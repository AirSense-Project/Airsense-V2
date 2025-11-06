/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
  "./public/index.html",  // Escanea la nueva página de inicio
  "./public/rutas.js",    // Escanea el JS de la inicio
  "./public/mapa.html",   // Escanea la página del mapa
  "./public/script.js"    // Escanea el JS del mapa
],
  theme: {
    extend: {},
  },
  plugins: [],
}