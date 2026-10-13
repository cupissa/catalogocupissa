/**
 * Cliente Supabase centralizado. Inicialización idempotente y compatible con módulos legacy.
 */
(function () {
  const rawUrl = window.SUPABASE_URL;
  const key = window.SUPABASE_ANON_KEY;
  const cleanUrl = String(rawUrl || '').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
  // El CDN UMD expone supabase.createClient antes de que window.supabase se use como cliente.
  const sdk = window.supabaseSDK || (window.supabase && typeof window.supabase.createClient === 'function' ? window.supabase : null);
  if (window.supabaseClient && window.supabaseClient.auth) {
    window.supabase = window.supabaseClient;
    return;
  }
  if (!cleanUrl || !key || !sdk || typeof sdk.createClient !== 'function') {
    console.error('[Cupissa] Supabase no está listo. Verifica el CDN, SUPABASE_URL y la clave pública.');
    window.supabaseReady = false;
    return;
  }
  try {
    const client = sdk.createClient(cleanUrl, key, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { 'x-application-name': 'cupissa-web-store' } }
    });
    window.supabaseClient = client;
    window.supabase = client; // alias de compatibilidad con módulos antiguos
    window.supabaseReady = true;
    console.info('[Cupissa] Cliente Supabase inicializado:', cleanUrl);
  } catch (error) {
    window.supabaseReady = false;
    console.error('[Cupissa] No se pudo inicializar Supabase:', error);
  }
})();
