/**
 * js/modules/auth.js
 * Módulo de Autenticación de Clientes con Captcha Gráfico y Sincronización de Sesión
 */

/**
 * Abre el modal de autenticación (#authModal)
 */
window.openAuthModal = function() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.remove('hidden');
    window.switchAuthMode('login');
  }
};

/**
 * Cierra el modal de autenticación (#authModal)
 */
window.closeAuthModal = function() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('hidden');
  }
};

/**
 * Alterna entre las pestañas "Iniciar Sesión" y "Registrarse"
 */
window.switchAuthMode = function(mode) {
  const formLogin = document.getElementById('formLoginContainer');
  const formRegister = document.getElementById('formRegisterContainer');
  const tabLogin = document.getElementById('tabRoleLogin');
  const tabRegister = document.getElementById('tabRoleRegister');

  if (mode === 'login') {
    if (formLogin) formLogin.classList.remove('hidden');
    if (formRegister) formRegister.classList.add('hidden');

    if (tabLogin) {
      tabLogin.className = 'flex-1 pb-3 font-bold text-xs border-b-2 border-brand-600 text-brand-600';
    }
    if (tabRegister) {
      tabRegister.className = 'flex-1 pb-3 font-bold text-xs border-b-2 border-transparent text-gray-400';
    }
  } else if (mode === 'register') {
    if (formRegister) formRegister.classList.remove('hidden');
    if (formLogin) formLogin.classList.add('hidden');

    if (tabRegister) {
      tabRegister.className = 'flex-1 pb-3 font-bold text-xs border-b-2 border-brand-600 text-brand-600';
    }
    if (tabLogin) {
      tabLogin.className = 'flex-1 pb-3 font-bold text-xs border-b-2 border-transparent text-gray-400';
    }

    // Inicializar Captcha Gráfico al abrir registro
    if (typeof window.generateVisualCaptcha === 'function') {
      window.generateVisualCaptcha();
    }
  }
};

/**
 * Procesa el inicio de sesión del cliente con Supabase Auth
 */
window.handleClientLogin = async function(event) {
  if (event) event.preventDefault();

  const emailInput = document.getElementById('loginEmail');
  const passInput = document.getElementById('loginPassword');

  if (!emailInput || !passInput) return;

  const email = emailInput.value.trim();
  const password = passInput.value;

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) {
      throw new Error('Supabase no está disponible.');
    }

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        throw new Error('No se pudo verificar el correo. Intenta iniciar sesión nuevamente o contacta a soporte.');
      }
      throw error;
    }

    if (typeof showToast === 'function') {
      showToast('¡Sesión iniciada correctamente!');
    }

    window.closeAuthModal();
    await window.updateUserAuthUI();
  } catch (err) {
    console.error('Error al iniciar sesión:', err);
    if (typeof showToast === 'function') {
      showToast(err.message || 'Correo o contraseña incorrectos.', 'error');
    } else {
      alert(err.message || 'Correo o contraseña incorrectos.');
    }
  }
};

/**
 * Procesa el registro del cliente, valida el Captcha Gráfico e inserta en la tabla 'profile'
 */
window.handleClientRegister = async function(event) {
  if (event) event.preventDefault();

  // Validar Captcha Gráfico
  const captchaInput = document.getElementById('captchaInput');
  const userInputCode = (captchaInput ? captchaInput.value : '').trim();

  if (typeof window.validateVisualCaptcha === 'function') {
    if (!window.validateVisualCaptcha(userInputCode)) {
      if (typeof showToast === 'function') {
        showToast('Código de verificación incorrecto. Inténtalo de nuevo.', 'error');
      } else {
        alert('Código de verificación incorrecto. Inténtalo de nuevo.');
      }
      if (typeof window.generateVisualCaptcha === 'function') {
        window.generateVisualCaptcha();
      }
      if (captchaInput) captchaInput.value = '';
      return;
    }
  }

  const firstName = (document.getElementById('regClientFirstName')?.value || '').trim();
  const lastName = (document.getElementById('regClientLastName')?.value || '').trim();
  const email = (document.getElementById('regClientEmail')?.value || '').trim();
  const password = document.getElementById('regClientPassword')?.value || '';

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) {
      throw new Error('El cliente de Supabase no está listo.');
    }

    // 1. Registro en Supabase Auth con Metadata del cliente
    const { data: authData, error: authError } = await client.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`.trim()
        }
      }
    });

    if (authError) throw authError;

    const user = authData.user;
    if (!user) throw new Error('No se pudo completar el registro del usuario.');

    // 2. Intentar inicio de sesión directo si no existe sesión activa automática
    if (!authData.session) {
      await client.auth.signInWithPassword({ email, password });
    }

    // 3. Creación del perfil en la tabla 'profile' de Supabase
    const profilePayload = {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      email: email,
      cupo_credito: 0,
      estado_credito: 'sin_solicitud',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: profError } = await client
      .from('profile')
      .upsert([profilePayload]);

    if (profError) {
      console.error('Error al guardar el perfil en la tabla profile:', profError);
    }

    if (typeof showToast === 'function') {
      showToast('¡Registro completado con éxito! Bienvenido a CUPISSA.');
    }

    window.closeAuthModal();
    await window.updateUserAuthUI();
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    if (typeof showToast === 'function') {
      showToast(err.message || 'Error al completar el registro.', 'error');
    } else {
      alert(err.message || 'Error al completar el registro.');
    }
  }
};

/**
 * Inicio de sesión alternativo con Google OAuth
 */
window.loginWithGoogle = async function() {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) return;
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google'
    });
    if (error) throw error;
  } catch (err) {
    console.error('Error con inicio de Google:', err);
  }
};

/**
 * Actualiza dinámicamente la sección del Header (#userAuthSection) al detectar sesión activa
 */
window.updateUserAuthUI = async function() {
  const authContainer = document.getElementById('userAuthSection');
  if (!authContainer) return;

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) return;

    const { data: { session } } = await client.auth.getSession();

    if (session && session.user) {
      let displayName = session.user.user_metadata?.first_name 
        || session.user.user_metadata?.full_name;

      if (!displayName) {
        const { data: profile } = await client
          .from('profile')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .maybeSingle();

        displayName = profile?.first_name || session.user.email.split('@')[0];
      }

      authContainer.innerHTML = `
        <div class="relative group inline-block">
          <button type="button" onclick="window.confirmLogout()" class="flex items-center space-x-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 py-2 px-3 rounded-xl transition-all" title="Haz clic para cerrar sesión">
            <i class="fa-solid fa-user-check text-emerald-500"></i>
            <span>Hola, <strong>${displayName}</strong></span>
          </button>
        </div>
      `;
    } else {
      authContainer.innerHTML = `
        <button type="button" onclick="openAuthModal()" class="flex items-center space-x-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all py-2 px-3 rounded-xl shadow-sm">
          <i class="fa-regular fa-user"></i>
          <span class="hidden sm:inline">Ingresar</span>
        </button>
      `;
    }
  } catch (err) {
    console.error('Error al actualizar interfaz de autenticación:', err);
  }
};

/**
 * Solicita confirmación para cerrar sesión
 */
window.confirmLogout = async function() {
  if (confirm("¿Deseas cerrar tu sesión actual?")) {
    const client = window.supabaseClient || window.supabase;
    if (client) {
      await client.auth.signOut();
    }
    if (typeof showToast === 'function') {
      showToast('Has cerrado sesión correctamente.');
    }
    await window.updateUserAuthUI();
  }
};

/**
 * Objeto global de compatibilidad ClientAuth
 */
window.ClientAuth = {
  getActiveClient: async () => {
    const client = window.supabaseClient || window.supabase;
    if (!client) return null;
    const { data: { session } } = await client.auth.getSession();
    if (!session || !session.user) return null;

    const { data: profile } = await client
      .from('profile')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    return { user: session.user, profile: profile || {} };
  },
  logoutClient: window.confirmLogout
};

// Verificación inicial al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  window.updateUserAuthUI();
});