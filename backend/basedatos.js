// ------------------------------
// backend/basedatos.js
// ------------------------------
require("dotenv").config();
const { Pool } = require("pg");
const fs = require("fs");

// 📂 Diagnóstico de entorno
console.log("📁 Ruta actual:", __dirname);
console.log("📄 ¿Archivo .env encontrado?", fs.existsSync(__dirname + "/.env"));
console.log("🧩 Variables cargadas:");
console.log({
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD ? "[OK]" : "[VACÍA]",
  DB_HOST: process.env.DB_HOST,
  DB_NAME: process.env.DB_NAME,
  DB_PORT: process.env.DB_PORT
});

let pool;

// -----------------------------------------------------
// Conexión con Render (SSL) o modo local (sin SSL)
// -----------------------------------------------------
async function conectarPostgres() {
  try {
    pool = new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: String(process.env.DB_PASSWORD).trim(),
      port: process.env.DB_PORT,
      ssl: { require: true, rejectUnauthorized: false }
    });

    const client = await pool.connect();
    console.log("✅ Conectado a PostgreSQL con SSL (Render)");
    client.release();
  } catch (err) {
    if (err.message.includes("does not support SSL")) {
      console.warn("⚠️ Render no acepta SSL, reintentando sin SSL...");

      pool = new Pool({
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: String(process.env.DB_PASSWORD).trim(),
        port: process.env.DB_PORT,
        ssl: false
      });

      const client = await pool.connect();
      console.log("✅ Conectado a PostgreSQL sin SSL (modo local)");
      client.release();
    } else {
      console.error("❌ Error de conexión a PostgreSQL:", err.message);
    }
  }
}

conectarPostgres();

// -----------------------------------------------------
// Función genérica de consulta SQL
// -----------------------------------------------------
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res;
  } catch (err) {
    console.error("❌ Error en la consulta SQL:", err.message);
    throw err;
  } finally {
    client.release();
  }
};

// -----------------------------------------------------
// Obtener municipios (incluye lat/long)
// -----------------------------------------------------
const getMunicipios = async () => {
  const sql = `
    SELECT id_municipio, nombre_municipio, latitud, longitud
    FROM municipios
    ORDER BY nombre_municipio;
  `;
  const res = await query(sql);
  return res.rows;
};

// -----------------------------------------------------
// Obtener estaciones por municipio (último año registrado)
// -----------------------------------------------------
const getEstacionesPorMunicipio = async (id_municipio) => {
  const sql = `
    SELECT e.id_estacion, e.nombre_estacion, u.id_ubicacion, u.latitud, u.longitud, u.anio
    FROM estaciones e
    JOIN ubicaciones_estaciones u ON e.id_estacion = u.id_estacion
    WHERE e.id_municipio = $1
      AND u.anio = (
        SELECT MAX(anio)
        FROM ubicaciones_estaciones
        WHERE id_estacion = e.id_estacion
      )
    ORDER BY e.nombre_estacion;
  `;
  const res = await query(sql, [id_municipio]);
  return res.rows;
};

// -----------------------------------------------------
// Exportar todas las funciones
// -----------------------------------------------------
module.exports = {
  query,
  getMunicipios,
  getEstacionesPorMunicipio
};
