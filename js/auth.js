let mathCaptchaAnswer = 0;

window.openAuthModal = function() { toggleAuthModal(true); };

window.toggleAuthModal = function(show) {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.toggle('hidden', !show);
};

window.switchAuthMode = function(mode) {
  const formReg = document.getElementById('formRegisterContainer');
  const formLog = document.getElementById('formLoginContainer');
  const tabReg = document.getElementById('tabRoleRegister');
  const tabLog = document.getElementById('tabRoleLogin');

  if (mode === 'register') {
    if (formReg) formReg.classList.remove('hidden');
    if (formLog) formLog.classList.add('hidden');
    if (tabReg) tabReg.className = "flex-1 pb-3 font-bold text-xs border-b-2 border-brand-600 text-brand-600";
    if (tabLog) tabLog.className = "flex-1 pb-3 font-bold text-xs border-b-2 border-transparent text-gray-400";
  } else {
    if (formReg) formReg.classList.add('hidden');
    if (formLog) formLog.classList.remove('hidden');
    if (tabLog) tabLog.className = "flex-1 pb-3 font-bold text-xs border-b-2 border-brand-600 text-brand-600";
    if (tabReg) tabReg.className = "flex-1 pb-3 font-bold text-xs border-b-2 border-transparent text-gray-400";
  }
};

function generateMathCaptcha() {
  const n1 = Math.floor(Math.random() * 9) + 1;
  const n2 = Math.floor(Math.random() * 9) + 1;
  mathCaptchaAnswer = n1 + n2;
  const qEl = document.getElementById('mathCaptchaQuestion');
  if (qEl) qEl.textContent = `¿Cuánto es ${n1} + ${n2}?`;
}

window.handleClientRegister = async function(e) {
  e.preventDefault();
  const ansInput = parseInt(document.getElementById('mathCaptchaInput').value, 10);
  if (ansInput !== mathCaptchaAnswer) {
    alert("Captcha incorrecto.");
    generateMathCaptcha();
    return;
  }
  const fname = document.getElementById('regClientFirstName').value;
  const lname = document.getElementById('regClientLastName').value;
  const email = document.getElementById('regClientEmail').value;
  const pass = document.getElementById('regClientPassword').value;

  try {
    const { error } = await supabaseClient.auth.signUp({
      email, password: pass, options: { data: { first_name: fname, last_name: lname } }
    });
    if (error) throw error;
    alert("¡Cuenta creada exitosamente!");
    toggleAuthModal(false);
    checkUserSession();
  } catch (err) { alert(err.message); }
};

window.handleClientLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    toggleAuthModal(false);
    checkUserSession();
  } catch (err) { alert(err.message); }
};

window.loginWithGoogle = async function() {
  await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
};

async function checkUserSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const authSec = document.getElementById('userAuthSection');
  if (!authSec) return;

  if (session && session.user) {
    const name = session.user.user_metadata?.first_name || 'Mi Cuenta';
    authSec.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-gray-700 dark:text-gray-200">${name}</span>
        <button type="button" onclick="logout()" class="text-xs text-gray-400 hover:text-brand-600 p-1">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    `;
  } else {
    authSec.innerHTML = `
      <button type="button" onclick="openAuthModal()" class="flex items-center space-x-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all py-2 px-3 rounded-xl shadow-sm">
        <i class="fa-regular fa-user"></i>
        <span class="hidden sm:inline">Ingresar</span>
      </button>
    `;
  }
}

window.logout = async function() {
  await supabaseClient.auth.signOut();
  checkUserSession();
};