from pyspark.sql import SparkSession
from pyspark.sql.functions import current_timestamp, input_file_name

# Iniciamos sesión de Spark (Si estás en Databricks esto es automático)
spark = SparkSession.builder.appName("WvW_Bronze_Ingest").getOrCreate()

# Ruta donde tu backend dejó el JSON
# En Databricks, aquí usarías un camino hacia un Volumen de Unity Catalog o DBFS
json_path = "databricks/bronze_data/*.json" 

# 1. Leer el JSON crudo
# Usamos 'multiline' porque los logs de dps.report son estructuras JSON largas y complejas
df = spark.read.option("multiline", "true").json(json_path)

# 2. Agregar metadatos
# Es fundamental saber CUÁNDO entró el dato y DE QUÉ archivo vino
df_bronze = df.withColumn("ingestion_time", current_timestamp()) \
              .withColumn("source_file", input_file_name())

# 3. Guardar en formato Delta
# Delta Lake es lo que hace que Databricks sea increíble para analítica
output_path = "databricks/delta_tables/bronze_wvw_logs"
df_bronze.write.format("delta").mode("append").save(output_path)

print("¡Datos cargados a la Capa Bronce en formato Delta!")