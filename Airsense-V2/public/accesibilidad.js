/* ============================================================
   🌿 Módulo de Accesibilidad para AirSense
   ------------------------------------------------------------
   Contiene todas las mejoras relacionadas con accesibilidad,
   navegación por teclado y soporte ARIA.
   ============================================================ */

/**
 * Sincroniza el menú de navegación con la sección visible.
 * Agrega aria-current="page" y la clase .nav-active dinámicamente.
 */
function configurarNavegacionAccesible() {
  const secciones = document.querySelectorAll("section[id]");
  const enlaces = document.querySelectorAll(".nav a");

  window.addEventListener("scroll", () => {
    let actual = "";

    secciones.forEach((seccion) => {
      const top = window.scrollY;
      const offset = seccion.offsetTop - 100; // margen para el header fijo
      const height = seccion.offsetHeight;

      if (top >= offset && top < offset + height) {
        actual = seccion.getAttribute("id");
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

/**
 * Actualiza el estado accesible del botón de modo oscuro.
 * Permite que lectores de pantalla anuncien el estado actual.
 */
function configurarModoOscuroAccesible() {
  const boton = document.getElementById("btnModoOscuro");
  if (!boton) return;

  boton.addEventListener("click", () => {
    const modoOscuroActivo = document.body.classList.toggle("modo-oscuro");

    // Actualiza aria-pressed y el texto accesible
    boton.setAttribute("aria-pressed", modoOscuroActivo);
    boton.setAttribute(
      "aria-label",
      modoOscuroActivo ? "Modo oscuro activado" : "Modo claro activado"
    );
  });
}

//Reflejar si el modo oscuro está activo o no.
const botonModo = document.getElementById("btnModoOscuro");
const textoModo = document.getElementById("estado-modo");

botonModo.addEventListener("click", () => {
  const activo = botonModo.getAttribute("aria-pressed") === "true";
  const nuevoEstado = !activo;

  botonModo.setAttribute("aria-pressed", nuevoEstado);

  if (nuevoEstado) {
    textoModo.textContent = "Modo oscuro activo";
  } else {
    textoModo.textContent = "Modo claro activo";
  }
});

/*Mensaje dinámico para confirmar que los filtros fueron limpiados*/
const btnLimpiar = document.getElementById("btnLimpiarFiltros");
const mensaje = document.getElementById("mensaje-limpieza");

btnLimpiar.addEventListener("click", () => {
  mensaje.textContent = "Filtros reiniciados. Mapa actualizado.";
  setTimeout(() => mensaje.textContent = "", 3000);
});


/**
 * Inicialización del módulo de accesibilidad
 */
document.addEventListener("DOMContentLoaded", () => {
  configurarNavegacionAccesible();
  configurarModoOscuroAccesible();
});
