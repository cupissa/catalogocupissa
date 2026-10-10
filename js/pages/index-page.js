/**
 * js/pages/index-page.js
 * Controlador Principal de la Página de Inicio (Pública) de la Tienda CUPISSA
 */

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Cargar productos directamente desde Supabase sin mockup ni datos ficticios
    const productos = await StoreProducts.loadProducts();

    // 2. Renderizar productos destacados (primeros 8 ítems activos)
    const destacados = productos.slice(0, 8);
    StoreProducts.renderGrid('contenedor-productos-destacados', destacados);

    // 3. Renderizar selector dinámico de mundos basado en los productos creados
    if (typeof StoreProducts.renderWorldsGrid === 'function') {
      StoreProducts.renderWorldsGrid('contenedor-mundos-home');
    } else {
      renderMundosFallback(productos);
    }

    // 4. Verificar y actualizar la sesión del usuario en el Header
    if (typeof window.updateUserAuthUI === 'function') {
      await window.updateUserAuthUI();
    }

    // 5. Inicializar Slider o Banner Principal si está presente en el DOM
    initHeroSlider();

  } catch (err) {
    console.error("Error al inicializar la página de inicio:", err);
  }
});

/**
 * Renderiza los botones de mundos si no está disponible renderWorldsGrid
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
  StoreProducts.renderGrid('contenedor-productos-destacados', filtrados);
};

/**
 * Animación suave del Slider de Banner Principal (si existe el elemento)
 */
function initHeroSlider() {
  const heroImg = document.getElementById('heroSlideImg');
  if (!heroImg) return;

  const images = ['images/logo.png'];
  let currentIndex = 0;

  if (images.length > 1) {
    setInterval(() => {
      currentIndex = (currentIndex + 1) % images.length;
      heroImg.style.opacity = '0';
      setTimeout(() => {
        heroImg.src = images[currentIndex];
        heroImg.style.opacity = '1';
      }, 300);
    }, 5000);
  }
}