/**
 * Servicio para la gestión de configuraciones globales de la aplicación
 * (ej. Temporada actual, banners, ajustes de tienda).
 */

const SETTINGS_TABLE = 'settings';

/**
 * Obtiene el valor de una configuración específica por su clave.
 * @param {string} key - Clave de la configuración (ej: 'current_season')
 * @returns {Promise<string|null>} Valor guardado o null
 */
window.getSetting = async function(key) {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) {
      return localStorage.getItem(`setting_${key}`) || null;
    }

    const { data, error } = await client
      .from(SETTINGS_TABLE)
      .select('value')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.warn(`[settings.js] Error consultando '${key}' en Supabase:`, error.message);
      return localStorage.getItem(`setting_${key}`) || null;
    }

    if (data && data.value !== undefined) {
      localStorage.setItem(`setting_${key}`, data.value);
      return data.value;
    }

    return localStorage.getItem(`setting_${key}`) || null;
  } catch (err) {
    console.error(`[settings.js] Error inesperado al obtener '${key}':`, err);
    return localStorage.getItem(`setting_${key}`) || null;
  }
};

/**
 * Guarda o actualiza una configuración global en la base de datos y respaldo local.
 * @param {string} key - Clave de la configuración
 * @param {string} value - Valor a guardar
 * @returns {Promise<{success: boolean, error?: string}>}
 */
window.saveSetting = async function(key, value) {
  try {
    const client = window.supabaseClient || window.supabase;
    const cleanValue = (value || '').trim();
    localStorage.setItem(`setting_${key}`, cleanValue);

    if (!client) {
      return { success: true };
    }

    const { error } = await client
      .from(SETTINGS_TABLE)
      .upsert(
        { key, value: cleanValue, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.error(`[settings.js] Error al guardar '${key}' en Supabase:`, error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error(`[settings.js] Error inesperado al guardar '${key}':`, err);
    return { success: false, error: err.message };
  }
};