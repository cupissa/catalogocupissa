let currentFilteredProducts = [];
let activeWorld = 'all';

window.filterByWorld = function(world) {
  activeWorld = world;
  
  document.querySelectorAll('.world-tab').forEach(tab => {
    tab.classList.remove('active', 'border-brand-600', 'text-brand-600');
  });
  
  const currentTab = document.getElementById(`tab-${world}`);
  if (currentTab) {
    currentTab.classList.add('active');
  }

  const titleElem = document.getElementById('currentWorldTitle');
  if (titleElem) {
    if (world === 'familiar') titleElem.textContent = 'Mundo Familiar y Regalos';
    else if (world === 'eventos') titleElem.textContent = 'Mundo Eventos y Fiestas';
    else if (world === 'empresas') titleElem.textContent = 'Mundo Empresas y B2B';
    else titleElem.textContent = 'Catálogo General Cupissa';
  }

  if (world === 'all') {
    currentFilteredProducts = [...products];
  } else {
    currentFilteredProducts = products.filter(p => (p.mundo || p.world || '').toLowerCase() === world.toLowerCase());
  }

  renderProductGrid(currentFilteredProducts);
};

window.filterProductsBySmartSearch = function() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  const query = searchInput.value.toLowerCase().trim();
  
  if (!query) {
    window.filterByWorld(activeWorld);
    return;
  }

  const results = products.filter(p => {
    const matchName = (p.nombre || p.title || '').toLowerCase().includes(query);
    const matchCat = (p.categoria || p.category || '').toLowerCase().includes(query);
    const matchDesc = (p.descripcion || p.description || '').toLowerCase().includes(query);
    return matchName || matchCat || matchDesc;
  });

  renderProductGrid(results);
};

window.openProductDetailById = function(id) {
  const prod = products.find(p => String(p.id) === String(id));
  if (prod) window.showProductDetail(prod);
};

window.showProductDetail = function(prod) {
  selectedProduct = prod;

  const secCatalog = document.getElementById('section-catalog');
  const secDetail = document.getElementById('section-product-detail');
  if (secCatalog) secCatalog.classList.add('hidden');
  if (secDetail) secDetail.classList.remove('hidden');

  const img = document.getElementById('detailImage');
  if (img) img.src = prod.imagen || prod.image_url || 'images/hero-banner.jpg';

  const wBadge = document.getElementById('detailWorldBadge');
  if (wBadge) wBadge.textContent = prod.mundo || prod.world || 'General';

  const cBadge = document.getElementById('detailCategoryBadge');
  if (cBadge) cBadge.textContent = prod.categoria || prod.category || 'Producto';

  const title = document.getElementById('detailTitle');
  if (title) title.textContent = prod.nombre || prod.title;

  const desc = document.getElementById('detailDescription');
  if (desc) desc.textContent = prod.descripcion || prod.description || 'Sin descripción disponible.';
  
  const price = prod.precio || prod.sale_price || prod.rental_price_per_day || 0;
  const totalPrice = document.getElementById('detailTotalPrice');
  if (totalPrice) totalPrice.textContent = `$${Number(price).toLocaleString('es-CO')} COP`;

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.showCatalogView = function() {
  const secCatalog = document.getElementById('section-catalog');
  const secDetail = document.getElementById('section-product-detail');
  if (secDetail) secDetail.classList.add('hidden');
  if (secCatalog) secCatalog.classList.remove('hidden');
};

window.addCurrentProductToCart = function() {
  if (!selectedProduct) return;
  if (typeof window.addToCartCurrent === 'function') {
    window.addToCartCurrent();
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  loadCartFromStorage();
  loadFavoritesFromStorage();
  generateMathCaptcha();
  checkUserSession();

  await fetchCatalogProducts();

  const urlParams = new URLSearchParams(window.location.search);
  const worldParam = urlParams.get('mundo');
  const searchParam = urlParams.get('search');
  const idParam = urlParams.get('id');

  if (idParam) {
    const prod = products.find(p => String(p.id) === String(idParam));
    if (prod) {
      window.showProductDetail(prod);
      return;
    }
  }

  if (worldParam) {
    window.filterByWorld(worldParam);
  } else if (searchParam) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = searchParam;
    window.filterProductsBySmartSearch();
  } else {
    window.filterByWorld('all');
  }
});