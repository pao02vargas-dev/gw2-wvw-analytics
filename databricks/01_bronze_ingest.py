# =============================================================================
# BRONZE LAYER - WvW Analytics
# =============================================================================
# Ingesta incremental de archivos JSON de combates WvW desde repositorio Git
# usando Auto Loader (cloudFiles) para detectar automáticamente archivos nuevos
# =============================================================================

# Importaciones necesarias para definir tablas del pipeline
import dlt  # Framework de Spark Declarative Pipelines (DLT)
from pyspark.sql import functions as F  # Funciones de transformación de Spark

# Decorador para definir una streaming table en el pipeline
# - name: nombre de la tabla que aparecerá en Unity Catalog
# - comment: descripción visible en el catálogo de datos
# - table_properties: configuración adicional de la tabla Delta
@dlt.table(
    name="wvw_kills_raw",
    comment="Tabla bronze con datos crudos de combates WvW de Guild Wars 2",
    table_properties={
        "quality": "bronze",  # Etiqueta para identificar la capa medallion
        "pipelines.autoOptimize.managed": "true",  # Optimización automática de archivos Delta
        "delta.columnMapping.mode": "name"  # Permite nombres de columnas con caracteres especiales
    }
)
def wvw_kills_raw():
    """
    Ingesta incremental de archivos JSON de combates WvW desde repositorio Git.
    
    Características:
    - Auto Loader detecta automáticamente archivos nuevos en el directorio
    - JSON multilínea con estructura compleja anidada
    - Inferencia automática de tipos de datos
    - Evolución del esquema cuando aparecen nuevas columnas
    - Metadatos de ingesta agregados para auditoría y trazabilidad
    """
    return (
        # Auto Loader: monitorea el directorio y procesa archivos nuevos incrementalmente
        spark.readStream
        .format("cloudFiles")  # Formato Auto Loader para ingesta incremental eficiente
        
        # Configuración del formato de los archivos fuente
        .option("cloudFiles.format", "json")  # Los archivos de entrada son JSON
        .option("multiLine", "true")  # JSON con objetos que abarcan múltiples líneas
        
        # Manejo automático del esquema
        .option("cloudFiles.inferColumnTypes", "true")  # Inferir tipos de datos (int, string, timestamp, etc.)
        .option("cloudFiles.schemaEvolutionMode", "addNewColumns")  # Agregar columnas nuevas si cambia el esquema
        
        # Cargar archivos desde el directorio especificado
        # Este directorio contiene los archivos JSON sincronizados desde Git
        .load("/Workspace/Users/pao02.vargas@gmail.com/gw2-wvw-analytics/databricks/bronze_data/")
        
        # Agregar columnas de metadatos para auditoría y trazabilidad
        .withColumn("ingestion_time", F.current_timestamp())  # Timestamp de cuándo se procesó el registro
        .withColumn("source_file", F.col("_metadata.file_path"))  # Ruta del archivo origen del registro
    )