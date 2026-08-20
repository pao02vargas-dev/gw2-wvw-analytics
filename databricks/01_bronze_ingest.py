# =============================================================================
# BRONZE LAYER - WvW Analytics
# =============================================================================
# Ingesta incremental de archivos JSON de combates WvW desde repositorio Git
# usando Auto Loader (cloudFiles) para detectar automáticamente archivos nuevos
# =============================================================================

import dlt
from pyspark.sql import functions as F

@dlt.table(
    name="wvw_kills_raw",
    comment="Tabla bronze con datos crudos de combates WvW de Guild Wars 2",
    table_properties={
        "quality": "bronze",
        "pipelines.autoOptimize.managed": "true",
        "delta.columnMapping.mode": "name"
    }
)
def wvw_kills_raw():
    """
    Ingesta incremental de archivos JSON de combates WvW desde repositorio Git.
    
    Características:
    - Auto Loader detecta automáticamente archivos nuevos
    - JSON multilínea con estructura compleja anidada
    - Inferencia automática de tipos de datos
    - Metadatos de ingesta agregados
    """
    return (
        spark.readStream
        .format("cloudFiles")
        .option("cloudFiles.format", "json")
        .option("multiLine", "true")
        .option("cloudFiles.inferColumnTypes", "true")
        .option("cloudFiles.schemaEvolutionMode", "addNewColumns")
        .load("/Workspace/Users/pao02.vargas@gmail.com/gw2-wvw-analytics/databricks/bronze_data/")
        .withColumn("ingestion_time", F.current_timestamp())
        .withColumn("source_file", F.col("_metadata.file_path"))
    )