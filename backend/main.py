import os
import json
import subprocess
import traceback
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

app = FastAPI(title="GW2 WvW Combat Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MONTAR ARCHIVOS ESTÁTICOS Y DATOS PARA EL FRONTEND ---
# Sirve la interfaz web ubicada en la carpeta 'docs' en la ruta raíz '/'
app.mount("/static", StaticFiles(directory="docs"), name="static")

# Expone la carpeta data para que el fetch() de app.js lea los JSONs sin errores
app.mount("/data", StaticFiles(directory="docs/data"), name="data")

@app.get("/")
def read_index():
    return FileResponse("docs/index.html")
# ----------------------------------------------------------

LOCAL_BRONZE_DIR = "databricks/bronze_data"
LOCAL_GOLD_DIR = "databricks/gold_data"
os.makedirs(LOCAL_BRONZE_DIR, exist_ok=True)
os.makedirs(LOCAL_GOLD_DIR, exist_ok=True)

# Ruta exacta de tu CLI y su carpeta de configuración (.conf)
PARSER_EXE = r"C:\Users\andpa\gw2-wvw-analytics\tools\EliteInsights\GW2EICLI\GuildWars2EliteInsights-CLI.exe"
CLI_DIR = os.path.dirname(PARSER_EXE)
SETTINGS_PATH = os.path.join(CLI_DIR, "settings.conf")

def git_pull_commit_and_push(file_path: str):
    repo_dir = Path(__file__).resolve().parent.parent
    file_name = os.path.basename(file_path)
    try:
        # 0. Guardar temporalmente cualquier cambio local o archivo no rastreado
        subprocess.run(["git", "stash", "-u"], cwd=repo_dir, capture_output=True)
        
        # 1. Sincronizar cambios remotos de forma segura
        subprocess.run(["git", "pull", "--rebase"], cwd=repo_dir, check=True)
        
        # 2. Recuperar los cambios guardados (incluyendo el archivo JSON actual)
        subprocess.run(["git", "stash", "pop"], cwd=repo_dir, capture_output=True)
        
        # 3. Agregar el nuevo archivo JSON a Git (asegurando ruta relativa correcta)
        relative_path = os.path.relpath(file_path, repo_dir).replace("\\", "/")
        subprocess.run(["git", "add", relative_path], cwd=repo_dir, check=True)
        
        # 4. Realizar el commit automático
        commit_message = f"chore(bronze): auto-agregar log parseado {file_name}"
        res_commit = subprocess.run(["git", "commit", "-m", commit_message], cwd=repo_dir, capture_output=True, text=True)
        
        # 5. Enviar los cambios a GitHub si hay un commit válido
        if res_commit.returncode == 0:
            subprocess.run(["git", "push"], cwd=repo_dir, check=True)
            print(f"¡Ciclo de Git (Pull, Commit, Push) completado con éxito para {file_name}!")
        else:
            print("Git: El archivo ya estaba commiteado o no hay cambios nuevos pendientes.")
            
    except subprocess.CalledProcessError as e:
        print(f"Aviso de Git durante la sincronización: {e}")
    except Exception as e:
        traceback.print_exc()

def load_gold_metrics():
    """Lee y carga los JSONs procesados de la capa Gold para enviarlos al frontend"""
    gold_data = {}
    files_to_load = {
        "summary": "www_player_stats_summary.json",
        "professions": "www_profession_performance.json",
        "encounters": "www_encounter_summary.json"
    }
    
    for key, filename in files_to_load.items():
        file_path = os.path.join(LOCAL_GOLD_DIR, filename)
        if os.path.exists(file_path):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    gold_data[key] = json.load(f)
            except Exception as e:
                print(f"Error leyendo {filename}: {e}")
                gold_data[key] = []
        else:
            gold_data[key] = []
            
    return gold_data

@app.post("/api/analyze")
async def analyze_log(file: UploadFile = File(...)):
    temp_zevtc_path = None
    try:
        if not os.path.exists(SETTINGS_PATH):
            raise HTTPException(
                status_code=500, 
                detail="No se encontró el archivo settings.conf en la carpeta del CLI. Por favor genéralo desde la interfaz gráfica de Elite Insights."
            )

        file_name = file.filename or "unknown.zevtc"
        contents = await file.read()
        
        # 1. Guardar temporalmente el .zevtc en bronze_data
        temp_zevtc_path = os.path.join(LOCAL_BRONZE_DIR, file_name)
        with open(temp_zevtc_path, "wb") as f:
            f.write(contents)

        print(f"Ejecutando Elite Insights CLI para: {file_name}")
        
        # 2. Ejecutar el CLI usando la configuración oficial (.conf)
        result = subprocess.run(
            [PARSER_EXE, "-c", SETTINGS_PATH, temp_zevtc_path],
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW
        )

        if result.returncode != 0:
            print("STDOUT:", result.stdout)
            print("STDERR:", result.stderr)
            raise HTTPException(
                status_code=500, 
                detail=f"Error en Elite Insights: {result.stderr or result.stdout}"
            )

        # 3. Eliminar el archivo binario .zevtc temporal
        if os.path.exists(temp_zevtc_path):
            os.remove(temp_zevtc_path)

        # 4. Analizar el stdout del CLI para extraer el archivo JSON generado de forma oficial
        generated_json_path = None
        for line in result.stdout.splitlines():
            if line.startswith("Processed - "):
                try:
                    json_data = json.loads(line[len("Processed - "):])
                    for gen_file in json_data.get("generatedFiles", []):
                        if gen_file.endswith(".json"):
                            generated_json_path = gen_file
                            break
                except Exception:
                    pass

        # Si por alguna razón no vino en el stdout, lo buscamos en bronze_data por extensión
        if not generated_json_path or not os.path.exists(generated_json_path):
            all_json_files = [
                os.path.join(LOCAL_BRONZE_DIR, f) 
                for f in os.listdir(LOCAL_BRONZE_DIR) 
                if f.endswith(".json") and not f.endswith((".deps.json", ".runtimeconfig.json"))
            ]
            if all_json_files:
                generated_json_path = max(all_json_files, key=os.path.getctime)

        if not generated_json_path or not os.path.exists(generated_json_path):
            raise HTTPException(
                status_code=500, 
                detail=f"El CLI finalizó pero no se generó ningún archivo JSON de combate. Salida: {result.stdout}"
            )

        # 5. Limpiar cualquier archivo .html o auxiliar sobrante en bronze_data
        for f in os.listdir(LOCAL_BRONZE_DIR):
            if f.endswith((".html", ".log")) and not f.endswith(".json"):
                try:
                    os.remove(os.path.join(LOCAL_BRONZE_DIR, f))
                except Exception:
                    pass

        # 6. Sincronizar automáticamente con Git (Pull -> Commit -> Push)
        git_pull_commit_and_push(generated_json_path)

        # 7. Cargar las métricas calculadas de la capa Gold para entregarlas al frontend
        gold_metrics = load_gold_metrics()

        return {
            "status": "success",
            "message": "Log parseado a JSON, sincronizado y métricas Gold cargadas correctamente.",
            "file": os.path.basename(generated_json_path),
            "data": gold_metrics
        }

    except Exception as e:
        if temp_zevtc_path and os.path.exists(temp_zevtc_path):
            os.remove(temp_zevtc_path)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)