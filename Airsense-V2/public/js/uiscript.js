/* ==========================================================================
   CONFIGURACIÓN INICIAL DEL MAPA
   ==========================================================================*/

// URL base de la API para todas las peticiones
const API_BASE_URL = "https://airsense-v2.onrender.com/api"; 

// ==========================================================================
// REFERENCIAS DEL DOM
// ==========================================================================

const selectMunicipio = document.getElementById("selectMunicipio");
const selectAnio = document.getElementById("selectAnio");
const selectEstacion = document.getElementById("selectEstacion");
const selectContaminante = document.getElementById("selectContaminante");

const statusMsg = document.createElement("span");
statusMsg.id = "status";
statusMsg.setAttribute("aria-live", "polite");
statusMsg.style.textAlign = "center";
statusMsg.style.color = "#555";
statusMsg.style.fontStyle = "italic";
statusMsg.style.transition = "opacity 0.4s ease";
document.getElementById("estadoMapa").appendChild(statusMsg);

const btnModoOscuro = document.getElementById('btnModoOscuro');
const btnLimpiarFiltros = document.getElementById('btnLimpiarFiltros');

// =========================================================================
// FUNCIONES DE UTILIDAD 
// =========================================================================
/**
 * Muestra un mensaje de estado al usuario en la UI.
 * @param {string} texto - El mensaje a mostrar.
 */
function mostrarErrorEnSelector(selectElement, mensaje) {
  // Limpia cualquier opción anterior
  selectElement.innerHTML = ''; 
  
  // Deshabilita el selector
  selectElement.disabled = true;

  // Crea y añade la opción de error
  const opcionError = document.createElement('option');
  opcionError.value = "";
  opcionError.textContent = `⚠️ ${mensaje}`;
  
  // (Opcional) Añade un poco de estilo para que se vea como un error
  selectElement.style.color = '#d9534f'; // Rojo
  
  selectElement.appendChild(opcionError);
}

// ==========================================================================
// FUNCIONES DE RETROALIMENTACIÓN VISUAL
// ==========================================================================

/**
 * Muestra un mensaje de estado al usuario en la UI.
 * @param {string} texto - El mensaje a mostrar.
 */
function mostrarEstado(texto) {
  const estadoMapa = document.getElementById("estadoMapa");

  // Actualiza visualmente el mensaje
  statusMsg.textContent = texto;
  estadoMapa.classList.add("visible");

  // 🟩 Mejora de accesibilidad: anuncio para lectores de pantalla
  estadoMapa.setAttribute("aria-live", "polite");
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

async function cargarMunicipios() {
  // 1. Lógica de UI 
  selectMunicipio.setAttribute('aria-busy', 'true');
  selectMunicipio.innerHTML = '<option value="">Cargando municipios...</option>';
  selectMunicipio.disabled = true;
  selectMunicipio.style.color = ''; // Resetear el color de error

  try {
    // 2. Lógica de UI 
    mostrarEstado("Cargando municipios...");
    const data = await apiClient("/municipios"); 

    // 4. Lógica de ÉXITO 
    if (!data || data.length === 0) {throw new Error("No se encontraron municipios");}

    selectMunicipio.innerHTML = '<option value="">-- Todos los Municipios --</option>';
    data.forEach((m) => {
      const option = document.createElement("option");
      option.value = m.id_municipio;
      option.textContent = m.nombre_municipio;
      selectMunicipio.appendChild(option);
    });

    selectMunicipio.disabled = false;

     notificarCarga({
      cantidad: data.length, tipo: "municipios",
      selectId: "selectMunicipio", selectElement: selectMunicipio,
      textoLabel: `Municipio (${data.length} opciones disponibles)`
    });

  } catch (error) {
    // 5. Lógica de ERROR Este catch atrapa CUALQUIER error que 'apiClient' le lance.
    console.error("❌ Error cargando municipios:", error);
    mostrarEstado(`❌ ${error.message}`);
    ocultarEstado(3000);
    // Lógica de error en el select
    selectMunicipio.innerHTML = `<option value="">⚠️ ${error.message}</option>`;
    selectMunicipio.style.color = '#d9534f';
  }finally {
    selectMunicipio.setAttribute('aria-busy', 'false'); 
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
  selectAnio.innerHTML = '<option value="">Cargando años...</option>';
  selectAnio.disabled = true;
  selectAnio.style.color = ''; 

  try {
    mostrarEstado("Cargando años disponibles...");
    const response = await fetch(`${API_BASE_URL}/anios/${idMunicipio}`);
    if (!response.ok) {
      if (response.status === 404) {throw new Error("No hay datos para este municipio");}
      throw new Error("Error al obtener años");
    }
    const data = await response.json();
    selectAnio.setAttribute("aria-label", `Año (${data.anios_disponibles.length} opciones disponibles)`);
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
    habilitarLecturaSelect("selectAnio", "estado-anio");
  } catch (error) {
    mostrarEstado(`❌ ${error.message}`);
    ocultarEstado(3000);
    
    // 2. Actualiza el <select> para que no se quede "cargando"
    selectAnio.innerHTML = '<option value="">⚠️ Error al cargar</option>';
    selectAnio.style.color = '#d9534f'; // Rojo
    selectAnio.disabled = true;

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
    const estaciones = await apiClient(`/estaciones/${idMunicipio}`);

    // 3. Lógica de ÉXITO apiClient ya maneja el caso de 0 estaciones si lanza un error
    mostrarEstacionesEnMapa(estaciones, null, false); 
    
    notificarCarga({
      cantidad: estaciones.length, tipo: "estaciones",
      selectId: "selectEstacion", selectElement: selectEstacion,
      textoLabel: `Estación (${estaciones.length} opciones disponibles)`
    });
  } catch (error) {
    // 4. Este catch atrapa CUALQUIER error que 'apiClient' le lance.
    console.error("❌ Error al cargar estaciones:", error);
    mostrarEstado(`❌ ${error.message}`); 
    ocultarEstado(3000);
  }
}

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

    const responseContaminantes = await fetch(`${API_BASE_URL}/contaminantes/${idEstacion}/${anio}`);
    
    if (!responseContaminantes.ok) {
      if (responseContaminantes.status === 404) {
        throw new Error("No hay contaminantes medidos en este período");
      }
      throw new Error("Error al obtener contaminantes");
    }

    const dataContaminantes = await responseContaminantes.json();

    selectContaminante.innerHTML = '<option value="">-- Selecciona contaminante --</option>';
    
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

    notificarCarga({
      cantidad: dataContaminantes.total_contaminantes,
      tipo: "contaminantes", selectId: "selectContaminante",
      selectElement: selectContaminante,
      textoLabel: `Contaminante (${dataContaminantes.total_contaminantes} opciones disponibles)`
    });
  } catch (error) {
    console.error("❌ Error al cargar contaminantes:", error);
    mostrarEstado(`❌ ${error.message}`);
    selectContaminante.disabled = true;
    ocultarEstado(3000);
  }
}

// ==========================================================================
// TAREA 4: CARGAR Y MOSTRAR DATOS HISTÓRICOS
// ==========================================================================

async function cargarDatosHistoricos(idEstacion, anio, idExposicion) {
  try {
    mostrarEstado("📊 Cargando datos del contaminante...");

    const response = await fetch(`${API_BASE_URL}/datos?estacion=${idEstacion}&anio=${anio}&exposicion=${idExposicion}`);

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
    anunciarAccesibilidad("Datos cargados correctamente y mostrados en el panel.");
    ocultarEstado(2000);
  } catch (error) {
    console.error("❌ Error al cargar datos históricos:", error);
    mostrarEstado(`❌ ${error.message}`);
    ocultarEstado(2000);

    // Mostrar error en el panel
    mostrarErrorEnPanel(error.message);
    anunciarAccesibilidad(`Error: ${error.message}`);
  }
}

function limpiarPanelInformacion() {
  const panel = document.getElementById("informacionContaminantes");
  if (!panel) return;

  // Limpiamos solo el contenido dinámico
  panel.innerHTML = `
    <div role="region" aria-label="Instrucciones de uso de la aplicación" style="text-align: center; padding: 25px 20px;">
      <h2 style="margin-bottom: 15px; color: #2c3e50; font-size: 24px;">
        Cómo usar la aplicación 🌍
      </h2>
      <p style="color: #5a6c7d; margin-bottom: 30px; font-size: 14px; line-height: 1.6; max-width: 320px; margin-left: auto; margin-right: auto;">
        Explora 13 años de datos históricos (2011-2023) de calidad del aire en el Valle del Cauca
      </p>
      
      <div role="list" style="display: inline-block; text-align: left; width: 100%; max-width: 340px;">
        <div role="listitem" style="margin-bottom: 12px; padding: 14px 16px; background: linear-gradient(135deg, #96ac61ff 0%, #a7d16dff 100%); border-radius: 10px; color: white; box-shadow: 0 2px 8px rgba(74, 124, 89, 0.2);">
          <div style="font-weight: bold; font-size: 13px; opacity: 0.9; margin-bottom: 4px;">PASO 1</div>
          <div style="font-size: 15px;">📍 Selecciona un <b>municipio</b> del Valle del Cauca</div>
        </div>
        
        <div role="listitem" style="margin-bottom: 12px; padding: 14px 16px; background: linear-gradient(135deg, #6aa1beff 0%, #73b4f1ff 100%); border-radius: 10px; color: white; box-shadow: 0 2px 8px rgba(91, 138, 114, 0.2);">
          <div style="font-weight: bold; font-size: 13px; opacity: 0.9; margin-bottom: 4px;">PASO 2</div>
          <div style="font-size: 15px;">🎯 Haz <b>clic en una estación</b> de monitoreo</div>
        </div>
        
        <div role="listitem" style="margin-bottom: 12px; padding: 14px 16px; background: linear-gradient(135deg, #f36c6cff 0%, #d66576ff 100%); border-radius: 10px; color: white; box-shadow: 0 2px 8px rgba(106, 158, 138, 0.2);">
          <div style="font-weight: bold; font-size: 13px; opacity: 0.9; margin-bottom: 4px;">PASO 3</div>
          <div style="font-size: 15px;">🧪 Escoge un <b>contaminante</b> atmosférico</div>
        </div>
        
        <div role="listitem" style="padding: 14px 16px; background: linear-gradient(135deg, #5be795ff 0%, #3ada92ff 100%); border-radius: 10px; color: white; box-shadow: 0 2px 8px rgba(120, 178, 153, 0.2);">
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

    // === Activar lectura automática de pasos ===
  const pasos = document.querySelectorAll(".paso-texto");
  const lectura = Array.from(pasos).map(p => p.textContent).join(". ");
  const contenedorLectura = document.getElementById("lecturaPasos");
  if (contenedorLectura) {
    // Limpiar contenido anterior para forzar relectura
    contenedorLectura.textContent = "";
    // Pequeña espera para que el lector detecte el cambio
    setTimeout(() => {
      contenedorLectura.textContent = lectura;
    }, 100);
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
        permanent: false, direction: "top", offset: [0, -5], opacity: 0.9,
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
    notificarCarga({ cantidad: estaciones.length, tipo: "estaciones", selectId: "selectEstacion" });
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

// ==========================================================================
// EVENT LISTENER: MUNICIPIO
// ==========================================================================

selectMunicipio.addEventListener("change", async (e) => {
  const idMunicipio = e.target.value;
  const municipioTexto = e.target.options[e.target.selectedIndex]?.text;

  anunciarAccesibilidad(`Seleccionaste ${municipioTexto || "ningún municipio"}`);
  console.log("🏙️ Cambio de municipio:", idMunicipio);

  // Limpieza general
  resetearFiltrosDependientes(1);
  limpiarEstacionesDelMapa();
  limpiarInfoBox();

  if (!idMunicipio) {
    map.setView([4, -76.55], 8.5);
    mostrarEstado("Vista general del Valle del Cauca");
        anunciarAccesibilidad("Vista general del Valle del Cauca cargada.");
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
  anunciarAccesibilidad(`Año seleccionado: ${anio || "ninguno"}`);
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
    const response = await fetch(`${API_BASE_URL}/estaciones/${idMunicipio}/${anio}`);

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
  const estacionTexto = e.target.options[e.target.selectedIndex]?.text;
  anunciarAccesibilidad(`Actualmente estás en ${estacionTexto || "ninguna estación"}`);

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
  const contaminanteTexto = e.target.options[e.target.selectedIndex]?.text;
  anunciarAccesibilidad(`Seleccionaste el contaminante ${contaminanteTexto || "ninguno"}`);

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
// RENDERIZAR INFORMACIÓN DEL CONTAMINANTE
// ==========================================================================

// ================================================================
// Función auxiliar 1: Obtener texto de calidad del aire
// ================================================================
function obtenerTextoCalidad(clasificacion) {
  if (!clasificacion) return "Sin datos ⚪";

  const nivel = clasificacion.nivel || "Sin definir ⚪";

  if (nivel.toLowerCase().includes("buena")) return "Calidad del aire: Buena 🟢";
  if (nivel.toLowerCase().includes("regular")) return " Calidad del aire: Moderada 🟠";
  if (nivel.toLowerCase().includes("mala")) return "Calidad del aire: Mala 🔴";

  return nivel;
}

// ================================================================
// Función auxiliar 2: Crear HTML del popup del marcador
// ================================================================
function crearPopupCalidad(datos, textoCalidad) {
  const color = datos.clasificacion.color;
  return `
    <div 
      style="min-width: 200px; font-family: 'Segoe UI', sans-serif;"
      role="dialog"
      aria-label="Información de calidad del aire"
      aria-live="polite"
    >
      <div 
        style="background: #fff; padding: 10px; border-left: 5px solid ${color}; border-radius: 6px;"
        role="group"
        aria-labelledby="titulo-contaminante"
        aria-describedby="descripcion-contaminante resumen-estadistico"
      >
        <strong 
          id="titulo-contaminante"
          style="display: block; font-size: 1.1em; color: #2a5d67; margin-bottom: 5px;"
        >
          ${datos.contaminante.simbolo} (${datos.contaminante.tiempo_exposicion.texto})
        </strong>

        <div 
          id="descripcion-contaminante"
          style="color: ${color}; font-weight: 600; margin-bottom: 6px;"
          aria-label="Nivel de calidad del aire"
        >
          ${textoCalidad}
        </div>

        <div 
          id="resumen-estadistico"
          style="font-size: 0.85em; color: #555;"
          aria-label="Resumen estadístico"
          role="status"
        >
          Promedio: <strong>${datos.estadisticas.promedio.toFixed(2)}</strong> ${datos.contaminante.unidades}<br>
          Máximo: <strong>${datos.estadisticas.maximo.toFixed(2)}</strong> ${datos.contaminante.unidades}
        </div>
      </div>
    </div>
  `;
}

// ================================================================
// Función auxiliar 3: Crear HTML del panel lateral
// ================================================================
function crearPanelInformacion(datos, textoCalidad) {
  return `
    <div class="informacion-contaminante" role="region" aria-label="Panel de información del contaminante" aria-live="polite">

      <!-- 🟩 NIVEL 1: Hero principal -->
      <div class="info-hero" style="background-color: ${datos.clasificacion.color}; padding: 20px; border-radius: 8px; margin-bottom: 20px;" role="group" aria-labelledby="hero-titulo" aria-describedby="hero-descripcion">
        <h2 id="hero-titulo" style="margin: 0 0 10px 0; color: #000; font-size: 1.8em;">
          ${datos.contaminante.simbolo}
        </h2>
        <p id="hero-descripcion" style="margin: 0; font-size: 1.2em; font-weight: 600; color: #000;">
          ${datos.contaminante.tiempo_exposicion.texto}
        </p>
        <p style="margin: 5px 0 0 0; font-weight: bold; color: #333;" aria-label="Calidad del aire">${textoCalidad}</p>
      </div>

      <!-- 📊 NIVEL 2: Estadísticas principales -->
      <div class="info-estadisticas" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;" role="group" aria-labelledby="estadisticas-titulo">
        <h3 id="estadisticas-titulo" style="margin: 0 0 15px 0; color: #2a5d67; border-bottom: 2px solid #a8d0da; padding-bottom: 8px;">
          📊 Estadísticas Principales
        </h3>

        <div class="stat-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
          <div class="stat-item" role="status" aria-label="Promedio">
            <p style="margin: 0; font-size: 0.85em; color: #666;">Promedio</p>
            <p style="margin: 5px 0 0 0; font-size: 1.4em; font-weight: bold; color: #2a5d67;">
              ${datos.estadisticas.promedio.toFixed(2)}
            </p>
            <p style="margin: 0; font-size: 0.75em; color: #888;">${datos.contaminante.unidades}</p>
          </div>
          <div class="stat-item" role="status" aria-label="Máximo">
            <p style="margin: 0; font-size: 0.85em; color: #666;">Máximo</p>
            <p style="margin: 5px 0 0 0; font-size: 1.4em; font-weight: bold; color: #ff4444;">
              ${datos.estadisticas.maximo.toFixed(2)}
            </p>
            <p style="margin: 0; font-size: 0.75em; color: #888;">${datos.contaminante.unidades}</p>
          </div>
          <div class="stat-item" role="status" aria-label="Mínimo">
            <p style="margin: 0; font-size: 0.85em; color: #666;">Mínimo</p>
            <p style="margin: 5px 0 0 0; font-size: 1.4em; font-weight: bold; color: #414141ff;">
              ${datos.estadisticas.minimo.toFixed(2)}
            </p>
            <p style="margin: 0; font-size: 0.75em; color: #888;">${datos.contaminante.unidades}</p>
          </div>
          <div class="stat-item" role="status" aria-label="Días con excedencias">
            <p style="margin: 0; font-size: 0.85em; color: #666;">Días con excedencias</p>
            <p style="margin: 5px 0 0 0; font-size: 1.4em; font-weight: bold; color: #ff8800;">
              ${datos.excedencias.dias_excendecias}
            </p>
            <p style="margin: 0; font-size: 0.75em; color: #888;">días</p>
          </div>
        </div>

        ${
          datos.clasificacion.limites_oms
            ? `<div style="margin-top: 18px; padding: 12px; background: #eef9f3; border-radius: 6px; border-left: 4px solid #28a745;" role="group" aria-label="Límites según OMS">
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
               </div>` : ""
        }

        <div style="margin-top: 15px; padding: 12px; background: #e8f4f8; border-radius: 6px; border-left: 4px solid #2a5d67;" role="status" aria-label="Fecha del pico máximo">
          <p style="margin: 0; font-size: 0.9em; color: #2a5d67;">
            <strong>📅 Fecha del pico máximo:</strong><br>
            ${formatearFecha(datos.estadisticas.fecha_hora_maximo)}
          </p>
        </div>

        <!-- 🔍 Detalles técnicos -->
        <details class="info-detalles" style="margin-top: 18px;" role="region" aria-label="Detalles técnicos del contaminante">
          <summary style="cursor: pointer; padding: 12px; background: #e9ecef; border-radius: 6px; font-weight: 600; color: #2a5d67;">
            🔍 Ver detalles técnicos
          </summary>
          <div style="padding: 15px; background: #f8f9fa; border-radius: 0 0 6px 6px;">
            <p><strong>Mediana:</strong> ${datos.estadisticas.mediana.toFixed(2)} ${datos.contaminante.unidades}</p>
            <p><strong>Percentil 98:</strong> ${datos.estadisticas.percentil_98.toFixed(2)} ${datos.contaminante.unidades}</p>
            <p><strong>Excedencias del límite actual:</strong> ${datos.excedencias.excedencias_limite_actual}</p>
            <p><strong>% de excedencias:</strong> ${datos.excedencias.porcentaje_excedencias.toFixed(2)}%</p>
            <p><strong>Representatividad temporal:</strong> ${datos.calidad_datos.representatividad_temporal.toFixed(1)}%</p>
          </div>
        </details>
      </div>

      <!-- 💡 NIVEL 3: Interpretación -->
      <div class="info-interpretacion" style="background: linear-gradient(135deg, #f7f9fb 0%, #ffffff 100%); padding: 15px; border-radius: 8px; border: 2px solid #d1e7ec;" role="region" aria-label="Interpretación del contaminante">
        <h4 style="margin: 0 0 10px 0; color: #2a5d67; display: flex; align-items: center; gap: 8px;">
          <span>💡</span> Interpretación
        </h4>
        <p style="margin: 0; line-height: 1.6; color: #555;">
          ${datos.clasificacion.descripcion}
        </p>
        <p style="margin: 8px 0 0 0; font-size: 0.85em; color: #666; font-style: italic; border-top: 1px solid #e0e0e0; padding-top: 8px;">
          ℹ️ Clasificación basada en las <strong>Guías de Calidad del Aire de la OMS 2021</strong>, más estrictas que la normativa colombiana vigente (Resolución 2254 de 2017).
        </p>
      </div>
    </div>
  `;
}

// ================================================================
// FUNCIÓN PRINCIPAL: mostrarInformacionContaminante(datos)
// ================================================================
function mostrarInformacionContaminante(datos) {
  if (!datos) return;

  const textoCalidad = obtenerTextoCalidad(datos.clasificacion);

  try {
    // Si hay estación seleccionada y existe su marcador en el mapa
    if (estacionSeleccionada && marcadoresEstaciones[estacionSeleccionada]) {
      const marcador = marcadoresEstaciones[estacionSeleccionada];
      const color = datos.clasificacion.color;

      // 1) Actualiza color e ícono en el marcador
      marcador.setIcon(crearIconoColor(color, true));

      // 2) Genera el HTML para el popup del contaminante usando la función existente
      //    (asegúrate que crearPopupCalidad recibe (datos, textoCalidad) como en tu código)
      try {
        const popupHTML = crearPopupCalidad(datos, textoCalidad);
        marcador.bindPopup(popupHTML).openPopup();
      } catch (errPopup) {
        // Evitar que un error en el popup rompa la UI
        console.warn("⚠️ No se pudo actualizar el popup del marcador:", errPopup);
      }
    }
  } catch (error) {
    console.error("Error al actualizar marcador o popup:", error);
  }

  // 3) Inserta el panel lateral (como ya lo hacías)
  const panel = document.getElementById("informacionContaminantes");
  if (panel) {
    panel.innerHTML = crearPanelInformacion(datos, textoCalidad);
  }

  // 4) Accesibilidad: construir texto simplificado y anunciarlo
  const textoAccesible = `
    Datos de ${datos.contaminante.simbolo || datos.contaminante.nombre}.
    Calidad del aire: ${textoCalidad.replace(/<[^>]+>/g, "")}.
    Promedio: ${Number(datos.estadisticas.promedio || 0).toFixed(2)} ${datos.contaminante.unidades || ""}.
    Máximo: ${Number(datos.estadisticas.maximo || 0).toFixed(2)}.
    Mínimo: ${Number(datos.estadisticas.minimo || 0).toFixed(2)}.
    Fecha del pico máximo: ${datos.estadisticas.fecha_hora_maximo || datos.estadisticas.fecha_maxima || "No disponible"}.
  `;

  // Usar tu función de accesibilidad (anunciarAccesibilidad) para que el Narrador lo lea
  try {
    anunciarAccesibilidad(textoAccesible.trim());
  } catch (errA11y) {
    console.warn("⚠️ Error al anunciar por accesibilidad:", errA11y);
  }

  // 5) Refuerzo de foco accesible en el panel lateral (para lectores que reaccionan al foco)
  if (panel) {
    panel.setAttribute("tabindex", "-1");
    try {
      panel.focus({ preventScroll: true });
    } catch (errFocus) {
      // algunos navegadores pueden bloquear focus programático en ciertos contextos; capturamos el error
      console.warn("⚠️ No se pudo forzar el foco en el panel:", errFocus);
    }
  }

  // 6) Actualizar región sr-only local si existe (infoContaminanteA11y)
  const infoA11y = document.getElementById("infoContaminanteA11y");
  if (infoA11y) infoA11y.textContent = textoAccesible.trim();
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

function mostrarErrorEnPanel(mensaje) {
  const panel = document.getElementById("informacionContaminantes");
  if (!panel) {
    console.warn("⚠️ No se encontró el panel de información para mostrar el error");
    return;
  }
  panel.innerHTML = `
    <div 
      style="padding: 20px; text-align: center;" 
      role="alert" 
      aria-live="assertive" 
      aria-atomic="true"
    >
      <div style="font-size: 3em; margin-bottom: 10px;">⚠️</div>
      <h3 style="color: #dc3545; margin-bottom: 10px;">
        Error al cargar datos
      </h3>
      <p style="color: #666;">
        ${mensaje}
      </p>
      <button 
        onclick="location.reload()" 
        style="margin-top: 15px; padding: 10px 20px; background: #2a5d67; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"
        aria-label="Recargar la página para intentar cargar los datos nuevamente"
      >
        🔄 Recargar página
      </button>
    </div>
  `;
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
  anunciarAccesibilidad("Filtros reiniciados. Mapa actualizado a vista general.");
  ocultarEstado(2000);
  selectMunicipio.focus(); 
});

// Actualizar el estado del botón cuando cambie cualquier filtro
selectMunicipio.addEventListener('change', actualizarBotonLimpiar);
selectAnio.addEventListener('change', actualizarBotonLimpiar);
selectEstacion.addEventListener('change', actualizarBotonLimpiar);
selectContaminante.addEventListener('change', actualizarBotonLimpiar);

// Listener del botón
  btnModoOscuro.addEventListener('click', () => {
    // Invertir el estado actual
    const estaActivadoAhora = document.body.classList.contains('dark-mode');
    setModoOscuro(!estaActivadoAhora);
});

// ==========================================================================
// BOTÓN LIMPIAR FILTROS
// ==========================================================================

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

