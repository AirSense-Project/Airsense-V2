// ------------------------------
// backend/index.js
// ------------------------------
const express = require("express");
const cors = require("cors");
const db = require("./basedatos");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000; // Usa puerto del entorno o 3000 en local

// ------------------------------
// Middlewares
// ------------------------------
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ------------------------------
// Ruta: Obtener municipios
// ------------------------------
app.get("/api/municipios", async (req, res) => {
  try {
    const municipios = await db.getMunicipios();
    res.json(municipios);
  } catch (err) {
    console.error("❌ Error al obtener municipios:", err.message);
    res.status(500).send("Error al obtener municipios desde la base de datos.");
  }
});

// ------------------------------
// Ruta: Obtener estaciones por municipio
// ------------------------------
app.get("/api/estaciones/:id_municipio", async (req, res) => {
  try {
    const estaciones = await db.getEstacionesPorMunicipio(req.params.id_municipio);
    res.json(estaciones);
  } catch (err) {
    console.error("❌ Error obteniendo estaciones:", err.message);
    res.status(500).send("Error al obtener estaciones.");
  }
});

// ------------------------------
// Ruta raíz (frontend)
// ------------------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ------------------------------
// Manejo global de errores
// ------------------------------
process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Promesa rechazada sin capturar:", reason);
});

// ------------------------------
// Iniciar servidor
// ------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend iniciado en: http://localhost:${PORT}`);
});
