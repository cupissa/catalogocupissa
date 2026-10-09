/**
 * js/pages/index-page.js
 * Controlador Principal de la Página de Inicio (Pública) de la Tienda CUPISSA
 */

window.heroSliderIndex = 0;
window.heroSliderImages = [
  'images/hero-banner.jpg',
  'images/hero-banner-2.jpg',
  'images/hero-banner-3.jpg'
];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Cargar productos directamente desde Supabase
    const productos = await StoreProducts.loadProducts();

    // 2. Obtener la Temporada Actual configurada desde el Admin
    let currentSeason = '';
    try {
      if (typeof window.getSetting === 'function') {
        currentSeason = await window.getSetting('current_season');
      }
    } catch (e) {
      console.warn("No se pudo obtener la temporada actual:", e);
    }

    // 3. Actualizar títulos de la sección según la temporada configurada
    const seasonTitle = document.getElementById('seasonTitle');
    const seasonBadge = document.getElementById('seasonBadge');

    if (currentSeason && currentSeason.trim() !== '') {
      if (seasonBadge) seasonBadge.textContent = `ESPECIAL TEMPORADA ${currentSeason.toUpperCase()}`;
      if (seasonTitle) seasonTitle.textContent = `Destacados de ${currentSeason.toUpperCase()}`;
    } else {
      if (seasonBadge) seasonBadge.textContent = `Especial de Temporada`;
      if (seasonTitle) seasonTitle.textContent = `Productos Destacados`;
    }

    // 4. Obtener 5 productos aleatorios de la temporada activa (rotativos)
    const destacadosSeason = StoreProducts.getSeasonProducts(currentSeason, 5);

    // Renderizar en ambos contenedores posibles por compatibilidad
    StoreProducts.renderGrid('seasonProductGrid', destacadosSeason);
    StoreProducts.renderGrid('contenedor-productos-destacados', destacadosSeason);

    // 5. Renderizar selector dinámico de mundos basado en los productos creados
    if (typeof StoreProducts.renderWorldsGrid === 'function') {
      StoreProducts.renderWorldsGrid('contenedor-mundos-home');
    } else {
      renderMundosFallback(productos);
    }

    // 6. Verificar y actualizar la sesión del usuario en el Header
    if (typeof window.updateUserAuthUI === 'function') {
      await window.updateUserAuthUI();
    }

    // 7. Inicializar Slider de Banner Principal
    initHeroSlider();

  } catch (err) {
    console.error("Error al inicializar la página de inicio:", err);
  }
});

/**
 * Renderiza los botones de mundos en caso de fallback
 */
function renderMundosFallback(productos) {
  const container = document.getElementById('contenedor-mundos-home');
  if (!container) return;

  const mundosSet = new Set(
    (productos || [])
      .map(p => (p.mundo ? p.mundo.trim().toUpperCase() : ''))
      .filter(Boolean)
  );

  if (mundosSet.size > 0) {
    container.innerHTML = `
      <button onclick="filtrarMundoHome('todos')" class="px-4 py-2 bg-brand-600 text-white font-extrabold text-xs rounded-2xl shadow-sm hover:bg-brand-700 transition-all whitespace-nowrap">
        ✨ Todos
      </button>
    ` + Array.from(mundosSet).map(mundo => `
      <button onclick="filtrarMundoHome('${mundo}')" class="px-4 py-2 bg-white dark:bg-gray-800 dark:text-gray-200 hover:bg-pink-50 border border-gray-200 dark:border-gray-700 text-gray-700 font-extrabold text-xs rounded-2xl shadow-sm transition-all whitespace-nowrap">
        ✨ ${mundo}
      </button>
    `).join('');
  } else {
    container.innerHTML = `<span class="text-xs text-gray-400 italic">No hay mundos registrados aún en el catálogo.</span>`;
  }
}

/**
 * Función global para filtrar productos destacados por mundo desde la página de inicio
 */
window.filtrarMundoHome = function(mundo) {
  const filtrados = StoreProducts.getByWorld(mundo);
  StoreProducts.renderGrid('seasonProductGrid', filtrados);
  StoreProducts.renderGrid('contenedor-productos-destacados', filtrados);
};

/**
 * Animación y controles del Slider Banner Principal
 */
function initHeroSlider() {
  const heroImg = document.getElementById('heroSlideImg');
  if (!heroImg) return;

  setInterval(() => {
    window.nextHeroSlide();
  }, 5000);
}

window.nextHeroSlide = function() {
  const heroImg = document.getElementById('heroSlideImg');
  if (!heroImg) return;

  window.heroSliderIndex = (window.heroSliderIndex + 1) % window.heroSliderImages.length;
  heroImg.style.opacity = '0';
  setTimeout(() => {
    heroImg.src = window.heroSliderImages[window.heroSliderIndex];
    heroImg.style.opacity = '1';
  }, 250);
};

window.prevHeroSlide = function() {
  const heroImg = document.getElementById('heroSlideImg');
  if (!heroImg) return;

  window.heroSliderIndex = (window.heroSliderIndex - 1 + window.heroSliderImages.length) % window.heroSliderImages.length;
  heroImg.style.opacity = '0';
  setTimeout(() => {
    heroImg.src = window.heroSliderImages[window.heroSliderIndex];
    heroImg.style.opacity = '1';
  }, 250);
};