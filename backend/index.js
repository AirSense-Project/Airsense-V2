/*==========================================================================
   AIRSENSE - SERVIDOR BACKEND
   ==========================================================================
  
   Descripción: API REST para gestionar datos de estaciones de calidad del aire
                Proporciona endpoints para consultar municipios y estaciones
   
   Tecnologías: Express.js, Node.js, PostgreSQL
   Puerto: 3000 (local) o variable de entorno PORT
  */


/* ==========================================================================
  IMPORTACIÓN DE DEPENDENCIAS
   ========================================================================== */

const express = require("express");   // Framework web para Node.js
const cors = require("cors");         // Middleware para habilitar CORS
const db = require("./basedatos");    // Módulo de conexión a base de datos
const path = require("path");         // Utilidades para rutas de archivos

/*Instancia principal de la aplicación Express
  Maneja todas las rutas y middlewares del servidor*/
const app = express();

const PORT = process.env.PORT || 3000; //Usa variable de entorno PORT (producción) o 3000 por defecto (desarrollo)


// ==========================================================================
// CONFIGURACIÓN DE MIDDLEWARES
// ==========================================================================

app.use(cors());                                            //permite que el fronted haga peticiones al backend desde diferente origen
app.use(express.json());                                    //habilita el procesamiento de peticiones en formato JSON
app.use(express.static(path.join(__dirname, "../public"))); //sirve archivos al fronted desde la carpeta public


/* ==========================================================================
   ENDPOINTS DE LA API
 ==========================================================================

Obtiene la lista completa de municipios disponibles en la base de datos */
app.get("/api/municipios", async (req, res) => {
  try {
    const municipios = await db.getMunicipios();
    res.json(municipios);
  } catch (err) {
    console.error("❌ Error al obtener municipios:", err.message);
    res.status(500).send("Error al obtener municipios desde la base de datos.");
  }
});

//Obtiene todas las estaciones de medición de un municipio específico
app.get("/api/estaciones/:id_municipio", async (req, res) => {
  try {
    const estaciones = await db.getEstacionesPorMunicipio(
      req.params.id_municipio
    );
    res.json(estaciones);
  } catch (err) {
    console.error("❌ Error obteniendo estaciones:", err.message);
    res.status(500).send("Error al obtener estaciones.");
  }
});

// Endpoint para obtener el diccionario de contaminantes
app.get("/api/diccionario", async (req, res) => {
  try {
    const diccionario = await db.getDiccionario();
    res.json(diccionario);
  } catch (err) {
    console.error("❌ Error al obtener diccionario:", err.message);
    res.status(500).send("Error al obtener el diccionario.");
  }
});


/* ==========================================================================
   RUTA DEL FRONTEND
   ==========================================================================

    Esta ruta sirve a la aplicacion frontend, actua como punto de entrada para 
    usuarios que acceden directamente a la URL base del servidor */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ==========================================================================
// MANEJO DE ERRORES GLOBALES
// ==========================================================================


/*Previene que el servidor se caiga por errores asíncronos no capturados
  Registra el error en la consola para debugging
  
  Escenarios comunes:
  - Fallos de conexión a base de datos no manejados
  - Timeouts de peticiones HTTP
  - Errores en operaciones asíncronas sin try-catch*/

process.on("unhandledRejection", (reason) => {
  console.error("⚠️ Promesa rechazada sin capturar:", reason);
});

// ==========================================================================
// INICIALIZACIÓN DEL SERVIDOR
// ==========================================================================

/*Inicia el servidor HTTP en el puerto especificado
  
  Una vez iniciado, el servidor escucha peticiones HTTP en:
  - Desarrollo: http://localhost:3000
  - Producción: Puerto definido por variable de entorno PORT */

app.listen(PORT, () => {
  console.log(`🚀 Servidor backend iniciado en: http://localhost:${PORT}`);
});
