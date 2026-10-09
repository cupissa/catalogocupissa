/**
 * js/pages/index-page.js
 * Controlador Principal de la Página de Inicio (Pública) de la Tienda CUPISSA
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cargar productos directamente desde Supabase sin mockup ni datos ficticios
  const productos = await StoreProducts.loadProducts();

  // 2. Renderizar productos destacados
  const destacados = productos.slice(0, 8);
  StoreProducts.renderGrid('contenedor-productos-destacados', destacados);

  // 3. Renderizar selector dinámico de mundos basado en los productos creados
  const mundosSet = new Set(
    productos
      .map(p => (p.mundo ? p.mundo.trim().toUpperCase() : ''))
      .filter(Boolean)
  );

  const containerMundos = document.getElementById('contenedor-mundos-home');

  if (containerMundos) {
    if (mundosSet.size > 0) {
      containerMundos.innerHTML = `
        <button onclick="filtrarMundoHome('todos')" class="px-4 py-2 bg-indigo-600 text-white font-extrabold text-xs rounded-2xl shadow-sm transition-all whitespace-nowrap">
          ✨ Opavave
        </button>
      ` + Array.from(mundosSet).map(mundo => `
        <button onclick="filtrarMundoHome('${mundo}')" class="px-4 py-2 bg-white hover:bg-indigo-50 border border-slate-200 text-slate-700 font-extrabold text-xs rounded-2xl shadow-sm transition-all whitespace-nowrap">
          ✨ ${mundo}
        </button>
      `).join('');
    } else {
      containerMundos.innerHTML = `<span class="text-xs text-slate-400 italic">Ndapóri mundo ojehai pyre gueteri.</span>`;
    }
  }

  // 4. Verificar usuario logueado para personalizar la bienvenida
  if (typeof ClientAuth !== 'undefined') {
    const activeData = await ClientAuth.getActiveClient();
    const btnUser = document.getElementById('btn-header-usuario');
    if (btnUser && activeData && activeData.profile) {
      const nombre = activeData.profile.first_name || 'Che Cuenta';
      btnUser.innerHTML = `<i class="fa-solid fa-user-check text-emerald-500 mr-1.5"></i> Mba'éichapa, ${nombre}`;
    }
  }
});

/**
 * Función global para filtrar productos por mundo desde la página de inicio
 */
window.filtrarMundoHome = function(mundo) {
  const filtrados = StoreProducts.getByWorld(mundo);
  StoreProducts.renderGrid('contenedor-productos-destacados', filtrados);
};