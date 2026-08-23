function switchTab(evt, tabId) {
    // Ocultar todas las secciones de contenido
    const contents = document.querySelectorAll(".tab-content");
    contents.forEach(content => content.classList.remove("active"));

    // Desactivar la clase 'active' de todos los botones del menú
    const buttons = document.querySelectorAll(".tab-btn");
    buttons.forEach(btn => btn.classList.remove("active"));

    // Mostrar la pestaña seleccionada y activar su botón
    document.getElementById(tabId).classList.add("active");
    evt.currentTarget.classList.add("active");
}

// Cargar el historial de Databricks automáticamente apenas se abra la página
document.addEventListener("DOMContentLoaded", async () => {
    await cargarTablaGold("player_dps.json", "container-player-dps", "🏆 Rendimiento y DPS de Jugadores (Histórico)");
    await cargarTablaGold("squad_summary.json", "container-squad-summary", "⚔️ Resumen General de Escuadra (Histórico)");
});

// Lógica de subida y análisis en tiempo real (para cuando uses FastAPI)
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

    statusMessage.style.color = "#f1c40f";
    statusMessage.textContent = "Procesando log y consultando capa Gold...";
    submitBtn.disabled = true;

    try {
        const response = await fetch("http://127.0.0.1:8000/api/analyze", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (response.ok && result.status === "success") {
            statusMessage.style.color = "#2ecc71";
            statusMessage.textContent = "¡Éxito! Análisis completado.";
            
            // Renderizar los resultados de la capa Gold en tiempo real
            //mostrarResultadosEnUI(result.data);
        } else {
            statusMessage.style.color = "#ff6b6b";
            statusMessage.textContent = `Error: ${result.detail || "Error en el servidor"}`;
        }
    } catch (error) {
        statusMessage.style.color = "#ff6b6b";
        statusMessage.textContent = "Aviso: No se pudo conectar con FastAPI local (Modo GitHub Pages estático activo).";
        console.error("Error de red:", error);
    } finally {
        submitBtn.disabled = false;
    }
});

// Función para pintar el resultado en tiempo real (tu función original adaptada)
/*function mostrarResultadosEnUI(data) {
    const container = document.getElementById("results-container");
    if (!container) return;

    let html = `<div class="glass-card" style="margin-top: 2rem;">
                    <h3 class="card-title">🏆 Resumen de Jugadores (En Vivo)</h3>
                    <table>
                        <tr><th>Jugador</th><th>Profesión</th><th>DPS Promedio</th></tr>`;
                        
    data.summary.forEach(player => {
        html += `<tr>
                    <td>${player.player_name || 'N/A'}</td>
                    <td>${player.profession || 'N/A'}</td>
                    <td><span class="stat-pill high">${Math.round(player.avg_dps || 0)}</span></td>
                 </tr>`;
    });

   html += `</table></div>`;

    container.innerHTML = html;
}*/

// Función genérica para leer tus JSONs exportados de la capa Gold (Databricks)
async function cargarTablaGold(nombreArchivo, containerId, tituloTabla) {
    const container = document.getElementById(containerId);
    if (!container) return;

    try {
        const response = await fetch(`./data/${nombreArchivo}`);
        if (!response.ok) throw new Error(`No se pudo cargar ${nombreArchivo}`);
        
        const rows = await response.json();
        
        if (!rows || rows.length === 0) {
            container.innerHTML = `<div class="glass-card" style="margin-top: 1.5rem;"><h3 class="card-title">${tituloTabla}</h3><p>Sin registros históricos.</p></div>`;
            return;
        }

        const columnas = Object.keys(rows[0]);

        let html = `<div class="glass-card" style="margin-top: 1.5rem;">
                        <h3 class="card-title">${tituloTabla}</h3>
                        <div style="overflow-x: auto;">
                            <table>
                                <tr>`;
                                
        columnas.forEach(col => {
            html += `<th>${col.replace(/_/g, ' ').toUpperCase()}</th>`;
        });
        
        html += `</tr>`;

        rows.forEach(row => {
            html += `<tr>`;
            columnas.forEach(col => {
                html += `<td>${row[col] !== undefined ? row[col] : 'N/A'}</td>`;
            });
            html += `</tr>`;
        });

        html += `</table></div>`;
        container.innerHTML = html;

    } catch (error) {
        console.warn(`Dataset histórico ${nombreArchivo} no encontrado.`, error);
        container.innerHTML = `<div class="glass-card" style="margin-top: 1.5rem;"><h3 class="card-title">${tituloTabla}</h3><p style="color: #94a3b8; font-size: 0.9rem;">Dataset no disponible en GitHub Pages todavía (Sube tu JSON a la carpeta /data).</p></div>`;
    }
}