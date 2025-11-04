/* ==========================================================================
   AIRSENSE - MÓDULO DE DICCIONARIO DE CONTAMINANTES
   ==========================================================================
   Gestiona la carga, renderizado y navegación del diccionario de
   contaminantes atmosféricos en un panel lateral interactivo.
   ========================================================================== */

// ==========================================================================
// REFERENCIAS DEL DOM
// ==========================================================================

const vistaLista = document.getElementById("vistaLista");
const vistaDetalle = document.getElementById("vistaDetalle");
const listaContaminantes = document.getElementById("listaContaminantes");
const contenidoDetalle = document.getElementById("contenidoDetalle");
const btnVolver = document.getElementById("btnVolver");

// ==========================================================================
// ESTADO GLOBAL DEL MÓDULO
// ==========================================================================

let contaminantes = [];  // Almacena los datos cargados desde el backend

/**
 * Cliente genérico para hacer peticiones fetch a la API.
 * Maneja el 'try-catch', la validación 'response.ok' y el parseo de JSON.
 *
 * @param {string} url - La URL del endpoint de la API (ej. "/api/municipios")
 * @param {object} [options] - Opciones de fetch (method, headers, body, etc.)
 * @returns {Promise<any>} - Los datos de la respuesta en JSON.
*/
async function apiClient(url, options = {}) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      // Intenta leer el error JSON que envía el backend (ej. { error: "..." })
      const errorData = await response.json().catch(() => ({})); 
      
      // Crea un mensaje de error útil
      const errorMsg = errorData.error || errorData.mensaje || `Error ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    // Si todo ok, devuelve el JSON
    return await response.json();

  } catch (error) {
    console.error(`❌ Error en cliente API [${url}]:`, error.message);
    // Vuelve a lanzar el error para que la función que lo llamó (ej. cargarDiccionario)
    // pueda manejarlo y mostrar un mensaje al usuario.
    throw error;
  }
}

// ==========================================================================
// FUNCIONES DE NAVEGACIÓN
// ==========================================================================

/**
 * Cambia entre las vistas de lista y detalle con transición suave
 * @param {'lista' | 'detalle'} vista - La vista a la que se desea cambiar
 */
function cambiarVista(vista) {
  if (vista === "lista") {
    vistaDetalle.classList.remove("diccionario__vista--activa");
    vistaLista.classList.add("diccionario__vista--activa");
  } else {
    vistaLista.classList.remove("diccionario__vista--activa");
    vistaDetalle.classList.add("diccionario__vista--activa");
    // Opcional: scroll al inicio del detalle
    vistaDetalle.scrollTop = 0;
  }
}

// ==========================================================================
// RENDERIZADO DE LISTA
// ==========================================================================

// Llena la lista <ul> con los contaminantes cargados
function renderizarLista() {
  listaContaminantes.innerHTML = "";
  
  contaminantes.forEach((cont) => {
    const li = document.createElement("li");
    li.className = "diccionario__item";
    li.style.borderLeftColor = cont.color_hex; 
    li.style.borderLeftWidth = "4px";
    
    li.innerHTML = `
      <span class="diccionario__item-simbolo" style="color: ${cont.color_hex}">
        ${cont.simbolo}
      </span>
      <span class="diccionario__item-nombre">${cont.nombre}</span>
      <span class="diccionario__item-icono">→</span>
    `;
    
    li.addEventListener("click", () => mostrarDetalle(cont));
    listaContaminantes.appendChild(li);
  });
}

// ==========================================================================
// RENDERIZADO DE DETALLE
// ==========================================================================

/*
  Muestra la información completa de un contaminante
*/
function mostrarDetalle(contaminante) {
  contenidoDetalle.innerHTML = `
    <h3>${contaminante.simbolo} — ${contaminante.nombre}</h3>
    
    <div class="diccionario__seccion">
      <h4>¿Qué es?</h4>
      <p>${contaminante.que_es}</p>
    </div>
    
    <div class="diccionario__seccion">
      <h4>Causas</h4>
      <p>${contaminante.causas}</p>
    </div>
    
    <div class="diccionario__seccion">
      <h4>Consecuencias</h4>
      <p>${contaminante.consecuencias}</p>
    </div>
  `;
  
  cambiarVista("detalle");
}

// ==========================================================================
// CARGA DE DATOS
// ==========================================================================

/*
  Obtiene el diccionario desde el backend
  Maneja errores de conexión y muestra feedback al usuario
*/

async function cargarDiccionario() {
  try {
    contaminantes = await apiClient("/api/diccionario");
    // Si todo sale bien, renderiza la lista
    renderizarLista();

  } catch (error) {
    console.error("❌ Error al cargar diccionario:", error);
    listaContaminantes.innerHTML = `
      <p style="color: #d9534f; text-align: center; padding: 20px;">
        ⚠️ No se pudo cargar el diccionario. Verifica tu conexión.
      </p>
    `;
  }
}

// ==========================================================================
// EVENT LISTENERS
// ==========================================================================

btnVolver.addEventListener("click", () => cambiarVista("lista"));

// ==========================================================================
// INICIALIZACIÓN
// ==========================================================================

cargarDiccionario();
