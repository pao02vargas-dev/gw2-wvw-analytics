// ============================================================================
// ENHANCED WVW ANALYTICS DASHBOARD - Inspired by reference HTML
// Features: Pills, Progress Bars, Rankings, Better Visuals
// ============================================================================

let globalData = {
    encounters: [],
    daily: [],
    summary: [],
    professions: [],
    squad: []
};

// ============================================================================
// UTILITY FUNCTIONS - Visual Elements
// ============================================================================

function crearPill(valor, tipo = 'dps') {
    let clase = 'stat-pill';
    let colorStyle = '';
    
    if (tipo === 'dps') {
        if (valor >= 1000) {
            clase += ' high';
            colorStyle = 'background: linear-gradient(135deg, rgba(76, 175, 80, 0.4), rgba(139, 195, 74, 0.3)); color: #8BC34A; border-color: rgba(76, 175, 80, 0.5);';
        } else if (valor >= 500) {
            clase += ' medium';
            colorStyle = 'background: linear-gradient(135deg, rgba(255, 193, 7, 0.4), rgba(255, 152, 0, 0.3)); color: #FFC107; border-color: rgba(255, 193, 7, 0.5);';
        } else {
            clase += ' low';
            colorStyle = 'background: linear-gradient(135deg, rgba(244, 67, 54, 0.4), rgba(229, 57, 53, 0.3)); color: #EF5350; border-color: rgba(244, 67, 54, 0.5);';
        }
    }
    
    return `<span class="${clase}" style="${colorStyle} display: inline-block; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; border: 1px solid; text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);">${Math.round(valor)}</span>`;
}

function crearProgressBar(valor, label = '') {
    const porcentaje = Math.min(Math.max(valor, 0), 100);
    return `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span style="font-size: 0.85rem; min-width: 60px;">${label || Math.round(valor) + '%'}</span>
            <div style="flex: 1; height: 8px; background: rgba(0,0,0,0.4); border-radius: 10px; overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.2);">
                <div style="width: ${porcentaje}%; height: 100%; background: linear-gradient(90deg, #D4AF37, #FFA500); border-radius: 10px; transition: width 1s ease-out; box-shadow: 0 0 15px rgba(212, 175, 55, 0.8);"></div>
            </div>
        </div>
    `;
}

function formatearNombreJugador(nombre, profesion) {
    return `<strong style="color: #FFA500;">${nombre}</strong><br/><small style="color: #94a3b8;">${profesion}</small>`;
}

// ============================================================================
// TAB SWITCHING
// ============================================================================

function switchTab(evt, tabId) {
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
}

function switchSubTab(evt, subTabId) {
    document.querySelectorAll(".subtab-content").forEach(c => { c.style.display = "none"; c.classList.remove("active"); });
    document.querySelectorAll(".sub-tab-btn").forEach(b => b.classList.remove("active"));
    const activeTab = document.getElementById(subTabId);
    if (activeTab) { activeTab.style.display = "block"; activeTab.classList.add("active"); }
    evt.currentTarget.classList.add("active");
}

// ============================================================================
// DATA LOADING
// ============================================================================

document.addEventListener("DOMContentLoaded", async () => {
    await cargarTodosLosDatos();
    const encounterSelect = document.getElementById("encounterSelect");
    const playerSearch = document.getElementById("playerSearch");
    if (encounterSelect) encounterSelect.addEventListener("change", actualizarFiltrosVista);
    if (playerSearch) playerSearch.addEventListener("input", actualizarFiltrosVista);
});

async function cargarTodosLosDatos() {
    globalData.encounters = await obtenerDatosJson("wvw_encounter_summary.json");
    globalData.daily = await obtenerDatosJson("wvw_player_stats_daily.json");
    globalData.summary = await obtenerDatosJson("wvw_player_stats_summary.json");
    globalData.professions = await obtenerDatosJson("wvw_profession_performance.json");
    globalData.squad = await obtenerDatosJson("wvw_squad_composition.json");
    poblarSelectorEncuentros();
    actualizarFiltrosVista();
}

async function obtenerDatosJson(nombreArchivo) {
    try {
        console.log(`📚 Intentando cargar: data/${nombreArchivo}`);
        const response = await fetch(`data/${nombreArchivo}`);
        if (!response.ok) {
            console.error(`❌ Error ${response.status}: data/${nombreArchivo}`);
            return [];
        }
        const data = await response.json();
        console.log(`✅ Cargado ${nombreArchivo}: ${Array.isArray(data) ? data.length : 1} registros`);
        return Array.isArray(data) ? data : [data];
    } catch (e) {
        console.error(`❌ No se pudo cargar data/${nombreArchivo}:`, e);
        return [];
    }
}

function poblarSelectorEncuentros() {
    const select = document.getElementById("encounterSelect");
    if (!select) return;
    select.innerHTML = '<option value="all">Todos los encuentros</option>';
    globalData.encounters.forEach((enc, index) => {
        const opt = document.createElement("option");
        opt.value = enc.encounter_id || index;
        opt.textContent = `Encuentro #${enc.encounter_id || index} - ${enc.encounter_date || 'Fecha N/A'}`;
        select.appendChild(opt);
    });
}

// ============================================================================
// FILTERING & RENDERING
// ============================================================================

function actualizarFiltrosVista() {
    const encounterSelect = document.getElementById("encounterSelect");
    const playerSearch = document.getElementById("playerSearch");
    const selectedEncounter = encounterSelect ? encounterSelect.value : "all";
    const searchFilter = playerSearch ? playerSearch.value.toLowerCase() : "";

    let selectedDate = null;
    if (selectedEncounter !== "all") {
        const encounter = globalData.encounters.find(e => String(e.encounter_id) === String(selectedEncounter));
        selectedDate = encounter ? encounter.encounter_date : null;
    }

    let filteredDaily = globalData.daily.filter(row => {
        const matchEnc = selectedEncounter === "all" || (selectedDate && row.encounter_date === selectedDate);
        const matchSearch = !searchFilter || Object.values(row).some(val => String(val).toLowerCase().includes(searchFilter));
        return matchEnc && matchSearch;
    });
    
    let filteredProfessions = globalData.professions.filter(row => {
        const matchEnc = selectedEncounter === "all" || (selectedDate && row.encounter_date === selectedDate);
        return matchEnc;
    });
    
    let filteredSquad = globalData.squad.filter(row => {
        const matchEnc = selectedEncounter === "all" || (selectedDate && row.encounter_date === selectedDate);
        return matchEnc;
    });

    // RENDER - Overview Tab
    renderPlayerRanking(filteredDaily, "container-encounter-overview", "🏆 Top 10 Jugadores por DPS", 10);
    renderSquadComposition(filteredSquad, "container-squad-analysis");
    
    // RENDER - Combat Tab
    renderPlayerCombatStats(filteredDaily, "container-combat-stats");
    
    // RENDER - Support Tab
    renderSupportStats(filteredDaily, "container-support-stats");
    
    // RENDER - Defense Tab
    renderDefenseStats(filteredDaily, "container-defense-stats");
    
    // RENDER - Performance Tab (detailed table)
    renderPlayerPerformanceDetailed(filteredDaily, "container-player-performance");
    renderPlayerSummary(globalData.summary, "container-player-summary");
    renderProfessionPerformance(filteredProfessions, "container-profession-stats");
}

// ============================================================================
// SPECIALIZED RENDER FUNCTIONS
// ============================================================================

function renderPlayerRanking(rows, containerId, titulo, limit = 10) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!rows || rows.length === 0) {
        container.innerHTML = `<div class="glass-card"><h3 class="card-title">${titulo}</h3><p style="color: #94a3b8;">No hay datos disponibles.</p></div>`;
        return;
    }
    
    const topPlayers = [...rows].sort((a, b) => (b.avg_dps || 0) - (a.avg_dps || 0)).slice(0, limit);
    
    let html = `
        <div class="glass-card">
            <h3 class="card-title">${titulo}</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Jugador</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Squad</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">DPS</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Power %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Condi %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Deaths</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    topPlayers.forEach(player => {
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1); transition: all 0.2s ease;">
                <td style="padding: 0.75rem;">${formatearNombreJugador(player.player_name, player.profession)}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${player.squad_group || 'N/A'}</td>
                <td style="padding: 0.75rem;">${crearPill(player.avg_dps || 0, 'dps')}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${Math.round(player.avg_power_damage_pct || 0)}%</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${Math.round(player.avg_condi_damage_pct || 0)}%</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.avg_deaths_per_encounter || 0).toFixed(1)}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderSquadComposition(rows, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!rows || rows.length === 0) {
        container.innerHTML = `<div class="glass-card"><h3 class="card-title">📊 Composición de Squad</h3><p style="color: #94a3b8;">No hay datos disponibles.</p></div>`;
        return;
    }
    
    let html = `
        <div class="glass-card">
            <h3 class="card-title">📊 Composición de Squad</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Squad</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Size</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Support</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">DPS</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Balance</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Avg DPS</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    rows.forEach(squad => {
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1);">
                <td style="padding: 0.75rem; color: #FFA500; font-weight: bold;">Group ${squad.squad_group}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${squad.squad_size}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${squad.support_count}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${squad.dps_count}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${squad.squad_balance}</td>
                <td style="padding: 0.75rem;">${crearPill(squad.avg_dps || 0, 'dps')}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderProfessionPerformance(rows, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!rows || rows.length === 0) {
        container.innerHTML = `<div class="glass-card"><h3 class="card-title">🎭 Rendimiento por Profesión</h3><p style="color: #94a3b8;">No hay datos disponibles.</p></div>`;
        return;
    }
    
    const sorted = [...rows].sort((a, b) => (b.avg_dps || 0) - (a.avg_dps || 0));
    
    let html = `
        <div class="glass-card">
            <h3 class="card-title">🎭 Rendimiento por Profesión</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Profesión</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Players</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Avg DPS</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Stability %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Cleanses/min</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    sorted.forEach(prof => {
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1);">
                <td style="padding: 0.75rem; color: #FFA500; font-weight: bold;">${prof.profession}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${prof.unique_players}</td>
                <td style="padding: 0.75rem;">${crearPill(prof.avg_dps || 0, 'dps')}</td>
                <td style="padding: 0.75rem;">
                    ${crearProgressBar(prof.avg_stability_uptime || 0)}
                </td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(prof.avg_cleanses_per_minute || 0).toFixed(1)}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderPlayerCombatStats(rows, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!rows || rows.length === 0) {
        container.innerHTML = `<div class="glass-card"><h3 class="card-title">⚔️ Estadísticas de Combate</h3><p style="color: #94a3b8;">No hay datos disponibles.</p></div>`;
        return;
    }
    
    const topDPS = [...rows].sort((a, b) => (b.avg_dps || 0) - (a.avg_dps || 0)).slice(0, 15);
    
    let html = `
        <div class="glass-card">
            <h3 class="card-title">⚔️ Top 15 DPS - Estadísticas de Combate</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Jugador</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">DPS</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Damage Dealt</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Power %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Condi %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">CC (sec)</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    topDPS.forEach(player => {
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1);">
                <td style="padding: 0.75rem;">${formatearNombreJugador(player.player_name, player.profession)}</td>
                <td style="padding: 0.75rem;">${crearPill(player.avg_dps || 0, 'dps')}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.total_damage_dealt || 0).toLocaleString()}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${Math.round(player.avg_power_damage_pct || 0)}%</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${Math.round(player.avg_condi_damage_pct || 0)}%</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.avg_cc_seconds_per_encounter || 0).toFixed(1)}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderSupportStats(rows, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!rows || rows.length === 0) {
        container.innerHTML = `<div class="glass-card"><h3 class="card-title">💚 Estadísticas de Support</h3><p style="color: #94a3b8;">No hay datos disponibles.</p></div>`;
        return;
    }
    
    const topSupport = [...rows].sort((a, b) => (b.avg_cleanses_per_minute || 0) - (a.avg_cleanses_per_minute || 0)).slice(0, 15);
    
    let html = `
        <div class="glass-card">
            <h3 class="card-title">💚 Top 15 Support - Cleanses & Boons</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Jugador</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Cleanses/min</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Stability %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Quickness %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Might %</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    topSupport.forEach(player => {
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1);">
                <td style="padding: 0.75rem;">${formatearNombreJugador(player.player_name, player.profession)}</td>
                <td style="padding: 0.75rem; color: #8BC34A; font-weight: bold;">${(player.avg_cleanses_per_minute || 0).toFixed(1)}</td>
                <td style="padding: 0.75rem;">${crearProgressBar(player.avg_stability_uptime || 0)}</td>
                <td style="padding: 0.75rem;">${crearProgressBar(player.avg_quickness_uptime || 0)}</td>
                <td style="padding: 0.75rem;">${crearProgressBar(player.avg_might_uptime || 0)}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderDefenseStats(rows, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!rows || rows.length === 0) {
        container.innerHTML = `<div class="glass-card"><h3 class="card-title">🛡️ Estadísticas Defensivas</h3><p style="color: #94a3b8;">No hay datos disponibles.</p></div>`;
        return;
    }
    
    const bestSurvival = [...rows].sort((a, b) => (b.avg_survival_ratio || 0) - (a.avg_survival_ratio || 0)).slice(0, 15);
    
    let html = `
        <div class="glass-card">
            <h3 class="card-title">🛡️ Top 15 Supervivencia</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Jugador</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Deaths</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Survival Ratio</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Damage Taken</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Tier</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    bestSurvival.forEach(player => {
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1);">
                <td style="padding: 0.75rem;">${formatearNombreJugador(player.player_name, player.profession)}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.avg_deaths_per_encounter || 0).toFixed(1)}</td>
                <td style="padding: 0.75rem; color: #8BC34A; font-weight: bold;">${(player.avg_survival_ratio || 0).toFixed(2)}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.avg_damage_taken || 0).toLocaleString()}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${player.survivability_tier || 'N/A'}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div>`;
    container.innerHTML = html;
}

function renderPlayerPerformanceDetailed(rows, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!rows || rows.length === 0) {
        container.innerHTML = `<div class="glass-card"><h3 class="card-title">🏆 Rendimiento Detallado</h3><p style="color: #94a3b8;">No hay datos disponibles.</p></div>`;
        return;
    }
    
    let html = `
        <div class="glass-card">
            <h3 class="card-title">🏆 Rendimiento Detallado por Jugador [${rows.length} jugadores]</h3>
            <div style="max-height: 700px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="position: sticky; top: 0; background: rgba(15, 23, 42, 0.95); z-index: 1;">
                        <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Jugador</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Squad</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Role</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">DPS</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Deaths</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Cleanses/min</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Tier</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    rows.forEach(player => {
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1);">
                <td style="padding: 0.75rem;">${formatearNombreJugador(player.player_name, player.profession)}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${player.squad_group || 'N/A'}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${player.primary_role || 'N/A'}</td>
                <td style="padding: 0.75rem;">${crearPill(player.avg_dps || 0, 'dps')}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.avg_deaths_per_encounter || 0).toFixed(1)}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.avg_cleanses_per_minute || 0).toFixed(1)}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${player.performance_tier || 'N/A'}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

function renderPlayerSummary(rows, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!rows || rows.length === 0) {
        container.innerHTML = `<div class="glass-card"><h3 class="card-title">👤 Resumen Histórico</h3><p style="color: #94a3b8;">No hay datos disponibles.</p></div>`;
        return;
    }
    
    let html = `
        <div class="glass-card">
            <h3 class="card-title">👤 Resumen Histórico de Jugadores [${rows.length} jugadores]</h3>
            <div style="max-height: 700px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="position: sticky; top: 0; background: rgba(15, 23, 42, 0.95); z-index: 1;">
                        <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Jugador</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Encounters</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Avg DPS</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Avg Deaths</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Survival Ratio</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Cleanses/min</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    rows.forEach(player => {
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1);">
                <td style="padding: 0.75rem;">${formatearNombreJugador(player.player_name, player.profession)}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${player.total_encounters || 0}</td>
                <td style="padding: 0.75rem;">${crearPill(player.avg_dps || 0, 'dps')}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.avg_deaths_per_encounter || 0).toFixed(1)}</td>
                <td style="padding: 0.75rem; color: #8BC34A;">${(player.avg_survival_ratio || 0).toFixed(2)}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.avg_cleanses_per_minute || 0).toFixed(1)}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

// ============================================================================
// UPLOAD FORM
// ============================================================================

document.getElementById("uploadForm").addEventListener("submit", async function(e) {
    e.preventDefault();
    const fileInput = document.getElementById("logFile");
    const statusMessage = document.getElementById("statusMessage");
    const submitBtn = document.getElementById("submitBtn");

    if (fileInput.files.length === 0) {
        statusMessage.style.color = "#ff6b6b";
        statusMessage.textContent = "Por favor selecciona un archivo .zevtc";
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    statusMessage.style.color = "#fbbf24";
    statusMessage.textContent = "Procesando log y registrando en Capa Bronze...";
    submitBtn.disabled = true;

    try {
        const response = await fetch("http://127.0.0.1:8000/api/analyze", {
            method: "POST",
            body: formData
        });

        if (response.ok) {
            statusMessage.style.color = "#4ade80";
            statusMessage.textContent = "¡Éxito! Archivo procesado y registrado correctamente.";
            this.reset();
            await cargarTodosLosDatos();
        } else {
            statusMessage.style.color = "#ff6b6b";
            statusMessage.textContent = "Error al procesar el archivo en el servidor.";
        }
    } catch (error) {
        statusMessage.style.color = "#ff6b6b";
        statusMessage.textContent = "Aviso: No se pudo conectar con FastAPI local (Modo estático).";
        console.error("Error de red:", error);
    } finally {
        submitBtn.disabled = false;
    }
});
