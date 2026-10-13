/**
 * js/modules/admin/web/web-categories.js
 * Módulo para la extracción dinámica de Mundos, Categorías, Subcategorías y Temporadas
 * en tiempo real desde los productos reales de Supabase (sin listas harcodeadas).
 */

window.webCategoriesState = {
  variablesActuales: [],
  complementosActuales: []
};

/**
 * Extrae y retorna todos los Mundos únicos presentes en los productos guardados en Supabase
 */
window.obtenerMundosDinamicos = function() {
  const productos = window.productosCache || window.adminProductsCache || [];
  const mundosSet = new Set(productos.map(p => p.mundo ? p.mundo.trim().toUpperCase() : '').filter(Boolean));
  return Array.from(mundosSet);
};

/**
 * Extrae y retorna todas las Categorías únicas presentes en los productos
 */
window.obtenerCategoriasDinamicas = function() {
  const productos = window.productosCache || window.adminProductsCache || [];
  const catSet = new Set(productos.map(p => p.categoria ? p.categoria.trim() : '').filter(Boolean));
  return Array.from(catSet);
};

/**
 * Agrega una variable dinámica al producto actual (Ej: Talla XL -> +$5.000, Color Dorado -> +$2.000)
 */
window.agregarVariableProductoWeb = function() {
  const tipoInput = document.getElementById('var-web-tipo');
  const valorInput = document.getElementById('var-web-valor');
  const ajusteInput = document.getElementById('var-web-ajuste');

  if (!tipoInput || !valorInput) return;

  const tipo = tipoInput.value.trim();
  const valor = valorInput.value.trim();
  const ajustePrecio = parseMonto(ajusteInput ? ajusteInput.value : 0);

  if (!tipo || !valor) {
    if (typeof showToast === 'function') showToast("Ingresa el tipo y valor de la variable (ej. Talla / XL).", "error");
    return;
  }

  window.webCategoriesState.variablesActuales.push({ tipo, valor, ajustePrecio });

  valorInput.value = '';
  if (ajusteInput) ajusteInput.value = '0';

  window.renderizarVariablesProductoWeb();
};

/**
 * Remueve una variable por su índice
 */
window.eliminarVariableProductoWeb = function(index) {
  window.webCategoriesState.variablesActuales.splice(index, 1);
  window.renderizarVariablesProductoWeb();
};

/**
 * Renderiza la lista de variables agregadas en el formulario
 */
window.renderizarVariablesProductoWeb = function() {
  const container = document.getElementById('prod-web-variables-list');
  if (!container) return;

  if (window.webCategoriesState.variablesActuales.length === 0) {
    container.innerHTML = `<span class="text-slate-400 text-[11px] italic">Sin variables asignadas (Talla, Color, Material).</span>`;
    return;
  }

  container.innerHTML = window.webCategoriesState.variablesActuales.map((v, i) => `
    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded-xl text-xs font-bold shadow-sm">
      <span>${v.tipo}: <strong>${v.valor}</strong> ${v.ajustePrecio > 0 ? `(+$${formatMoneda(v.ajustePrecio)})` : ''}</span>
      <button type="button" onclick="eliminarVariableProductoWeb(${i})" class="text-red-500 hover:text-red-700 ml-1 font-extrabold">&times;</button>
    </div>
  `).join(' ');
};

/**
 * Agrega un complemento/adicional opcional al producto (Ej: Empaque Lujo -> +$15.000)
 */
window.agregarComplementoProductoWeb = function() {
  const nombreInput = document.getElementById('comp-web-nombre');
  const precioInput = document.getElementById('comp-web-precio');

  if (!nombreInput) return;

  const nombre = nombreInput.value.trim();
  const precioExtra = parseMonto(precioInput ? precioInput.value : 0);

  if (!nombre) {
    if (typeof showToast === 'function') showToast("Ingresa el nombre del complemento opcional.", "error");
    return;
  }

  window.webCategoriesState.complementosActuales.push({ nombre, precioExtra });

  nombreInput.value = '';
  if (precioInput) precioInput.value = '0';

  window.renderizarComplementosProductoWeb();
};

/**
 * Remueve un complemento por índice
 */
window.eliminarComplementoProductoWeb = function(index) {
  window.webCategoriesState.complementosActuales.splice(index, 1);
  window.renderizarComplementosProductoWeb();
};

/**
 * Renderiza la lista de complementos en el formulario
 */
window.renderizarComplementosProductoWeb = function() {
  const container = document.getElementById('prod-web-complementos-list');
  if (!container) return;

  if (window.webCategoriesState.complementosActuales.length === 0) {
    container.innerHTML = `<span class="text-slate-400 text-[11px] italic">Sin complementos opcionales configurados.</span>`;
    return;
  }

  container.innerHTML = window.webCategoriesState.complementosActuales.map((c, i) => `
    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-pink-50 text-pink-900 border border-pink-200 rounded-xl text-xs font-bold shadow-sm">
      <span>${c.nombre} (+$${formatMoneda(c.precioExtra)})</span>
      <button type="button" onclick="eliminarComplementoProductoWeb(${i})" class="text-red-500 hover:text-red-700 ml-1 font-extrabold">&times;</button>
    </div>
  `).join(' ');
};