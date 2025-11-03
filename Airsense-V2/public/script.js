/* ==========================================================================
   CONFIGURACIÓN INICIAL DEL MAPA
   ==========================================================================
   Este bloque inicializa el mapa de Leaflet centrado en el Valle del Cauca,
   define las capas base (modo claro y oscuro), y configura las referencias
   principales del DOM para la interacción con los filtros y el estado del mapa.
========================================================================== */


const map = L.map("map").setView([4, -76.55], 8.5);

/* -------------------- Capas base del mapa -------------------- */
const urlMapaClaro = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const atribClaro = "© OpenStreetMap contributors";
const capaMapaClaro = L.tileLayer(urlMapaClaro, { attribution: atribClaro, pane: 'tilePane' });

const urlMapaOscuro = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const atribOscuro = '© OpenStreetMap contributors & © CartoDB';
const capaMapaOscuro = L.tileLayer(urlMapaOscuro, { attribution: atribOscuro, pane: 'tilePane' });


// ==========================================================================
// REFERENCIAS DEL DOM
// ==========================================================================

const selectMunicipio = document.getElementById("selectMunicipio");
const selectAnio = document.getElementById("selectAnio");
const selectEstacion = document.getElementById("selectEstacion");
const selectContaminante = document.getElementById("selectContaminante");

const statusMsg = document.createElement("span");
statusMsg.id = "status";
statusMsg.style.textAlign = "center";
statusMsg.style.color = "#555";
statusMsg.style.fontStyle = "italic";
statusMsg.style.transition = "opacity 0.4s ease";
document.getElementById("estadoMapa").appendChild(statusMsg);

// ==========================================================================
// VARIABLES GLOBALES
// ==========================================================================

let infoBoxControl = null;
let marcadoresEstaciones = {};
let estacionSeleccionada = null;
let capaMunicipios = L.layerGroup().addTo(map);

// ==========================================================================
// FUNCIONES DE RETROALIMENTACIÓN VISUAL
// ==========================================================================

/**
 * Muestra un mensaje de estado al usuario en la UI.
 * @param {string} texto - El mensaje a mostrar.
 */
function mostrarEstado(texto) {
  statusMsg.textContent = texto;
  document.getElementById("estadoMapa").classList.add("visible");
}

/**
 * Oculta el mensaje de estado después de un tiempo.
 * @param {number} [delay=300] - Tiempo en milisegundos antes de ocultar.
 */
function ocultarEstado(delay = 300) {
  setTimeout(() => {
    document.getElementById("estadoMapa").classList.remove("visible");
    setTimeout(() => {
      statusMsg.textContent = "";
    }, 400);
  }, delay);
}

// ==========================================================================
// CARGA Y VISUALIZACIÓN DE MUNICIPIOS
// ==========================================================================

//Carga inicial: Obtiene los municipios de la API y los muestra.
async function cargarMunicipios() {
  try {
    mostrarEstado("Cargando municipios...");

    const response = await fetch("http://localhost:3000/api/municipios");
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

/**
 * Rellena el <select> de municipios.
 * @param {Array<Object>} municipios - Lista de municipios.
 */
function llenarSelectMunicipios(municipios) {
  selectMunicipio.innerHTML = '<option value="">-- Selecciona --</option>';

  municipios.forEach((m) => {
    const option = document.createElement("option");
    option.value = m.id_municipio;
    option.textContent = m.nombre_municipio;
    selectMunicipio.appendChild(option);
  });
}

/**
 * Muestra los marcadores de los municipios en el mapa.
 * @param {Array<Object>} municipios - Lista de municipios.
 */
function mostrarMunicipiosEnMapa(municipios) {
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

/**
 * Resetea los <select> dependientes a su estado inicial.
 * @param {number} nivel - Nivel de reseteo (1: Año, 2: Estación, 3: Contaminante).
 */
function resetearFiltrosDependientes(nivel) {
  if (nivel <= 1) {
    selectAnio.innerHTML =
      '<option value="">-- Primero selecciona municipio --</option>';
    selectAnio.disabled = true;
  }

  if (nivel <= 2) {
    selectEstacion.innerHTML =
      '<option value="">-- Primero selecciona año --</option>';
    selectEstacion.disabled = true;
  }

  if (nivel <= 3) {
    selectContaminante.innerHTML =
      '<option value="">-- Primero selecciona estación --</option>';
    selectContaminante.disabled = true;
  }

  // Limpia también el panel lateral de información
  if (nivel <= 3) {
    limpiarPanelInformacion();

    // Resetea el color de todos los marcadores a gris
    Object.entries(marcadoresEstaciones).forEach(([id, marker]) => {
      marker.setIcon(crearIconoColor("#9E9E9E", false));
    });
  }
}

// ==========================================================================
// CARGAR AÑOS POR MUNICIPIO
// ==========================================================================

/**
 * Obtiene los años con datos disponibles para un municipio específico.
 * @param {string} idMunicipio - El ID del municipio a consultar.
 */
async function cargarAniosPorMunicipio(idMunicipio) {
  try {
    mostrarEstado("Cargando años disponibles...");
    const response = await fetch(`http://localhost:3000/api/anios/${idMunicipio}`);
    if (!response.ok) {
      if (response.status === 404) {throw new Error("No hay datos para este municipio");}
      throw new Error("Error al obtener años");
    }
    const data = await response.json();
    selectAnio.innerHTML = '<option value="">-- Selecciona año --</option>';
    data.anios_disponibles.forEach((anio) => {
      const option = document.createElement("option");
      option.value = anio;
      option.textContent = anio;
      selectAnio.appendChild(option);
    });

    selectAnio.disabled = false;

    mostrarEstado(
      `${data.anios_disponibles.length} años disponibles para ${data.municipio}.`
    );
    ocultarEstado(2500);
  } catch (error) {
    console.error("❌ Error al cargar años:", error);
    mostrarEstado(`❌ ${error.message}`);
    ocultarEstado(3000);
  }
}

// ==========================================================================
// CARGAR ESTACIONES POR MUNICIPIO
// ==========================================================================

/**
 * Obtiene las estaciones de un municipio y las muestra en el mapa.
 * @param {string} idMunicipio - El ID del municipio.
 */
async function cargarEstacionesPorMunicipio(idMunicipio) {
  try {
    mostrarEstado("Cargando estaciones...");
    
    const response = await fetch(`http://localhost:3000/api/estaciones/${idMunicipio}`);
    if (!response.ok) {
      throw new Error("Error al obtener estaciones");
    }
    
    const estaciones = await response.json();
    
    // Llama a la función que las dibuja
    mostrarEstacionesEnMapa(estaciones, null, false); 
    
    mostrarEstado(`${estaciones.length} estaciones encontradas.`);
    ocultarEstado(2500);

  } catch (error) {
    console.error("❌ Error al cargar estaciones:", error);
    mostrarEstado("❌ No se pudieron cargar las estaciones.");
  }
}

// ==========================================================================
// FUNCIÓN UNIFICADA: MOSTRAR ESTACIONES EN EL MAPA
// ==========================================================================

/**
 * Renderiza los marcadores de las estaciones en el mapa.
 * @param {Array<Object>} estaciones - Lista de estaciones a mostrar.
 * @param {string|null} anio - El año seleccionado (para el popup).
 * @param {boolean} conInteractividad - Si los marcadores deben ser clickables para seleccionar.
 */
function mostrarEstacionesEnMapa(
  estaciones,
  anio = null,
  conInteractividad = false
) {
  console.log("🗺️ Actualizando mapa con", estaciones.length, "estaciones");

  // 1. LIMPIAR TODO ANTES DE RENDERIZAR
  limpiarEstacionesDelMapa();
  limpiarInfoBox();

  if (estaciones.length === 0) {
    mostrarEstado("⚠️ No hay estaciones para mostrar");
    map.setView([4, -76.55], 8.5);
    return;
  }

  // 2. RENDERIZAR CADA ESTACIÓN
  estaciones.forEach((est) => {
    if (est.latitud && est.longitud) {
      const esSeleccionada = estacionSeleccionada === est.id_estacion;

      const colorPorDefecto = "#9E9E9E"; //Gris

      const marker = L.marker(
        [parseFloat(est.latitud), parseFloat(est.longitud)],
        {
          icon: crearIconoColor(colorPorDefecto, esSeleccionada),
        }
      ).addTo(map);

      // Popup siempre interactivo
      marker.bindPopup(crearPopupInteractivo(est, anio));

      if (conInteractividad) {
        marker.on("click", () => {
          window.sincronizarEstacionConSelector(est.id_estacion);
        });
      }

      marker.bindTooltip(est.nombre_estacion, {
        permanent: false,
        direction: "top",
        offset: [0, -5],
        opacity: 0.9,
      });

      marcadoresEstaciones[est.id_estacion] = marker;
    }
  });

  // 3. CENTRAR MAPA
  const primeraEstacion = estaciones[0];
  map.setView(
    [parseFloat(primeraEstacion.latitud), parseFloat(primeraEstacion.longitud)],
    13
  );

  // 4. ACTUALIZAR CUADRO INFORMATIVO
  actualizarInfoBox(estaciones, anio);

  // 5. SELECCIÓN AUTOMÁTICA SI SOLO HAY 1 ESTACIÓN
  if (conInteractividad && estaciones.length === 1) {
    console.log("🎯 Solo 1 estación, seleccionando automáticamente...");
    setTimeout(() => {
      window.sincronizarEstacionConSelector(estaciones[0].id_estacion);
    }, 500); // Pequeño delay para que se vea la animación
  }
}

// ==========================================================================
// FUNCIONES AUXILIARES PARA POPUPS
// ==========================================================================

// Crea el HTML para el popup de un marcador de estación
function crearPopupInteractivo(est, anio) {
  return `
    <div style="min-width: 200px; max-width: 220px; font-family: 'Segoe UI', sans-serif; padding: 4px;">
      <div style="background: #fff; padding: 12px; border-left: 4px solid #2a5d67;">
        <strong style="font-size: 1.15em; color: #2a5d67; display: block; margin-bottom: 8px;">
          ${est.nombre_estacion}
        </strong>
        ${est.tipo_estacion ? `
          <span style="display: inline-block; background: #e8f4f8; color: #2a5d67; padding: 3px 8px; border-radius: 4px; font-size: 1.1em; font-weight: 500;">
            📍 ${est.tipo_estacion}
          </span>
        ` : ''}
      </div>
            
      <div style="padding: 10px 12px; font-size: 1.1em; color: #555; line-height: 1.6; background: #f9fafb;">
        <div style="margin-bottom: 5px;">
          <span style="color: #888; font-size: 1.1em;">Latitud:</span>
          <strong style="float: right; color: #2a5d67;">${parseFloat(est.latitud).toFixed(4)}°</strong>
        </div>
        <div style="margin-bottom: ${anio ? '12px' : '0'};">
          <span style="color: #888; font-size: 1.1em;">Longitud:</span>
          <strong style="float: right; color: #2a5d67;">${parseFloat(est.longitud).toFixed(4)}°</strong>
        </div>
      </div>
      
      ${anio ? `
        <button 
          onclick="window.centrarMapaEnEstacion(${est.id_estacion})"
          style="
            width: 100%;
            padding: 10px 12px;
            background: #2a5d67;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
            font-size: 0.95em;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(42, 93, 103, 0.2);
          "
          onmouseover="this.style.background='#1e4a54'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(42, 93, 103, 0.3)'"
          onmouseout="this.style.background='#2a5d67'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(42, 93, 103, 0.2)'"
        >
          🎯 Centrar aquí
        </button>
      ` : ''}
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
    setTimeout(() => {
      marker.closePopup();
    }, 1500);

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

// ==========================================================================
// CARGAR CONTAMINANTES POR ESTACIÓN
// ==========================================================================

/**
 * Carga los contaminantes medidos por una estación en un año específico.
 * @param {string} idEstacion - ID de la estación.
 * @param {string} anio - Año seleccionado.
 */
async function cargarContaminantesPorEstacion(idEstacion, anio) {
  try {
    mostrarEstado("Cargando contaminantes disponibles...");

    const responseContaminantes = await fetch(`http://localhost:3000/api/contaminantes/${idEstacion}/${anio}`
    );

    if (!responseContaminantes.ok) {
      if (responseContaminantes.status === 404) {
        throw new Error("No hay contaminantes medidos en este período");
      }
      throw new Error("Error al obtener contaminantes");
    }

    const dataContaminantes = await responseContaminantes.json();

    selectContaminante.innerHTML =
      '<option value="">-- Selecciona contaminante --</option>';

    dataContaminantes.contaminantes.forEach((cont) => {
      cont.tiempos_exposicion.forEach((tiempo) => {
        const option = document.createElement("option");
        option.value = tiempo.id_exposicion;
        option.textContent = `${cont.simbolo} - ${tiempo.tiempo_texto}`;
        option.dataset.simbolo = cont.simbolo;
        option.dataset.tiempoHoras = tiempo.tiempo_horas;
        selectContaminante.appendChild(option);
      });
    });

    selectContaminante.disabled = false;

    mostrarEstado(
      `${dataContaminantes.total_contaminantes} contaminantes disponibles.`
    );
    ocultarEstado(2500);
  } catch (error) {
    console.error("❌ Error al cargar contaminantes:", error);
    mostrarEstado(`❌ ${error.message}`);
    selectContaminante.disabled = true;
    ocultarEstado(3000);
  }
}

// ==========================================================================
// EVENT LISTENER: MUNICIPIO
// ==========================================================================

selectMunicipio.addEventListener("change", async (e) => {
  const idMunicipio = e.target.value;

  console.log("🏙️ Cambio de municipio:", idMunicipio);

  // Limpieza general
  resetearFiltrosDependientes(1);
  limpiarEstacionesDelMapa();
  limpiarInfoBox();

  if (!idMunicipio) {
    map.setView([4, -76.55], 8.5);
    mostrarEstado("Vista general del Valle del Cauca");
    ocultarEstado(2000);
    return;
  }
  
  // Cargar datos dependientes
  await cargarAniosPorMunicipio(idMunicipio);
  await cargarEstacionesPorMunicipio(idMunicipio);
});

// ==========================================================================
// EVENT LISTENER: AÑO
// ==========================================================================

selectAnio.addEventListener("change", async (e) => {
  const anio = e.target.value;
  const idMunicipio = selectMunicipio.value;

  console.log("📅 Cambio de año:", anio);

  resetearFiltrosDependientes(2);

  if (!anio) {
    await cargarEstacionesPorMunicipio(idMunicipio);
    return;
  }

  // Si se selecciona un año, cargar estaciones CON interactividad
  try {
    mostrarEstado(`Cargando estaciones operativas en ${anio}...`);

    const response = await fetch(`http://localhost:3000/api/estaciones/${idMunicipio}/${anio}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`No hay estaciones con datos para el año ${anio}`);
      }
      throw new Error("Error al obtener estaciones");
    }

    const data = await response.json();

    // Mostrar en el mapa (CON interactividad y selección automática si solo hay 1)
    mostrarEstacionesEnMapa(data.estaciones, anio, true);

    // Llenamos el selector de estaciones
    selectEstacion.innerHTML =
      '<option value="">-- Selecciona estación --</option>';

    data.estaciones.forEach((est) => {
      const option = document.createElement("option");
      option.value = est.id_estacion;
      option.textContent = est.nombre_estacion;
      selectEstacion.appendChild(option);
    });

    selectEstacion.disabled = false;
    mostrarEstado(`${data.total_estaciones} estaciones operativas en ${anio}.`);
    ocultarEstado(2500);
  } catch (error) {
    console.error("❌ Error al cargar estaciones por año:", error);
    mostrarEstado(`❌ ${error.message}`);
    ocultarEstado(3000);
  }
});

// ==========================================================================
// EVENT LISTENER: ESTACIÓN
// ==========================================================================

selectEstacion.addEventListener("change", async (e) => {
  const idEstacion = e.target.value;
  const anio = selectAnio.value;

  console.log("🏭 Cambio de estación:", idEstacion);

  resetearFiltrosDependientes(3);
  estacionSeleccionada = parseInt(idEstacion);

  if (!idEstacion) {
    estacionSeleccionada = null;
    estacionSeleccionada = idEstacion ? parseInt(idEstacion) : null;
    // SOLO restaurar tamaños, NO remover marcadores
    Object.values(marcadoresEstaciones).forEach((marker) => {
      marker.setIcon(crearIconoColor("#9E9E9E", false)); // Gris por defecto
    });
    return;
  }

  // Resalta el marcador y carga los contaminantes
  resaltarEstacionEnMapa(estacionSeleccionada);
  await cargarContaminantesPorEstacion(idEstacion, anio);
});

// ==========================================================================
// EVENT LISTENER: CONTAMINANTE 
// ==========================================================================

selectContaminante.addEventListener("change", async (e) => {
  const idExposicion = e.target.value;
  if (!idExposicion) {
    limpiarPanelInformacion(); // Limpia el panel si deselecciona
    return;
  }
  const idEstacion = selectEstacion.value;
  const anio = selectAnio.value;

  console.log("⚗️ Cambio de contaminante:", idExposicion);

  // Cargar datos históricos del contaminante
  await cargarDatosHistoricos(idEstacion, anio, idExposicion);
});

// ==========================================================================
// TAREA 4: CARGAR Y MOSTRAR DATOS HISTÓRICOS
// ==========================================================================

async function cargarDatosHistoricos(idEstacion, anio, idExposicion) {
  try {
    mostrarEstado("📊 Cargando datos del contaminante...");

    const response = await fetch(
      `http://localhost:3000/api/datos?estacion=${idEstacion}&anio=${anio}&exposicion=${idExposicion}`
    );

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("No hay datos disponibles para esta combinación");
      }
      throw new Error("Error al obtener datos históricos");
    }

    const datos = await response.json();

    console.log("📊 Datos recibidos:", datos);

    // Renderizar en el panel de información
    mostrarInformacionContaminante(datos);

    mostrarEstado("✅ Datos cargados correctamente");
    ocultarEstado(2000);
  } catch (error) {
    console.error("❌ Error al cargar datos históricos:", error);
    mostrarEstado(`❌ ${error.message}`);
    ocultarEstado(3000);

    // Mostrar error en el panel
    mostrarErrorEnPanel(error.message);
  }
}

// ==========================================================================
// RENDERIZAR INFORMACIÓN DEL CONTAMINANTE
// ==========================================================================

function mostrarInformacionContaminante(datos) {
  
  // --- Modificado ---
  try {
    if (estacionSeleccionada && marcadoresEstaciones[estacionSeleccionada]) {
      const colorDeClasificacion = datos.clasificacion.color;
      const marcador = marcadoresEstaciones[estacionSeleccionada];
      marcador.setIcon(crearIconoColor(colorDeClasificacion, true));
      
    }
  } catch (error) {
    console.error("Error al actualizar el ícono del marcador:", error);
  }
  // --- FIN DEL BLOQUE A AÑADIR ---
  // Ocultar instrucciones
  const instrucciones = document.querySelector("panel-resultados");
  if (instrucciones) {
    instrucciones.classList.add("oculto");
  }
  const panel = document.getElementById("informacionContaminantes");

  // Construir HTML con la estructura de 3 niveles que diseñamos antes
  const html = `
    <div class="informacion-contaminante">
      
      <!-- NIVEL 1: Hero Card -->
      <div class="info-hero" style="background-color: ${
        datos.clasificacion.color
      }; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h2 style="margin: 0 0 10px 0; color: #000; font-size: 1.8em;">
          ${datos.contaminante.simbolo}
        </h2>
        <p style="margin: 0; font-size: 1.2em; font-weight: 600; color: #000;">
          ${datos.contaminante.tiempo_exposicion.texto}
        </p>
      </div>

      <!-- NIVEL 2: Estadísticas Clave -->
      <div class="info-estadisticas" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 15px 0; color: #2a5d67; border-bottom: 2px solid #a8d0da; padding-bottom: 8px;">
          📊 Estadísticas Principales
        </h3>
        
        <div class="stat-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="stat-item" style="background: white; padding: 12px; border-radius: 6px;">
            <p style="margin: 0; font-size: 0.85em; color: #666;">Promedio</p>
            <p style="margin: 5px 0 0 0; font-size: 1.4em; font-weight: bold; color: #2a5d67;">
              ${datos.estadisticas.promedio.toFixed(2)}
            </p>
            <p style="margin: 0; font-size: 0.75em; color: #888;">${
              datos.contaminante.unidades
            }</p>
          </div>
          
          <div class="stat-item" style="background: white; padding: 12px; border-radius: 6px;">
            <p style="margin: 0; font-size: 0.85em; color: #666;">Máximo</p>
            <p style="margin: 5px 0 0 0; font-size: 1.4em; font-weight: bold; color: #ff4444;">
              ${datos.estadisticas.maximo.toFixed(2)}
            </p>
            <p style="margin: 0; font-size: 0.75em; color: #888;">${
              datos.contaminante.unidades
            }</p>
          </div>
          
          <div class="stat-item" style="background: white; padding: 12px; border-radius: 6px;">
            <p style="margin: 0; font-size: 0.85em; color: #666;">Mínimo</p>
            <p style="margin: 5px 0 0 0; font-size: 1.4em; font-weight: bold; color: #414141ff;">
              ${datos.estadisticas.minimo.toFixed(2)}
            </p>
            <p style="margin: 0; font-size: 0.75em; color: #888;">${
              datos.contaminante.unidades
            }</p>
          </div>
          
          <div class="stat-item" style="background: white; padding: 12px; border-radius: 6px;">
            <p style="margin: 0; font-size: 0.85em; color: #666;">Días con excedencias</p>
            <p style="margin: 5px 0 0 0; font-size: 1.4em; font-weight: bold; color: #ff8800;">
              ${datos.excedencias.dias_excendecias}
            </p>
            <p style="margin: 0; font-size: 0.75em; color: #888;">días</p>
          </div>
        </div>
        
        ${
          datos.clasificacion.limites_oms
            ? `
              <div style="margin-top: 18px; padding: 12px; background: #eef9f3; border-radius: 6px; border-left: 4px solid #28a745;">
                <p style="margin: 0 0 6px 0; font-size: 0.95em; color: #155724; font-weight: bold;">
                  🌍 Límites según OMS (${datos.clasificacion.limites_oms.tiempo_horas}h)
                </p>
                <p style="margin: 0; font-size: 0.85em; color: #155724;">
                  Buena ≤ <strong>${datos.clasificacion.limites_oms.buena}</strong> ${datos.contaminante.unidades}<br>
                  Regular ≤ <strong>${datos.clasificacion.limites_oms.regular}</strong> ${datos.contaminante.unidades}
                </p>
                <p style="margin: 6px 0 0 0; font-size: 0.75em; color: #666; font-style: italic;">
                  Fuente: ${datos.clasificacion.limites_oms.fuente}
                </p>
              </div>
            `
            : ""
        }

        <div style="margin-top: 15px; padding: 12px; background: #e8f4f8; border-radius: 6px; border-left: 4px solid #2a5d67;">
          <p style="margin: 0; font-size: 0.9em; color: #2a5d67;">
            <strong>Fecha del pico máximo:</strong><br>
            ${formatearFecha(datos.estadisticas.fecha_hora_maximo)}
          </p>
        </div>
      </div>

      <!-- NIVEL 3: Detalles Técnicos (Colapsable) -->
      <details class="info-detalles" style="margin-bottom: 20px;">
        <summary style="cursor: pointer; padding: 12px; background: #e9ecef; border-radius: 6px; font-weight: 600; color: #2a5d67;">
          🔍 Ver detalles técnicos
        </summary>
        <div style="padding: 15px; background: #f8f9fa; border-radius: 0 0 6px 6px;">
          <p style="margin: 8px 0;"><strong>Mediana:</strong> ${datos.estadisticas.mediana.toFixed(
            2
          )} ${datos.contaminante.unidades}</p>
          <p style="margin: 8px 0;"><strong>Percentil 98:</strong> ${datos.estadisticas.percentil_98.toFixed(
            2
          )} ${datos.contaminante.unidades}</p>
          <p style="margin: 8px 0;"><strong>Excedencias del límite actual:</strong> ${
            datos.excedencias.excedencias_limite_actual
          }</p>
          <p style="margin: 8px 0;"><strong>% de excedencias:</strong> ${datos.excedencias.porcentaje_excedencias.toFixed(
            2
          )}%</p>
          <p style="margin: 8px 0;"><strong>Representatividad temporal:</strong> ${datos.calidad_datos.representatividad_temporal.toFixed(
            1
          )}%</p>
        </div>
      </details>

      <!-- Footer: Interpretación -->
      <div class="info-interpretacion" style="background: linear-gradient(135deg, #f7f9fb 0%, #ffffff 100%); padding: 15px; border-radius: 8px; border: 2px solid #d1e7ec;">
        <h4 style="margin: 0 0 10px 0; color: #2a5d67; display: flex; align-items: center; gap: 8px;">
          <span>💡</span> Interpretación
        </h4>
        <p style="margin: 0; line-height: 1.6; color: #555;">
          ${datos.clasificacion.descripcion}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 0.85em; color: #666; font-style: italic; border-top: 1px solid #e0e0e0; padding-top: 8px;">
          ℹ️ Clasificación basada en las <strong>Guías de Calidad del Aire de la OMS 2021</strong>, 
          más estrictas que la normativa colombiana vigente (Resolución 2254 de 2017).
        </p>
      </div>
    </div>
  `;

  panel.innerHTML = html;
}

// ==========================================================================
// FUNCIONES AUXILIARES PARA PANEL DE INFORMACIÓN
// ==========================================================================

function formatearFecha(fechaISO) {
  if (!fechaISO) return "No disponible";

  const fecha = new Date(fechaISO);
  const opciones = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };

  return fecha.toLocaleDateString("es-CO", opciones);
}

function limpiarPanelInformacion() {
  const panel = document.getElementById("informacionContaminantes");
  if (!panel) return;

  // Limpiamos solo el contenido dinámico
  panel.innerHTML = `
    <div style="text-align: center; padding: 25px 20px;">
      <h2 style="margin-bottom: 15px; color: #2c3e50; font-size: 24px;">
        Cómo usar la aplicación 🌍
      </h2>
      <p style="color: #5a6c7d; margin-bottom: 30px; font-size: 14px; line-height: 1.6; max-width: 320px; margin-left: auto; margin-right: auto;">
        Explora 13 años de datos históricos (2011-2023) de calidad del aire en el Valle del Cauca
      </p>
      
      <div style="display: inline-block; text-align: left; width: 100%; max-width: 340px;">
        <div style="margin-bottom: 12px; padding: 14px 16px; background: linear-gradient(135deg, #96ac61ff 0%, #a7d16dff 100%); border-radius: 10px; color: white; box-shadow: 0 2px 8px rgba(74, 124, 89, 0.2);">
          <div style="font-weight: bold; font-size: 13px; opacity: 0.9; margin-bottom: 4px;">PASO 1</div>
          <div style="font-size: 15px;">📍 Selecciona un <b>municipio</b> del Valle del Cauca</div>
        </div>
        
        <div style="margin-bottom: 12px; padding: 14px 16px; background: linear-gradient(135deg, #6aa1beff 0%, #73b4f1ff 100%); border-radius: 10px; color: white; box-shadow: 0 2px 8px rgba(91, 138, 114, 0.2);">
          <div style="font-weight: bold; font-size: 13px; opacity: 0.9; margin-bottom: 4px;">PASO 2</div>
          <div style="font-size: 15px;">🎯 Haz <b>clic en una estación</b> de monitoreo</div>
        </div>
        
        <div style="margin-bottom: 12px; padding: 14px 16px; background: linear-gradient(135deg, #f36c6cff 0%, #d66576ff 100%); border-radius: 10px; color: white; box-shadow: 0 2px 8px rgba(106, 158, 138, 0.2);">
          <div style="font-weight: bold; font-size: 13px; opacity: 0.9; margin-bottom: 4px;">PASO 3</div>
          <div style="font-size: 15px;">🧪 Escoge un <b>contaminante</b> atmosférico</div>
        </div>
        
        <div style="padding: 14px 16px; background: linear-gradient(135deg, #5be795ff 0%, #3ada92ff 100%); border-radius: 10px; color: white; box-shadow: 0 2px 8px rgba(120, 178, 153, 0.2);">
          <div style="font-weight: bold; font-size: 13px; opacity: 0.9; margin-bottom: 4px;">PASO 4</div>
          <div style="font-size: 15px;">📊 Consulta <b>datos y límites OMS</b></div>
        </div>
      </div>
    </div>
  `;
   // Volvemos a mostrar el bloque de instrucciones
  const instrucciones = document.querySelector(".panel-instrucciones");
  if (instrucciones) {
    instrucciones.classList.remove("oculto");
  }
}

function mostrarErrorEnPanel(mensaje) {
  const panel = document.getElementById("informacionContaminantes");
  panel.innerHTML = `
    <div style="padding: 20px; text-align: center;">
      <div style="font-size: 3em; margin-bottom: 10px;">⚠️</div>
      <h3 style="color: #dc3545; margin-bottom: 10px;">Error al cargar datos</h3>
      <p style="color: #666;">${mensaje}</p>
      <button 
        onclick="location.reload()" 
        style="margin-top: 15px; padding: 10px 20px; background: #2a5d67; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"
      >
        🔄 Recargar página
      </button>
    </div>
  `;
}

// ==========================================================================
// BOTÓN LIMPIAR FILTROS
// ==========================================================================

const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');

// Verofica si hay filtros activos
function hayFiltrosActivos() {
  return selectMunicipio.value !== '' || 
         selectAnio.value !== '' || 
         selectEstacion.value !== '' || 
         selectContaminante.value !== '';
}

// Habilita o desabilita el boton de limpia
function actualizarBotonLimpiar() {
  if (hayFiltrosActivos()) {
    btnLimpiarFiltros.disabled = false;
  } else {
    btnLimpiarFiltros.disabled = true;
  }
}

// Evento del botón limpiar
btnLimpiarFiltros.addEventListener('click', () => {
  if (!hayFiltrosActivos()) return;

  console.log("🗑️ Limpiando filtros...");

  // 1. Resetear todos los selectores
  selectMunicipio.value = '';
  selectAnio.value = '';
  selectAnio.disabled = true;
  selectEstacion.value = '';
  selectEstacion.disabled = true;
  selectContaminante.value = '';
  selectContaminante.disabled = true;

  // 2. Limpiar mapa
  limpiarEstacionesDelMapa();
  limpiarInfoBox();

  // 3. Volver a la vista general
  map.setView([4, -76.55], 8.5);

  // 4. Limpiar panel de información
  limpiarPanelInformacion();

  // 5. Actualizar estado del botón
  actualizarBotonLimpiar();

  // 6. Mostrar mensaje
  mostrarEstado("✨ Filtros limpiados - Vista general");
  ocultarEstado(2000);
});

// Actualizar el estado del botón cuando cambie cualquier filtro
selectMunicipio.addEventListener('change', actualizarBotonLimpiar);
selectAnio.addEventListener('change', actualizarBotonLimpiar);
selectEstacion.addEventListener('change', actualizarBotonLimpiar);
selectContaminante.addEventListener('change', actualizarBotonLimpiar);

// ==========================================================================
// MODO OSCURO (CON CAMBIO DE MAPA)
// ==========================================================================

const btnModoOscuro = document.getElementById('btnModoOscuro');

/**
 * Función que cambia la capa del mapa (tiles) según el modo oscuro.
 */
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

/**
 * Función que activa o desactiva el modo oscuro en TODO el sitio
 */
function setModoOscuro(activado) {
  if (activado) {
    document.body.classList.add('dark-mode');
    localStorage.setItem('modoOscuro', 'activado');
    actualizarCapaMapa(true);
  } else {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('modoOscuro', 'desactivado');
    actualizarCapaMapa(false);
  }
}

// --- Lógica de Inicialización del Modo Oscuro ---

// Verificar si ya hay preferencia guardada
const modoGuardado = localStorage.getItem('modoOscuro');
if (modoGuardado === 'activado') {
  setModoOscuro(true);
} else {
  // Cargar el mapa claro por defecto si no hay nada guardado
  setModoOscuro(false); 
}

// Listener del botón
btnModoOscuro.addEventListener('click', () => {
  // Invertir el estado actual
  const estaActivadoAhora = document.body.classList.contains('dark-mode');
  setModoOscuro(!estaActivadoAhora);
});

// ==========================================================================\
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================================================\

/** Función principal que inicia el visor */
function inicializarVisor() {
  cargarMunicipios();
  actualizarBotonLimpiar(); // Estado inicial del botón
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", inicializarVisor);
