
const map = L.map("map").setView([4, -76.55], 8.5);

/* -------------------- Capas base del mapa -------------------- */
const urlMapaClaro = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const atribClaro = "© OpenStreetMap contributors";
const capaMapaClaro = L.tileLayer(urlMapaClaro, { attribution: atribClaro, pane: 'tilePane' });

const urlMapaOscuro = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const atribOscuro = '© OpenStreetMap contributors & © CartoDB';
const capaMapaOscuro = L.tileLayer(urlMapaOscuro, { attribution: atribOscuro, pane: 'tilePane' });

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let infoBoxControl = null;
let marcadoresEstaciones = {};
let estacionSeleccionada = null;
let capaMunicipios = L.layerGroup().addTo(map);

/**
 * Muestra los marcadores de los municipios en el mapa.
 * @param {Array<Object>} municipios - Lista de municipios.
 */
function mostrarMunicipiosEnMapa(municipios) {
  console.log("📍 Municipios recibidos:", municipios.length, municipios);
    capaMunicipios.clearLayers();
  municipios.forEach((m) => {
    if (m.latitud && m.longitud) {
      const marker = L.circleMarker([m.latitud, m.longitud], {
        radius: 6,
        className: "mapa__marcador-municipio",
      }).addTo(capaMunicipios);

      // Click en el marcador para seleccionar automáticamente
      marker.on("click", () => {
        window.seleccionarMunicipioDesdeMarkador(m.id_municipio);
      });

      // Tooltip al pasar el mouse
      marker.bindTooltip(m.nombre_municipio, { 
        direction: "top",
        permanent: false,
        opacity: 0.9
      });
    }
  });
}

// ==========================================================================
// LIMPIEZA DE MARCADORES Y ESTADO
// ==========================================================================

// Limpia todos los marcadores de estaciones del mapa
function limpiarEstacionesDelMapa() {
  Object.values(marcadoresEstaciones).forEach((marker) => {
    map.removeLayer(marker);
  });
  marcadoresEstaciones = {};
  estacionSeleccionada = null;

  console.log("🧹 Marcadores de estaciones limpiados");
}

// Limpia el cuadro de información (InfoBox) del mapa 
function limpiarInfoBox() {
  if (infoBoxControl) {
    map.removeControl(infoBoxControl);
    infoBoxControl = null;
  }
}

// ==========================================================================
// FUNCIONES AUXILIARES PARA POPUPS
// ==========================================================================

// Crea el HTML para el popup de un marcador de estación
function crearPopupInteractivo(est, anio) {
  // Texto para lectura con lectores de pantalla
  const resumenA11y = `${est.nombre_estacion}${est.tipo_estacion ? ', tipo de estación: ' + est.tipo_estacion : ''}. Latitud: ${parseFloat(est.latitud).toFixed(4)} grados. Longitud: ${parseFloat(est.longitud).toFixed(4)} grados.${anio ? ' Botón disponible: Centrar aquí.' : ''}`;

  return `
    <div role="region" aria-labelledby="popup-${est.id_estacion}" style="min-width: 200px; max-width: 220px; font-family: 'Segoe UI', sans-serif; padding: 4px;">
      
      <!-- Título visible -->
      <div style="background: #fff; padding: 12px; border-left: 4px solid #2a5d67;">
        <strong id="popup-${est.id_estacion}" style="font-size: 1.15em; color: #2a5d67; display: block; margin-bottom: 8px;">
          ${est.nombre_estacion}
        </strong>
        ${est.tipo_estacion ? `
          <span style="display: inline-block; background: #e8f4f8; color: #2a5d67; padding: 3px 8px; border-radius: 4px; font-size: 1.1em; font-weight: 500;"
                role="text">
            📍 ${est.tipo_estacion}
          </span>
        ` : ''}
      </div>
      
      <!-- Latitud y longitud -->
      <div style="padding: 10px 12px; font-size: 1.1em; color: #555; line-height: 1.6; background: #f9fafb;">
        <div style="margin-bottom: 5px;">
          <span style="color: #888; font-size: 1.1em;">Latitud:</span>
          <strong style="float: right; color: #2a5d67;">
            ${parseFloat(est.latitud).toFixed(4)}°
          </strong>
        </div>
        <div style="margin-bottom: ${anio ? '12px' : '0'};">
          <span style="color: #888; font-size: 1.1em;">Longitud:</span>
          <strong style="float: right; color: #2a5d67;">
            ${parseFloat(est.longitud).toFixed(4)}°
          </strong>
        </div>
      </div>

      <!-- Botón -->
      ${anio ? `
        <button 
          onclick="window.centrarMapaEnEstacion(${est.id_estacion})"
          style=" width: 100%; padding: 10px 12px; background: #2a5d67; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 0.95em; transition: all 0.3s ease; box-shadow: 0 2px 4px rgba(42, 93, 103, 0.2);"
          onmouseover="this.style.background='#1e4a54'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(42, 93, 103, 0.3)'"
          onmouseout="this.style.background='#2a5d67'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(42, 93, 103, 0.2)'"
          aria-label="Centrar el mapa en ${est.nombre_estacion}"
        >
          🎯 Centrar aquí
        </button>
      ` : ''}

      <!-- Texto para lectores de pantalla -->
      <div class="sr-only" aria-live="polite">
        ${resumenA11y}
      </div>
      
    </div>
  `;
}

//Actualiza la información
function actualizarInfoBox(estaciones, anio) {
  limpiarInfoBox();

  infoBoxControl = L.control({ position: "bottomright" });

  infoBoxControl.onAdd = function () {
    const div = L.DomUtil.create("div", "mapa__cuadro-info");

    // Solo mostrar cantidad de estaciones
    let html = `<b># Estaciones:</b> ${estaciones.length}`;

    // Mostrar mensajes según cantidad de estaciones
    if (anio && estaciones.length === 1) {
      html += `<br><small style="color: #666; margin-top: 4px; display: block; font-size: 10px">✅ Estación seleccionada automáticamente</small>`;
    }

    div.innerHTML = html;
    return div;
  };
  infoBoxControl.addTo(map);
}

// ==========================================================================
// FUNCIONES AUXILIARES PARA MARCADORES
// ==========================================================================

// Resalta un marcador de estación específico
function resaltarEstacionEnMapa(idEstacion) {
  console.log("✨ Resaltando estación:", idEstacion);

  Object.entries(marcadoresEstaciones).forEach(([id, marker]) => {
    const esSeleccionada = parseInt(id) === idEstacion;

    if (esSeleccionada) {
      marker.setZIndexOffset(1000);
      const latlng = marker.getLatLng();
      map.setView(latlng, 14, { animate: true });
      marker.openPopup();
    } else {
      marker.setZIndexOffset(0);
    }
  });
}

// ==========================================================================
// CREAR ICONOS CON COLORES PERSONALIZADOS
// ==========================================================================

/**
 * Crea un icono de Leaflet (pin) con un color dinámico.
 * @param {string} color - Color hexadecimal (ej. "#FF0000").
 * @param {boolean} [resaltado=false] - Si debe ser más grande.
 * @returns {L.Icon} Un objeto de icono de Leaflet.
 */
function crearIconoColor(color, resaltado = false) {
  console.log(`🎨 Creando ícono. Color: ${color}, Resaltado: ${resaltado}`);

  // 1. Validar el color
  if (!color || typeof color !== "string" || color.trim() === "") {
    color = "#9E9E9E"; // gris por defecto
  }

  // 2. Definir escala y tamaño base
  // El viewBox="0 0 25 41" significa que el ratio es 41/25 = 1.64
  const escala = resaltado ? 1.4 : 1;
  const anchoBase = 25;
  const ratio = 1.64;
  const ancho = anchoBase * escala;
  const alto = anchoBase * ratio * escala;

  // 3. Definir el ancla (la punta del pin)
  const anchor = [ancho / 2, alto];

  // 4. Crear el string SVG (IMPORTANTE: sin width= ni height=)
  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41">
      <path fill="${color}" stroke="#fff" stroke-width="2" 
            d="M12.5 0C5.6 0 0 5.6 0 12.5c0 8.4 12.5 28.5 12.5 28.5S25 20.9 25 12.5C25 5.6 19.4 0 12.5 0z"/>
      <circle cx="12.5" cy="12.5" r="6" fill="#fff" opacity="0.9"/>
    </svg>
  `;

  // 5. Codificar con btoa
  const iconUrl = "data:image/svg+xml;base64," + btoa(svgIcon.trim());

  // 6. Retornar el ícono de Leaflet
  return L.icon({
    iconUrl: iconUrl,
    shadowUrl: "",
    iconSize: [ancho, alto],
    iconAnchor: anchor,
    popupAnchor: [0, -alto + 10],
    className: resaltado ? "marcador-resaltado" : "marcador-normal",
  });
}

// ==========================================================================
//  FUNCIÓN GLOBAL: CENTRAR MAPA EN ESTACIÓN
// ==========================================================================

// Centra el mapa en una estación (llamado desde el popup)
window.centrarMapaEnEstacion = function (idEstacion) {
  console.log("🎯 Centrando mapa en estación:", idEstacion);
  const marker = marcadoresEstaciones[idEstacion];
  if (marker) {
    const latlng = marker.getLatLng();
    map.setView(latlng, 15, { animate: true, duration: 1 });

    // Cerrar el popup después de centrar
    setTimeout(() => { marker.closePopup(); }, 1500);

    mostrarEstado("📍 Mapa centrado en la estación");
    ocultarEstado(2000);
  }
};

// ==========================================================================
// FUNCIÓN GLOBAL: SELECCIONAR MUNICIPIO DESDE MARCADOR
// ==========================================================================

window.seleccionarMunicipioDesdeMarkador = async function (idMunicipio) {
  console.log("📍 Seleccionando municipio desde marcador:", idMunicipio);

  // 1. Actualizar el selector
  selectMunicipio.value = idMunicipio;
  // 2. Limpiar filtros dependientes
  resetearFiltrosDependientes(1);
  limpiarEstacionesDelMapa();
  limpiarInfoBox();
  // 3. Cargar años disponibles
  await cargarAniosPorMunicipio(idMunicipio);
  // 4. Cargar estaciones del municipio
  await cargarEstacionesPorMunicipio(idMunicipio);
};

// ==========================================================================
// FUNCIÓN GLOBAL PARA SINCRONIZACIÓN
// ==========================================================================

window.sincronizarEstacionConSelector = function (idEstacion) {
  console.log("🔄 Sincronizando estación:", idEstacion);

  selectEstacion.value = idEstacion;
  estacionSeleccionada = idEstacion;

  const event = new Event("change", { bubbles: true });
  selectEstacion.dispatchEvent(event);

  resaltarEstacionEnMapa(idEstacion);
};



// --- Lógica de Inicialización del Modo Oscuro ---

// ==========================================================================
// MODO OSCURO (CON CAMBIO DE MAPA)
// ==========================================================================

/*Función que activa o desactiva el modo oscuro en el sitio*/
function setModoOscuro(activado) {
  const textoModo = document.getElementById("estado-modo");

  if (activado) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('modoOscuro', 'activado');
    actualizarCapaMapa(true);
    btnModoOscuro.setAttribute('aria-pressed', 'true');
    textoModo.textContent = "Modo oscuro activo"; // ← accesible
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('modoOscuro', 'desactivado');
    actualizarCapaMapa(false);
    btnModoOscuro.setAttribute('aria-pressed', 'false');
    textoModo.textContent = "Modo claro activo"; // ← accesible
  }
}

/*Función que cambia la capa del mapa (tiles) según el modo oscuro.*/
function actualizarCapaMapa(estaEnModoOscuro) {
  if (estaEnModoOscuro) {
    // Si el mapa claro está, quitarlo
    if (map.hasLayer(capaMapaClaro)) {
      map.removeLayer(capaMapaClaro);
    }
    // Si el mapa oscuro NO está, agregarlo
    if (!map.hasLayer(capaMapaOscuro)) {
      map.addLayer(capaMapaOscuro);
    }
  } else {
    // Si el mapa oscuro está, quitarlo
    if (map.hasLayer(capaMapaOscuro)) {
      map.removeLayer(capaMapaOscuro);
    }
    // Si el mapa claro NO está, agregarlo
    if (!map.hasLayer(capaMapaClaro)) {
      map.addLayer(capaMapaClaro);
    }
  }
}

// Verificar si ya hay preferencia guardada
const modoGuardado = localStorage.getItem('modoOscuro');
  if (modoGuardado === 'activado') {
    setModoOscuro(true);
  } else {
    // Cargar el mapa claro por defecto si no hay nada guardado
    setModoOscuro(false); 
  }
