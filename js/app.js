document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  loadCartFromStorage();
  loadFavoritesFromStorage();
  generateMathCaptcha();
  await loadProducts();
  checkUserSession();
});

async function loadProducts() {
  try {
    const { data, error } = await supabaseClient.from('products').select('*').eq('is_active', true);
    if (error) throw error;
    products = data || [];
  } catch (err) {
    products = [
      { id: '1', title: 'Caja Regalo Sorpresa', world: 'familiar', category: 'Regalos', sale_price: 120000, type: 'sale', advance_percentage: 50 },
      { id: '2', title: 'Silla VIP para Eventos', world: 'eventos', category: 'Mobiliario', rental_price_per_day: 15000, type: 'rental', advance_percentage: 30 }
    ];
  }
  renderProductGrid(products);
}

window.filterByWorld = function(world) {
  currentWorld = world;
  document.querySelectorAll('.world-tab').forEach(tab => tab.classList.remove('active'));
  const activeTab = document.getElementById(`tab-${world}`);
  if (activeTab) activeTab.classList.add('active');

  const filtered = world === 'all' ? products : products.filter(p => p.world === world);
  renderProductGrid(filtered);
};

window.filterProductsBySmartSearch = function() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  if (!query) {
    filterByWorld(currentWorld);
    return;
  }
  const filtered = products.filter(p => p.title?.toLowerCase().includes(query));
  renderProductGrid(filtered);
};

function renderProductGrid(items) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-xs text-gray-400">Sin productos.</div>`;
    return;
  }

  grid.innerHTML = items.map(p => {
    const isFav = favorites.some(fav => fav.id === p.id);
    const price = p.type === 'rental' ? (p.rental_price_per_day || 0) : (p.sale_price || 0);

    return `
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex flex-col justify-between">
        <div>
          <div class="relative w-full h-40 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-3">
            <img src="${p.image_url || 'https://via.placeholder.com/300'}" class="w-full h-full object-cover" />
            <button type="button" onclick="toggleFavorite('${p.id}', event)" class="absolute top-2 right-2 p-2 bg-white/80 rounded-full">
              <i class="fa-solid fa-heart ${isFav ? 'text-brand-600' : 'text-gray-400'} text-xs"></i>
            </button>
          </div>
          <h3 class="font-extrabold text-xs text-gray-900 dark:text-white line-clamp-2 mb-2">${p.title}</h3>
        </div>
        <div>
          <div class="text-xs font-black text-brand-600 mb-2">$${Number(price).toLocaleString()} COP</div>
          <button type="button" onclick="openProductDetail('${p.id}')" class="w-full bg-gray-100 dark:bg-gray-700 hover:bg-brand-600 hover:text-white font-bold py-2 rounded-xl text-xs transition-all">Ver Detalle</button>
        </div>
      </div>
    `;
  }).join('');
}

window.openProductDetail = function(productId) {
  selectedProduct = products.find(p => p.id === productId);
  if (!selectedProduct) return;

  document.getElementById('detailImage').src = selectedProduct.image_url || 'https://via.placeholder.com/500';
  document.getElementById('detailTitle').textContent = selectedProduct.title;
  document.getElementById('detailDescription').textContent = selectedProduct.description || 'Sin descripción.';

  setProductMode(selectedProduct.type || 'sale');
  showSection('product-detail');
};

window.setProductMode = function(mode) {
  currentProductMode = mode;
  const isRental = mode === 'rental';
  const totalPrice = isRental ? (selectedProduct?.rental_price_per_day || 0) : (selectedProduct?.sale_price || 0);
  const pct = selectedProduct?.advance_percentage || 50;

  document.getElementById('detailTotalPrice').textContent = `$${Number(totalPrice).toLocaleString()} COP`;
  document.getElementById('detailAdvancePrice').textContent = `$${Number((totalPrice * pct) / 100).toLocaleString()} COP`;
};

window.showSection = function(sectionName) {
  ['catalog', 'product-detail', 'checkout'].forEach(s => {
    const el = document.getElementById(`section-${s}`);
    if (el) el.classList.toggle('hidden', s !== sectionName);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};