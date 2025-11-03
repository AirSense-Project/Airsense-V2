// public/apiClient.js

/**
 * Cliente genérico para hacer peticiones fetch a la API.
 * Maneja el 'try-catch', la validación 'response.ok' y el parseo de JSON.
 *
 * @param {string} url - La URL del endpoint de la API (ej. "/api/municipios")
 * @param {object} [options] - Opciones de fetch (method, headers, body, etc.)
 * @returns {Promise<any>} - Los datos de la respuesta en JSON.
 * @throws {Error} - Lanza un error estandarizado si la petición falla.
 */
async function apiClient(url, options = {}) {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      // Intenta leer el error JSON que envía el backend (ej. { error: "..." })
      const errorData = await response.json().catch(() => ({})); 
      
      // Crea un mensaje de error útil
      const errorMsg = errorData.error || errorData.mensaje || `Error ${response.status}: ${response.statusText}`;
      throw new Error(errorMsg);
    }

    // Si todo ok, devuelve el JSON
    return await response.json();

  } catch (error) {
    console.error(`❌ Error en cliente API [${url}]:`, error.message);
    // Vuelve a lanzar el error para que la función que lo llamó
    // pueda manejarlo y mostrar un mensaje al usuario.
    throw error;
  }
}