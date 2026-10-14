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

    if (!authData.session) {
      await client.auth.signInWithPassword({ email, password });
    }

    const profilePayload = {
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      email: email,
      cupo_credito: 200000,
      estado_credito: 'aprobado',
      credito_utilizado: 0,
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
      provider: 'google',
      options: { redirectTo: window.location.origin + window.location.pathname }
    });
    if (error) throw error;
  } catch (err) {
    console.error('Error con inicio de Google:', err);
    window.showToast?.('No se pudo iniciar con Google. Verifica que Google esté habilitado en Supabase Auth y que esta URL esté en Redirect URLs.', 'error');
  }
};

/**
 * Actualiza dinámicamente la sección del Header (#userAuthSection) al detectar sesión activa
 */
window.updateUserAuthUI = async function() {
  const authContainer = document.getElementById('userAuthSection');
  const paymentsLink = document.getElementById('portalPaymentsNav');
  if (!authContainer) return;

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) return;

    const { data: { session } } = await client.auth.getSession();
    let verifiedUser = null;
    if (session?.user) {
      const verification = await client.auth.getUser(); // valida el usuario contra Auth, no solo el token local
      if (verification.error || !verification.data?.user) {
        await client.auth.signOut({ scope: 'local' });
        localStorage.removeItem('cupissa_client_user');
      } else verifiedUser = verification.data.user;
    } else {
      localStorage.removeItem('cupissa_client_user');
    }

    if (paymentsLink) paymentsLink.classList.toggle('hidden', !verifiedUser);
    if (verifiedUser) {
      session.user = verifiedUser;
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

      // Sincronizar datos básicos en localStorage para el perfil modular
      const localClient = {
        firstName: displayName,
        email: session.user.email,
        ...session.user.user_metadata
      };
      localStorage.setItem("cupissa_client_user", JSON.stringify(localClient));

      // El perfil se abre en una página independiente, no en una ventana flotante.
      authContainer.innerHTML = `
        <a href="profile.html" class="flex items-center space-x-1.5 text-xs font-bold text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-950/50 hover:bg-brand-100 py-2 px-3 rounded-xl border border-brand-200 dark:border-brand-800 transition-all shadow-sm" title="Ver mi cuenta y perfil">
          <i class="fa-solid fa-user-gear"></i>
          <span>Mi perfil</span>
        </a>
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
 * Función de cierre de sesión oficial (llamada desde el perfil modular)
 */
window.confirmLogout = async function() {
  const client = window.supabaseClient || window.supabase;
  if (client) {
    await client.auth.signOut();
  }
  localStorage.removeItem("cupissa_client_user");
  if (typeof showToast === 'function') {
    showToast('Has cerrado sesión correctamente.');
  }
  await window.updateUserAuthUI();
};

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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => window.updateUserAuthUI(), { once: true });
} else {
  window.updateUserAuthUI();
}