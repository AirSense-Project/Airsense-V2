// Archivo: backen/health.js

const express = require('express');
const router = express.Router();

// 'basedatos' está en la MISMA carpeta, así que la ruta es './basedatos'
const db = require('./basedatos'); 

/**
 * @route GET /
 * @description Endpoint para el Cron Job (Render) para mantener Supabase activo.
 * Nota: La ruta es solo '/' porque el '/api/health' se define en index.js
 */
router.get('/', async (req, res) => {
  try {
    // 1. Validar el secreto
    // Esta variable 'HEALTH_CHECK_SECRET' la agregarás en Render
    const secret = req.query.secret;
    if (secret !== process.env.HEALTH_CHECK_SECRET) {
      console.warn("⚠️ Intento de acceso a /api/health con secreto incorrecto.");
      return res.status(401).json({ status: 'unauthorized' });
    }

    // 2. Ejecutar una consulta simple para 'despertar' la DB
    // 'SELECT 1' es la consulta más ligera posible.
    await db.query('SELECT 1;'); 
    console.log("✅ Supabase keep-alive check exitoso (desde health.js).");

    // 3. Responder con éxito
    res.status(200).json({ status: 'ok', message: 'Supabase pinged successfully.' });

  } catch (error) {
    // 4. Manejo de error
    // (apiHandler no está aquí, así que hacemos log manual)
    console.error(`❌ Error en /api/health:`, error.message);
    res.status(500).json({ 
      error: `Error interno del servidor al procesar /api/health` 
    });
  }
});

// Exportar el router para que index.js pueda usarlo
module.exports = router;