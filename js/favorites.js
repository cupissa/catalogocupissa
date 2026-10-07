function loadFavoritesFromStorage() {
  favorites = JSON.parse(localStorage.getItem('cupissa_favorites') || '[]');
  updateFavBadge();
}

function saveFavoritesToStorage() {
  localStorage.setItem('cupissa_favorites', JSON.stringify(favorites));
  updateFavBadge();
}

window.toggleFavorite = function(productId, event) {
  if (event) event.stopPropagation();
  const p = products.find(prod => prod.id === productId);
  if (!p) return;

  const idx = favorites.findIndex(fav => fav.id === productId);
  if (idx > -1) favorites.splice(idx, 1);
  else favorites.push(p);

  saveFavoritesToStorage();
  if (typeof renderProductGrid === 'function') renderProductGrid(products);
  renderFavoritesList();
};

window.toggleFavoriteCurrent = function() {
  if (selectedProduct) toggleFavorite(selectedProduct.id);
};

function updateFavBadge() {
  const badge = document.getElementById('favCount');
  if (badge) badge.textContent = favorites.length;
}

window.toggleFavoritesModal = function(show) {
  const modal = document.getElementById('favoritesModal');
  if (modal) {
    if (show) renderFavoritesList();
    modal.classList.toggle('hidden', !show);
  }
};

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
        <img src="${p.image_url || 'https://via.placeholder.com/100'}" class="w-10 h-10 object-cover rounded-lg" />
        <div>
          <h4 class="font-bold text-xs text-gray-800 dark:text-white">${p.title}</h4>
        </div>
      </div>
      <button type="button" onclick="toggleFavorite('${p.id}')" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-trash text-xs"></i></button>
    </div>
  `).join('');
}