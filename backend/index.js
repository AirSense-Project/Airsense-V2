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

/**
 * Endpoint: Obtener años con datos disponibles por municipio
 * Ruta: GET /api/anios/:id_municipio
 * Parámetro: id_municipio (número entero)
 * Respuesta: JSON con nombre del municipio y array de años disponibles
 */
app.get('/api/anios/:id_municipio', async (req, res) => {
  try {
    // Parsear y validar el parámetro
    const idMunicipio = parseInt(req.params.id_municipio);
    
    if (isNaN(idMunicipio) || idMunicipio <= 0) {
      return res.status(400).json({ 
        error: 'El ID del municipio debe ser un número entero positivo' 
      });
    }
    
    // Llamar a la función de base de datos
    const resultado = await db.getAniosPorMunicipio(idMunicipio);
    
    // Si no hay resultados (municipio no existe o sin datos)
    if (!resultado) {
      return res.status(404).json({ 
        mensaje: 'No existen registros de calidad del aire para este municipio.' 
      });
    }
    
    // Respuesta exitosa
    res.status(200).json(resultado);
    
  } catch (error) {
    console.error('Error en endpoint /api/anios:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener los años disponibles' 
    });
  }
});

/**
 * Endpoint: Obtener estaciones por municipio y año con ubicaciones temporales
 * Ruta: GET /api/estaciones/:id_municipio/:anio
 * Parámetros: 
 *   - id_municipio: ID del municipio (número entero)
 *   - anio: Año a consultar (número entero, 2011-2023)
 * 
 * Respuesta: Array de estaciones con sus ubicaciones correspondientes al año
 * 
 * Lógica de ubicación temporal:
 * - Si hay ubicación exacta para el año, se usa esa
 * - Si no, se usa la ubicación más reciente anterior
 * - Solo incluye estaciones con mediciones en ese año
 */
app.get('/api/estaciones/:id_municipio/:anio', async (req, res) => {
  try {
    // Parsear y validar parámetros
    const idMunicipio = parseInt(req.params.id_municipio);
    const anio = parseInt(req.params.anio);
    
    // Validación de ID de municipio
    if (isNaN(idMunicipio) || idMunicipio <= 0) {
      return res.status(400).json({ 
        error: 'El ID del municipio debe ser un número entero positivo' 
      });
    }
    
    // Validación de año (rango razonable según tus datos)
    if (isNaN(anio) || anio < 2011 || anio > 2023) {
      return res.status(400).json({ 
        error: 'El año debe ser un número entre 2011 y 2023' 
      });
    }
    
    // Llamar a la función de base de datos
    const estaciones = await db.getEstacionesPorMunicipioYAnio(idMunicipio, anio);
    
    // Si no hay estaciones operativas en ese año
    if (estaciones.length === 0) {
      return res.status(404).json({ 
        mensaje: `No hay estaciones con datos de calidad del aire para este municipio en el año ${anio}.`,
        sugerencia: 'Intente con otro año disponible'
      });
    }
    
    // Respuesta exitosa con metadata
    res.status(200).json({
      municipio_id: idMunicipio,
      anio_consultado: anio,
      total_estaciones: estaciones.length,
      estaciones: estaciones
    });
    
  } catch (error) {
    console.error('Error en endpoint /api/estaciones/:id_municipio/:anio:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener las estaciones' 
    });
  }
});

/**
 * Endpoint: Obtener contaminantes medidos en una estación durante un año
 * Ruta: GET /api/contaminantes/:id_estacion/:anio
 * Parámetros: 
 *   - id_estacion: ID de la estación (número entero)
 *   - anio: Año a consultar (número entero, 2011-2023)
 * 
 * Respuesta: Array de contaminantes con sus tiempos de exposición disponibles
 * 
 * Propósito: Llenar dinámicamente el filtro de contaminantes en el frontend
 */
app.get('/api/contaminantes/:id_estacion/:anio', async (req, res) => {
  try {
    // Parsear y validar parámetros
    const idEstacion = parseInt(req.params.id_estacion);
    const anio = parseInt(req.params.anio);
    
    // Validación de ID de estación
    if (isNaN(idEstacion) || idEstacion <= 0) {
      return res.status(400).json({ 
        error: 'El ID de la estación debe ser un número entero positivo' 
      });
    }
    
    // Validación de año (rango razonable según tus datos)
    if (isNaN(anio) || anio < 2011 || anio > 2023) {
      return res.status(400).json({ 
        error: 'El año debe ser un número entre 2011 y 2023' 
      });
    }
    
    // Llamar a la función de base de datos
    const contaminantes = await db.getContaminantesPorEstacionYAnio(idEstacion, anio);
    
    // Si no hay contaminantes medidos en ese año
    if (contaminantes.length === 0) {
      return res.status(404).json({ 
        mensaje: `No hay datos de contaminantes para esta estación en el año ${anio}.`,
        sugerencia: 'Verifique que la estación estuviera operativa en ese año'
      });
    }
    
    // Respuesta exitosa con metadata
    res.status(200).json({
      estacion_id: idEstacion,
      anio_consultado: anio,
      total_contaminantes: contaminantes.length,
      contaminantes: contaminantes
    });
    
  } catch (error) {
    console.error('Error en endpoint /api/contaminantes/:id_estacion/:anio:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener los contaminantes' 
    });
  }
});

/**
 * Endpoint: Obtener datos históricos completos de un contaminante
 * Ruta: GET /api/datos
 * Query params: 
 *   - estacion: ID de la estación (requerido)
 *   - anio: Año a consultar (requerido)
 *   - exposicion: ID de exposición (contaminante + tiempo) (requerido)
 * 
 * Ejemplo: /api/datos?estacion=8986&anio=2015&exposicion=4
 * 
 * Respuesta: Objeto completo con estadísticas, clasificación y metadata
 */
app.get('/api/datos', async (req, res) => {
  try {
    // Extraer y validar query parameters
    const estacionParam = req.query.estacion;
    const anioParam = req.query.anio;
    const exposicionParam = req.query.exposicion;
    
    // Validar que todos los parámetros estén presentes
    if (!estacionParam || !anioParam || !exposicionParam) {
      return res.status(400).json({ 
        error: 'Faltan parámetros requeridos',
        parametros_requeridos: {
          estacion: 'ID de la estación (número)',
          anio: 'Año a consultar (2011-2023)',
          exposicion: 'ID de exposición (número)'
        },
        ejemplo: '/api/datos?estacion=8986&anio=2015&exposicion=4'
      });
    }
    
    // Parsear parámetros
    const idEstacion = parseInt(estacionParam);
    const anio = parseInt(anioParam);
    const idExposicion = parseInt(exposicionParam);
    
    // Validar ID de estación
    if (isNaN(idEstacion) || idEstacion <= 0) {
      return res.status(400).json({ 
        error: 'El ID de la estación debe ser un número entero positivo' 
      });
    }
    
    // Validar año
    if (isNaN(anio) || anio < 2011 || anio > 2023) {
      return res.status(400).json({ 
        error: 'El año debe ser un número entre 2011 y 2023' 
      });
    }
    
    // Validar ID de exposición
    if (isNaN(idExposicion) || idExposicion <= 0) {
      return res.status(400).json({ 
        error: 'El ID de exposición debe ser un número entero positivo' 
      });
    }
    
    // Llamar a la función de base de datos
    const datos = await db.getDatosHistoricosPorContaminante(idEstacion, anio, idExposicion);
    
    // Si no hay datos para esa combinación
    if (!datos) {
      return res.status(404).json({ 
        mensaje: 'No se encontraron datos para la combinación especificada',
        parametros_consultados: {
          estacion: idEstacion,
          anio: anio,
          exposicion: idExposicion
        },
        sugerencia: 'Verifique que existan mediciones para este contaminante en la estación y año seleccionados'
      });
    }
    
    // Respuesta exitosa
    res.status(200).json(datos);
    
  } catch (error) {
    console.error('Error en endpoint /api/datos:', error);
    res.status(500).json({ 
      error: 'Error interno del servidor al obtener los datos del contaminante' 
    });
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
