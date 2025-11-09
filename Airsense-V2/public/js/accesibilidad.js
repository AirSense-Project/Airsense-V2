/* ============================================================
  Módulo de Accesibilidad Unificado - AirSense
   ------------------------------------------------------------
   Este archivo se puede usar tanto en "mapa.html" como en
   "visor.html". Solo se ejecutan las funciones que correspondan
   según los elementos presentes en el DOM.
   ============================================================ */

/* Navegación accesible (para visor.html) */
function configurarNavegacionAccesible() {
  const secciones = document.querySelectorAll("section[id]");
  const enlaces = document.querySelectorAll(".nav a");

  if (!secciones.length || !enlaces.length) return; // ← Solo si existen

  window.addEventListener("scroll", () => {
    let actual = "";
    const top = window.scrollY;

    secciones.forEach((seccion) => {
      const offset = seccion.offsetTop - 100;
      const height = seccion.offsetHeight;
      if (top >= offset && top < offset + height) {
        actual = seccion.id;
      }
    });

    enlaces.forEach((enlace) => {
      enlace.removeAttribute("aria-current");
      enlace.classList.remove("nav-active");
      if (enlace.getAttribute("href") === `#${actual}`) {
        enlace.setAttribute("aria-current", "page");
        enlace.classList.add("nav-active");
      }
    });
  });
}

/* Mensaje accesible al limpiar filtros (para mapa.html) */
function configurarMensajeLimpieza() {
  const btnLimpiar = document.getElementById("btnLimpiarFiltros");
  const mensaje = document.getElementById("mensaje-limpieza");

  if (!btnLimpiar || !mensaje) return; // ← Solo si existen

  btnLimpiar.addEventListener("click", () => {
    mensaje.textContent = "Filtros reiniciados. Mapa actualizado.";
    setTimeout(() => (mensaje.textContent = ""), 3000);
  });
}

// =======================================================
// ACCESIBILIDAD: Anunciar cambios en los filtros
// =======================================================
//Para el maoa.html
function activarLecturaFiltrosAccesibles() {
  const filtros = [
    { id: "selectMunicipio", estado: "estado-municipio" },
    { id: "selectAnio", estado: "estado-anio" },
    { id: "selectEstacion", estado: "estado-estacion" },
    { id: "selectContaminante", estado: "estado-contaminante" }
  ];

  filtros.forEach(filtro => {
    const select = document.getElementById(filtro.id);
    const estado = document.getElementById(filtro.estado);

    if (select && estado) {
      select.addEventListener("change", () => {
        const texto = select.options[select.selectedIndex]?.text || "sin selección";
        estado.textContent = `Seleccionado: ${texto}`;
      });
    }
  });

  // Anunciar cuando se limpian los filtros
  const btnLimpiar = document.getElementById("btnLimpiarFiltros");
  const estadoLimpiar = document.getElementById("estado-limpiar");
  if (btnLimpiar && estadoLimpiar) {
    btnLimpiar.addEventListener("click", () => {
      estadoLimpiar.textContent = "Filtros restablecidos correctamente.";
    });
  }
}

/* Inicialización automática */
document.addEventListener("DOMContentLoaded", () => {
  configurarNavegacionAccesible();
  configurarMensajeLimpieza();
  activarLecturaFiltrosAccesibles();
});
