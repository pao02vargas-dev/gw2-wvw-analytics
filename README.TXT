================================================================================
        PANEL DE ANÁLISIS GW2 WvW - DESCRIPCIÓN GENERAL DEL PROYECTO
================================================================================

NOMBRE DEL PROYECTO: Guild Wars 2 - Panel de Análisis World vs World
LENGUAJE: Python (Backend) + HTML/CSS/JavaScript (Frontend)
CREADO: 2026-08-23
ÚLTIMA ACTUALIZACIÓN: 2026-08-25
ESTADO: Desarrollo Activo

================================================================================
DESCRIPCIÓN DEL PROYECTO
================================================================================

Este proyecto es un panel de análisis para métricas de jugabilidad en World vs
World (WvW) de Guild Wars 2. Proporciona análisis de rendimiento integral para
jugadores y escuadras durante encuentros de WvW.

El panel visualiza datos de combate, métricas de soporte, estadísticas
defensivas y rendimiento general de jugadores con una interfaz interactiva y
codificada por colores, inspirada en la temática visual de Guild Wars 2.

================================================================================
CARACTERÍSTICAS PRINCIPALES
================================================================================

CARACTERÍSTICAS VISUALES:
  • Pastillas de Estadísticas con Códigos de Color (Verde/Amarillo/Rojo según
    umbrales de DPS)
  • Barras de Progreso Animadas (para uptimes de beneficios y métricas)
  • Nombres de Jugadores Formateados (con insignias de profesión)
  • Efectos Hover y Transiciones Suaves
  • Diseño Responsivo (ancho del 95% del viewport)

PESTAÑAS DEL PANEL:
  
  1. PESTAÑA RESUMEN (Overview)
     - Top 10 Jugadores por DPS
     - Análisis de Composición de Escuadra
     - Métricas de Balance (ratio Soporte/DPS)

  2. PESTAÑA COMBATE (Combat)
     - Top 15 Rankings de DPS
     - Estadísticas de Daño (Total, Poder, Condición)
     - Métricas de Control de Multitudes (CC)

  3. PESTAÑA SOPORTE (Support)
     - Top 15 Rankings de Soporte
     - Tasas de Limpieza (limpiezas/minuto)
     - Métricas de Uptime de Beneficios (Estabilidad, Rapidez, Fuerza)

  4. PESTAÑA DEFENSA (Defense)
     - Rankings de Supervivencia
     - Muertes y Daño Recibido
     - Tiers de Supervivencia (Principiante/Bueno/Avanzado/Élite)

  5. PESTAÑA RENDIMIENTO (Performance)
     - Rendimiento Detallado de Jugador
     - Resumen Histórico de 30 Días
     - Rendimiento por Profesión

================================================================================
ESTRUCTURA DEL PROYECTO
================================================================================

gw2-wvw-analytics/
├── README.TXT                          (Este archivo)
├── DASHBOARD_IMPROVEMENTS.md           (Documentación de mejoras detalladas)
├── backend/                            (Servicios de backend)
├── databricks/                         (Integración de almacén de datos)
├── docs/                               (Archivos de frontend)
│   ├── index.html                      (HTML principal del panel)
│   ├── style.css                       (Estilos y animaciones)
│   ├── app.js                          (Lógica de JavaScript - 29KB)
│   └── data/                           (Archivos de datos JSON)
│       ├── wvw_encounter_summary.json
│       ├── wvw_player_stats_daily.json
│       ├── wvw_player_stats_summary.json
│       ├── wvw_profession_performance.json
│       └── wvw_squad_composition.json
└── tools/                              (Scripts de utilidad)

================================================================================
MÉTRICAS PRINCIPALES RASTREADAS
================================================================================

MÉTRICAS DE COMBATE:
  • DPS (Daño por Segundo)
  • Daño Total Infligido
  • % Daño de Poder / % Daño por Condición
  • Segundos de Control de Multitudes (CC)
  • % de Cleave

MÉTRICAS DE SOPORTE:
  • Limpiezas/Minuto
  • % Uptime de Estabilidad
  • % Uptime de Rapidez
  • % Uptime de Fuerza
  • % Uptime de Égida
  • % Uptime de Resistencia

MÉTRICAS DE DEFENSA:
  • Muertes por Encuentro
  • Caídas por Encuentro
  • Ratio de Supervivencia
  • Daño Recibido
  • Daño Prevenido
  • Tier de Supervivencia

MÉTRICAS DE RENDIMIENTO:
  • Tier de Rendimiento (Principiante/Bueno/Avanzado/Élite)
  • Eficiencia de Daño
  • Asignación de Rol Principal
  • Tipo de Construcción (Poder vs Condición)

================================================================================
SISTEMA DE FILTROS
================================================================================

El panel incluye un sistema de filtros avanzado:

1. SELECTOR DE ENCUENTRO
   - Menú desplegable con todos los encuentros disponibles
   - Formato: "Encuentro #ID - Fecha"
   - Opción para vista global de "Todos los Encuentros"

2. BÚSQUEDA DE JUGADOR
   - Búsqueda en tiempo real en todas las columnas
   - Insensible a mayúsculas/minúsculas
   - Se combina con el filtro de encuentro

LÓGICA DE FILTROS: (Encuentro Seleccionado) Y (Texto de Búsqueda)

================================================================================
DISEÑO Y ESTILOS
================================================================================

PALETA DE COLORES (Temática GW2):
  • Dorado: #D4AF37 (Encabezados, títulos, acentos)
  • Naranja: #FFA500 (Nombres de jugadores, highlights)
  • Dorado Oscuro: #FF8C00 (Gradientes, barras de progreso)

COLORES DE PASTILLAS DE DPS:
  • Verde (#8BC34A): DPS Alto (≥ 1000)
  • Amarillo (#FFC107): DPS Medio (500-999)
  • Rojo (#EF5350): DPS Bajo (< 500)

PATRONES DE DISEÑO:
  • Efectos de glassmorphism
  • Pastillas con esquinas redondeadas
  • Barras de progreso animadas
  • Superposiciones de gradiente
  • Transiciones suaves en hover

================================================================================
ESPECIFICACIONES DE DISEÑO RESPONSIVO
================================================================================

Ancho del Contenedor: 95% del viewport
Altura de Tabla: 700px máximo (con desplazamiento)
Máximo de Filas por Tabla: 200 filas (configurable)
Puntos de Quiebre: Optimizado para Móvil, Tablet, Desktop

MÉTRICAS DE RENDIMIENTO:
  • Carga Inicial: < 1 segundo
  • Cambio de Pestaña: Instantáneo
  • Aplicación de Filtros: < 100ms

================================================================================
FUENTES DE DATOS
================================================================================

El panel obtiene datos de:
  • Unity Catalog Gold Layer (Almacén de datos principal)
  • Resúmenes de encuentros de WvW (formato JSON)
  • Estadísticas diarias de jugadores
  • Registros de composición de escuadra
  • Agregaciones de rendimiento por profesión

================================================================================
STACK TECNOLÓGICO
================================================================================

FRONTEND:
  • HTML5 (Estructura)
  • CSS3 (Estilos con animaciones)
  • JavaScript Vanilla (Sin dependencias externas)

BACKEND:
  • Python (Lógica de negocio)
  • Databricks (Procesamiento de datos)

FORMATO DE DATOS:
  • JSON (Transporte de datos)

ALOJAMIENTO:
  • GitHub Pages (directorio docs/)

================================================================================
CÓMO USAR EL PANEL
================================================================================

1. NAVEGACIÓN:
   - Haz clic en los nombres de las pestañas (Resumen, Combate, Soporte,
     Defensa, Rendimiento)
   - Cada pestaña muestra análisis diferentes

2. FILTRADO:
   - Selecciona un encuentro del menú desplegable
   - Escribe el nombre del jugador o profesión en el cuadro de búsqueda
   - Los resultados se actualizan en tiempo real

3. ORDENAMIENTO:
   - Haz clic en los encabezados de las columnas para ordenar
     (ascendente/descendente)
   - Múltiples ordenamientos disponibles por vista

4. VISUALIZACIÓN DE DATOS:
   - Pasa el ratón sobre las filas para resaltarlas
   - Desplázate horizontalmente para ver más columnas
   - Desplázate verticalmente a través de grandes conjuntos de datos

================================================================================
SOLUCIÓN DE PROBLEMAS
================================================================================

PROBLEMA: "No hay datos disponibles"
SOLUCIÓN:
  1. Verifica que los archivos JSON existan en docs/data/
  2. Abre la consola del navegador (F12) para ver mensajes de error
  3. Comprueba el formato del archivo JSON (JSON válido)
  4. Verifica las rutas de archivo en app.js

PROBLEMA: "Los filtros no funcionan"
SOLUCIÓN:
  1. Asegúrate de que encounter_id existe en el JSON
  2. Comprueba la consistencia de encounter_date entre archivos
  3. Recarga forzada: Ctrl+Shift+R
  4. Limpia la caché del navegador

PROBLEMA: "Las tablas no se muestran correctamente"
SOLUCIÓN:
  1. Verifica que style.css cargó (pestaña F12 Network)
  2. Limpia la caché del navegador
  3. Comprueba errores de JavaScript en app.js
  4. Intenta con un navegador diferente

================================================================================
MEJORAS FUTURAS PLANEADAS
================================================================================

CARACTERÍSTICAS PLANEADAS:
  • Gráficos Interactivos (Chart.js / D3.js)
    - Gráficos de DPS a lo largo del tiempo
    - Gráficos de uptime de beneficios
    - Gráficos de distribución de profesiones

  • Comparación de Encuentros
    - Vistas de comparación lado a lado
    - Seguimiento de progresión

  • Exportación de Datos
    - Funcionalidad de exportación a CSV
    - Reportes en PDF

  • Estadísticas Avanzadas
    - Cálculos de percentiles (P50, P75, P90)
    - Análisis de tendencias
    - Seguimiento de mejora de jugadores

  • Aplicación Móvil
    - Progressive Web App (PWA)
    - Soporte sin conexión

================================================================================
REGISTRO DE CAMBIOS
================================================================================

VERSIÓN 2.0.0 (2026-08-24)
  ✓ Rediseño completo del panel
  ✓ Mejoras visuales (pastillas, barras de progreso)
  ✓ Tablas especializadas por categoría
  ✓ Sistema de filtrado mejorado
  ✓ Diseño responsivo (ancho del 95%)
  ✓ Optimizaciones de rendimiento
  ✓ Múltiples modos de visualización (Detallado/Resumen/Profesión)

VERSIÓN 1.0.0 (2026-08-23)
  ✓ Lanzamiento inicial del panel
  ✓ Renderizado de tablas básico
  ✓ Filtrado simple
  ✓ Visualización de estadísticas de jugadores

================================================================================
DOCUMENTACIÓN
================================================================================

Para información detallada sobre:
  • Mejoras implementadas: Ver DASHBOARD_IMPROVEMENTS.md
  • Especificaciones de diseño visual
  • Desglose de métricas por pestaña
  • Lógica de filtros y ejemplos

El archivo de documentación principal proporciona detalles exhaustivos sobre:
  - Nuevas características visuales
  - Estructura del panel por pestañas
  - Métricas destacadas por sección
  - Especificaciones de paleta de colores
  - Detalles de diseño responsivo
  - Optimizaciones de rendimiento

================================================================================
CRÉDITOS Y ATRIBUCIÓN
================================================================================

Inspiración de Diseño: wvw_analytics_dashboard.html
Fuente de Datos: Unity Catalog Gold Layer
Framework de Desarrollo: JavaScript Vanilla + CSS (sin dependencias)
Temática Visual: Paleta de colores de Guild Wars 2
Creado por: pao02vargas-dev

================================================================================
CONTACTO Y SOPORTE
================================================================================

Para reportar errores o sugerir características:
  • Contacta al equipo de Data Engineering
  • Revisa los Issues existentes en GitHub
  • Consulta DASHBOARD_IMPROVEMENTS.md para mejoras conocidas

Repositorio: https://github.com/pao02vargas-dev/gw2-wvw-analytics

================================================================================
NOTAS
================================================================================

• El panel se genera automáticamente desde datos de Unity Catalog
• Todos los datos se procesan en formato JSON para portabilidad
• No se requieren dependencias externas para el frontend (HTML/CSS/JS puro)
• Optimizado para navegadores modernos (Chrome, Firefox, Safari, Edge)
• Los tiers de rendimiento de jugadores se actualizan según métricas de encuentro

================================================================================
FIN DEL README
================================================================================

Última Actualización: 2026-08-25
Generado para: GW2 WvW Analytics v2.0.0
Estado: Desarrollo Activo
