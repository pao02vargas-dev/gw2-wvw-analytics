# =============================================================================
# GOLD LAYER - WvW Analytics
# =============================================================================
# Crea agregaciones pre-calculadas optimizadas para consumo analítico
# y dashboards desde la tabla Silver granular
# =============================================================================

import dlt
from pyspark.sql import functions as F

# =============================================================================
# GOLD TABLE 1: wvw_player_stats_daily
# Agregación diaria por jugador
# =============================================================================

@dlt.table(
    name="wvw_player_stats_daily",
    comment="Estadísticas diarias agregadas por jugador",
    table_properties={
        "quality": "gold",
        "pipelines.autoOptimize.managed": "true"
    }
)
def wvw_player_stats_daily():
    """
    Agregación diaria por jugador.
    Granularidad: Una fila por jugador por día
    """
    silver_df = dlt.read("wvw_player_encounters")
    
    return (
        silver_df
        .groupBy("encounter_date", "player_name", "profession")
        .agg(
            F.max("squad_group").alias("squad_group"),
            F.max("primary_role").alias("primary_role"),
            F.max("build_type").alias("build_type"),
            
            # Encounter count
            F.countDistinct("encounter_id").alias("total_encounters"),
            
            # Damage metrics
            F.round(F.avg("dps"), 0).alias("avg_dps"),
            F.round(F.sum("damage_dealt"), 0).alias("total_damage_dealt"),
            F.round(F.avg("damage_dealt"), 0).alias("avg_damage_per_encounter"),
            F.round(F.avg("power_damage_pct"), 1).alias("avg_power_damage_pct"),
            F.round(F.avg("condi_damage_pct"), 1).alias("avg_condi_damage_pct"),
            F.round(F.avg("cleave_pct"), 1).alias("avg_cleave_pct"),
            
            # Survival metrics
            F.round(F.avg("deaths"), 2).alias("avg_deaths_per_encounter"),
            F.round(F.sum("deaths"), 0).alias("total_deaths"),
            F.round(F.avg("downs"), 2).alias("avg_downs_per_encounter"),
            F.round(F.avg("survival_ratio"), 2).alias("avg_survival_ratio"),
            F.round(F.avg("damage_taken"), 0).alias("avg_damage_taken"),
            F.round(F.sum("damage_taken"), 0).alias("total_damage_taken"),
            F.round(F.avg("damage_prevented"), 0).alias("avg_damage_prevented"),
            
            # Boon uptimes
            F.round(F.avg("stability_uptime"), 1).alias("avg_stability_uptime"),
            F.round(F.avg("resistance_uptime"), 1).alias("avg_resistance_uptime"),
            F.round(F.avg("aegis_uptime"), 1).alias("avg_aegis_uptime"),
            F.round(F.avg("quickness_uptime"), 1).alias("avg_quickness_uptime"),
            F.round(F.avg("might_uptime"), 1).alias("avg_might_uptime"),
            
            # Boon generation
            F.round(F.avg("stability_generation"), 1).alias("avg_stability_generation"),
            F.round(F.avg("resistance_generation"), 1).alias("avg_resistance_generation"),
            F.round(F.avg("quickness_generation"), 1).alias("avg_quickness_generation"),
            F.round(F.avg("might_generation"), 1).alias("avg_might_generation"),
            
            # Cleanse metrics
            F.round(F.avg("cleanses_per_minute"), 1).alias("avg_cleanses_per_minute"),
            F.round(F.sum("conditions_cleansed"), 0).alias("total_conditions_cleansed"),
            F.round(F.avg("conditions_cleansed"), 1).alias("avg_conditions_cleansed"),
            
            # CC metrics
            F.round(F.avg("cc_seconds"), 2).alias("avg_cc_seconds_per_encounter"),
            F.round(F.sum("cc_seconds"), 1).alias("total_cc_seconds")
        )
        .withColumn("damage_efficiency",
            F.round(F.col("avg_damage_per_encounter") / F.col("avg_damage_taken"), 2))
        .withColumn("performance_tier",
            F.when((F.col("avg_dps") >= 15000) & (F.col("avg_deaths_per_encounter") < 0.5), "Elite")
            .when((F.col("avg_dps") >= 12000) & (F.col("avg_deaths_per_encounter") < 1.0), "Advanced")
            .when((F.col("avg_dps") >= 8000) & (F.col("avg_deaths_per_encounter") < 1.5), "Intermediate")
            .otherwise("Beginner"))
        .withColumn("survivability_tier",
            F.when(F.col("avg_deaths_per_encounter") < 0.5, "Excellent")
            .when(F.col("avg_deaths_per_encounter") < 1.0, "Good")
            .when(F.col("avg_deaths_per_encounter") < 1.5, "Fair")
            .otherwise("Needs Improvement"))
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
    Optimizado para leaderboards y rankings.
    Granularidad: Una fila por jugador
    """
    silver_df = dlt.read("wvw_player_encounters")
    
    # Filtrar últimos 30 días
    thirty_days_ago = F.date_sub(F.current_date(), 30)
    
    return (
        silver_df
        .filter(F.col("encounter_date") >= thirty_days_ago)
        .groupBy("player_name", "profession")
        .agg(
            F.max("squad_group").alias("squad_group"),
            F.max("primary_role").alias("primary_role"),
            F.max("build_type").alias("build_type"),
            
            # Time window
            F.min("encounter_date").alias("first_encounter_date"),
            F.max("encounter_date").alias("last_encounter_date"),
            F.datediff(F.max("encounter_date"), F.min("encounter_date")).alias("days_active"),
            
            # Counts
            F.countDistinct("encounter_id").alias("total_encounters"),
            
            # Damage
            F.round(F.avg("dps"), 0).alias("avg_dps"),
            F.round(F.sum("damage_dealt"), 0).alias("total_damage_dealt"),
            
            # Survival
            F.round(F.avg("deaths"), 2).alias("avg_deaths_per_encounter"),
            F.round(F.avg("survival_ratio"), 2).alias("avg_survival_ratio"),
            
            # Boons
            F.round(F.avg("stability_uptime"), 1).alias("avg_stability_uptime"),
            F.round(F.avg("quickness_uptime"), 1).alias("avg_quickness_uptime"),
            
            # Cleanses & CC
            F.round(F.avg("cleanses_per_minute"), 1).alias("avg_cleanses_per_minute"),
            F.round(F.avg("cc_seconds"), 2).alias("avg_cc_seconds")
        )
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
    Permite analizar meta, balance y efectividad de cada clase.
    Granularidad: Una fila por profesión por día
    """
    silver_df = dlt.read("wvw_player_encounters")
    
    return (
        silver_df
        .groupBy("encounter_date", "profession")
        .agg(
            # Counts
            F.countDistinct("player_name").alias("unique_players"),
            F.countDistinct("encounter_id").alias("total_encounters"),
            
            # Damage
            F.round(F.avg("dps"), 0).alias("avg_dps"),
            F.round(F.avg("damage_dealt"), 0).alias("avg_damage_dealt"),
            F.round(F.avg("power_damage_pct"), 1).alias("avg_power_pct"),
            F.round(F.avg("condi_damage_pct"), 1).alias("avg_condi_pct"),
            
            # Survival
            F.round(F.avg("deaths"), 2).alias("avg_deaths"),
            F.round(F.avg("survival_ratio"), 2).alias("avg_survival_ratio"),
            
            # Boons
            F.round(F.avg("stability_uptime"), 1).alias("avg_stability_uptime"),
            F.round(F.avg("might_uptime"), 1).alias("avg_might_uptime"),
            
            # Support
            F.round(F.avg("cleanses_per_minute"), 1).alias("avg_cleanses_per_minute"),
            F.round(F.avg("cc_seconds"), 2).alias("avg_cc_seconds")
        )
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
    Analiza composición, balance y performance de cada grupo.
    Granularidad: Una fila por grupo por día
    """
    silver_df = dlt.read("wvw_player_encounters")
    
    return (
        silver_df
        .groupBy("encounter_date", "squad_group")
        .agg(
            # Squad size
            F.countDistinct("player_name").alias("squad_size"),
            F.countDistinct("encounter_id").alias("total_encounters"),
            
            # Composition
            F.countDistinct(F.when(F.col("primary_role").contains("Support"), F.col("player_name"))).alias("support_count"),
            F.countDistinct(F.when(F.col("primary_role") == "DPS", F.col("player_name"))).alias("dps_count"),
            F.countDistinct(F.when(F.col("primary_role").contains("Cleanser"), F.col("player_name"))).alias("cleanser_count"),
            
            # Performance
            F.round(F.avg("dps"), 0).alias("avg_dps"),
            F.round(F.sum("damage_dealt"), 0).alias("total_squad_damage"),
            F.round(F.avg("deaths"), 2).alias("avg_deaths"),
            
            # Boons
            F.round(F.avg("stability_uptime"), 1).alias("avg_stability_uptime"),
            F.round(F.avg("quickness_uptime"), 1).alias("avg_quickness_uptime"),
            
            # Support
            F.round(F.avg("cleanses_per_minute"), 1).alias("avg_cleanses_per_minute")
        )
        .withColumn("support_ratio",
            F.round(F.col("support_count") / F.col("squad_size"), 2))
        .withColumn("squad_balance",
            F.when((F.col("support_ratio") >= 0.3) & (F.col("support_ratio") <= 0.5), "Balanced")
            .when(F.col("support_ratio") < 0.3, "DPS Heavy")
            .otherwise("Support Heavy"))
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
    Permite analizar la dificultad y performance del grupo completo.
    Granularidad: Una fila por encounter
    """
    silver_df = dlt.read("wvw_player_encounters")
    
    return (
        silver_df
        .groupBy("encounter_id", "encounter_date", "encounter_time", "encounter_duration_minutes")
        .agg(
            # Squad composition
            F.count("player_name").alias("total_players"),
            F.countDistinct("profession").alias("unique_professions"),
            
            # Group performance
            F.round(F.avg("dps"), 0).alias("avg_dps"),
            F.round(F.sum("damage_dealt"), 0).alias("total_group_damage"),
            F.round(F.avg("deaths"), 2).alias("avg_deaths"),
            F.round(F.sum("deaths"), 0).alias("total_deaths"),
            
            # Group support
            F.round(F.avg("stability_uptime"), 1).alias("avg_stability_uptime"),
            F.round(F.avg("quickness_uptime"), 1).alias("avg_quickness_uptime"),
            F.round(F.avg("cleanses_per_minute"), 1).alias("avg_cleanses_per_minute")
        )
        .withColumn("encounter_difficulty",
            F.when((F.col("avg_deaths") < 0.5) & (F.col("avg_dps") > 12000), "Easy")
            .when((F.col("avg_deaths") < 1.0) & (F.col("avg_dps") > 10000), "Medium")
            .when(F.col("avg_deaths") < 2.0, "Hard")
            .otherwise("Very Hard"))
        .withColumn("group_coordination",
            F.when((F.col("avg_stability_uptime") > 60) & (F.col("avg_quickness_uptime") > 80), "Excellent")
            .when((F.col("avg_stability_uptime") > 40) & (F.col("avg_quickness_uptime") > 60), "Good")
            .otherwise("Needs Work"))
        .orderBy(F.desc("encounter_date"), F.desc("encounter_time"))
    )
