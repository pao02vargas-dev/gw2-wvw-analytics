# =============================================================================
# SILVER LAYER - WvW Analytics  
# =============================================================================
# Transforma datos crudos de combates WvW de la capa Bronze en métricas
# consolidadas de rendimiento para evaluar la efectividad del grupo
# =============================================================================

import dlt
from pyspark.sql import functions as F

@dlt.table(
    name="wvw_player_encounters",
    comment="Métricas de rendimiento por jugador por encuentro (granular)",
    table_properties={
        "quality": "silver",
        "pipelines.autoOptimize.managed": "true"
    }
)
@dlt.expect_or_drop("valid_encounter_id", "encounter_id IS NOT NULL")
@dlt.expect_or_drop("valid_player", "player_name IS NOT NULL")
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
    
    # Leer datos de Bronze y explotar jugadores
    bronze_df = dlt.read("wvw_kills_raw")
    
    return (
        bronze_df
        .withColumn("encounter_date", F.to_date("timeStartStd"))
        .withColumn("encounter_time", F.to_timestamp("timeStartStd"))
        .withColumn("encounter_duration_minutes", F.col("durationMS") / 1000.0 / 60.0)
        .withColumn("encounter_duration_seconds", F.col("durationMS") / 1000.0)
        .withColumn("player", F.explode("players"))
        .selectExpr(
            "eiLogID AS encounter_id",
            "encounter_date",
            "encounter_time",
            "encounter_duration_minutes",
            "player.account AS player_account",
            "player.name AS player_name",
            "player.profession AS profession",
            "player.group AS squad_group",
            "player.buffUptimes AS buffUptimes",
            "player.defenses AS defenses",
            "player.dpsAll AS dpsAll",
            "player.dpsTargets AS dpsTargets",
            "encounter_duration_seconds"
        )
        # Boons
        .withColumn("stability_uptime", 
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 1122)[0].buffData[0].uptime"), F.lit(0.0)), 2))
        .withColumn("stability_generation",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 1122)[0].buffData[0].presence"), F.lit(0.0)), 2))
        .withColumn("resistance_uptime",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 26980)[0].buffData[0].uptime"), F.lit(0.0)), 2))
        .withColumn("resistance_generation",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 26980)[0].buffData[0].presence"), F.lit(0.0)), 2))
        .withColumn("aegis_uptime",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 743)[0].buffData[0].uptime"), F.lit(0.0)), 2))
        .withColumn("aegis_generation",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 743)[0].buffData[0].presence"), F.lit(0.0)), 2))
        .withColumn("quickness_uptime",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 1187)[0].buffData[0].uptime"), F.lit(0.0)), 2))
        .withColumn("quickness_generation",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 1187)[0].buffData[0].presence"), F.lit(0.0)), 2))
        .withColumn("might_uptime",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 740)[0].buffData[0].uptime"), F.lit(0.0)), 2))
        .withColumn("might_generation",
            F.round(F.coalesce(F.expr("filter(buffUptimes, x -> x.id = 740)[0].buffData[0].presence"), F.lit(0.0)), 2))
        # Cleanses
        .withColumn("conditions_cleansed", F.col("defenses")[0].conditionCleanses)
        .withColumn("cleanses_per_minute",
            F.round((F.col("defenses")[0].conditionCleanses / F.col("encounter_duration_seconds")) * 60, 2))
        .withColumn("damage_prevented",
            F.round((F.col("defenses")[0].conditionCleansesTime / 1000.0) * 500, 0))
        # Damage
        .withColumn("damage_dealt", F.col("dpsAll")[0].damage)
        .withColumn("power_damage", F.col("dpsAll")[0].powerDamage)
        .withColumn("condi_damage", F.col("dpsAll")[0].condiDamage)
        .withColumn("dps", F.round(F.col("dpsAll")[0].dps, 1))
        .withColumn("target_damage", F.col("dpsTargets")[0].damage[0])
        # Survival
        .withColumn("downs", F.col("defenses")[0].downCount)
        .withColumn("deaths", F.col("defenses")[0].deadCount)
        .withColumn("damage_taken", F.col("defenses")[0].damageTaken)
        # CC
        .withColumn("breakbar_damage", F.col("dpsAll")[0].actorBreakbarDamage)
        .withColumn("cc_seconds", F.round(F.col("dpsAll")[0].actorBreakbarDamage / 150.0, 2))
        # Métricas derivadas
        .withColumn("cleave_pct",
            F.round(((F.col("damage_dealt") - F.col("target_damage")) / F.col("damage_dealt")) * 100, 1))
        .withColumn("power_damage_pct",
            F.round((F.col("power_damage") / F.col("damage_dealt")) * 100, 1))
        .withColumn("condi_damage_pct",
            F.round((F.col("condi_damage") / F.col("damage_dealt")) * 100, 1))
        .withColumn("survival_ratio",
            F.round(F.col("damage_dealt") / F.col("damage_taken"), 2))
        # Clasificaciones
        .withColumn("primary_role",
            F.when(F.col("stability_generation") > 10, "Stability Support")
            .when(F.col("resistance_generation") > 10, "Condi Support")
            .when(F.col("quickness_generation") > 20, "Quickness Support")
            .when(F.col("might_generation") > 15, "Might Support")
            .when(F.col("cleanses_per_minute") >= 15, "Elite Cleanser")
            .when(F.col("cleave_pct") > 50, "Cleave DPS")
            .when(F.col("cc_seconds") >= 8, "CC Specialist")
            .otherwise("DPS"))
        .withColumn("build_type",
            F.when(F.col("condi_damage_pct") > 70, "Condi")
            .when(F.col("power_damage_pct") > 70, "Power")
            .otherwise("Hybrid"))
        .withColumn("survivability_tier",
            F.when(F.col("deaths") < 0.5, "Elite Survivor")
            .when(F.col("deaths") < 1.0, "Strong Survivor")
            .when(F.col("deaths") < 2.0, "Average")
            .otherwise("High Risk"))
        .withColumn("processed_at", F.current_timestamp())
        .select(
            "encounter_id", "encounter_date", "encounter_time", "encounter_duration_minutes",
            "player_account", "player_name", "profession", "squad_group",
            "stability_uptime", "stability_generation", "resistance_uptime", "resistance_generation",
            "aegis_uptime", "aegis_generation", "quickness_uptime", "quickness_generation",
            "might_uptime", "might_generation", "conditions_cleansed", "cleanses_per_minute",
            "damage_prevented", "damage_dealt", "power_damage", "condi_damage", "dps",
            "target_damage", "cleave_pct", "power_damage_pct", "condi_damage_pct",
            "downs", "deaths", "damage_taken", "survival_ratio",
            "breakbar_damage", "cc_seconds",
            "primary_role", "build_type", "survivability_tier", "processed_at"
        )
    )
