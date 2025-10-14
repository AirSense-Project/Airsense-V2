// ------------------------------
// script.js - Lógica del mapa y carga de datos
// Sistema interactivo del frontend de AirSense
// ------------------------------

// ------------------------------
// Inicialización del mapa (Leaflet)
// ------------------------------
const map = L.map("map").setView([3.45, -76.53], 9); // Vista inicial centrada en Cali

// Capa base: OpenStreetMap
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// ------------------------------
// Referencias del DOM
// ------------------------------
const selectMunicipio = document.getElementById("selectMunicipio");

// Mensaje dinámico
const statusMsg = document.createElement("p");
statusMsg.id = "status";
statusMsg.style.display = "none";
statusMsg.style.textAlign = "center";
statusMsg.style.color = "#555";
statusMsg.style.fontStyle = "italic";
statusMsg.style.transition = "opacity 0.4s ease";
selectMunicipio.insertAdjacentElement("afterend", statusMsg);

// ------------------------------
// Funciones auxiliares
// ------------------------------
function mostrarEstado(texto) {
  statusMsg.textContent = texto;
  statusMsg.style.display = "block";
  statusMsg.style.opacity = "1";
}

function ocultarEstado(delay = 300) {
  setTimeout(() => {
    statusMsg.style.opacity = "0";
    setTimeout(() => {
      statusMsg.style.display = "none";
      statusMsg.textContent = "";
    }, 400);
  }, delay);
}

// ------------------------------
// Cargar municipios y mostrarlos en el mapa
// ------------------------------
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

// ------------------------------
// Llenar el <select> con municipios
// ------------------------------
function llenarSelectMunicipios(municipios) {
  selectMunicipio.innerHTML = '<option value="">-- Selecciona un municipio --</option>';

  municipios.forEach((m) => {
    const option = document.createElement("option");
    option.value = m.id_municipio;
    option.textContent = m.nombre_municipio;
    selectMunicipio.appendChild(option);
  });
}

// ------------------------------
// Mostrar los municipios en el mapa
// ------------------------------
function mostrarMunicipiosEnMapa(municipios) {
  municipios.forEach((m) => {
    if (m.latitud && m.longitud) {
      L.circleMarker([m.latitud, m.longitud], {
        radius: 6,
        className: "municipio-marker" // 🔹 Clase CSS personalizada
      })
        .addTo(map)
        .bindPopup(`<b>${m.nombre_municipio}</b>`)
        .bindTooltip(m.nombre_municipio, { direction: "top" });
    }
  });
}

// ------------------------------
// Variable para cuadro informativo (no global window)
// ------------------------------
let infoBoxControl = null;

// ------------------------------
// Evento: Cambio de municipio seleccionado
// ------------------------------
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

// ------------------------------
// Mostrar estaciones en el mapa
// ------------------------------
function mostrarEstaciones(estaciones) {
  // Limpiar marcadores previos (mantener capa base)
  map.eachLayer((layer) => {
    if (layer instanceof L.Marker) map.removeLayer(layer);
  });

  // Icono clásico de marcador verde (flecha original)
  const iconoEstacion = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

  // Mostrar marcadores con información detallada + tooltip
  estaciones.forEach((est) => {
    if (est.latitud && est.longitud) {
      const marker = L.marker([est.latitud, est.longitud], { icon: iconoEstacion })
        .addTo(map)
        .bindPopup(`
          <b>${est.nombre_estacion}</b><br>
          ID estación: ${est.id_estacion}<br>
          ID ubicación: ${est.id_ubicacion || "N/A"}<br>
          Año: ${est.anio}<br>
          Latitud: ${est.latitud}<br>
          Longitud: ${est.longitud}
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

  // Centrar vista
  if (estaciones.length > 0) {
    const { latitud, longitud } = estaciones[0];
    map.setView([latitud, longitud], 11);
  }
  //  Cuadro informativo (leyenda dentro del mapa)
  if (infoBoxControl) map.removeControl(infoBoxControl);
  infoBoxControl = L.control({ position: "bottomright" });
  infoBoxControl.onAdd = function () {
    const div = L.DomUtil.create("div", "info-box");
    const nombreMunicipio = selectMunicipio.options[selectMunicipio.selectedIndex].text;
    div.innerHTML = `
      <div class="info-box">
        <b>🏙️ Municipio:</b> ${nombreMunicipio}<br>
        <b>📍 Estaciones:</b> ${estaciones.length}
      </div>`;
    return div;
  };

  infoBoxControl.addTo(map);
}

// ------------------------------
// Inicialización automática
// ------------------------------
cargarMunicipios();

