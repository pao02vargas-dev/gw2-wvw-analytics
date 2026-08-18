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

def git_commit_and_push(file_name: str):
    try:
        # Apunta a la raíz del proyecto (subiendo un nivel desde backend/)
        repo_dir = Path(__file__).resolve().parent.parent
        
        # 1. git add del archivo JSON generado
        subprocess.run(["git", "add", f"databricks/bronze_data/{file_name}"], cwd=repo_dir, check=True)
        
        # 2. git commit automático
        commit_message = f"chore(bronze): auto-agregar log procesado {file_name}"
        subprocess.run(["git", "commit", "-m", commit_message], cwd=repo_dir, check=True)
        
        print(f"¡Git commit realizado con éxito para {file_name}!")
        
    except subprocess.CalledProcessError as e:
        print(f"Aviso de Git (posiblemente sin cambios nuevos): {e}")
    except Exception as e:
        traceback.print_exc()

@app.post("/api/analyze")
async def analyze_log(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        file_name = file.filename or "unknown.zevtc"
        
        json_file_name = file_name.replace(".zevtc", "_analysis.json")
        local_file_path = os.path.join(LOCAL_BRONZE_DIR, json_file_name)

        # Guardar archivo localmente
        with open(local_file_path, "wb") as f:
            f.write(contents)

        # Ejecutar commit automático
        git_commit_and_push(json_file_name)

        return {
            "status": "success",
            "message": "Archivo procesado, guardado y commiteado en Git automáticamente.",
            "file": json_file_name
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)