/**
 * js/modules/admin/admin-auth.js
 * Módulo de Autenticación y Verificación de Sesión para el Panel Administrativo
 */

window.checkAdminSession = async function() {
  try {
    if (typeof supabaseClient === 'undefined' || !supabaseClient) {
      console.warn('Supabase Client no está inicializado.');
      return null;
    }

    const { data: { session }, error } = await supabaseClient.auth.getSession();
    
    if (error) {
      console.error('Error al obtener la sesión de administración:', error);
      return null;
    }

    if (!session || !session.user) {
      console.warn('No hay sesión activa en el panel administrativo.');
      return null;
    }

    return session.user;
  } catch (err) {
    console.error('Excepción al verificar la sesión de administrador:', err);
    return null;
  }
};

window.logoutAdmin = async function() {
  try {
    if (typeof supabaseClient !== 'undefined' && supabaseClient) {
      await supabaseClient.auth.signOut();
    }
    if (typeof showToast === 'function') {
      showToast('Sesión administrativa cerrada correctamente.');
    }
    window.location.href = 'index.html';
  } catch (err) {
    console.error('Error al cerrar sesión de administración:', err);
  }
};