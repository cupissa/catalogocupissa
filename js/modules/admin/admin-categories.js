/**
 * js/modules/admin/admin-categories.js
 * Módulo de Gestión de Categorías, Mundos y Filtros para el Panel Administrativo
 */

window.mundosDisponibles = [
  { key: 'FAMILIAR', nombre: 'Mundo Familiar y Regalos' },
  { key: 'EVENTOS', nombre: 'Mundo Eventos y Fiestas' },
  { key: 'EMPRESAS', nombre: 'Mundo Empresas y B2B' }
];

/**
 * Obtiene o formatea la lista de mundos configurados en el sistema
 */
window.obtenerMundosCategorias = function() {
  const productos = window.productosCache || [];
  const mundosSet = new Set();

  window.mundosDisponibles.forEach(m => mundosSet.add(m.key));

  productos.forEach(p => {
    if (p.mundo) mundosSet.add(p.mundo.toUpperCase());
  });

  return Array.from(mundosSet);
};

/**
 * Poblar opciones de categorías/mundos en selectores dinámicos
 */
window.poblarSelectMundos = function(selectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;

  const mundos = window.obtenerMundosCategorias();
  sel.innerHTML = '<option value="">Todos los mundos / categorías</option>';

  mundos.forEach(m => {
    sel.innerHTML += `<option value="${m}">${m}</option>`;
  });
};