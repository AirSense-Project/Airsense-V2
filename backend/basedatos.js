/* ==========================================================================
   AIRSENSE - MÓDULO DE CONEXIÓN A BASE DE DATOS
   ==========================================================================
   
   Descripción: Gestiona la conexión a PostgreSQL y proporciona funciones
                para consultar municipios, estaciones y ubicaciones
   
   Tecnologías: PostgreSQL, pg (node-postgres), dotenv
   Compatibilidad: Soporta conexión SSL (Render) y sin SSL (desarrollo local)*/


// ==========================================================================
// IMPORTACIÓN DE DEPENDENCIAS
// ==========================================================================

require("dotenv").config();           // Carga variables de entorno desde .env
const { Pool } = require("pg");       // Pool de conexiones de PostgreSQL
const fs = require("fs");             // Sistema de archivos para verificaciones

// ==========================================================================
// DIAGNÓSTICO DE ENTORNO
// ==========================================================================

//validacion manual en las variables de entorno, para que esten cargadas correctamente
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

// ==========================================================================
// POOL DE CONEXIONES
// ==========================================================================

//gestiona un conjunto de conexiones reutilizables a la base de datos
let pool;


/* ==========================================================================
   INICIALIZACIÓN DE LA CONEXIÓN
   ==========================================================================
      Establece la conexión con PostgreSQL usando estrategia de fallback
      
      Flujo de conexión:
      1. Intenta conectar con SSL habilitado (requerido por Render y servicios cloud)
      2. Si falla por incompatibilidad SSL, reintenta sin SSL (desarrollo local)
      3. Si ambos fallan, registra el error y detiene la ejecución
       
      Configuración SSL:
        - require: true → Solicita SSL pero no es obligatorio
        - rejectUnauthorized: false → Acepta certificados autofirmados
       
        Variables de entorno requeridas:
        - DB_USER: Usuario de PostgreSQL
        - DB_HOST: Host del servidor (ej: localhost, render.com)
        - DB_NAME: Nombre de la base de datos
        - DB_PASSWORD: Contraseña del usuario
        - DB_PORT: Puerto de PostgreSQL (por defecto 5432) */

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

conectarPostgres();   //ejecutar conexion al cargar el modulo


// ==========================================================================
// FUNCIÓN GENÉRICA DE CONSULTA
// ==========================================================================

/* Ejecuta una consulta SQL parametrizada en la base de datos
  
  Características:
  - Usa conexiones del pool para eficiencia
  - Soporta consultas parametrizadas (previene SQL injection)
  - Libera automáticamente la conexión después de usarla
  - Maneja errores y los propaga al llamado */

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

// ==========================================================================
// CONSULTAS DE NEGOCIO
// ==========================================================================

//Obtiene la lista completa de municipios con sus coordenadas
const getMunicipios = async () => {
  const sql = `
    SELECT id_municipio, nombre_municipio, latitud, longitud
    FROM municipios
    ORDER BY nombre_municipio;
  `;
  const res = await query(sql);
  return res.rows;
};

//Obtiene las estaciones de un municipio específico con su última ubicación
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

// ==========================================================================
// EXPORTACIÓN DEL MÓDULO
// ==========================================================================

//Interfaz pública del módulo de base de datos, usada en otros archivos
module.exports = {
  query,
  getMunicipios,
  getEstacionesPorMunicipio
};
