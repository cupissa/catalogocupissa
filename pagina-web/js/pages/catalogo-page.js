/**
 * js/pages/catalogo-page.js
 * Controlador de la Página de Catálogo de Productos para los Clientes
 */

window.catalogState = {
  currentSelectedWorld: 'all',
  filteredProducts: [],
  visibleCount: 0,
  pageSize: 24,
  observer: null
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Cargar productos desde Supabase (productos_web vía StoreProducts)
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
    const normalize = value => String(value || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().trim();
    const q = normalize(query);
    const distance = (a, b) => {
      if (Math.abs(a.length - b.length) > 2) return 99;
      let prev = Array.from({length: b.length + 1}, (_, i) => i);
      for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++) cur[j] = Math.min(cur[j-1] + 1, prev[j] + 1, prev[j-1] + (a[i-1] === b[j-1] ? 0 : 1));
        prev = cur;
      }
      return prev[b.length];
    };
    const fields = p => [p.nombre,p.mundo,p.categoria,p.subcategoria,p.temporada,p.referencia,p.descripcion]
      .map(normalize).filter(Boolean);
    const scored = resultado.map(p => {
      const words = fields(p);
      let score = words.reduce((best, field) => {
        if (field.includes(q)) return Math.min(best, field === q ? 0 : 1);
        const tokens = field.split(/[^a-z0-9]+/).filter(Boolean);
        return Math.min(best, ...tokens.map(token => {
          if (token.startsWith(q) || q.startsWith(token)) return 1;
          if (Math.min(token.length, q.length) >= 4 && distance(token, q) <= (q.length >= 7 ? 2 : 1)) return 2;
          return 99;
        }));
      }, 99);
      return {p, score};
    }).filter(item => item.score < 99)
      .sort((a,b) => a.score-b.score).map(item => item.p);
    resultado = scored;
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

  // Renderizado progresivo: solo 24 productos inicialmente y más al acercarse al final.
  window.catalogState.visibleCount = 0;
  const grid = document.getElementById('productGrid') || document.getElementById('contenedor-productos-catalogo');
  if (!grid) return;
  if (window.catalogState.observer) window.catalogState.observer.disconnect();
  grid.innerHTML = '';
  const sentinel = document.getElementById('catalogInfiniteSentinel');
  if (sentinel) sentinel.remove();
  window.cargarSiguienteLoteCatalogo(true);
};

window.cargarSiguienteLoteCatalogo = function(reset = false) {
  const state = window.catalogState;
  const grid = document.getElementById('productGrid') || document.getElementById('contenedor-productos-catalogo');
  if (!grid) return;
  if (reset) { state.visibleCount = 0; grid.innerHTML = ''; }
  const start = state.visibleCount;
  const end = Math.min(start + state.pageSize, state.filteredProducts.length);
  const batch = state.filteredProducts.slice(start, end);
  if (batch.length) {
    const scratch = document.createElement('div');
    scratch.className = grid.className;
    StoreProducts.renderGridForContainer?.(scratch, batch);
    // renderGrid espera un ID; usar un contenedor temporal registrado en DOM para mantener compatibilidad.
    const tempId = 'catalog-batch-' + Date.now();
    const temp = document.createElement('div');
    temp.id = tempId;
    temp.className = grid.className;
    grid.appendChild(temp);
    StoreProducts.renderGrid(tempId, batch);
    while (temp.firstElementChild) grid.appendChild(temp.firstElementChild);
    temp.remove();
    state.visibleCount = end;
  }
  let sentinel = document.getElementById('catalogInfiniteSentinel');
  if (!sentinel) {
    sentinel = document.createElement('div');
    sentinel.id = 'catalogInfiniteSentinel';
    sentinel.className = 'col-span-full py-5 text-center text-xs text-gray-400';
    grid.after(sentinel);
  }
  if (state.visibleCount < state.filteredProducts.length) {
    sentinel.textContent = 'Desliza para cargar más productos…';
    if (state.observer) state.observer.disconnect();
    state.observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) window.cargarSiguienteLoteCatalogo(false);
    }, {rootMargin: '500px'});
    state.observer.observe(sentinel);
  } else {
    sentinel.textContent = state.filteredProducts.length ? 'Has llegado al final del catálogo.' : 'No se encontraron productos similares.';
    if (!state.filteredProducts.length) StoreProducts.renderGrid('productGrid', []);
    if (state.observer) state.observer.disconnect();
  }
};