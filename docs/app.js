let globalData = {
    encounters: [],
    daily: [],
    summary: [],
    professions: [],
    squad: []
};

// Control de pestañas principales (Cargar Log vs Estadísticas Históricas)
function switchTab(evt, tabId) {
    const contents = document.querySelectorAll(".tab-content");
    contents.forEach(content => content.classList.remove("active"));

    const buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(btn => btn.classList.remove("active"));

    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// Control de sub-pestañas internas dentro de Estadísticas Históricas
function switchSubTab(evt, subTabId) {
    document.querySelectorAll(".subtab-content").forEach(c => {
        c.style.display = "none";
        c.classList.remove("active");
    });
    document.querySelectorAll(".sub-tab-btn").forEach(b => b.classList.remove("active"));
    
    const activeTab = document.getElementById(subTabId);
    if (activeTab) {
        activeTab.style.display = "block";
        activeTab.classList.add("active");
    }
    evt.currentTarget.classList.add("active");
}

// Cargar los 5 datasets de la Capa Gold automáticamente al abrir la página
document.addEventListener("DOMContentLoaded", async () => {
    await cargarTodosLosDatos();

    // Activar eventos de filtrado en tiempo real
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

function actualizarFiltrosVista() {
    const encounterSelect = document.getElementById("encounterSelect");
    const playerSearch = document.getElementById("playerSearch");
    
    const selectedEncounter = encounterSelect ? encounterSelect.value : "all";
    const searchFilter = playerSearch ? playerSearch.value.toLowerCase() : "";

    // Filtrar el rendimiento diario según encuentro y texto de búsqueda
    let filteredDaily = globalData.daily.filter(row => {
        const matchEnc = selectedEncounter === "all" || String(row.encounter_id) === String(selectedEncounter);
        const matchSearch = Object.values(row).some(val => String(val).toLowerCase().includes(searchFilter));
        return matchEnc && matchSearch;
    });

    // Renderizar cada dataset en su contenedor correspondiente
    // OVERVIEW
    renderizarTablaHTML(globalData.encounters, "container-encounter-overview", "🛡️ Resumen General de Encuentro");
    renderizarTablaHTML(globalData.squad, "container-squad-analysis", "📊 Análisis y Balance de Escuadra");
    
    // COMBAT - Métricas de daño y DPS por profesión
    renderizarTablaHTML(globalData.professions, "container-combat-stats", "⚔️ Rendimiento de Combate por Profesión");
    
    // SUPPORT - Métricas de support (cleanses, boons) de squad
    renderizarTablaHTML(globalData.squad, "container-support-stats", "💚 Análisis de Support por Squad");
    
    // DEFENSE - Métricas de supervivencia del daily
    renderizarTablaHTML(filteredDaily, "container-defense-stats", "🛡️ Estadísticas Defensivas y Supervivencia");
    
    // PERFORMANCE - Detalles de jugadores
    renderizarTablaHTML(filteredDaily, "container-player-performance", `🏆 Rendimiento Detallado por Jugador (Daily) [${filteredDaily.length} registros]`);
    renderizarTablaHTML(globalData.summary, "container-player-summary", "👤 Resumen Histórico de Jugador (Summary)");
    renderizarTablaHTML(globalData.professions, "container-profession-stats", "⚔️ Estadísticas por Profesión");
}

function renderizarTablaHTML(rows, containerId, tituloTabla) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!rows || rows.length === 0) {
        container.innerHTML = `<div class="glass-card" style="margin-top: 1.5rem;"><h3 class="card-title">${tituloTabla}</h3><p style="color: #94a3b8; font-size: 0.85rem;">No hay registros disponibles con los filtros actuales.</p></div>`;
        return;
    }

    const columnas = Object.keys(rows[0]);
    const maxFilas = 50;
    const filasAMostrar = rows.slice(0, maxFilas);

    let html = `<div class="glass-card" style="margin-top: 1.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                        <h3 class="card-title" style="margin: 0;">${tituloTabla}</h3>
                        <span style="font-size: 0.8rem; color: #94a3b8;">Mostrando ${filasAMostrar.length} de ${rows.length}</span>
                    </div>
                    <div style="max-height: 350px; overflow-y: auto; overflow-x: auto; border-radius: 8px;">
                        <table style="width: 100%; border-collapse: collapse; text-align: left;">
                            <thead style="position: sticky; top: 0; background: rgba(15, 23, 42, 0.95); z-index: 1;">
                                <tr>`;

    columnas.forEach(col => {
        html += `<th style="padding: 10px; font-size: 0.85rem; border-bottom: 1px solid rgba(255,255,255,0.1);">${col.replace(/_/g, ' ').toUpperCase()}</th>`;
    });

    html += `</tr></thead><tbody>`;

    filasAMostrar.forEach(row => {
        html += `<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">`;
        columnas.forEach(col => {
            let valor = row[col];
            if (valor === undefined || valor === null) valor = 'N/A';
            html += `<td style="padding: 8px 10px; font-size: 0.85rem; color: #e2e8f0;">${valor}</td>`;
        });
        html += `</tr>`;
    });

    html += `</tbody></table></div></div>`;
    container.innerHTML = html;
}

// Lógica de subida por lotes conectada a FastAPI
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
            await cargarTodosLosDatos(); // Recargar datos automáticamente tras subir uno nuevo
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