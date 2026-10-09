/**
 * js/pages/catalogo-page.js
 * Controlador de la Página de Catálogo de Productos para los Clientes
 */

window.catalogState = {
  currentSelectedWorld: 'all',
  filteredProducts: []
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Cargar productos desde Supabase
    const productos = await StoreProducts.loadProducts();

    // 2. Leer parámetros URL ("mundo", "search", "favs", "product")
    const urlParams = new URLSearchParams(window.location.search);
    const mundoParam = urlParams.get('mundo');
    const searchParam = urlParams.get('search');
    const favsParam = urlParams.get('favs');
    const productParam = urlParams.get('product');

    if (mundoParam) {
      window.catalogState.currentSelectedWorld = mundoParam;
    }

    const inputBusqueda = document.getElementById('searchInput') || document.getElementById('buscador-catalogo-input');
    if (inputBusqueda && searchParam) {
      inputBusqueda.value = searchParam;
    }

    // 3. Renderizar pestañas horizontales de mundos
    if (typeof StoreProducts.renderWorldTabs === 'function') {
      StoreProducts.renderWorldTabs('worldTabsContainer', window.catalogState.currentSelectedWorld);
    }

    // 4. Poblar selector desplegable si existe
    poblarFiltrosCatalogo(productos, window.catalogState.currentSelectedWorld);

    // 5. Renderizar y filtrar la lista inicial
    window.filtrarYOrdenarCatalogo();

    // 6. Escuchadores de eventos para la barra de búsqueda y filtros
    if (inputBusqueda) {
      inputBusqueda.addEventListener('input', window.filtrarYOrdenarCatalogo);
      inputBusqueda.addEventListener('keyup', window.filtrarYOrdenarCatalogo);
    }

    const selectOrden = document.getElementById('select-ordenar-catalogo');
    if (selectOrden) {
      selectOrden.addEventListener('change', window.filtrarYOrdenarCatalogo);
    }

    const selectMundo = document.getElementById('select-filtro-mundo');
    if (selectMundo) {
      selectMundo.addEventListener('change', (e) => {
        window.catalogState.currentSelectedWorld = e.target.value;
        if (typeof StoreProducts.renderWorldTabs === 'function') {
          StoreProducts.renderWorldTabs('worldTabsContainer', window.catalogState.currentSelectedWorld);
        }
        window.filtrarYOrdenarCatalogo();
      });
    }

    // 7. Si se solicita abrir directamente un producto por parámetro en URL
    if (productParam) {
      const pFound = (productos || []).find(p => String(p.id) === String(productParam));
      if (pFound && typeof window.showProductDetail === 'function') {
        window.showProductDetail(pFound);
      }
    }

    // 8. Si se solicita abrir el modal de favoritos directamente
    if (favsParam === 'true' && typeof window.toggleFavoritesModal === 'function') {
      window.toggleFavoritesModal(true);
    }

    // 9. Actualizar sesión de usuario en header
    if (typeof window.updateUserAuthUI === 'function') {
      await window.updateUserAuthUI();
    }

  } catch (err) {
    console.error("Error al cargar la página de catálogo:", err);
    const grid = document.getElementById('productGrid') || document.getElementById('contenedor-productos-catalogo');
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <i class="fa-solid fa-triangle-exclamation text-3xl text-amber-500 mb-2"></i>
          <p class="text-gray-500 font-bold text-xs">No se pudo cargar el catálogo. Intenta recargar la página.</p>
        </div>
      `;
    }
  }
});

/**
 * Función global para filtrar por mundo desde las pestañas
 */
window.filterByWorld = function(mundo) {
  window.catalogState.currentSelectedWorld = mundo;

  const selectMundo = document.getElementById('select-filtro-mundo');
  if (selectMundo) {
    selectMundo.value = mundo.toLowerCase() === 'all' ? 'todos' : mundo;
  }

  if (typeof StoreProducts.renderWorldTabs === 'function') {
    StoreProducts.renderWorldTabs('worldTabsContainer', window.catalogState.currentSelectedWorld);
  }

  window.filtrarYOrdenarCatalogo();
};

/**
 * Búsqueda inteligente llamada desde la cabecera
 */
window.filterProductsBySmartSearch = function() {
  window.filtrarYOrdenarCatalogo();
};

/**
 * Muestra el catálogo principal ocultando la vista estática legacy de detalle si aplica
 */
window.showCatalogView = function() {
  const sectionCatalog = document.getElementById('section-catalog');
  const sectionDetail = document.getElementById('section-product-detail');

  if (sectionCatalog) sectionCatalog.classList.remove('hidden');
  if (sectionDetail) sectionDetail.classList.add('hidden');
};

/**
 * Pobla desplegable de filtros de mundos
 */
function poblarFiltrosCatalogo(productos, selectedMundo = 'all') {
  const selectMundo = document.getElementById('select-filtro-mundo');
  if (!selectMundo) return;

  const mundosSet = new Set(
    (productos || [])
      .map(p => (p.mundo ? p.mundo.trim().toUpperCase() : ''))
      .filter(Boolean)
  );

  selectMundo.innerHTML = '<option value="todos">Todos los Mundos</option>';

  mundosSet.forEach(mundo => {
    const isSel = selectedMundo.toUpperCase() === mundo.toUpperCase();
    selectMundo.innerHTML += `<option value="${mundo}" ${isSel ? 'selected' : ''}>${mundo}</option>`;
  });
}

function parseMontoSeguro(val) {
  if (typeof window.parseMonto === 'function') {
    return window.parseMonto(val);
  }
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

/**
 * Aplica los filtros de búsqueda, mundo y orden en tiempo real
 */
window.filtrarYOrdenarCatalogo = function() {
  let resultado = [...(StoreProducts.cache || [])];

  // 1. Búsqueda por texto
  const inputBusqueda = document.getElementById('searchInput') || document.getElementById('buscador-catalogo-input');
  const query = (inputBusqueda?.value || '').toLowerCase().trim();

  if (query) {
    resultado = resultado.filter(p =>
      (p.nombre || '').toLowerCase().includes(query) ||
      (p.mundo || '').toLowerCase().includes(query) ||
      (p.categoria || '').toLowerCase().includes(query) ||
      (p.subcategoria || '').toLowerCase().includes(query) ||
      (p.temporada || '').toLowerCase().includes(query) ||
      (p.referencia || '').toLowerCase().includes(query)
    );
  }

  // 2. Filtro por mundo
  const currentWorld = window.catalogState.currentSelectedWorld;
  if (currentWorld && currentWorld !== 'all' && currentWorld !== 'todos') {
    resultado = resultado.filter(p => 
      (p.mundo || '').trim().toUpperCase() === currentWorld.trim().toUpperCase()
    );
  }

  // 3. Ordenamiento
  const orden = document.getElementById('select-ordenar-catalogo')?.value || 'nombre';
  if (orden === 'precio-menor') {
    resultado.sort((a, b) => parseMontoSeguro(a.precio_detal || a.price) - parseMontoSeguro(b.precio_detal || b.price));
  } else if (orden === 'precio-mayor') {
    resultado.sort((a, b) => parseMontoSeguro(b.precio_detal || b.price) - parseMontoSeguro(a.precio_detal || a.price));
  } else if (orden === 'nombre') {
    resultado.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }

  window.catalogState.filteredProducts = resultado;

  // Actualizar título del mundo actual si el elemento existe
  const titleElem = document.getElementById('currentWorldTitle');
  if (titleElem) {
    if (currentWorld && currentWorld !== 'all' && currentWorld !== 'todos') {
      titleElem.textContent = `Mundo ${currentWorld.toUpperCase()} (${resultado.length})`;
    } else {
      titleElem.textContent = `Catálogo General Cupissa (${resultado.length})`;
    }
  }

  // Renderizar en los contenedores correspondientes
  StoreProducts.renderGrid('productGrid', resultado);
  StoreProducts.renderGrid('contenedor-productos-catalogo', resultado);
};