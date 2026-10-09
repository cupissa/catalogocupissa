/**
 * js/modules/auth.js
 * Módulo de Autenticación de Clientes y Gestión de Sesiones en Supabase
 */

window.ClientAuth = {
  /**
   * Registra un nuevo cliente en Supabase Auth y crea su perfil en 'profile'
   */
  async registerClient(formData) {
    const { email, password, firstName, lastName, phone, address, city } = formData;

    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        throw new Error('Supabase Client no está inicializado.');
      }

      // 1. Crear cuenta de usuario en Supabase Auth
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: email.trim(),
        password: password
      });

      if (authError) throw authError;

      const user = authData.user;
      if (!user) throw new Error('No se pudo completar el registro del usuario.');

      // 2. Insertar/Actualizar perfil en la tabla 'profile'
      const profilePayload = {
        id: user.id,
        first_name: firstName ? firstName.trim() : '',
        last_name: lastName ? lastName.trim() : '',
        email: email.trim(),
        telefono: phone ? phone.trim() : '',
        direccion: address ? address.trim() : '',
        city: city || 'Barranquilla',
        cupo_credito: 0,
        estado_credito: 'sin_solicitud',
        updated_at: new Date().toISOString()
      };

      const { error: profError } = await supabaseClient
        .from('profile')
        .upsert([profilePayload]);

      if (profError) {
        console.error('Error al guardar el perfil del cliente:', profError);
      }

      if (typeof showToast === 'function') {
        showToast('¡Registro exitoso! Bienvenido a CUPISSA S.A.S.');
      }

      return { success: true, user };
    } catch (err) {
      console.error('Error en registro de cliente:', err);
      if (typeof showToast === 'function') {
        showToast(err.message || 'Error al completar el registro.', 'error');
      }
      return { success: false, error: err };
    }
  },

  /**
   * Inicia sesión con correo y contraseña en Supabase Auth
   */
  async loginClient(email, password) {
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        throw new Error('Supabase Client no está listo.');
      }

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (error) throw error;

      if (typeof showToast === 'function') {
        showToast('¡Sesión iniciada correctamente!');
      }

      return { success: true, user: data.user, session: data.session };
    } catch (err) {
      console.error('Error al iniciar sesión:', err);
      if (typeof showToast === 'function') {
        showToast(err.message || 'Correo o contraseña incorrectos.', 'error');
      }
      return { success: false, error: err };
    }
  },

  /**
   * Cierra la sesión activa del cliente
   */
  async logoutClient() {
    try {
      if (typeof supabaseClient !== 'undefined' && supabaseClient) {
        await supabaseClient.auth.signOut();
      }
      if (typeof showToast === 'function') {
        showToast('Has cerrado sesión correctamente.');
      }
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
    }
  },

  /**
   * Retorna el usuario y perfil del cliente con sesión activa
   */
  async getActiveClient() {
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) return null;

      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (error || !session || !session.user) return null;

      // Consultar perfil guardado
      const { data: profile } = await supabaseClient
        .from('profile')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      return {
        user: session.user,
        profile: profile || {}
      };
    } catch (err) {
      console.error('Error verificando usuario activo:', err);
      return null;
    }
  }
};

/**
 * Escuchador automático para conectar formularios de Login/Registro si existen en el DOM
 */
document.addEventListener('DOMContentLoaded', () => {
  // Formulario de Login de Clientes
  const formLogin = document.getElementById('form-login-cliente') || document.getElementById('form-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = document.getElementById('login-email') || document.getElementById('input-login-email');
      const passInput = document.getElementById('login-password') || document.getElementById('input-login-password');

      if (!emailInput || !passInput) return;

      const res = await window.ClientAuth.loginClient(emailInput.value, passInput.value);
      if (res.success) {
        const modalLogin = document.getElementById('modal-login-cliente') || document.getElementById('modal-login');
        if (modalLogin) modalLogin.classList.add('hidden');
        window.location.reload();
      }
    });
  }

  // Formulario de Registro de Clientes
  const formRegistro = document.getElementById('form-registro-cliente') || document.getElementById('form-registro');
  if (formRegistro) {
    formRegistro.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = (document.getElementById('reg-email')?.value || '').trim();
      const password = document.getElementById('reg-password')?.value || '';
      const firstName = (document.getElementById('reg-nombre')?.value || '').trim();
      const lastName = (document.getElementById('reg-apellido')?.value || '').trim();
      const phone = (document.getElementById('reg-telefono')?.value || '').trim();
      const address = (document.getElementById('reg-direccion')?.value || '').trim();

      const res = await window.ClientAuth.registerClient({
        email, password, firstName, lastName, phone, address
      });

      if (res.success) {
        const modalReg = document.getElementById('modal-registro-cliente') || document.getElementById('modal-registro');
        if (modalReg) modalReg.classList.add('hidden');
        window.location.reload();
      }
    });
  }
});