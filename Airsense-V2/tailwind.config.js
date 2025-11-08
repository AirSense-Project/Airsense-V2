/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  "./public/visor.html",  // Escanea la nueva página de inicio
  "./public/js/rutas.js",    // Escanea el JS de la inicio
  "./public/mapa.html",   // Escanea la página del mapa
  "./public/js/script.js"    // Escanea el JS del mapa
],
  theme: {
    extend: {},
  },
  plugins: [],
}