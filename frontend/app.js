document.getElementById("uploadForm").addEventListener("submit", async function(e) {
    e.preventDefault(); // Evita que la página se recargue

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
    statusMessage.textContent = "Procesando log y guardando localmente...";
    submitBtn.disabled = true;

    try {
        const response = await fetch("http://127.0.0.1:8000/api/analyze", {
            method: "POST",
            body: formData
        });

        const result = await response.json();

        if (response.ok) {
            statusMessage.style.color = "#2ecc71";
            statusMessage.textContent = "¡Éxito! Archivo procesado y guardado localmente (Listo para Git).";
        } else {
            statusMessage.style.color = "#ff6b6b";
            statusMessage.textContent = `Error: ${result.detail || "Error interno en el servidor"}`;
        }
    } catch (error) {
        statusMessage.style.color = "#ff6b6b";
        statusMessage.textContent = "Error al conectar con el servidor.";
        console.error("Error de red:", error);
    } finally {
        submitBtn.disabled = false;
    }
});