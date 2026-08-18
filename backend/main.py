import os
import subprocess
import traceback
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path

app = FastAPI(title="GW2 WvW Combat Analytics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

LOCAL_BRONZE_DIR = "databricks/bronze_data"
os.makedirs(LOCAL_BRONZE_DIR, exist_ok=True)

# ⚠️ Actualiza esta ruta con la ubicación exacta de tu ejecutable CLI en tu PC
PARSER_EXE = r"C:\Users\andpa\gw2-wvw-analytics\tools\EliteInsights\GW2EICLI\GuildWars2EliteInsights-CLI.exe"

def git_pull_commit_and_push(file_name: str):
    try:
        repo_dir = Path(__file__).resolve().parent.parent
        
        # 0. git pull para sincronizar cambios remotos antes de trabajar
        subprocess.run(["git", "pull", "--rebase"], cwd=repo_dir, check=True)
        
        # 1. git add del archivo JSON generado
        subprocess.run(["git", "add", f"databricks/bronze_data/{file_name}"], cwd=repo_dir, check=True)
        
        # 2. git commit automático
        commit_message = f"chore(bronze): auto-agregar log parseado {file_name}"
        subprocess.run(["git", "commit", "-m", commit_message], cwd=repo_dir, check=True)
        
        # 3. git push para enviar los cambios a GitHub
        subprocess.run(["git", "push"], cwd=repo_dir, check=True)
        print(f"¡Ciclo de Git (Pull, Commit, Push) completado con éxito para {file_name}!")
        
    except subprocess.CalledProcessError as e:
        print(f"Aviso de Git durante la sincronización: {e}")
    except Exception as e:
        traceback.print_exc()

@app.post("/api/analyze")
async def analyze_log(file: UploadFile = File(...)):
    temp_zevtc_path = None
    try:
        file_name = file.filename or "unknown.zevtc"
        contents = await file.read()
        
        # 1. Guardar temporalmente el .zevtc recibido en la carpeta bronze_data
        temp_zevtc_path = os.path.join(LOCAL_BRONZE_DIR, file_name)
        with open(temp_zevtc_path, "wb") as f:
            f.write(contents)

        print(f"Ejecutando Elite Insights CLI para: {file_name}")
        
        # 2. Llamar al CLI de Elite Insights para parsear el archivo a JSON
        result = subprocess.run(
            [PARSER_EXE, temp_zevtc_path],
            capture_output=True,
            text=True,
            creationflags=subprocess.CREATE_NO_WINDOW  # Oculta la ventana de consola en Windows
        )

        if result.returncode != 0:
            raise HTTPException(
                status_code=500, 
                detail=f"Error en Elite Insights: {result.stderr or result.stdout}"
            )

        # 3. Eliminar el archivo binario .zevtc temporal
        if os.path.exists(temp_zevtc_path):
            os.remove(temp_zevtc_path)

        # 4. Localizar el archivo .json recién generado en la carpeta bronze_data
        json_files = [f for f in os.listdir(LOCAL_BRONZE_DIR) if f.endswith(".json")]
        if not json_files:
            raise HTTPException(
                status_code=500, 
                detail="Elite Insights finalizó pero no se encontró ningún archivo .json."
            )

        latest_json = max(
            [os.path.join(LOCAL_BRONZE_DIR, f) for f in os.listdir(LOCAL_BRONZE_DIR) if f.endswith(".json")],
            key=os.path.getctime
        )
        final_json_name = os.path.basename(latest_json)

        # 5. Ejecutar el flujo completo de Git (Pull -> Commit -> Push)
        git_pull_commit_and_push(final_json_name)

        return {
            "status": "success",
            "message": "Log parseado, sincronizado (Pull/Commit/Push) y respaldado en GitHub correctamente.",
            "file": final_json_name
        }

    except Exception as e:
        if temp_zevtc_path and os.path.exists(temp_zevtc_path):
            os.remove(temp_zevtc_path)
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)