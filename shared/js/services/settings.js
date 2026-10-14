/* Configuración central de la tienda almacenada en public.configuracion_tienda. */
const SETTINGS_TABLE = 'configuracion_tienda';

function normalizeSetting(value) {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'value')) return String(value.value ?? '');
    if (Object.prototype.hasOwnProperty.call(value, 'valor')) return String(value.valor ?? '');
    return JSON.stringify(value);
  }
  return String(value);
}

window.getSetting = async function(key) {
  const client = window.supabaseClient || window.supabase;
  try {
    if (!client) return localStorage.getItem(`setting_${key}`) || null;
    const { data, error } = await client.from(SETTINGS_TABLE).select('valor').eq('clave', key).maybeSingle();
    if (error) throw error;
    if (data && data.valor !== undefined) {
      const value = normalizeSetting(data.valor);
      if (value !== null) localStorage.setItem(`setting_${key}`, value);
      return value;
    }
  } catch (err) {
    console.warn(`[Cupissa] No se pudo leer la configuración ${key}:`, err.message || err);
  }
  return localStorage.getItem(`setting_${key}`) || null;
};

window.saveSetting = async function(key, value) {
  const client = window.supabaseClient || window.supabase;
  const cleanValue = String(value ?? '').trim();
  localStorage.setItem(`setting_${key}`, cleanValue);
  if (!client) return { success: false, error: 'Supabase no está inicializado.' };
  try {
    const { data: existing, error: lookupError } = await client
      .from(SETTINGS_TABLE).select('clave').eq('clave', key).limit(1).maybeSingle();
    if (lookupError) throw lookupError;
    const payload = { valor: cleanValue, updated_at: new Date().toISOString() };
    const result = existing
      ? await client.from(SETTINGS_TABLE).update(payload).eq('clave', key)
      : await client.from(SETTINGS_TABLE).insert({ clave: key, ...payload });
    if (result.error) throw result.error;
    return { success: true };
  } catch (err) {
    console.error(`[Cupissa] No se pudo guardar la configuración ${key}:`, err.message || err);
    return { success: false, error: err.message || String(err) };
  }
};

window.getTax4x1000Rate = async function() {
  const value = await window.getSetting('tax_4x1000_rate');
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 ? rate : 0.004;
};

window.cargarConfiguracionTemporada = async function() {
  const input = document.getElementById('input-temporada-actual');
  if (!input) return;
  const season = await window.getSetting('current_season');
  input.value = season || '';
};

window.guardarConfiguracionTemporada = async function() {
  const input = document.getElementById('input-temporada-actual');
  if (!input) return;
  const season = input.value.trim().toUpperCase();
  const result = await window.saveSetting('current_season', season);
  if (!result.success) {
    window.showToast?.('No se pudo guardar la temporada: ' + result.error, 'error');
    return;
  }
  input.value = season;
  window.showToast?.(season ? 'Temporada destacada actualizada.' : 'Se quitó la temporada destacada.');
};
