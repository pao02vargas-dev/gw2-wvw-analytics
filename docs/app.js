function switchTab(evt, tabId) {
    const contents = document.querySelectorAll(".tab-content");
    contents.forEach(content => content.classList.remove("active"));

    const buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(btn => btn.classList.remove("active"));

    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// Cargar los 5 historiales de Databricks automáticamente apenas se abra la página
document.addEventListener("DOMContentLoaded", async () => {
    await cargarTablaGold("www_encounter_summary.json", "container-encounter-overview", "🛡️ Resumen General de Encuentro");
    await cargarTablaGold("www_player_stats_daily.json", "container-player-performance", "🏆 Rendimiento Detallado por Jugador (Daily)");
    await cargarTablaGold("www_player_stats_summary.json", "container-player-summary", "👤 Resumen Histórico de Jugador (Summary)");
    await cargarTablaGold("www_profession_performance.json", "container-profession-stats", "⚔️ Estadísticas por Profesión");
    await cargarTablaGold("www_squad_composition.json", "container-squad-analysis", "📊 Análisis y Balance de Escuadra");
});

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

// Función robusta para leer los JSONs de la Capa Gold asegurando compatibilidad de rutas
async function cargarTablaGold(nombreArchivo, containerId, tituloTabla) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Ruta explícita basada en la ubicación del proyecto
    const rutaJson = `data/${nombreArchivo}`;

    try {
        const response = await fetch(rutaJson);
        if (!response.ok) throw new Error(`No se pudo acceder a ${rutaJson} (Status: ${response.status})`);
        
        const data = await response.json();
        const rows = Array.isArray(data) ? data : [data];
        
        if (!rows || rows.length === 0) {
            container.innerHTML = `<div class="glass-card" style="margin-top: 1.5rem;"><h3 class="card-title">${tituloTabla}</h3><p>Sin registros históricos disponibles.</p></div>`;
            return;
        }

        const columnas = Object.keys(rows[0]);
        const maxFilas = 50; // Límite para evitar bloqueos con datasets masivos
        const filasAMostrar = rows.slice(0, maxFilas);

        let html = `<div class="glass-card" style="margin-top: 1.5rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                            <h3 class="card-title" style="margin: 0;">${tituloTabla}</h3>
                            <span style="font-size: 0.8rem; color: #94a3b8;">Total registros: ${rows.length} ${rows.length > maxFilas ? `(Mostrando top ${maxFilas})` : ''}</span>
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

    } catch (error) {
        console.warn(`Error cargando ${nombreArchivo}:`, error);
        container.innerHTML = `<div class="glass-card" style="margin-top: 1.5rem;"><h3 class="card-title">${tituloTabla}</h3><p style="color: #94a3b8; font-size: 0.85rem;">Dataset no disponible en la ruta <code>data/${nombreArchivo}</code>.</p></div>`;
    }
}