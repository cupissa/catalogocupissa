function loadFavoritesFromStorage() {
  try {
    favorites = JSON.parse(localStorage.getItem('cupissa_favorites') || '[]');
  } catch (e) {
    favorites = [];
  }
  updateFavBadge();
}

function saveFavoritesToStorage() {
  localStorage.setItem('cupissa_favorites', JSON.stringify(favorites));
  updateFavBadge();
}

window.toggleFavoritesModal = function(show) {
  if (show) {
    renderFavoritesList();
    if (typeof openModal === 'function') {
      openModal('favoritesModal');
    } else {
      const modal = document.getElementById('favoritesModal');
      if (modal) modal.classList.remove('hidden');
    }
  } else {
    if (typeof closeModal === 'function') {
      closeModal('favoritesModal');
    } else {
      const modal = document.getElementById('favoritesModal');
      if (modal) modal.classList.add('hidden');
    }
  }
};

window.toggleFavorite = function(productId, event) {
  if (event) event.stopPropagation();
  if (!productId) return;

  let sourceList = products || [];
  if ((!sourceList || sourceList.length === 0) && typeof currentFilteredProducts !== 'undefined') {
    sourceList = currentFilteredProducts;
  }

  const p = sourceList.find(prod => String(prod.id) === String(productId));
  const idx = favorites.findIndex(fav => String(fav.id) === String(productId));

  if (idx > -1) {
    favorites.splice(idx, 1);
  } else if (p) {
    favorites.push({
      id: p.id,
      title: p.nombre || p.title || 'Producto',
      image_url: p.imagen || p.image_url || 'images/logo.png',
      price: p.precio || p.sale_price || p.rental_price_per_day || 0
    });
  }

  saveFavoritesToStorage();
  if (typeof renderProductGrid === 'function' && sourceList.length > 0) {
    renderProductGrid(sourceList);
  }
  renderFavoritesList();
};

function updateFavBadge() {
  const badge = document.getElementById('favCount');
  if (badge) badge.textContent = favorites.length;
}

function renderFavoritesList() {
  const list = document.getElementById('favoritesItemsList');
  if (!list) return;

  if (favorites.length === 0) {
    list.innerHTML = `<p class="text-center text-xs text-gray-400 py-6">Aún no tienes favoritos.</p>`;
    return;
  }

  list.innerHTML = favorites.map(p => `
    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
      <div class="flex items-center gap-3">
        <img src="${p.image_url || 'images/logo.png'}" class="w-10 h-10 object-cover rounded-lg" />
        <div>
          <h4 class="font-bold text-xs text-gray-800 dark:text-white">${p.title}</h4>
          <span class="text-[10px] text-brand-600 font-bold">$${Number(p.price || 0).toLocaleString('es-CO')} COP</span>
        </div>
      </div>
      <button type="button" onclick="window.toggleFavorite('${p.id}')" class="text-gray-400 hover:text-red-500 p-1">
        <i class="fa-solid fa-trash text-xs"></i>
      </button>
    </div>
  `).join('');
}