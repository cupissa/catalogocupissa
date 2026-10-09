/**
 * js/pages/catalogo-page.js
 * Controlador de la Página de Catálogo de Productos para los Clientes
 */

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cargar productos desde Supabase
  const productos = await StoreProducts.loadProducts();

  // 2. Renderizar la grilla inicial de productos
  StoreProducts.renderGrid('contenedor-productos-catalogo', productos);

  // 3. Poblar selectores de filtros dinámicos (Mundos)
  poblarFiltrosCatalogo(productos);

  // 4. Escuchadores de eventos para búsqueda y ordenamiento
  const inputBusqueda = document.getElementById('buscador-catalogo-input');
  if (inputBusqueda) {
    inputBusqueda.addEventListener('input', filtrarYOrdenarCatalogo);
  }

  const selectOrden = document.getElementById('select-ordenar-catalogo');
  if (selectOrden) {
    selectOrden.addEventListener('change', filtrarYOrdenarCatalogo);
  }

  const selectMundo = document.getElementById('select-filtro-mundo');
  if (selectMundo) {
    selectMundo.addEventListener('change', filtrarYOrdenarCatalogo);
  }
});

/**
 * Pobla dinámicamente el selector de mundos leyendo únicamente los registros existentes en Supabase
 */
function poblarFiltrosCatalogo(productos) {
  const selectMundo = document.getElementById('select-filtro-mundo');
  if (!selectMundo) return;

  const mundosSet = new Set(
    productos
      .map(p => (p.mundo ? p.mundo.trim().toUpperCase() : ''))
      .filter(Boolean)
  );

  selectMundo.innerHTML = '<option value="todos">Opavave Mundos</option>';

  mundosSet.forEach(mundo => {
    selectMundo.innerHTML += `<option value="${mundo}">${mundo}</option>`;
  });
}

/**
 * Aplica los filtros de texto, mundo seleccionado y criterio de ordenamiento en tiempo real
 */
function filtrarYOrdenarCatalogo() {
  let resultado = [...StoreProducts.cache];

  // Filtro por término de búsqueda (Nombre, Mundo, Categoría)
  const query = (document.getElementById('buscador-catalogo-input')?.value || '').toLowerCase().trim();
  if (query) {
    resultado = resultado.filter(p =>
      (p.nombre || '').toLowerCase().includes(query) ||
      (p.mundo || '').toLowerCase().includes(query) ||
      (p.categoria || '').toLowerCase().includes(query) ||
      (p.subcategoria || '').toLowerCase().includes(query)
    );
  }

  // Filtro por mundo seleccionado
  const mundoSel = document.getElementById('select-filtro-mundo')?.value || 'todos';
  if (mundoSel !== 'todos') {
    resultado = resultado.filter(p => (p.mundo || '').trim().toUpperCase() === mundoSel.toUpperCase());
  }

  // Criterio de ordenamiento por precio o nombre
  const orden = document.getElementById('select-ordenar-catalogo')?.value || 'nombre';
  if (orden === 'precio-menor') {
    resultado.sort((a, b) => parseMonto(a.precio_detal || a.price) - parseMonto(b.precio_detal || b.price));
  } else if (orden === 'precio-mayor') {
    resultado.sort((a, b) => parseMonto(b.precio_detal || b.price) - parseMonto(a.precio_detal || a.price));
  } else if (orden === 'nombre') {
    resultado.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }

  StoreProducts.renderGrid('contenedor-productos-catalogo', resultado);
}