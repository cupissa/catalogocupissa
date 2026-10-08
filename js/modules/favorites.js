/**
 * js/modules/favorites.js
 * Módulo de gestión de Favoritos sincronizado para Inicio y Catálogo
 */

window.favoritesState = JSON.parse(localStorage.getItem('cupissa_favorites') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  window.updateFavoritesUI();
});

window.toggleFavoriteItem = function(product) {
  const productId = typeof product === 'object' ? product.id : product;
  const index = window.favoritesState.findIndex(i => i.id === productId);

  if (index > -1) {
    window.favoritesState.splice(index, 1);
  } else if (typeof product === 'object') {
    window.favoritesState.push({
      id: product.id,
      name: product.name || product.title,
      price: product.price || 0,
      image_url: product.image_url || product.image || 'images/logo.png'
    });
  }

  localStorage.setItem('cupissa_favorites', JSON.stringify(window.favoritesState));
  window.updateFavoritesUI();

  // Si existe el grid interactivo del catálogo, re-renderizar
  if (typeof renderProductsGrid === 'function' && window.catalogState) {
    renderProductsGrid(window.catalogState.filteredProducts);
  }
};

window.openProductDetailFromFavorites = function(productId) {
  window.toggleFavoritesModal(false);
  window.location.href = `catalogo.html?product=${productId}`;
};

window.updateFavoritesUI = function() {
  const countElem = document.getElementById('favCount');
  if (countElem) countElem.textContent = window.favoritesState.length.toString();

  const favList = document.getElementById('favoritesItemsList');
  if (!favList) return;

  if (window.favoritesState.length === 0) {
    favList.innerHTML = `
      <div class="py-12 text-center text-gray-400 text-xs">
        <i class="fa-regular fa-heart text-2xl mb-2 text-gray-300"></i>
        <p>No tienes productos favoritos aún.</p>
      </div>
    `;
    return;
  }

  favList.innerHTML = window.favoritesState.map(item => `
    <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 transition-all">
      <div onclick="window.openProductDetailFromFavorites('${item.id}')" class="flex items-center gap-2.5 cursor-pointer flex-1 group">
        <img src="${item.image_url || 'images/logo.png'}" alt="${item.name}" class="w-12 h-12 object-contain rounded-lg bg-white p-1 group-hover:scale-105 transition-transform">
        <div>
          <h4 class="text-xs font-bold text-gray-800 dark:text-gray-100 line-clamp-1 group-hover:text-brand-600 transition-colors">${item.name}</h4>
          <span class="text-[10px] font-black text-brand-600">$${(item.price || 0).toLocaleString('es-CO')} COP</span>
          <span class="block text-[9px] text-gray-400">Ver en catálogo</span>
        </div>
      </div>
      <button onclick="window.toggleFavoriteItem('${item.id}')" class="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Quitar de Favoritos">
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
    </div>
  `).join('');
};

window.toggleFavoritesModal = function(show) {
  const modal = document.getElementById('favoritesModal');
  if (modal) {
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
  }
};