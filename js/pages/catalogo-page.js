let currentFilteredProducts = [];
let activeWorld = 'all';

function filterByWorld(world) {
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
    currentFilteredProducts = products.filter(p => p.mundo && p.mundo.toLowerCase() === world.toLowerCase());
  }

  renderProductGrid(currentFilteredProducts);
}

function filterProductsBySmartSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  const query = searchInput.value.toLowerCase().trim();
  
  if (!query) {
    filterByWorld(activeWorld);
    return;
  }

  const results = products.filter(p => {
    const matchName = (p.nombre || p.title || '').toLowerCase().includes(query);
    const matchCat = (p.categoria || p.category || '').toLowerCase().includes(query);
    const matchDesc = (p.descripcion || p.description || '').toLowerCase().includes(query);
    return matchName || matchCat || matchDesc;
  });

  renderProductGrid(results);
}

function openProductDetailById(id) {
  const prod = products.find(p => String(p.id) === String(id));
  if (prod) showProductDetail(prod);
}

function showProductDetail(prod) {
  selectedProduct = prod;

  document.getElementById('section-catalog').classList.add('hidden');
  document.getElementById('section-product-detail').classList.remove('hidden');

  document.getElementById('detailImage').src = prod.imagen || prod.image_url || 'images/hero-banner.jpg';
  document.getElementById('detailWorldBadge').textContent = prod.mundo || prod.world || 'General';
  document.getElementById('detailCategoryBadge').textContent = prod.categoria || prod.category || 'Producto';
  document.getElementById('detailTitle').textContent = prod.nombre || prod.title;
  document.getElementById('detailDescription').textContent = prod.descripcion || prod.description || 'Sin descripción disponible.';
  
  const price = prod.precio || prod.sale_price || prod.rental_price_per_day || 0;
  document.getElementById('detailTotalPrice').textContent = `$${Number(price).toLocaleString('es-CO')} COP`;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showCatalogView() {
  document.getElementById('section-product-detail').classList.add('hidden');
  document.getElementById('section-catalog').classList.remove('hidden');
}

function addCurrentProductToCart() {
  if (!selectedProduct) return;
  addToCartCurrent();
}

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
      showProductDetail(prod);
      return;
    }
  }

  if (worldParam) {
    filterByWorld(worldParam);
  } else if (searchParam) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = searchParam;
    filterProductsBySmartSearch();
  } else {
    filterByWorld('all');
  }
});