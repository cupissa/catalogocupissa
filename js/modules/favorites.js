/**
 * js/modules/favorites.js
 * Módulo de gestión de Favoritos sincronizado para Inicio y Catálogo.
 * Permite guardar, eliminar y abrir el detalle interactivo directamente desde Favoritos.
 */

window.favoritesState = JSON.parse(localStorage.getItem('cupissa_favorites') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  window.updateFavoritesUI();
});

/**
 * Alterna el estado de Favorito de un producto
 */
window.toggleFavoriteItem = function(product) {
  if (!product) return;

  const productId = typeof product === 'object' ? product.id : product;
  const index = window.favoritesState.findIndex(i => i.id === productId);

  if (index > -1) {
    window.favoritesState.splice(index, 1);
    if (typeof window.showToast === 'function') {
      window.showToast("Producto eliminado de Favoritos.", "info");
    }
  } else if (typeof product === 'object') {
    window.favoritesState.push({
      id: product.id,
      nombre: product.nombre || product.name || product.title,
      price: product.precio_detal || product.price || 0,
      image_url: product.image_url || product.imagen || product.image || 'images/logo.png',
      rawProduct: product
    });
    if (typeof window.showToast === 'function') {
      window.showToast("¡Producto guardado en Favoritos!");
    }
  }

  localStorage.setItem('cupissa_favorites', JSON.stringify(window.favoritesState));
  window.updateFavoritesUI();

  // Re-renderizar catálogo si está activo
  if (window.StoreProducts && typeof window.StoreProducts.renderGrid === 'function' && window.catalogState) {
    window.StoreProducts.renderGrid('productGrid', window.catalogState.filteredProducts || window.StoreProducts.cache);
  }
};

// Alias compatible
window.toggleFavorite = window.toggleFavoriteItem;

/**
 * Abre el detalle interactivo del producto directamente desde la lista de Favoritos
 */
window.openProductDetailFromFavorites = function(productId) {
  window.toggleFavoritesModal(false);

  const favObj = window.favoritesState.find(f => f.id === productId);
  if (favObj && favObj.rawProduct && typeof window.showProductDetail === 'function') {
    window.showProductDetail(favObj.rawProduct);
    return;
  }

  // Redireccionar al catálogo si no se encuentra en memoria
  window.location.href = `catalogo.html?product=${productId}`;
};

/**
 * Actualiza los contadores globales y la lista visual de Favoritos
 */
window.updateFavoritesUI = function() {
  const count = window.favoritesState.length.toString();

  const countElem = document.getElementById('favCount');
  const badgeFavCount = document.getElementById('badge-favorites-count');
  if (countElem) countElem.textContent = count;
  if (badgeFavCount) {
    badgeFavCount.textContent = count;
    if (window.favoritesState.length > 0) badgeFavCount.classList.remove('hidden');
    else badgeFavCount.classList.add('hidden');
  }

  const favList = document.getElementById('favoritesItemsList');
  if (!favList) return;

  if (window.favoritesState.length === 0) {
    favList.innerHTML = `
      <div class="py-12 text-center text-gray-400 text-xs">
        <i class="fa-regular fa-heart text-3xl mb-2 text-gray-300 dark:text-gray-600 block"></i>
        <p class="font-semibold">No tienes productos favoritos aún.</p>
      </div>
    `;
    return;
  }

  const fmtMoney = (val) => typeof window.formatMoneda === 'function' ? window.formatMoneda(val) : new Intl.NumberFormat('es-CO').format(val || 0);

  favList.innerHTML = window.favoritesState.map(item => `
    <div class="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700 transition-all">
      <div onclick="window.openProductDetailFromFavorites('${item.id}')" class="flex items-center gap-2.5 cursor-pointer flex-1 group">
        <img src="${item.image_url || 'images/logo.png'}" alt="${item.nombre}" class="w-12 h-12 object-contain rounded-xl bg-white p-1 group-hover:scale-105 transition-transform shrink-0 border">
        <div>
          <h4 class="text-xs font-bold text-gray-800 dark:text-gray-100 line-clamp-1 group-hover:text-brand-600 transition-colors">${item.nombre}</h4>
          <span class="text-[10px] font-black text-brand-600 dark:text-brand-400">$${fmtMoney(item.price)} COP</span>
          <span class="block text-[9px] text-gray-400 font-semibold">Ver detalle</span>
        </div>
      </div>
      <button onclick="window.toggleFavoriteItem('${item.id}')" class="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Quitar de Favoritos">
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
    </div>
  `).join('');
};

/**
 * Muestra u oculta el modal de Favoritos
 */
window.toggleFavoritesModal = function(show) {
  const modal = document.getElementById('favoritesModal');
  if (modal) {
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
  }
};