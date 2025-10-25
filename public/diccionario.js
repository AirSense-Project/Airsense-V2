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

// ==========================================================================
// FUNCIONES DE NAVEGACIÓN
// ==========================================================================

/*
  Cambia entre las vistas de lista y detalle con transición suave
 */
function cambiarVista(vista) {
  if (vista === "lista") {
    vistaDetalle.classList.remove("diccionario__vista--activa");
    setTimeout(() => {
      vistaLista.classList.add("diccionario__vista--activa");
    }, 100);
  } else if (vista === "detalle") {
    vistaLista.classList.remove("diccionario__vista--activa");
    setTimeout(() => {
      vistaDetalle.classList.add("diccionario__vista--activa");
    }, 100);
  }
}

// ==========================================================================
// RENDERIZADO DE LISTA
// ==========================================================================

 /*
  Renderiza la lista de contaminantes como elementos clicables
  Cada elemento actúa como tarjeta navegable
 */

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
    const response = await fetch("/api/diccionario");
    if (!response.ok) throw new Error("Error al cargar diccionario");
    
    contaminantes = await response.json();
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
