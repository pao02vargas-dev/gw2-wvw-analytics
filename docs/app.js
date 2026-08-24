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

    console.log('🔍 Datos filtrados:', {
        daily: filteredDaily.length,
        professions: filteredProfessions.length,
        squad: filteredSquad.length,
        selectedEncounter,
        selectedDate
    });

    // RENDER - Overview Tab
    try {
        renderPlayerRanking(filteredDaily, "container-encounter-overview", "🏆 Top 10 Jugadores por DPS", 10);
        renderSquadComposition(filteredSquad, "container-squad-analysis");
        console.log('✅ Overview rendered');
    } catch (e) {
        console.error('❌ Error en Overview:', e);
    }
    
    // RENDER - Combat Tab
    try {
        renderPlayerCombatStats(filteredDaily, "container-combat-stats");
        console.log('✅ Combat rendered');
    } catch (e) {
        console.error('❌ Error en Combat:', e);
    }
    
    // RENDER - Support Tab
    try {
        renderSupportStats(filteredDaily, "container-support-stats");
        console.log('✅ Support rendered');
    } catch (e) {
        console.error('❌ Error en Support:', e);
    }
    
    // RENDER - Defense Tab
    try {
        renderDefenseStats(filteredDaily, "container-defense-stats");
        console.log('✅ Defense rendered');
    } catch (e) {
        console.error('❌ Error en Defense:', e);
    }
    
    // RENDER - Performance Tab (detailed table)
    try {
        renderPlayerPerformanceDetailed(filteredDaily, "container-player-performance");
        renderPlayerSummary(globalData.summary, "container-player-summary");
        renderProfessionPerformance(filteredProfessions, "container-profession-stats");
        console.log('✅ Performance rendered');
    } catch (e) {
        console.error('❌ Error en Performance:', e);
    }
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
    
    // Calcular métricas agregadas del squad
    const totalSquadDPS = rows.reduce((sum, p) => sum + (p.avg_dps || 0), 0);
    const avgPlayerDPS = totalSquadDPS / rows.length;
    const topPlayer = [...rows].sort((a, b) => (b.avg_dps || 0) - (a.avg_dps || 0))[0];
    const totalPowerDamage = rows.reduce((sum, p) => sum + (p.total_damage_dealt || 0) * (p.avg_power_damage_pct || 0) / 100, 0);
    const totalCondiDamage = rows.reduce((sum, p) => sum + (p.total_damage_dealt || 0) * (p.avg_condi_damage_pct || 0) / 100, 0);
    const totalDamage = totalPowerDamage + totalCondiDamage;
    const powerPct = totalDamage > 0 ? (totalPowerDamage / totalDamage * 100) : 0;
    const condiPct = totalDamage > 0 ? (totalCondiDamage / totalDamage * 100) : 0;
    
    const topDPS = [...rows].sort((a, b) => (b.avg_dps || 0) - (a.avg_dps || 0)).slice(0, 15);
    
    let html = `
        <!-- Tarjetas de Métricas de Combat -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div class="stat-card">
                <div class="stat-icon">⚔️</div>
                <div class="stat-label">TOTAL SQUAD DPS</div>
                <div class="stat-value">${Math.round(totalSquadDPS).toLocaleString()}</div>
                <div class="stat-sublabel">Combined damage output</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">💥</div>
                <div class="stat-label">AVERAGE PLAYER DPS</div>
                <div class="stat-value">${Math.round(avgPlayerDPS)}</div>
                <div class="stat-sublabel">Per player average</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🔥</div>
                <div class="stat-label">HIGHEST DPS</div>
                <div class="stat-value">${Math.round(topPlayer?.avg_dps || 0)} (${topPlayer?.player_name || 'N/A'})</div>
                <div class="stat-sublabel">Peak performer</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-label">POWER VS CONDI</div>
                <div class="stat-value">${powerPct.toFixed(1)}% / ${condiPct.toFixed(1)}%</div>
                <div class="stat-sublabel">Damage type distribution</div>
            </div>
        </div>
        
        <!-- Tabla de Top DPS Players -->
        <div class="glass-card">
            <h3 class="card-title">🔥 Top DPS Players</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Player</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Role</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">DPS</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Power %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Condi %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Cleave %</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    topDPS.forEach(player => {
        const role = determinarRol(player);
        const cleave = player.avg_cleave_pct || 100;
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1); cursor: pointer;" onclick="mostrarDetallesJugador('${player.player_name}', '${player.profession}')">
                <td style="padding: 0.75rem;">${formatearNombreJugador(player.player_name, player.profession)}</td>
                <td style="padding: 0.75rem;"><span class="role-badge ${role.toLowerCase().replace(' ', '-')}">${role}</span></td>
                <td style="padding: 0.75rem;">${crearPill(player.avg_dps || 0, 'dps')}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${Math.round(player.avg_power_damage_pct || 0)}%</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${Math.round(player.avg_condi_damage_pct || 0)}%</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${cleave.toFixed(1)}%</td>
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
    
    // Calcular métricas agregadas de support
    const avgMight = rows.reduce((sum, p) => sum + (p.avg_might_uptime || 0), 0) / rows.length;
    const avgQuickness = rows.reduce((sum, p) => sum + (p.avg_quickness_uptime || 0), 0) / rows.length;
    const avgStability = rows.reduce((sum, p) => sum + (p.avg_stability_uptime || 0), 0) / rows.length;
    const totalCleanses = rows.reduce((sum, p) => sum + (p.total_cleanses || 0), 0);
    
    const topSupport = [...rows].sort((a, b) => (b.avg_cleanses_per_minute || 0) - (a.avg_cleanses_per_minute || 0)).slice(0, 15);
    
    let html = `
        <!-- Tarjetas de Métricas de Support -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div class="stat-card">
                <div class="stat-icon">💚</div>
                <div class="stat-label">SQUAD MIGHT AVG</div>
                <div class="stat-value">${avgMight.toFixed(1)}%</div>
                <div class="stat-sublabel">Average might uptime</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⚡</div>
                <div class="stat-label">SQUAD QUICKNESS AVG</div>
                <div class="stat-value">${avgQuickness.toFixed(1)}%</div>
                <div class="stat-sublabel">Average quickness uptime</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🛡️</div>
                <div class="stat-label">SQUAD STABILITY AVG</div>
                <div class="stat-value">${avgStability.toFixed(1)}%</div>
                <div class="stat-sublabel">Average stability uptime</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🌸</div>
                <div class="stat-label">TOTAL CLEANSES</div>
                <div class="stat-value">${Math.round(totalCleanses)}</div>
                <div class="stat-sublabel">Conditions removed</div>
            </div>
        </div>
        
        <!-- Tabla de Top Support Players -->
        <div class="glass-card">
            <h3 class="card-title">💚 Top Support Players</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Player</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Role</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Might %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Quick %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Stab %</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Cleanses/min</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    topSupport.forEach(player => {
        const role = determinarRol(player);
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1); cursor: pointer;" onclick="mostrarDetallesJugador('${player.player_name}', '${player.profession}')">
                <td style="padding: 0.75rem;">${formatearNombreJugador(player.player_name, player.profession)}</td>
                <td style="padding: 0.75rem;"><span class="role-badge ${role.toLowerCase().replace(' ', '-')}">${role}</span></td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.avg_might_uptime || 0).toFixed(1)}%</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.avg_quickness_uptime || 0).toFixed(1)}%</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${(player.avg_stability_uptime || 0).toFixed(1)}%</td>
                <td style="padding: 0.75rem; color: #8BC34A; font-weight: bold;">${(player.avg_cleanses_per_minute || 0).toFixed(1)}</td>
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
    
    // Calcular métricas agregadas de defensa
    const totalDeaths = rows.reduce((sum, p) => sum + (p.avg_deaths_per_encounter || 0), 0);
    const avgSurvivalRatio = rows.reduce((sum, p) => sum + (p.avg_survival_ratio || 0), 0) / rows.length;
    const totalDamageTaken = rows.reduce((sum, p) => sum + (p.avg_damage_taken || 0), 0);
    const totalDamagePrevented = rows.reduce((sum, p) => sum + (p.avg_damage_prevented || 0), 0);
    
    const bestSurvival = [...rows].sort((a, b) => (b.avg_survival_ratio || 0) - (a.avg_survival_ratio || 0)).slice(0, 15);
    
    let html = `
        <!-- Tarjetas de Métricas de Defense -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div class="stat-card">
                <div class="stat-icon">❤️</div>
                <div class="stat-label">TOTAL DEATHS</div>
                <div class="stat-value">${Math.round(totalDeaths)}</div>
                <div class="stat-sublabel">Squad casualties</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🛡️</div>
                <div class="stat-label">AVG SURVIVAL RATE</div>
                <div class="stat-value">${avgSurvivalRatio.toFixed(2)}</div>
                <div class="stat-sublabel">Per player average</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⚔️</div>
                <div class="stat-label">DAMAGE TAKEN</div>
                <div class="stat-value">${Math.round(totalDamageTaken).toLocaleString()}</div>
                <div class="stat-sublabel">Total incoming damage</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✨</div>
                <div class="stat-label">DAMAGE PREVENTED</div>
                <div class="stat-value">${Math.round(totalDamagePrevented).toLocaleString()}</div>
                <div class="stat-sublabel">Mitigated damage</div>
            </div>
        </div>
        
        <!-- Tabla de Survivability Leaders -->
        <div class="glass-card">
            <h3 class="card-title">🛡️ Survivability Leaders</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Player</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Survival Rate</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Deaths</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Dmg Taken</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Dmg Prevented</th>
                        <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Tier</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    bestSurvival.forEach(player => {
        const safeName = (player.player_name || '').replace(/'/g, "\\'");
        const safeProfession = (player.profession || '').replace(/'/g, "\\'");
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1); cursor: pointer;" onclick="mostrarDetallesJugador('${safeName}', '${safeProfession}')">
                <td style="padding: 0.75rem;">${formatearNombreJugador(player.player_name, player.profession)}</td>
                <td style="padding: 0.75rem; color: #8BC34A; font-weight: bold;">${(player.avg_survival_ratio || 0).toFixed(2)}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${Math.round(player.avg_deaths_per_encounter || 0)}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${Math.round(player.avg_damage_taken || 0).toLocaleString()}</td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${Math.round(player.avg_damage_prevented || 0).toLocaleString()}</td>
                <td style="padding: 0.75rem;"><span class="tier-badge ${(player.survivability_tier || 'N/A').toLowerCase()}">${player.survivability_tier || 'N/A'}</span></td>
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
    
    // Calcular conteo de tiers de performance
    const expertCount = rows.filter(p => p.performance_tier === 'Expert').length;
    const advancedCount = rows.filter(p => p.performance_tier === 'Advanced').length;
    const intermediateCount = rows.filter(p => p.performance_tier === 'Intermediate').length;
    const beginnerCount = rows.filter(p => p.performance_tier === 'Beginner').length;
    
    // Ordenar por score de performance (o DPS si no hay score)
    const sortedPlayers = [...rows].sort((a, b) => {
        const scoreA = a.performance_score || a.avg_dps || 0;
        const scoreB = b.performance_score || b.avg_dps || 0;
        return scoreB - scoreA;
    });
    
    let html = `
        <!-- Tarjetas de Métricas de Performance -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
            <div class="stat-card">
                <div class="stat-icon">🏆</div>
                <div class="stat-label">EXPERT PLAYERS</div>
                <div class="stat-value">${expertCount}</div>
                <div class="stat-sublabel">Top tier performers</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⭐</div>
                <div class="stat-label">ADVANCED PLAYERS</div>
                <div class="stat-value">${advancedCount}</div>
                <div class="stat-sublabel">High skill bracket</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🌿</div>
                <div class="stat-label">INTERMEDIATE</div>
                <div class="stat-value">${intermediateCount}</div>
                <div class="stat-sublabel">Mid skill bracket</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">🌱</div>
                <div class="stat-label">BEGINNERS</div>
                <div class="stat-value">${beginnerCount}</div>
                <div class="stat-sublabel">Learning players</div>
            </div>
        </div>
        
        <!-- Tabla de Performance Rankings -->
        <div class="glass-card">
            <h3 class="card-title">📋 Performance Rankings</h3>
            <div style="max-height: 700px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="position: sticky; top: 0; background: rgba(15, 23, 42, 0.95); z-index: 1;">
                        <tr style="background: rgba(212, 175, 55, 0.2); border-bottom: 2px solid rgba(212, 175, 55, 0.4);">
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Rank</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Player</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Score</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Performance Tier</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Survival Tier</th>
                            <th style="padding: 0.75rem; text-align: left; color: #D4AF37;">Efficiency</th>
                        </tr>
                    </thead>
                    <tbody>
    `;
    
    sortedPlayers.forEach((player, index) => {
        const score = player.performance_score || (player.avg_dps / 10) || 0;
        const efficiency = player.damage_efficiency || ((player.avg_dps || 0) / Math.max(player.avg_deaths_per_encounter || 1, 0.1) / 1000) || 0;
        const safeName = (player.player_name || '').replace(/'/g, "\\'");
        const safeProfession = (player.profession || '').replace(/'/g, "\\'");
        html += `
            <tr style="border-bottom: 1px solid rgba(212, 175, 55, 0.1); cursor: pointer;" onclick="mostrarDetallesJugador('${safeName}', '${safeProfession}')">
                <td style="padding: 0.75rem; color: #D4AF37; font-weight: bold;">${index + 1}</td>
                <td style="padding: 0.75rem;">${formatearNombreJugador(player.player_name, player.profession)}</td>
                <td style="padding: 0.75rem;"><span class="stat-pill high" style="background: linear-gradient(135deg, rgba(76, 175, 80, 0.4), rgba(139, 195, 74, 0.3)); color: #8BC34A; border-color: rgba(76, 175, 80, 0.5);">${score.toFixed(1)}</span></td>
                <td style="padding: 0.75rem;"><span class="tier-badge ${(player.performance_tier || 'N/A').toLowerCase()}">${player.performance_tier || 'N/A'}</span></td>
                <td style="padding: 0.75rem;"><span class="tier-badge ${(player.survivability_tier || 'N/A').toLowerCase()}">${player.survivability_tier || 'N/A'}</span></td>
                <td style="padding: 0.75rem; color: #e2e8f0;">${efficiency.toFixed(2)}</td>
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

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function determinarRol(player) {
    const dps = player.avg_dps || 0;
    const cleanses = player.avg_cleanses_per_minute || 0;
    const might = player.avg_might_uptime || 0;
    const quickness = player.avg_quickness_uptime || 0;
    const stability = player.avg_stability_uptime || 0;
    
    // Support roles: high cleanses or boons
    if (cleanses > 5 || might > 60 || quickness > 60 || stability > 40) {
        return 'Support';
    }
    
    // High DPS roles
    if (dps > 800) {
        return 'DPS';
    }
    
    // Hybrid
    if (dps > 400 && (cleanses > 2 || might > 30)) {
        return 'Hybrid';
    }
    
    return 'DPS';
}

function mostrarDetallesJugador(playerName, profession) {
    // Buscar datos del jugador en todos los datasets
    const playerDaily = globalData.daily.find(p => p.player_name === playerName);
    const playerSummary = globalData.summary.find(p => p.player_name === playerName);
    
    if (!playerDaily && !playerSummary) {
        alert('No se encontraron datos para ' + playerName);
        return;
    }
    
    const data = playerDaily || playerSummary;
    
    // Crear modal con detalles del jugador
    const modal = document.createElement('div');
    modal.id = 'playerModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(5px);
    `;
    
    const role = determinarRol(data);
    const performanceTier = data.performance_tier || 'N/A';
    const survivalTier = data.survivability_tier || 'N/A';
    
    modal.innerHTML = `
        <div style="
            background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.95));
            border: 2px solid rgba(212, 175, 55, 0.3);
            border-radius: 15px;
            padding: 2rem;
            max-width: 800px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
        ">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; border-bottom: 2px solid rgba(212, 175, 55, 0.3); padding-bottom: 1rem;">
                <div>
                    <h2 style="color: #FFA500; margin: 0; font-size: 1.8rem;">${playerName}</h2>
                    <p style="color: #94a3b8; margin: 0.5rem 0 0 0;">${profession} • ${role}</p>
                </div>
                <button onclick="cerrarModal()" style="
                    background: rgba(239, 68, 68, 0.2);
                    border: 1px solid rgba(239, 68, 68, 0.5);
                    color: #EF4444;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.2s ease;
                " onmouseover="this.style.background='rgba(239, 68, 68, 0.4)'" onmouseout="this.style.background='rgba(239, 68, 68, 0.2)'">✕ Cerrar</button>
            </div>
            
            <!-- Performance Tiers -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                <div style="background: rgba(212, 175, 55, 0.1); padding: 1rem; border-radius: 10px; border: 1px solid rgba(212, 175, 55, 0.2);">
                    <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.5rem;">Performance Tier</div>
                    <div style="font-size: 1.5rem; color: #FFA500; font-weight: bold;">${performanceTier}</div>
                </div>
                <div style="background: rgba(212, 175, 55, 0.1); padding: 1rem; border-radius: 10px; border: 1px solid rgba(212, 175, 55, 0.2);">
                    <div style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.5rem;">Survival Tier</div>
                    <div style="font-size: 1.5rem; color: #8BC34A; font-weight: bold;">${survivalTier}</div>
                </div>
            </div>
            
            <!-- Combat Stats -->
            <div style="margin-bottom: 2rem;">
                <h3 style="color: #D4AF37; margin-bottom: 1rem; font-size: 1.2rem;">⚔️ Combat Statistics</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Average DPS:</span>
                        <span style="color: #FFA500; font-weight: bold;">${Math.round(data.avg_dps || 0)}</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Total Damage:</span>
                        <span style="color: #e2e8f0;">${Math.round(data.total_damage_dealt || 0).toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Power Damage %:</span>
                        <span style="color: #e2e8f0;">${Math.round(data.avg_power_damage_pct || 0)}%</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Condi Damage %:</span>
                        <span style="color: #e2e8f0;">${Math.round(data.avg_condi_damage_pct || 0)}%</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Cleave %:</span>
                        <span style="color: #e2e8f0;">${(data.avg_cleave_pct || 100).toFixed(1)}%</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Encounters:</span>
                        <span style="color: #e2e8f0;">${data.total_encounters || data.encounter_count || 1}</span>
                    </div>
                </div>
            </div>
            
            <!-- Support Stats -->
            <div style="margin-bottom: 2rem;">
                <h3 style="color: #D4AF37; margin-bottom: 1rem; font-size: 1.2rem;">💚 Support Statistics</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Might Uptime:</span>
                        <span style="color: #8BC34A; font-weight: bold;">${(data.avg_might_uptime || 0).toFixed(1)}%</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Quickness Uptime:</span>
                        <span style="color: #8BC34A; font-weight: bold;">${(data.avg_quickness_uptime || 0).toFixed(1)}%</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Stability Uptime:</span>
                        <span style="color: #8BC34A; font-weight: bold;">${(data.avg_stability_uptime || 0).toFixed(1)}%</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Cleanses/min:</span>
                        <span style="color: #8BC34A; font-weight: bold;">${(data.avg_cleanses_per_minute || 0).toFixed(1)}</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Total Cleanses:</span>
                        <span style="color: #e2e8f0;">${Math.round(data.total_cleanses || 0)}</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Strips:</span>
                        <span style="color: #e2e8f0;">${Math.round(data.total_strips || 0)}</span>
                    </div>
                </div>
            </div>
            
            <!-- Defense Stats -->
            <div>
                <h3 style="color: #D4AF37; margin-bottom: 1rem; font-size: 1.2rem;">🛡️ Defense Statistics</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Survival Ratio:</span>
                        <span style="color: #8BC34A; font-weight: bold;">${(data.avg_survival_ratio || 0).toFixed(2)}</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Deaths/Encounter:</span>
                        <span style="color: #EF4444;">${(data.avg_deaths_per_encounter || 0).toFixed(1)}</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Damage Taken:</span>
                        <span style="color: #e2e8f0;">${Math.round(data.avg_damage_taken || 0).toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Damage Prevented:</span>
                        <span style="color: #8BC34A;">${Math.round(data.avg_damage_prevented || 0).toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Barrier Generated:</span>
                        <span style="color: #e2e8f0;">${Math.round(data.total_barrier_generated || 0).toLocaleString()}</span>
                    </div>
                    <div class="stat-row">
                        <span style="color: #94a3b8;">Squad Group:</span>
                        <span style="color: #FFA500;">${data.squad_group || 'N/A'}</span>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Agregar estilos para las filas de estadísticas
    const style = document.createElement('style');
    style.textContent = `
        .stat-row {
            display: flex;
            justify-content: space-between;
            padding: 0.75rem;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 8px;
            border: 1px solid rgba(212, 175, 55, 0.1);
        }
    `;
    document.head.appendChild(style);
    
    // Click fuera del modal para cerrar
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            cerrarModal();
        }
    });
}

function cerrarModal() {
    const modal = document.getElementById('playerModal');
    if (modal) {
        modal.remove();
    }
}
