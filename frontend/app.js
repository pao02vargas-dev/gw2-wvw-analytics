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
            
            // Renderizar los resultados de la capa Gold en el HTML
            mostrarResultadosEnUI(result.data);
        } else {
            statusMessage.style.color = "#ff6b6b";
            statusMessage.textContent = `Error: ${result.detail || "Error en el servidor"}`;
        }
    } catch (error) {
        statusMessage.style.color = "#ff6b6b";
        statusMessage.textContent = "Error al conectar con el servidor FastAPI.";
        console.error("Error de red:", error);
    } finally {
        submitBtn.disabled = false;
    }
});

function mostrarResultadosEnUI(data) {
    // Aquí puedes crear dinámicamente contenedores o tablas con tu estilo glassmorphism
    console.log("Datos Gold listos para pintar:", data);
    
    // Ejemplo rápido: Si tienes un contenedor con id="results-container" en tu index.html
    const container = document.getElementById("results-container");
    if (!container) return;

    let html = `<div class="glass-card" style="margin-top: 2rem;">
                    <h3 class="card-title">🏆 Resumen de Jugadores (Gold)</h3>
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
}