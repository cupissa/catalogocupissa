/**
 * js/pages/catalogo-page.js
 * Controlador de la Página de Catálogo de Productos para los Clientes
 */

let currentSelectedWorld = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // 1. Cargar productos desde Supabase
    const productos = await StoreProducts.loadProducts();

    // 2. Leer parámetros "mundo" o "search" desde la URL si viene redireccionado
    const urlParams = new URLSearchParams(window.location.search);
    const mundoParam = urlParams.get('mundo');
    const searchParam = urlParams.get('search');

    if (mundoParam) {
      currentSelectedWorld = mundoParam;
    }

    const inputBusqueda = document.getElementById('buscador-catalogo-input');
    if (inputBusqueda && searchParam) {
      inputBusqueda.value = searchParam;
    }

    // 3. Renderizar pestañas horizontales de mundos si el contenedor existe
    if (typeof StoreProducts.renderWorldTabs === 'function') {
      StoreProducts.renderWorldTabs('worldTabsContainer', currentSelectedWorld);
    }

    // 4. Poblar selector desplegable de filtros de mundos
    poblarFiltrosCatalogo(productos, currentSelectedWorld);

    // 5. Renderizar y filtrar la lista inicial
    filtrarYOrdenarCatalogo();

    // 6. Escuchadores de eventos para interacción del usuario
    if (inputBusqueda) {
      inputBusqueda.addEventListener('input', filtrarYOrdenarCatalogo);
    }

    const selectOrden = document.getElementById('select-ordenar-catalogo');
    if (selectOrden) {
      selectOrden.addEventListener('change', filtrarYOrdenarCatalogo);
    }

    const selectMundo = document.getElementById('select-filtro-mundo');
    if (selectMundo) {
      selectMundo.addEventListener('change', (e) => {
        currentSelectedWorld = e.target.value;
        if (typeof StoreProducts.renderWorldTabs === 'function') {
          StoreProducts.renderWorldTabs('worldTabsContainer', currentSelectedWorld);
        }
        filtrarYOrdenarCatalogo();
      });
    }

    // 7. Actualizar estado de autenticación en la cabecera
    if (typeof window.updateUserAuthUI === 'function') {
      await window.updateUserAuthUI();
    }

  } catch (err) {
    console.error("Error al cargar la página de catálogo:", err);
  }
});

/**
 * Función global llamada al hacer clic en las pestañas de mundos
 */
window.filterByWorld = function(mundo) {
  currentSelectedWorld = mundo;

  const selectMundo = document.getElementById('select-filtro-mundo');
  if (selectMundo) {
    selectMundo.value = mundo.toLowerCase() === 'all' ? 'todos' : mundo;
  }

  if (typeof StoreProducts.renderWorldTabs === 'function') {
    StoreProducts.renderWorldTabs('worldTabsContainer', currentSelectedWorld);
  }

  filtrarYOrdenarCatalogo();
};

/**
 * Pobla dinámicamente el selector desplegable leyendo solo registros existentes
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

/**
 * Helper local seguro para parsear valores numéricos
 */
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
 * Aplica los filtros de texto, mundo seleccionado y criterio de ordenamiento en tiempo real
 */
function filtrarYOrdenarCatalogo() {
  let resultado = [...StoreProducts.cache];

  // 1. Filtro por término de búsqueda (Nombre, Mundo, Categoría, Subcategoría)
  const query = (document.getElementById('buscador-catalogo-input')?.value || '').toLowerCase().trim();
  if (query) {
    resultado = resultado.filter(p =>
      (p.nombre || '').toLowerCase().includes(query) ||
      (p.mundo || '').toLowerCase().includes(query) ||
      (p.categoria || '').toLowerCase().includes(query) ||
      (p.subcategoria || '').toLowerCase().includes(query)
    );
  }

  // 2. Filtro por mundo seleccionado
  if (currentSelectedWorld && currentSelectedWorld !== 'all' && currentSelectedWorld !== 'todos') {
    resultado = resultado.filter(p => 
      (p.mundo || '').trim().toUpperCase() === currentSelectedWorld.trim().toUpperCase()
    );
  }

  // 3. Criterio de ordenamiento por precio o nombre
  const orden = document.getElementById('select-ordenar-catalogo')?.value || 'nombre';
  if (orden === 'precio-menor') {
    resultado.sort((a, b) => parseMontoSeguro(a.precio_detal || a.price) - parseMontoSeguro(b.precio_detal || b.price));
  } else if (orden === 'precio-mayor') {
    resultado.sort((a, b) => parseMontoSeguro(b.precio_detal || b.price) - parseMontoSeguro(a.precio_detal || a.price));
  } else if (orden === 'nombre') {
    resultado.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }

  StoreProducts.renderGrid('contenedor-productos-catalogo', resultado);
}