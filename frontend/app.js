document.getElementById("uploadForm").addEventListener("submit", function(e) {
    e.preventDefault(); // Evita que la página se recargue

    const fileInput = document.getElementById("logFile");
    const statusMessage = document.getElementById("statusMessage");
    const submitBtn = document.getElementById("submitBtn");
    
    const progressContainer = document.getElementById("progressContainer");
    const progressBar = document.getElementById("progressBar");
    const progressText = document.getElementById("progressText");

    if (fileInput.files.length === 0) {
        statusMessage.style.color = "#ff6b6b";
        statusMessage.textContent = "Por favor selecciona un archivo .zevtc";
        return;
    }

    const formData = new FormData();
    formData.append("file", fileInput.files[0]);

    // Limpiar estados anteriores y mostrar la barra de progreso
    statusMessage.textContent = "";
    progressContainer.style.display = "block";
    progressBar.style.width = "0%";
    progressBar.style.background = "linear-gradient(90deg, #8b5cf6, #c084fc)";
    progressText.textContent = "Iniciando subida a Databricks...";
    submitBtn.disabled = true;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:8000/api/analyze", true);

    // Monitorear el progreso en tiempo real de la subida del archivo
    xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            progressBar.style.width = percentComplete + "%";
            
            if (percentComplete < 100) {
                progressText.textContent = `Subiendo a la capa Bronze: ${percentComplete}%`;
            } else {
                progressText.textContent = "Archivo recibido. Procesando y guardando en Databricks...";
            }
        }
    };

    // Respuesta exitosa del servidor
    xhr.onload = function() {
        submitBtn.disabled = false;
        if (xhr.status === 200) {
            try {
                const result = JSON.parse(xhr.responseText);
                progressBar.style.width = "100%";
                progressBar.style.background = "linear-gradient(90deg, #10b981, #34d399)"; // Verde éxito
                progressText.textContent = "¡Éxito! Log guardado localmente y enviado a Databricks (Bronze).";
            } catch (err) {
                progressText.textContent = "Respuesta procesada, pero formato inesperado.";
            }
        } else {
            try {
                const result = JSON.parse(xhr.responseText);
                progressBar.style.background = "#ff6b6b"; // Rojo error
                progressText.textContent = `Error: ${result.detail || "Error interno en el servidor"}`;
            } catch {
                progressBar.style.background = "#ff6b6b";
                progressText.textContent = "Error en el servidor al procesar el archivo.";
            }
        }
    };

    // Manejo de errores de red
    xhr.onerror = function() {
        submitBtn.disabled = false;
        progressBar.style.background = "#ff6b6b";
        progressText.textContent = "Error al conectar con el servidor.";
    };

    // Enviar la petición con el archivo
    xhr.send(formData);
});