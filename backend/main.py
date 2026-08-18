import os
import traceback
import requests
from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path

# Apuntar al archivo .env en la raíz del proyecto
env_path = Path(__file__).resolve().parent.parent / '.env'
load_dotenv(dotenv_path=env_path)

app = FastAPI(title="GW2 WvW Combat Analytics API")

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Credenciales desde .env
DATABRICKS_HOST = os.getenv("DATABRICKS_HOST")
DATABRICKS_TOKEN = os.getenv("DATABRICKS_TOKEN")

# Directorio local de respaldo
LOCAL_BRONZE_DIR = "databricks/bronze_data"
os.makedirs(LOCAL_BRONZE_DIR, exist_ok=True)

def upload_file_to_databricks_volume(local_file_path: str, file_name: str):
    """
    Sube el archivo al Volumen de Databricks usando requests con depuración de URL activa.
    """
    if not DATABRICKS_HOST or not DATABRICKS_TOKEN:
        print("--- ERROR: Las credenciales de Databricks no están configuradas en el .env ---")
        return

    try:
        base_host = DATABRICKS_HOST.strip().rstrip('/')
        
        # Endpoint oficial de la API de Files para Unity Catalog Volumes
        volume_api_path = f"/api/2.0/fs/files/Volumes/gw2_analytics/bronze/raw_logs/{file_name}"
        url = f"{base_host}{volume_api_path}"

        print(f"--- DEBUG URL --- Intentando conectar a: {url}")

        headers = {
            "Authorization": f"Bearer {DATABRICKS_TOKEN.strip()}"
        }

        # Leer archivo binario
        with open(local_file_path, "rb") as f:
            file_bytes = f.read()

        # Petición PUT con timeout de 30 segundos
        response = requests.put(url, headers=headers, data=file_bytes, timeout=30)
        
        print(f"Código de respuesta HTTP: {response.status_code}")
        if response.status_code in [200, 201]:
            print(f"¡Éxito! Archivo {file_name} subido al volumen de Databricks correctamente.")
        else:
            print(f"--- ERROR EN RESPUESTA DE DATABRICKS ---")
            print(response.text)
            
    except Exception as e:
        print("--- ERROR DETALLADO EN LA SUBIDA ---")
        traceback.print_exc()

@app.post("/api/analyze")
async def analyze_log(file: UploadFile = File(...), background_tasks: BackgroundTasks = BackgroundTasks()):
    try:
        # 1. Leer contenido
        contents = await file.read()
        file_name = file.filename or "unknown.zevtc"
        
        # Crear nombre de archivo para Databricks
        json_file_name = file_name.replace(".zevtc", "_analysis.json")
        local_file_path = os.path.join(LOCAL_BRONZE_DIR, json_file_name)

        # 2. Guardar copia local
        with open(local_file_path, "wb") as f:
            f.write(contents)

        # 3. Programar subida en segundo plano
        background_tasks.add_task(upload_file_to_databricks_volume, local_file_path, json_file_name)

        return {
            "status": "success",
            "message": "Archivo recibido. Guardado localmente y procesándose en Databricks (Bronze) en segundo plano.",
            "file": json_file_name
        }

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)