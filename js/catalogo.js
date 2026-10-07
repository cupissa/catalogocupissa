let allProducts = [];
let currentFilteredProducts = [];
let activeWorld = 'all';
let currentSelectedProduct = null;

// Inicialización de Tema Claro/Oscuro
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const themeIcon = document.getElementById('themeIcon');

  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    if (themeIcon) {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    }
  } else {
    document.documentElement.classList.remove('dark');
    if (themeIcon) {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    }
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    if (isDark) {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    } else {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    }
  }
}

// Cargar catálogo desde Supabase
async function fetchCatalogProducts() {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*');

    if (error) throw error;

    allProducts = data || [];
    
    // Leer parámetros URL para filtrado automático si viene desde index.html
    const urlParams = new URLSearchParams(window.location.search);
    const worldParam = urlParams.get('mundo');
    const searchParam = urlParams.get('search');
    const idParam = urlParams.get('id');

    if (idParam) {
      const prod = allProducts.find(p => String(p.id) === String(idParam));
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

  } catch (err) {
    console.error('Error al cargar productos:', err);
    grid.innerHTML = `
      <div class="col-span-full text-center py-12 text-red-500 text-xs">
        Ocurrió un error al cargar el catálogo de productos.
      </div>`;
  }
}

// Filtrar por Mundo (familiar, eventos, empresas, all)
function filterByWorld(world) {
  activeWorld = world;
  
  // Actualizar clases de los tabs
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
    currentFilteredProducts = [...allProducts];
  } else {
    currentFilteredProducts = allProducts.filter(p => p.mundo && p.mundo.toLowerCase() === world.toLowerCase());
  }

  renderProductGrid(currentFilteredProducts);
}

// Búsqueda Inteligente
function filterProductsBySmartSearch() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  
  if (!query) {
    filterByWorld(activeWorld);
    return;
  }

  const results = allProducts.filter(p => {
    const matchName = p.nombre && p.nombre.toLowerCase().includes(query);
    const matchCat = p.categoria && p.categoria.toLowerCase().includes(query);
    const matchDesc = p.descripcion && p.descripcion.toLowerCase().includes(query);
    return matchName || matchCat || matchDesc;
  });

  renderProductGrid(results);
}

// Renderizado de Tarjetas de Producto
function renderProductGrid(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12 text-gray-400 text-xs">
        No se encontraron productos coincidentes.
      </div>`;
    return;
  }

  grid.innerHTML = products.map(prod => `
    <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        <div class="relative w-full h-40 rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700">
          <img src="${prod.imagen || 'hero-banner.png'}" alt="${prod.nombre}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
          ${prod.mundo ? `<span class="absolute top-2 left-2 bg-brand-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">${prod.mundo}</span>` : ''}
        </div>
        <h3 class="text-xs font-bold text-gray-800 dark:text-gray-100 line-clamp-1 mb-1">${prod.nombre}</h3>
        <p class="text-[11px] font-black text-brand-600 dark:text-brand-400 mb-2">
          $${Number(prod.precio || 0).toLocaleString('es-CO')} COP
        </p>
      </div>
      <button type="button" onclick="openProductDetailById('${prod.id}')" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2 rounded-xl text-center transition-colors">
        Ver Detalle
      </button>
    </div>
  `).join('');
}

// Ver Detalle de Producto
function openProductDetailById(id) {
  const prod = allProducts.find(p => String(p.id) === String(id));
  if (prod) showProductDetail(prod);
}

function showProductDetail(prod) {
  currentSelectedProduct = prod;

  document.getElementById('section-catalog').classList.add('hidden');
  document.getElementById('section-product-detail').classList.remove('hidden');

  document.getElementById('detailImage').src = prod.imagen || 'hero-banner.png';
  document.getElementById('detailWorldBadge').textContent = prod.mundo || 'General';
  document.getElementById('detailCategoryBadge').textContent = prod.categoria || 'Producto';
  document.getElementById('detailTitle').textContent = prod.nombre;
  document.getElementById('detailDescription').textContent = prod.descripcion || 'Sin descripción disponible.';
  document.getElementById('detailTotalPrice').textContent = `$${Number(prod.precio || 0).toLocaleString('es-CO')} COP`;

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showCatalogView() {
  document.getElementById('section-product-detail').classList.add('hidden');
  document.getElementById('section-catalog').classList.remove('hidden');
}

function addCurrentProductToCart() {
  if (!currentSelectedProduct) return;
  
  if (typeof addToCart === 'function') {
    addToCart(currentSelectedProduct);
  } else {
    alert(`Producto "${currentSelectedProduct.nombre}" agregado al carrito.`);
  }
}

// Cargar script al iniciar DOM
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  fetchCatalogProducts();
});