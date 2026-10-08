class CupissaHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <header class="sticky top-0 z-40 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border-b border-gray-100 dark:border-gray-700/60 shadow-sm">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <a href="index.html" class="flex items-center space-x-2 shrink-0">
            <img src="images/logo.png" alt="Cupissa Logo" class="h-10 w-auto object-contain">
          </a>

          <div class="flex-1 max-w-md hidden md:block relative">
            <div class="relative">
              <input 
                type="text" 
                id="searchInput" 
                placeholder="Buscar en Cupissa..." 
                class="w-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-800 dark:text-gray-100 rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all placeholder-gray-400"
              >
              <i class="fa-solid fa-magnifying-glass absolute left-3 top-3 text-xs text-gray-400"></i>
            </div>
          </div>

          <div class="flex items-center space-x-1 sm:space-x-3 shrink-0">
            <a href="index.html" class="text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-brand-600 transition-colors py-2 px-2.5 rounded-lg">
              <i class="fa-solid fa-house text-brand-600 mr-1"></i>Inicio
            </a>
            <a href="catalogo.html" class="text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-brand-600 transition-colors py-2 px-2.5 rounded-lg">
              <i class="fa-solid fa-store text-brand-600 mr-1"></i>Catálogo
            </a>
            <a href="rastreo.html" class="text-xs font-bold text-gray-700 dark:text-gray-200 hover:text-brand-600 transition-colors hidden lg:inline-flex items-center gap-1.5 py-2 px-2.5 rounded-lg">
              <i class="fa-solid fa-truck-fast text-brand-600"></i>Rastrear
            </a>

            <div id="userAuthSection">
              <button type="button" onclick="openAuthModal()" class="flex items-center space-x-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 py-2 px-3 rounded-xl shadow-sm">
                <i class="fa-regular fa-user"></i>
                <span class="hidden sm:inline">Ingresar</span>
              </button>
            </div>

            <button type="button" onclick="window.toggleFavoritesModal(true)" class="relative p-2 text-gray-600 dark:text-gray-300 hover:text-brand-600">
              <i class="fa-solid fa-heart text-lg text-gray-400"></i>
              <span id="favCount" class="absolute -top-1 -right-1 bg-brand-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
            </button>

            <button type="button" onclick="window.toggleCartModal(true)" class="relative p-2 text-gray-600 dark:text-gray-300 hover:text-brand-600">
              <i class="fa-solid fa-bag-shopping text-lg"></i>
              <span id="cartCount" class="absolute -top-1 -right-1 bg-brand-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">0</span>
            </button>

            <button type="button" id="themeToggleBtn" onclick="toggleTheme()" class="p-2 text-gray-600 dark:text-yellow-400 hover:text-brand-600 rounded-xl">
              <i id="themeIcon" class="fa-solid fa-sun text-lg"></i>
            </button>
          </div>
        </div>
      </header>
    `;
  }
}
customElements.define('cupissa-header', CupissaHeader);