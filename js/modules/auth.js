// ==========================================
// MÓDULO DE AUTENTICACIÓN Y SESIÓN - CUPISSA
// ==========================================

if (typeof window.currentUser === 'undefined') window.currentUser = null;
if (typeof window.currentUserProfile === 'undefined') window.currentUserProfile = null;

window.checkUserSession = async function() {
  try {
    const { data: { session }, error } = await supabaseClient.auth.getSession();
    if (error) throw error;

    if (session && session.user) {
      window.currentUser = session.user;
      await window.fetchUserProfile(session.user.id);
    } else {
      window.currentUser = null;
      window.currentUserProfile = null;
    }

    window.updateAuthUI();
    return window.currentUser;
  } catch (err) {
    console.error('Error al verificar sesión de usuario:', err);
    window.currentUser = null;
    window.currentUserProfile = null;
    window.updateAuthUI();
    return null;
  }
};

window.fetchUserProfile = async function(userId) {
  try {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error obteniendo perfil:', error);
      return;
    }

    window.currentUserProfile = data || null;
  } catch (e) {
    console.error('Error en fetchUserProfile:', e);
  }
};

window.updateAuthUI = function() {
  const container = document.getElementById('authButtonContainer');
  if (!container) return;

  if (window.currentUser) {
    const isAdmin = window.currentUserProfile?.is_admin === true;
    const name = window.currentUserProfile?.full_name || window.currentUser.email.split('@')[0];

    container.innerHTML = `
      <div class="flex items-center gap-3">
        <div class="text-right hidden sm:block">
          <span class="block text-xs font-bold text-gray-800 dark:text-white">${name}</span>
          <span class="block text-[9px] font-extrabold ${isAdmin ? 'text-red-500' : 'text-brand-600'} uppercase">
            ${isAdmin ? 'Administrador' : 'Cliente'}
          </span>
        </div>
        ${isAdmin ? `
          <a href="admin.html" class="px-3 py-1.5 rounded-xl bg-red-100 text-red-600 font-bold text-xs hover:bg-red-200 transition">
            <i class="fa-solid fa-shield-halved mr-1"></i> Panel Admin
          </a>
        ` : ''}
        <button type="button" onclick="window.handleLogout()" class="text-xs text-gray-400 hover:text-red-500 font-bold p-1">
          <i class="fa-solid fa-right-from-bracket text-base"></i>
        </button>
      </div>
    `;
  } else {
    container.innerHTML = `
      <button type="button" onclick="window.openAuthModal()" class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition">
        Iniciar Sesión
      </button>
    `;
  }
};

window.openAuthModal = function() {
  if (typeof window.generateMathCaptcha === 'function') {
    window.generateMathCaptcha();
  }
  if (typeof window.openModal === 'function') {
    window.openModal('authModal');
  } else {
    const m = document.getElementById('authModal');
    if (m) {
      m.classList.remove('hidden');
      m.classList.add('flex');
    }
  }
};

window.closeAuthModal = function() {
  if (typeof window.closeModal === 'function') {
    window.closeModal('authModal');
  } else {
    const m = document.getElementById('authModal');
    if (m) {
      m.classList.add('hidden');
      m.classList.remove('flex');
    }
  }
};

window.loginWithGoogle = async function() {
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
    if (error) throw error;
  } catch (err) {
    console.error('Error Google Login:', err);
    if (typeof window.showToast === 'function') window.showToast(err.message, 'error');
  }
};

window.handleClientRegister = async function(e) {
  if (e) e.preventDefault();

  const captchaInput = document.getElementById('mathCaptchaInput');
  if (captchaInput && Number(captchaInput.value) !== window.mathCaptchaAnswer) {
    if (typeof window.showToast === 'function') window.showToast('Respuesta del CAPTCHA incorrecta', 'error');
    return;
  }

  const email = document.getElementById('registerEmail')?.value;
  const password = document.getElementById('registerPassword')?.value;
  const fullName = document.getElementById('registerFullName')?.value;
  const phone = document.getElementById('registerPhone')?.value;

  if (!email || !password || !fullName) {
    if (typeof window.showToast === 'function') window.showToast('Completa todos los campos obligatorios', 'error');
    return;
  }

  try {
    const { data: authData, error: authError } = await supabaseClient.auth.signUp({
      email,
      password
    });

    if (authError) throw authError;

    if (authData.user) {
      // Crear registro en la tabla profiles
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert([{
          id: authData.user.id,
          full_name: fullName,
          phone: phone || '',
          is_admin: false,
          credit_limit: 200000 // Cupo inicial base Crédito Cupissa
        }]);

      if (profileError) console.error('Error registrando perfil:', profileError);

      if (typeof window.showToast === 'function') {
        window.showToast('Cuenta creada exitosamente. ¡Bienvenido!', 'success');
      }
      window.closeAuthModal();
      await window.checkUserSession();
    }
  } catch (err) {
    console.error('Error en registro:', err);
    if (typeof window.showToast === 'function') window.showToast(err.message, 'error');
  }
};

window.handleLogout = async function() {
  await supabaseClient.auth.signOut();
  window.currentUser = null;
  window.currentUserProfile = null;
  window.updateAuthUI();
  if (typeof window.showToast === 'function') window.showToast('Has cerrado sesión', 'success');
};

// Escuchar cambios de estado en Supabase
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
    if (session?.user) {
      window.currentUser = session.user;
      await window.fetchUserProfile(session.user.id);
      window.updateAuthUI();
    }
  } else if (event === 'SIGNED_OUT') {
    window.currentUser = null;
    window.currentUserProfile = null;
    window.updateAuthUI();
  }
});