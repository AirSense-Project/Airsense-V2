/* ==========================================================================
   CONFIGURACIÓN INICIAL DEL MAPA
   ==========================================================================*/
   
//Inicializado con vista centrada en el Valle del cauca, Colombia
const map = L.map("map").setView([3.9, -76.6], 8.4); 

/* 
   Capa base del mapa usando OpenStreetMap
   Proporciona el fondo cartográfico con calles, ciudades y topografía
*/

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);


// ==========================================================================
// REFERENCIAS DEL DOM
// ==========================================================================

//Elemento <select> donde el usuario elige el municipio a visualizar
const selectMunicipio = document.getElementById("selectMunicipio");

/* Mensaje dinámico para mostrar feedback al usuario durante
   operaciones asincronas (carga de datos, errores, etc...)*/

const statusMsg = document.createElement("p");
statusMsg.id = "status";
statusMsg.style.display = "none";
statusMsg.style.textAlign = "center";
statusMsg.style.color = "#555";
statusMsg.style.fontStyle = "italic";
statusMsg.style.transition = "opacity 0.4s ease";
selectMunicipio.insertAdjacentElement("afterend", statusMsg);


// ==========================================================================
// FUNCIONES DE RETROALIMENTACIÓN VISUAL
// ==========================================================================

//muestra un mensaje de estado al usuario
function mostrarEstado(texto) {
  statusMsg.textContent = texto;
  statusMsg.style.display = "block";
  statusMsg.style.opacity = "1";
}

//Oculta el mensaje de estado con una transición suave
function ocultarEstado(delay = 300) {
  setTimeout(() => {
    statusMsg.style.opacity = "0";
    setTimeout(() => {
      statusMsg.style.display = "none";
      statusMsg.textContent = "";
    }, 400);
  }, delay);
}

/* ==========================================================================
   CARGA Y VISUALIZACIÓN DE MUNICIPIOS
   ==========================================================================

Carga la lista de municipios desde el backend
 * 
 * Flujo de ejecución:
 * 1. Realiza petición GET a /api/municipios
 * 2. Llena el selector <select> con los municipios disponibles
 * 3. Muestra los municipios como marcadores en el mapa
 * 4. Maneja errores de conexión o servidor */

async function cargarMunicipios() {
  try {
    mostrarEstado("Cargando municipios...");

    const response = await fetch("/api/municipios");
    if (!response.ok) throw new Error("No se pudieron obtener los municipios");

    const municipios = await response.json();
    llenarSelectMunicipios(municipios);
    mostrarMunicipiosEnMapa(municipios);

    ocultarEstado(800);
  } catch (error) {
    console.error("❌ Error al cargar municipios:", error);
    mostrarEstado("❌ Error al conectar con el servidor.");
  }
}

/*Llena el selector <select> con opciones de municipios
  
Estructura esperada del objeto municipio:
  {
    id_municipio: 1,
    nombre_municipio: "Cali",
  }
*/

function llenarSelectMunicipios(municipios) {
  selectMunicipio.innerHTML =
    '<option value="">-- Selecciona un municipio --</option>';

  municipios.forEach((m) => {
    const option = document.createElement("option");
    option.value = m.id_municipio;
    option.textContent = m.nombre_municipio;
    selectMunicipio.appendChild(option);
  });
}

/*Renderiza marcadores circulares de municipios en el mapa
  Características de los marcadores:
  - Radio: 6px
  - Estilo: CircleMarker de Leaflet con clase CSS personalizada
  - Interacción: Popup con nombre al hacer clic, tooltip al hover
*/
function mostrarMunicipiosEnMapa(municipios) {
  municipios.forEach((m) => {
    if (m.latitud && m.longitud) {
      L.circleMarker([m.latitud, m.longitud], {
        radius: 6,
        className: "mapa__marcador-municipio", 
      })
        .addTo(map)
        .bindPopup(`<b>${m.nombre_municipio}</b>`)
        .bindTooltip(m.nombre_municipio, { direction: "top" });
    }
  });
}

/* ==========================================================================
   VARIABLES GLOBALES DE CONTROL
   ==========================================================================
   Control del cuadro informativo de Leaflet
   Almacena referencia al control de leyenda en la esquina inferior derecha
   Se actualiza cada vez que se selecciona un nuevo municipio */

let infoBoxControl = null;

/* ==========================================================================
   MANEJO DE EVENTOS
   ==========================================================================

    Event listener: Cambio de municipio seleccionado
      
    Flujo cuando el usuario selecciona un municipio:
    1. Obtiene el ID del municipio seleccionado
    2. Realiza petición GET a /api/estaciones/{id}
    3. Limpia marcadores anteriores del mapa
    4. Renderiza las nuevas estaciones
    5. Actualiza el cuadro informativo
    6. Centra el mapa en la zona del municipio
*/

selectMunicipio.addEventListener("change", async (e) => {
  const idMunicipio = e.target.value;
  if (!idMunicipio) return;

  try {
    mostrarEstado("Cargando estaciones...");

    const response = await fetch(`/api/estaciones/${idMunicipio}`);
    if (!response.ok) throw new Error("Error al obtener estaciones");

    const estaciones = await response.json();
    mostrarEstaciones(estaciones);

    mostrarEstado(`${estaciones.length} estaciones encontradas.`);
    ocultarEstado(2500);
  } catch (error) {
    console.error("❌ Error al cargar estaciones:", error);
    mostrarEstado("❌ No se pudieron cargar las estaciones.");
  }
});

/* ==========================================================================
   VISUALIZACIÓN DE ESTACIONES
   ==========================================================================
   Renderiza las estaciones de calidad del aire en el mapa
   Funcionalidad:
   - Limpia marcadores previos de estaciones (mantiene municipios)
   - Crea marcadores con icono clásico de Leaflet
   - Añade popups informativos con datos de cada estación
   - Implementa tooltips al hacer hover
   - Centra el mapa en la primera estación
   - Actualiza cuadro informativo con total de estaciones
*/

function mostrarEstaciones(estaciones) {
  // Limpiar solo los marcadores de estaciones (mantiene capa base y municipios)
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  //Usa el icono clásico de Leaflet (pin azul) para mostrar estaciones
  const iconoEstacion = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  // Renderizar cada estación como marcador en el mapa
  estaciones.forEach((est) => {
    if (est.latitud && est.longitud) {
      const marker = L.marker([est.latitud, est.longitud], {
        icon: iconoEstacion,
      }).addTo(map).bindPopup(`
          <b>${est.nombre_estacion}</b><br>
          ID estación: ${est.id_estacion}<br>
          ID ubicación: ${est.id_ubicacion || "N/A"}<br>
          Año: ${est.anio}<br>
          Latitud: ${est.latitud}<br>
          Longitud: ${est.longitud}<br>
        `);

      // Tooltip visible al pasar el mouse
      marker.bindTooltip(est.nombre_estacion, {
        //no son estilos CSS, sino propiedades funcionales del componente
        permanent: false,
        direction: "top",
        offset: [0, -5],
        opacity: 0.9,
      });
    }
  });

  //Centrar mapa en la ubicacion de la primera estacion
  if (estaciones.length > 0) {
    const { latitud, longitud } = estaciones[0];
    map.setView([latitud, longitud], 13);
  }

  /*
   Cuadro informativo (leyenda en esquina inferior derecha)
   - Muestra: nombre del municipio y cantidad de estaciones
   - Se actualiza dinámicamente con cada selección
  */

  if (infoBoxControl) map.removeControl(infoBoxControl);

  infoBoxControl = L.control({ position: "bottomright" });

  infoBoxControl.onAdd = function () {
    const div = L.DomUtil.create("div", "mapa__cuadro-info");
    const nombreMunicipio =
      selectMunicipio.options[selectMunicipio.selectedIndex].text;
    div.innerHTML = `
      <b>Municipio:</b> ${nombreMunicipio}<br>
      <b>Estaciones:</b> ${estaciones.length}
    `;
    return div;
  };

  infoBoxControl.addTo(map);
}

/* ==========================================================================
   INICIALIZACIÓN DE LA APLICACIÓN
   ==========================================================================

 - Punto de entrada de la aplicación
 - Se ejecuta automáticamente al cargar el script
 - Inicia la carga de municipios y configuración inicial del mapa */
 
cargarMunicipios();
