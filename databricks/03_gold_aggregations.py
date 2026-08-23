# =============================================================================
# GOLD LAYER - WvW Analytics
# =============================================================================
# Crea agregaciones pre-calculadas optimizadas para consumo analítico
# y dashboards desde la tabla Silver granular
# 
# Este archivo define 5 tablas Gold, cada una con una granularidad diferente:
# 1. wvw_player_stats_daily - Performance diaria por jugador
# 2. wvw_player_stats_summary - Resumen rolling 30 días (leaderboards)
# 3. wvw_profession_performance - Meta analysis por clase
# 4. wvw_squad_composition - Balance y composición por grupo
# 5. wvw_encounter_summary - Análisis de dificultad por encuentro
# =============================================================================

# Importaciones para agregaciones Gold
import dlt  # Framework de Spark Declarative Pipelines (DLT)
from pyspark.sql import functions as F  # Funciones de agregación y transformación

# =============================================================================
# GOLD TABLE 1: wvw_player_stats_daily
# Agregación diaria por jugador
# =============================================================================

@dlt.table(
    name="wvw_player_stats_daily",
    comment="Estadísticas diarias agregadas por jugador",
    table_properties={
        "quality": "gold",  # Identifica esta tabla como capa Gold
        "pipelines.autoOptimize.managed": "true"  # Optimización automática de archivos
    }
)
def wvw_player_stats_daily():
    """
    Agregación diaria por jugador.
    
    Granularidad: Una fila por jugador por día
    Propósito: Análisis de tendencias diarias, mejoras individuales y comparación temporal
    Uso típico: Dashboards de progreso personal, tracking diario
    """
    # Leer datos granulares desde Silver
    silver_df = dlt.read("wvw_player_encounters")
    
    return (
        silver_df
        # === AGRUPACIÓN ===
        # Agrupa por fecha, jugador y profesión para obtener estadísticas diarias
        .groupBy("encounter_date", "player_name", "profession")
        
        # === AGREGACIONES ===
        .agg(
            # --- Contexto del jugador ---
            # Toma el valor más reciente de características que no cambian durante el día
            F.max("squad_group").alias("squad_group"),
            F.max("primary_role").alias("primary_role"),
            F.max("build_type").alias("build_type"),
            
            # --- Conteo de encuentros ---
            F.countDistinct("encounter_id").alias("total_encounters"),  # Cuántos combates participó ese día
            
            # --- Métricas de daño agregadas ---
            F.round(F.avg("dps"), 0).alias("avg_dps"),  # DPS promedio en todos los encuentros del día
            F.round(F.sum("damage_dealt"), 0).alias("total_damage_dealt"),  # Daño total acumulado en el día
            F.round(F.avg("damage_dealt"), 0).alias("avg_damage_per_encounter"),  # Daño promedio por encuentro
            F.round(F.avg("power_damage_pct"), 1).alias("avg_power_damage_pct"),  # % promedio de daño directo
            F.round(F.avg("condi_damage_pct"), 1).alias("avg_condi_damage_pct"),  # % promedio de daño por condiciones
            F.round(F.avg("cleave_pct"), 1).alias("avg_cleave_pct"),  # % promedio de daño cleave (AoE)
            
            # --- Métricas de supervivencia agregadas ---
            F.round(F.avg("deaths"), 2).alias("avg_deaths_per_encounter"),  # Promedio de muertes por encuentro
            F.round(F.sum("deaths"), 0).alias("total_deaths"),  # Total de muertes en el día
            F.round(F.avg("downs"), 2).alias("avg_downs_per_encounter"),  # Promedio de downs por encuentro
            F.round(F.avg("survival_ratio"), 2).alias("avg_survival_ratio"),  # Ratio daño infligido/recibido
            F.round(F.avg("damage_taken"), 0).alias("avg_damage_taken"),  # Daño recibido promedio
            F.round(F.sum("damage_taken"), 0).alias("total_damage_taken"),  # Daño total recibido
            F.round(F.avg("damage_prevented"), 0).alias("avg_damage_prevented"),  # Daño prevenido por cleanses
            
            # --- Boon uptimes promedio ---
            # Qué % del tiempo el jugador tuvo cada boon activo
            F.round(F.avg("stability_uptime"), 1).alias("avg_stability_uptime"),
            F.round(F.avg("resistance_uptime"), 1).alias("avg_resistance_uptime"),
            F.round(F.avg("aegis_uptime"), 1).alias("avg_aegis_uptime"),
            F.round(F.avg("quickness_uptime"), 1).alias("avg_quickness_uptime"),
            F.round(F.avg("might_uptime"), 1).alias("avg_might_uptime"),
            
            # --- Boon generation promedio ---
            # Qué % del tiempo el jugador generó cada boon (para el squad)
            F.round(F.avg("stability_generation"), 1).alias("avg_stability_generation"),
            F.round(F.avg("resistance_generation"), 1).alias("avg_resistance_generation"),
            F.round(F.avg("quickness_generation"), 1).alias("avg_quickness_generation"),
            F.round(F.avg("might_generation"), 1).alias("avg_might_generation"),
            
            # --- Cleanse metrics agregadas ---
            F.round(F.avg("cleanses_per_minute"), 1).alias("avg_cleanses_per_minute"),  # Tasa de limpieza
            F.round(F.sum("conditions_cleansed"), 0).alias("total_conditions_cleansed"),  # Total de condiciones removidas
            F.round(F.avg("conditions_cleansed"), 1).alias("avg_conditions_cleansed"),  # Promedio por encuentro
            
            # --- CC (Crowd Control) metrics agregadas ---
            F.round(F.avg("cc_seconds"), 2).alias("avg_cc_seconds_per_encounter"),  # Segundos de CC por encuentro
            F.round(F.sum("cc_seconds"), 1).alias("total_cc_seconds")  # Total de segundos de CC en el día
        )
        
        # === MÉTRICAS DERIVADAS (calculadas después de las agregaciones) ===
        
        # Eficiencia de daño: cuánto daño hago por cada punto de daño que recibo
        .withColumn("damage_efficiency",
            F.round(F.col("avg_damage_per_encounter") / F.col("avg_damage_taken"), 2))
        
        # Clasificación de performance basada en DPS y supervivencia
        .withColumn("performance_tier",
            F.when((F.col("avg_dps") >= 15000) & (F.col("avg_deaths_per_encounter") < 0.5), "Elite")  # Alto daño, casi no muere
            .when((F.col("avg_dps") >= 12000) & (F.col("avg_deaths_per_encounter") < 1.0), "Advanced")  # Buen daño, muere poco
            .when((F.col("avg_dps") >= 8000) & (F.col("avg_deaths_per_encounter") < 1.5), "Intermediate")  # Daño medio, supervivencia aceptable
            .otherwise("Beginner"))  # Bajo daño o muere mucho
        
        # Clasificación de supervivencia independiente (solo por muertes)
        .withColumn("survivability_tier",
            F.when(F.col("avg_deaths_per_encounter") < 0.5, "Excellent")  # Casi nunca muere
            .when(F.col("avg_deaths_per_encounter") < 1.0, "Good")  # Muere poco
            .when(F.col("avg_deaths_per_encounter") < 1.5, "Fair")  # Supervivencia promedio
            .otherwise("Needs Improvement"))  # Muere frecuentemente
        
        # === ORDENAMIENTO ===
        # Ordena por fecha más reciente primero, luego por mejor DPS
        .orderBy(F.desc("encounter_date"), F.desc("avg_dps"))
    )


# =============================================================================
# GOLD TABLE 2: wvw_player_stats_summary
# Resumen rolling 30 días por jugador (leaderboards)
# =============================================================================

@dlt.table(
    name="wvw_player_stats_summary",
    comment="Resumen de performance rolling 30 días por jugador",
    table_properties={
        "quality": "gold",
        "pipelines.autoOptimize.managed": "true"
    }
)
def wvw_player_stats_summary():
    """
    Rolling 30-day summary por jugador.
    
    Granularidad: Una fila por jugador (toda su actividad reciente)
    Propósito: Leaderboards, rankings globales, identificación de top performers
    Uso típico: Tablas de clasificación, comparación entre jugadores
    """
    silver_df = dlt.read("wvw_player_encounters")
    
    # === FILTRO TEMPORAL ===
    # Calcular la fecha de hace 30 días desde hoy
    thirty_days_ago = F.date_sub(F.current_date(), 30)
    
    return (
        silver_df
        # Filtrar solo los últimos 30 días de actividad
        .filter(F.col("encounter_date") >= thirty_days_ago)
        
        # === AGRUPACIÓN ===
        # Agrupa por jugador sin dimensión temporal (resumen global)
        .groupBy("player_name", "profession")
        
        # === AGREGACIONES ===
        .agg(
            # --- Contexto del jugador ---
            F.max("squad_group").alias("squad_group"),
            F.max("primary_role").alias("primary_role"),
            F.max("build_type").alias("build_type"),
            
            # --- Ventana temporal de actividad ---
            F.min("encounter_date").alias("first_encounter_date"),  # Primera vez visto en los 30 días
            F.max("encounter_date").alias("last_encounter_date"),  # Última vez visto
            F.datediff(F.max("encounter_date"), F.min("encounter_date")).alias("days_active"),  # Días con actividad
            
            # --- Conteos ---
            F.countDistinct("encounter_id").alias("total_encounters"),  # Total de encuentros en 30 días
            
            # --- Métricas principales (promediadas) ---
            F.round(F.avg("dps"), 0).alias("avg_dps"),  # DPS promedio de los 30 días
            F.round(F.sum("damage_dealt"), 0).alias("total_damage_dealt"),  # Daño total acumulado
            
            # --- Supervivencia ---
            F.round(F.avg("deaths"), 2).alias("avg_deaths_per_encounter"),  # Muertes promedio por encuentro
            F.round(F.avg("survival_ratio"), 2).alias("avg_survival_ratio"),  # Ratio daño infligido/recibido
            
            # --- Boons clave ---
            F.round(F.avg("stability_uptime"), 1).alias("avg_stability_uptime"),  # Uptime de Stability
            F.round(F.avg("quickness_uptime"), 1).alias("avg_quickness_uptime"),  # Uptime de Quickness
            
            # --- Soporte ---
            F.round(F.avg("cleanses_per_minute"), 1).alias("avg_cleanses_per_minute"),  # Tasa de cleanses
            F.round(F.avg("cc_seconds"), 2).alias("avg_cc_seconds")  # CC por encuentro
        )
        
        # === ORDENAMIENTO ===
        # Ordena por DPS descendente (leaderboard de daño)
        .orderBy(F.desc("avg_dps"))
    )


# =============================================================================
# GOLD TABLE 3: wvw_profession_performance
# Agregación diaria por profesión (meta analysis)
# =============================================================================

@dlt.table(
    name="wvw_profession_performance",
    comment="Performance diaria agregada por profesión de GW2",
    table_properties={
        "quality": "gold",
        "pipelines.autoOptimize.managed": "true"
    }
)
def wvw_profession_performance():
    """
    Agregación diaria por profesión.
    
    Granularidad: Una fila por profesión por día
    Propósito: Análisis del meta-game, balance entre clases, identificar profesiones dominantes
    Uso típico: Reportes de balance, análisis de composición meta, guías de clase
    """
    silver_df = dlt.read("wvw_player_encounters")
    
    return (
        silver_df
        # === AGRUPACIÓN ===
        # Agrupa por fecha y profesión para ver tendencias de cada clase
        .groupBy("encounter_date", "profession")
        
        # === AGREGACIONES ===
        .agg(
            # --- Popularidad ---
            F.countDistinct("player_name").alias("unique_players"),  # Cuántos jugadores distintos usaron esta clase
            F.countDistinct("encounter_id").alias("total_encounters"),  # Cuántos encuentros con esta clase
            
            # --- Performance de daño ---
            F.round(F.avg("dps"), 0).alias("avg_dps"),  # DPS promedio de la clase
            F.round(F.avg("damage_dealt"), 0).alias("avg_damage_dealt"),  # Daño promedio por encuentro
            F.round(F.avg("power_damage_pct"), 1).alias("avg_power_pct"),  # % de daño directo
            F.round(F.avg("condi_damage_pct"), 1).alias("avg_condi_pct"),  # % de daño por condiciones
            
            # --- Supervivencia ---
            F.round(F.avg("deaths"), 2).alias("avg_deaths"),  # Muertes promedio de la clase
            F.round(F.avg("survival_ratio"), 2).alias("avg_survival_ratio"),  # Ratio supervivencia
            
            # --- Boons ---
            F.round(F.avg("stability_uptime"), 1).alias("avg_stability_uptime"),  # Stability de la clase
            F.round(F.avg("might_uptime"), 1).alias("avg_might_uptime"),  # Might de la clase
            
            # --- Soporte ---
            F.round(F.avg("cleanses_per_minute"), 1).alias("avg_cleanses_per_minute"),  # Capacidad de cleanse
            F.round(F.avg("cc_seconds"), 2).alias("avg_cc_seconds")  # Capacidad de CC
        )
        
        # === ORDENAMIENTO ===
        # Ordena por fecha reciente primero, luego por DPS más alto
        .orderBy(F.desc("encounter_date"), F.desc("avg_dps"))
    )


# =============================================================================
# GOLD TABLE 4: wvw_squad_composition
# Agregación diaria por squad/grupo
# =============================================================================

@dlt.table(
    name="wvw_squad_composition",
    comment="Composición y performance diaria por squad group",
    table_properties={
        "quality": "gold",
        "pipelines.autoOptimize.managed": "true"
    }
)
def wvw_squad_composition():
    """
    Agregación diaria por squad group.
    
    Granularidad: Una fila por grupo por día
    Propósito: Analiza balance del squad, composición, y si hay suficiente soporte vs DPS
    Uso típico: Optimización de composición, identificar grupos desbalanceados
    """
    silver_df = dlt.read("wvw_player_encounters")
    
    return (
        silver_df
        # === AGRUPACIÓN ===
        # Agrupa por fecha y grupo dentro del squad
        .groupBy("encounter_date", "squad_group")
        
        # === AGREGACIONES ===
        .agg(
            # --- Tamaño y participación del squad ---
            F.countDistinct("player_name").alias("squad_size"),  # Cuántos jugadores en este grupo
            F.countDistinct("encounter_id").alias("total_encounters"),  # Cuántos encuentros
            
            # --- Composición por roles ---
            # Cuenta jugadores por rol para analizar balance
            F.countDistinct(F.when(F.col("primary_role").contains("Support"), F.col("player_name"))).alias("support_count"),  # Jugadores de soporte
            F.countDistinct(F.when(F.col("primary_role") == "DPS", F.col("player_name"))).alias("dps_count"),  # Jugadores DPS puro
            F.countDistinct(F.when(F.col("primary_role").contains("Cleanser"), F.col("player_name"))).alias("cleanser_count"),  # Cleansers
            
            # --- Performance del grupo ---
            F.round(F.avg("dps"), 0).alias("avg_dps"),  # DPS promedio del grupo
            F.round(F.sum("damage_dealt"), 0).alias("total_squad_damage"),  # Daño total del grupo
            F.round(F.avg("deaths"), 2).alias("avg_deaths"),  # Muertes promedio
            
            # --- Boons del grupo ---
            F.round(F.avg("stability_uptime"), 1).alias("avg_stability_uptime"),  # Stability grupal
            F.round(F.avg("quickness_uptime"), 1).alias("avg_quickness_uptime"),  # Quickness grupal
            
            # --- Soporte del grupo ---
            F.round(F.avg("cleanses_per_minute"), 1).alias("avg_cleanses_per_minute")  # Capacidad de cleanse grupal
        )
        
        # === MÉTRICAS DERIVADAS ===
        
        # Ratio de soporte: qué % del grupo son jugadores de soporte
        .withColumn("support_ratio",
            F.round(F.col("support_count") / F.col("squad_size"), 2))
        
        # Clasificación del balance del grupo basado en ratio soporte/DPS
        .withColumn("squad_balance",
            F.when((F.col("support_ratio") >= 0.3) & (F.col("support_ratio") <= 0.5), "Balanced")  # 30-50% soporte = equilibrado
            .when(F.col("support_ratio") < 0.3, "DPS Heavy")  # Menos de 30% soporte = mucho DPS, poco soporte
            .otherwise("Support Heavy"))  # Más de 50% soporte = mucho soporte, poco DPS
        
        # === ORDENAMIENTO ===
        # Ordena por fecha reciente primero, luego por número de grupo
        .orderBy(F.desc("encounter_date"), "squad_group")
    )


# =============================================================================
# GOLD TABLE 5: wvw_encounter_summary
# Agregación por encounter (análisis de dificultad)
# =============================================================================

@dlt.table(
    name="wvw_encounter_summary",
    comment="Resumen por encuentro - análisis de dificultad y desempeño grupal",
    table_properties={
        "quality": "gold",
        "pipelines.autoOptimize.managed": "true"
    }
)
def wvw_encounter_summary():
    """
    Agregación por encounter.
    
    Granularidad: Una fila por encounter (combate individual)
    Propósito: Analiza dificultad del combate, performance del grupo completo, coordinación
    Uso típico: Post-mortem de combates, identificar encuentros difíciles, evaluar coordinación
    """
    silver_df = dlt.read("wvw_player_encounters")
    
    return (
        silver_df
        # === AGRUPACIÓN ===
        # Agrupa por identificadores únicos del encuentro (incluye timestamp y duración)
        .groupBy("encounter_id", "encounter_date", "encounter_time", "encounter_duration_minutes")
        
        # === AGREGACIONES ===
        .agg(
            # --- Composición del squad en el encuentro ---
            F.count("player_name").alias("total_players"),  # Cuántos jugadores participaron
            F.countDistinct("profession").alias("unique_professions"),  # Diversidad de clases
            
            # --- Performance grupal ---
            F.round(F.avg("dps"), 0).alias("avg_dps"),  # DPS promedio del grupo en este combate
            F.round(F.sum("damage_dealt"), 0).alias("total_group_damage"),  # Daño total del grupo
            F.round(F.avg("deaths"), 2).alias("avg_deaths"),  # Muertes promedio por jugador
            F.round(F.sum("deaths"), 0).alias("total_deaths"),  # Total de muertes del grupo
            
            # --- Soporte grupal ---
            F.round(F.avg("stability_uptime"), 1).alias("avg_stability_uptime"),  # Stability grupal
            F.round(F.avg("quickness_uptime"), 1).alias("avg_quickness_uptime"),  # Quickness grupal
            F.round(F.avg("cleanses_per_minute"), 1).alias("avg_cleanses_per_minute")  # Cleanses grupales
        )
        
        # === MÉTRICAS DERIVADAS ===
        
        # Clasificación de dificultad basada en muertes y DPS
        # Combates fáciles: poco daño recibido (pocas muertes) + alto DPS
        # Combates difíciles: mucho daño recibido (muchas muertes) + DPS bajo
        .withColumn("encounter_difficulty",
            F.when((F.col("avg_deaths") < 0.5) & (F.col("avg_dps") > 12000), "Easy")  # Dominamos el combate
            .when((F.col("avg_deaths") < 1.0) & (F.col("avg_dps") > 10000), "Medium")  # Combate equilibrado
            .when(F.col("avg_deaths") < 2.0, "Hard")  # Combate difícil pero manejable
            .otherwise("Very Hard"))  # Combate muy difícil, muchas muertes
        
        # Clasificación de coordinación grupal basada en uptimes de boons clave
        # Buena coordinación = alta cobertura de boons críticos (Stability + Quickness)
        .withColumn("group_coordination",
            F.when((F.col("avg_stability_uptime") > 60) & (F.col("avg_quickness_uptime") > 80), "Excellent")  # Excelente cobertura
            .when((F.col("avg_stability_uptime") > 40) & (F.col("avg_quickness_uptime") > 60), "Good")  # Buena cobertura
            .otherwise("Needs Work"))  # Cobertura insuficiente, mala coordinación
        
        # === ORDENAMIENTO ===
        # Ordena por fecha y hora más recientes primero
        .orderBy(F.desc("encounter_date"), F.desc("encounter_time"))
    )

    # =====================================================================
#  Export ALL Gold Tables to JSON for Git (gold_data)
# =====================================================================
import json
import os

print("🔵 Gold JSON Export - START: Exporting ALL Gold tables to gold_data directory...")

try:
    # 1. Extraer TODAS las 5 tablas Gold a Pandas
    print("   📊 Fetching Gold tables...")
    df_daily = spark.sql("SELECT * FROM gw2_analytics.gold.wvw_player_stats_daily").toPandas()
    df_summary = spark.sql("SELECT * FROM gw2_analytics.gold.wvw_player_stats_summary").toPandas()
    df_prof = spark.sql("SELECT * FROM gw2_analytics.gold.wvw_profession_performance").toPandas()
    df_squad = spark.sql("SELECT * FROM gw2_analytics.gold.wvw_squad_composition").toPandas()
    df_encounter = spark.sql("SELECT * FROM gw2_analytics.gold.wvw_encounter_summary").toPandas()
    
    all_dfs = [df_daily, df_summary, df_prof, df_squad, df_encounter]
    print(f"   ✅ Fetched {len(all_dfs)} tables")
    
    # Convert date and datetime columns to strings for JSON serialization
    print("   🔄 Converting date/datetime columns to strings...")
    for df in all_dfs:
        # Get column dtypes once before loop (avoid SCPAP001 lint warning)
        datetime_cols = df.select_dtypes(include=['object', 'datetime64']).columns
        for col in datetime_cols:
            df[col] = df[col].astype(str)

    # 2. Definir el diccionario con TODAS las tablas
    gold_exports = {
        "wvw_player_stats_daily.json": df_daily.to_dict(orient="records"),
        "wvw_player_stats_summary.json": df_summary.to_dict(orient="records"),
        "wvw_profession_performance.json": df_prof.to_dict(orient="records"),
        "wvw_squad_composition.json": df_squad.to_dict(orient="records"),
        "wvw_encounter_summary.json": df_encounter.to_dict(orient="records")
    }
    
    print(f"   📦 Prepared {len(gold_exports)} JSON files")

    # 3. Ruta correcta del repositorio Git en Workspace/Users
    repo_path = "/Workspace/Users/pao02.vargas@gmail.com/gw2-wvw-analytics/docs/data/"
    fallback_path = "/Workspace/Users/pao02.vargas@gmail.com/gold_data_backup/"
    
    # Try repo path first
    export_dir = repo_path
    try:
        print(f"   🔍 Attempting to write to Git repo: {repo_path}")
        # Test if we can write to repo path
        test_path = f"{repo_path}.test"
        dbutils.fs.put(test_path, "test", overwrite=True)
        dbutils.fs.rm(test_path)
        print("   ✅ Git repo path is accessible!")
    except Exception as e:
        print(f"   ⚠️  Git repo path not accessible: {str(e)}")
        print(f"   🔄 Falling back to workspace: {fallback_path}")
        export_dir = fallback_path
    
    # Create directory
    try:
        dbutils.fs.mkdirs(export_dir)
    except Exception:
        pass  # Directory may already exist

    # 4. Guardar cada tabla como archivo JSON
    print(f"\n   💾 Writing JSON files to: {export_dir}")
    for filename, data in gold_exports.items():
        file_path = f"{export_dir}{filename}"
        
        # Convertir a JSON bonito y escribir usando dbutils
        json_string = json.dumps(data, ensure_ascii=False, indent=2)
        dbutils.fs.put(file_path, json_string, overwrite=True)
        
        print(f"   ✅ {filename}: {len(data)} registros")

    print(f"\n✅ Gold JSON Export - SUCCESS!")
    print(f"📂 Location: {export_dir}")
    
    if export_dir == fallback_path:
        print(f"\n⚠️  NOTA: Archivos guardados en workspace, no en el repo de Git.")
        print(f"   Para copiarlos al repo, ejecuta estos comandos en una celda shell:")
        print(f"   cp {fallback_path}*.json {repo_path}")

except Exception as e:
    print(f"❌ Gold JSON Export - ERROR: Falla al exportar a gold_data: {str(e)}")