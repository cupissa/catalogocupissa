// js/components/Modals.js

class CupissaModals extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <!-- MODAL FAVORITOS -->
      <div id="favoritesModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end hidden">
        <div class="bg-white dark:bg-gray-800 h-full w-full max-w-md p-6 shadow-2xl border-l border-gray-100 dark:border-gray-700 flex flex-col justify-between relative z-50">
          <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
            <h3 class="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
              <i class="fa-solid fa-heart text-brand-600"></i> Mis Favoritos
            </h3>
            <button type="button" onclick="window.toggleFavoritesModal(false)" class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
              <i class="fa-solid fa-xmark text-lg"></i>
            </button>
          </div>
          <div id="favoritesItemsList" class="space-y-3 overflow-y-auto flex-1 pr-1"></div>
        </div>
      </div>

      <!-- MODAL CARRITO -->
      <div id="cartModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-end hidden">
        <div class="bg-white dark:bg-gray-800 h-full w-full max-w-md p-6 shadow-2xl border-l border-gray-100 dark:border-gray-700 flex flex-col justify-between relative z-50">
          <div class="flex-1 overflow-hidden flex flex-col">
            <div class="flex justify-between items-center mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
              <h3 class="font-black text-base text-gray-900 dark:text-white flex items-center gap-2">
                <i class="fa-solid fa-bag-shopping text-brand-600"></i> Mi Carrito
              </h3>
              <button type="button" onclick="window.toggleCartModal(false)" class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
                <i class="fa-solid fa-xmark text-lg"></i>
              </button>
            </div>
            <div id="cartItemsList" class="space-y-3 overflow-y-auto flex-1 pr-1"></div>
          </div>
          <div class="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2 mt-4">
            <div class="flex justify-between text-xs">
              <span class="text-gray-500 dark:text-gray-400 font-bold">Total Productos:</span>
              <span id="cartTotalText" class="font-black text-gray-900 dark:text-white">$0 COP</span>
            </div>
            <div class="flex justify-between text-xs font-bold text-brand-600 dark:text-brand-400">
              <span>Anticipo a Pagar:</span>
              <span id="cartAdvanceText">$0 COP</span>
            </div>
            <a href="catalogo.html" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-3 rounded-xl text-xs transition-all mt-2 shadow-md flex items-center justify-center gap-2">
              <span>Ir al Catálogo a Procesar Pago</span>
              <i class="fa-solid fa-arrow-right"></i>
            </a>
          </div>
        </div>
      </div>

      <!-- MODAL AUTENTICACIÓN -->
      <div id="authModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
        <div class="bg-white dark:bg-gray-800 rounded-3xl max-w-sm w-full p-6 shadow-xl border border-gray-100 dark:border-gray-700 relative">
          <button type="button" onclick="closeAuthModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <i class="fa-solid fa-xmark"></i>
          </button>

          <div class="flex mb-6 border-b border-gray-100 dark:border-gray-700 text-center">
            <button type="button" id="tabRoleLogin" onclick="switchAuthMode('login')" class="flex-1 pb-3 font-bold text-xs border-b-2 border-brand-600 text-brand-600">
              Iniciar Sesión
            </button>
            <button type="button" id="tabRoleRegister" onclick="switchAuthMode('register')" class="flex-1 pb-3 font-bold text-xs border-b-2 border-transparent text-gray-400">
              Registrarse
            </button>
          </div>

          <div id="formLoginContainer">
            <form onsubmit="handleClientLogin(event)" class="space-y-3">
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                <input type="email" id="loginEmail" required class="w-full bg-gray-50 dark:bg-gray-700 text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Contraseña</label>
                <input type="password" id="loginPassword" required class="w-full bg-gray-50 dark:bg-gray-700 text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500">
              </div>
              <button type="submit" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-md">
                Ingresar
              </button>
            </form>
          </div>

          <div id="formRegisterContainer" class="hidden">
            <form onsubmit="handleClientRegister(event)" class="space-y-3">
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Nombre</label>
                  <input type="text" id="regClientFirstName" required class="w-full bg-gray-50 dark:bg-gray-700 text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
                </div>
                <div>
                  <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Apellido</label>
                  <input type="text" id="regClientLastName" required class="w-full bg-gray-50 dark:bg-gray-700 text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                <input type="email" id="regClientEmail" required class="w-full bg-gray-50 dark:bg-gray-700 text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
              </div>
              <div>
                <label class="block text-[10px] font-bold text-gray-500 uppercase mb-1">Contraseña</label>
                <input type="password" id="regClientPassword" required class="w-full bg-gray-50 dark:bg-gray-700 text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-600">
              </div>

              <div class="flex items-center gap-2">
                <span id="mathCaptchaQuestion" class="bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">?</span>
                <input type="number" id="mathCaptchaInput" required placeholder="Respuesta" class="w-full bg-gray-50 dark:bg-gray-700 text-xs p-2 rounded-xl border border-gray-200 dark:border-gray-600">
              </div>

              <button type="submit" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition-all shadow-md">
                Crear Cuenta
              </button>
            </form>
          </div>

          <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-center">
            <button type="button" onclick="loginWithGoogle()" class="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2">
              <i class="fa-brands fa-google text-red-500"></i> Continuar con Google
            </button>
          </div>
        </div>
      </div>
    `;
  }
}
customElements.define('cupissa-modals', CupissaModals);