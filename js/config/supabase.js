/**
 * js/config/supabase.js
 * Inicialización y configuración centralizada del cliente de Supabase
 */

(function() {
  const rawUrl = window.SUPABASE_URL || 'https://njwiobfjtmwsxyigxgrp.supabase.co';
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'sb_publishable_z9FRc9Z312kNfGbR_seecQ_9Sq2rUPj';

  // Saneamiento automático por si se incluye /rest/v1 por error
  const cleanUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');

  if (typeof supabase !== 'undefined' && supabase.createClient) {
    try {
      const client = supabase.createClient(cleanUrl, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        global: {
          headers: {
            'x-application-name': 'cupissa-web-store'
          }
        }
      });

      // Asignación dual para garantizar compatibilidad con todos los módulos
      window.supabaseClient = client;
      window.supabase = client;

      console.log('✅ Supabase Client inicializado correctamente con URL:', cleanUrl);
    } catch (err) {
      console.error('❌ Error al crear la instancia de Supabase Client:', err);
    }
  } else {
    console.warn('⚠️ La librería CDN de Supabase (@supabase/supabase-js) no está cargada en el DOM.');
  }
})();