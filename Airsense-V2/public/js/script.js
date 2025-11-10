/* ==========================================================================
   CONFIGURACIÓN INICIAL DEL MAPA
   ==========================================================================
   Este bloque inicializa el mapa de Leaflet centrado en el Valle del Cauca,
   define las capas base (modo claro y oscuro), y configura las referencias
   principales del DOM para la interacción con los filtros y el estado del mapa.
========================================================================== */

// ==========================================================================\
// INICIALIZACIÓN DE LA APLICACIÓN
// ==========================================================================\

/** Función principal que inicia el visor */
function inicializarVisor() {
  console.log("🚀 Aplicación inicializada");
  cargarMunicipios();
  actualizarBotonLimpiar(); // Estado inicial del botón
  // Mensaje accesible cuando el mapa está listo
  const estadoMapa = document.getElementById("estadoMapa");
}

// Iniciar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  inicializarVisor();
  const mapa = document.getElementById("map");
  mapa.setAttribute("tabindex", "0"); // ya en HTML
  mapa.focus({ preventScroll: true });
});
