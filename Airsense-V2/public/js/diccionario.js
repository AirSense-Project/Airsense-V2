/* ==========================================================================
   AIRSENSE - MÓDULO DE DICCIONARIO DE CONTAMINANTES
   ==========================================================================
   Gestiona la carga, renderizado y navegación del diccionario de
   contaminantes atmosféricos en un panel lateral interactivo,
   con soporte completo de accesibilidad y notificación de carga.
   ========================================================================== */

// ==========================================================================
// REFERENCIAS DEL DOM
// ==========================================================================
const vistaLista = document.getElementById("vistaLista");
const vistaDetalle = document.getElementById("vistaDetalle");
const listaContaminantes = document.getElementById("listaContaminantes");
const contenidoDetalle = document.getElementById("contenidoDetalle");
const btnVolver = document.getElementById("btnVolver");
const ariaLive = document.getElementById("aria-live-region");

let contaminantes = []; // Datos cargados desde backend

/* ==========================================================================
   FUNCIONES DE NAVEGACIÓN ACCESIBLE
   ========================================================================== */
function cambiarVista(vista) {
  if (vista === "detalle") {
    vistaLista.classList.remove("diccionario__vista--activa");
    vistaLista.setAttribute("aria-hidden", "true");
    vistaLista.inert = true;

    vistaDetalle.classList.add("diccionario__vista--activa");
    vistaDetalle.setAttribute("aria-hidden", "false");
    vistaDetalle.inert = false;

    // Foco en el botón volver para navegación
    btnVolver.focus();
  } else if (vista === "lista") {
    vistaDetalle.classList.remove("diccionario__vista--activa");
    vistaDetalle.setAttribute("aria-hidden", "true");
    vistaDetalle.inert = true;

    vistaLista.classList.add("diccionario__vista--activa");
    vistaLista.setAttribute("aria-hidden", "false");
    vistaLista.inert = false;

    // Foco en el primer item de la lista
    const primerItem = listaContaminantes.querySelector(".diccionario__item");
    if (primerItem) primerItem.focus();
  }
}

/* ==========================================================================
   NOTIFICACIÓN DE CARGA
   ========================================================================== */
function notificarCarga({ cantidad, tipo, selectId }) {
  mostrarEstado(`${cantidad} ${tipo} cargados.`, { tipo: "exito" });
  ocultarEstado(2500);

  // Lectura accesible
  anunciarAccesibilidad(`${cantidad} ${tipo} disponibles para seleccionar.`);

  // Activar lectura de lista si corresponde
  if (selectId === "listaContaminantes") habilitarLecturaSelectLista(listaContaminantes);
}

/* ==========================================================================
   LECTURA ACCESIBLE PARA LISTA
   ========================================================================== */
function habilitarLecturaSelectLista(ulElement) {
  if (!ulElement) return;

  const items = ulElement.querySelectorAll(".diccionario__item");
  items.forEach((item) => {
    item.addEventListener("focus", () => {
      anunciarAccesibilidad(item.textContent.trim());
    });
  });
}

/* ==========================================================================
   RENDERIZADO DE LISTA
   ========================================================================== */
function renderizarLista() {
  listaContaminantes.innerHTML = "";

  contaminantes.forEach((cont) => {
    const li = document.createElement("li");
    li.className = "diccionario__item";
    li.style.borderLeftColor = cont.color_hex;
    li.style.borderLeftWidth = "4px";
    li.tabIndex = 0;

    li.innerHTML = `
      <span class="diccionario__item-simbolo" style="color: ${cont.color_hex}">
        ${cont.simbolo}
      </span>
      <span class="diccionario__item-nombre">${cont.nombre}</span>
      <span class="diccionario__item-icono">→</span>
    `;

    li.addEventListener("click", () => mostrarDetalle(cont));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") mostrarDetalle(cont);
    });

    listaContaminantes.appendChild(li);
  });

  notificarCarga({ cantidad: contaminantes.length, tipo: "contaminantes", selectId: "listaContaminantes" });
}

/* ==========================================================================
   RENDERIZADO DE DETALLE
   ========================================================================== */
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
  vistaDetalle.focus();

  const ariaLive = document.getElementById("aria-live-region");
  ariaLive.textContent = "";

  // Separar cada sección y repetir nombre del contaminante
  const secciones = [
    `Contaminante: ${contaminante.simbolo} — ${contaminante.nombre}.`,
    `Contaminante ${contaminante.nombre}, Qué es: ${contaminante.que_es}.`,
    `Contaminante ${contaminante.nombre}, Causas: ${contaminante.causas}.`,
    `Contaminante ${contaminante.nombre}, Consecuencias: ${contaminante.consecuencias}.`
  ];

  // Función para calcular tiempo de lectura aproximado
  function tiempoLectura(texto) {
    const palabras = texto.split(/\s+/).length;
    return Math.max(1000, palabras * 200); // 200ms por palabra, mínimo 1s
  }

  let acumulado = 0;
  secciones.forEach(texto => {
    setTimeout(() => {
      // Actualizamos dentro de requestAnimationFrame para que lector de pantalla lo detecte
      requestAnimationFrame(() => {
        ariaLive.textContent = texto;
      });
    }, acumulado);
    acumulado += tiempoLectura(texto);
  });
}

/* ==========================================================================
   CARGA DE DATOS
   ========================================================================== */
async function cargarDiccionario() {
  try {
    contaminantes = await apiClient("/diccionario");
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

/* ==========================================================================
   EVENT LISTENERS
   ========================================================================== */
btnVolver.addEventListener("click", () => cambiarVista("lista"));

/* ==========================================================================
   INICIALIZACIÓN
   ========================================================================== */
cargarDiccionario();
