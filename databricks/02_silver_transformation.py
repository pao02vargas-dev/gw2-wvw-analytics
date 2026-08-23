# =============================================================================
# SILVER LAYER - WvW Analytics  
# =============================================================================
# Transforma datos crudos de combates WvW de la capa Bronze en métricas
# consolidadas de rendimiento para evaluar la efectividad del grupo
# =============================================================================

# Importaciones necesarias para transformaciones Silver
import dlt  # Framework de Spark Declarative Pipelines (DLT)
from pyspark.sql import functions as F  # Funciones de transformación de Spark

# Decorador para definir la tabla Silver con validaciones de calidad
# - @dlt.expect_or_drop: elimina registros que no cumplan las condiciones (data quality)
@dlt.table(
    name="wvw_player_encounters",
    comment="Métricas de rendimiento por jugador por encuentro (granular)",
    table_properties={
        "quality": "silver",  # Identifica esta tabla como capa Silver
        "pipelines.autoOptimize.managed": "true"  # Optimización automática de archivos
    }
)
@dlt.expect_or_drop("valid_encounter_id", "encounter_id IS NOT NULL")  # Rechaza registros sin ID de encuentro
@dlt.expect_or_drop("valid_player", "player_name IS NOT NULL")  # Rechaza registros sin nombre de jugador
def wvw_player_encounters():
    """
    Tabla Silver granular: Una fila por jugador por encuentro
    
    Métricas incluidas:
    - Boon Uptime (Stability, Resistance, Aegis, Quickness, Might)
    - Cleanse Efficiency (condiciones removidas, daño prevenido)
    - Damage Distribution (Power vs Condi, Target vs Cleave)
    - Survival Analysis (Downs, Deaths, Damage Taken)
    - CC Impact (Breakbar damage, CC seconds)
    """
    
    # Leer datos de Bronze y explotar jugadores (un registro por jugador)
    bronze_df = dlt.read("wvw_kills_raw")
    
    return (
        bronze_df
        # === TRANSFORMACIONES TEMPORALES Y DE ENCUENTRO ===
        .withColumn("encounter_date", F.to_date("timeStartStd"))  # Fecha del encuentro (sin hora)
        .withColumn("encounter_time", F.to_timestamp("timeStartStd"))  # Timestamp completo del encuentro
        .withColumn("encounter_duration_minutes", F.col("durationMS") / 1000.0 / 60.0)  # Duración en minutos
        .withColumn("encounter_duration_seconds", F.col("durationMS") / 1000.0)  # Duración en segundos (para cálculos)
        
        # === EXPLOTAR ARRAY DE JUGADORES ===
        # Convierte un registro de encuentro con múltiples jugadores en múltiples filas (una por jugador)
        .withColumn("player", F.explode("players"))
        
        # === SELECCIONAR CAMPOS BASE ===
        .selectExpr(
            "eiLogID AS encounter_id",  # ID único del encuentro
            "encounter_date",
            "encounter_time",
            "encounter_duration_minutes",
            "player.account AS player_account",  # Nombre de cuenta del jugador
            "player.name AS player_name",  # Nombre del personaje
            "player.profession AS profession",  # Profesión/clase del personaje
            "player.group AS squad_group",  # Número de grupo en el squad
            "player.buffUptimes AS buffUptimes",  # Array con datos de boons
            "player.defenses AS defenses",  # Array con datos defensivos y survival
            "player.dpsAll AS dpsAll",  # Array con datos de daño total
            "player.dpsTargets AS dpsTargets",  # Array con datos de daño a targets específicos
            "encounter_duration_seconds"
        )
        
        # === BOONS: STABILITY (ID: 1122) ===
        # Busca el buff de Stability en el array buffUptimes y extrae métricas de uptime
        .withColumn("stability_uptime", 
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 1122)[0].buffData[0].uptime"), F.lit(0.0)), 2))  # % de tiempo con el boon activo
        .withColumn("stability_generation",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 1122)[0].buffData[0].presence"), F.lit(0.0)), 2))  # % de tiempo generando el boon
        
        # === BOONS: RESISTANCE (ID: 26980) ===
        .withColumn("resistance_uptime",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 26980)[0].buffData[0].uptime"), F.lit(0.0)), 2))
        .withColumn("resistance_generation",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 26980)[0].buffData[0].presence"), F.lit(0.0)), 2))
        
        # === BOONS: AEGIS (ID: 743) ===
        .withColumn("aegis_uptime",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 743)[0].buffData[0].uptime"), F.lit(0.0)), 2))
        .withColumn("aegis_generation",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 743)[0].buffData[0].presence"), F.lit(0.0)), 2))
        
        # === BOONS: QUICKNESS (ID: 1187) ===
        .withColumn("quickness_uptime",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 1187)[0].buffData[0].uptime"), F.lit(0.0)), 2))
        .withColumn("quickness_generation",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 1187)[0].buffData[0].presence"), F.lit(0.0)), 2))
        
        # === BOONS: MIGHT (ID: 740) ===
        .withColumn("might_uptime",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 740)[0].buffData[0].uptime"), F.lit(0.0)), 2))
        .withColumn("might_generation",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 740)[0].buffData[0].presence"), F.lit(0.0)), 2))
        
        # === CLEANSES (LIMPIEZA DE CONDICIONES) ===
        .withColumn("conditions_cleansed", F.col("defenses")[0].conditionCleanses)  # Total de condiciones removidas
        .withColumn("cleanses_per_minute",
            F.round((F.col("defenses")[0].conditionCleanses / F.col("encounter_duration_seconds")) * 60, 2))  # Tasa de limpieza normalizada
        .withColumn("damage_prevented",
            F.round((F.col("defenses")[0].conditionCleansesTime / 1000.0) * 500, 0))  # Estimación de daño prevenido por cleanses
        
        # === DAMAGE (DAÑO INFLIGIDO) ===
        .withColumn("damage_dealt", F.col("dpsAll")[0].damage)  # Daño total infligido
        .withColumn("power_damage", F.col("dpsAll")[0].powerDamage)  # Daño directo (power)
        .withColumn("condi_damage", F.col("dpsAll")[0].condiDamage)  # Daño por condiciones (condi)
        .withColumn("dps", F.round(F.col("dpsAll")[0].dps, 1))  # Daño por segundo
        .withColumn("target_damage", F.col("dpsTargets")[0].damage[0])  # Daño al target principal
        
        # === SURVIVAL (SUPERVIVENCIA) ===
        .withColumn("downs", F.col("defenses")[0].downCount)  # Número de veces derribado (downed)
        .withColumn("deaths", F.col("defenses")[0].deadCount)  # Número de muertes
        .withColumn("damage_taken", F.col("defenses")[0].damageTaken)  # Daño recibido
        
        # === CC (CROWD CONTROL) ===
        .withColumn("breakbar_damage", F.col("dpsAll")[0].actorBreakbarDamage)  # Daño a la barra de control
        .withColumn("cc_seconds", F.round(F.col("dpsAll")[0].actorBreakbarDamage / 150.0, 2))  # Segundos de CC aplicados (150 = 1 segundo)
        
        # === MÉTRICAS DERIVADAS ===
        # Porcentaje de daño que fue cleave (daño a múltiples enemigos vs target único)
        .withColumn("cleave_pct",
            F.round(((F.col("damage_dealt") - F.col("target_damage")) / F.col("damage_dealt")) * 100, 1))
        # Distribución de tipo de daño
        .withColumn("power_damage_pct",
            F.round((F.col("power_damage") / F.col("damage_dealt")) * 100, 1))
        .withColumn("condi_damage_pct",
            F.round((F.col("condi_damage") / F.col("damage_dealt")) * 100, 1))
        # Ratio de supervivencia (daño infligido vs daño recibido)
        .withColumn("survival_ratio",
            F.round(F.col("damage_dealt") / F.col("damage_taken"), 2))
        
        # === CLASIFICACIONES AUTOMÁTICAS ===
        # Determina el rol principal del jugador basado en métricas de soporte y daño
        .withColumn("primary_role",
            F.when(F.col("stability_generation") > 10, "Stability Support")  # Alta generación de Stability
            .when(F.col("resistance_generation") > 10, "Condi Support")  # Alta generación de Resistance
            .when(F.col("quickness_generation") > 20, "Quickness Support")  # Alta generación de Quickness
            .when(F.col("might_generation") > 15, "Might Support")  # Alta generación de Might
            .when(F.col("cleanses_per_minute") >= 15, "Elite Cleanser")  # Alta tasa de cleanses
            .when(F.col("cleave_pct") > 50, "Cleave DPS")  # Mayor parte del daño es cleave
            .when(F.col("cc_seconds") >= 8, "CC Specialist")  # Alto control de multitudes
            .otherwise("DPS"))  # Por defecto: rol de daño
        
        # Clasificación del tipo de build según distribución de daño
        .withColumn("build_type",
            F.when(F.col("condi_damage_pct") > 70, "Condi")  # Build enfocado en daño por condiciones
            .when(F.col("power_damage_pct") > 70, "Power")  # Build enfocado en daño directo
            .otherwise("Hybrid"))  # Build mixto
        
        # Clasificación de supervivencia basada en número de muertes
        .withColumn("survivability_tier",
            F.when(F.col("deaths") < 0.5, "Elite Survivor")  # Casi nunca muere
            .when(F.col("deaths") < 1.0, "Strong Survivor")  # Muere raramente
            .when(F.col("deaths") < 2.0, "Average")  # Supervivencia promedio
            .otherwise("High Risk"))  # Muere frecuentemente
        
        # === METADATA ===
        .withColumn("processed_at", F.current_timestamp())  # Timestamp de procesamiento
        
        # === SELECCIÓN FINAL DE COLUMNAS ===
        # Ordena y selecciona solo las columnas relevantes para la tabla final
        .select(
            # Identificadores y contexto
            "encounter_id", "encounter_date", "encounter_time", "encounter_duration_minutes",
            "player_account", "player_name", "profession", "squad_group",
            # Boons
            "stability_uptime", "stability_generation", "resistance_uptime", "resistance_generation",
            "aegis_uptime", "aegis_generation", "quickness_uptime", "quickness_generation",
            "might_uptime", "might_generation", 
            # Cleanses
            "conditions_cleansed", "cleanses_per_minute", "damage_prevented", 
            # Damage
            "damage_dealt", "power_damage", "condi_damage", "dps",
            "target_damage", "cleave_pct", "power_damage_pct", "condi_damage_pct",
            # Survival
            "downs", "deaths", "damage_taken", "survival_ratio",
            # CC
            "breakbar_damage", "cc_seconds",
            # Clasificaciones
            "primary_role", "build_type", "survivability_tier", 
            # Metadata
            "processed_at"
        )
    )