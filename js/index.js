// VARIABLES GLOBALMENTE DISPONIBLES
let products = [];
let cart = [];
let favorites = [];
let currentWorld = 'all';
let currentProductMode = 'sale';
let selectedProduct = null;
let mathCaptchaAnswer = 0;

// INICIALIZACIÓN DE LA APLICACIÓN
document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  loadCartFromStorage();
  loadFavoritesFromStorage();
  generateMathCaptcha();
  await loadProducts();
  checkUserSession();
});

/* ==========================================================================
   1. GESTIÓN DE TEMA (CLARO / OSCURO)
   ========================================================================== */
function initTheme() {
  const savedTheme = localStorage.getItem('cupissa_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
    updateThemeIcon(true);
  } else {
    document.documentElement.classList.remove('dark');
    updateThemeIcon(false);
  }
}

window.toggleTheme = function() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('cupissa_theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
};

function updateThemeIcon(isDark) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = isDark ? "fa-solid fa-moon text-lg text-yellow-400" : "fa-solid fa-sun text-lg text-amber-500";
  }
}

/* ==========================================================================
   2. CARGA Y FILTRADO DE PRODUCTOS
   ========================================================================== */
async function loadProducts() {
  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    products = data || [];
    renderProductGrid(products);
  } catch (err) {
    console.error("Error cargando productos de Supabase:", err);
    // Productos de contingencia si no hay conexión a BD
    products = [
      {
        id: '1',
        title: 'Caja Regalo Sorpresa Ejecutiva',
        world: 'familiar',
        category: 'Regalos',
        sale_price: 120000,
        advance_percentage: 50,
        type: 'sale',
        image_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=500&q=80',
        description: 'Elegante arreglo personalizado para ocasiones especiales.'
      },
      {
        id: '2',
        title: 'Silla VIP para Eventos',
        world: 'eventos',
        category: 'Alquiler Mobiliario',
        rental_price_per_day: 15000,
        rental_deposit: 30000,
        extra_hour_price: 3000,
        advance_percentage: 30,
        type: 'rental',
        image_url: 'https://images.unsplash.com/photo-1503602642458-232111445657?w=500&q=80',
        description: 'Mobiliario de lujo ideal para eventos, bodas y fiestas corporativas.'
      }
    ];
    renderProductGrid(products);
  }
}

window.filterByWorld = function(world) {
  currentWorld = world;
  
  document.querySelectorAll('.world-tab').forEach(tab => {
    tab.classList.remove('active', 'border-brand-600', 'text-brand-600');
  });
  
  const activeTab = document.getElementById(`tab-${world}`);
  if (activeTab) activeTab.classList.add('active');

  const titleEl = document.getElementById('currentWorldTitle');
  const titles = {
    'all': 'Catálogo General Cupissa',
    'familiar': 'Mundo Familiar y Regalos',
    'eventos': 'Mundo Eventos y Fiestas',
    'empresas': 'Mundo Empresas y B2B'
  };
  if (titleEl) titleEl.textContent = titles[world] || 'Catálogo General';

  const filtered = world === 'all' ? products : products.filter(p => p.world === world);
  renderProductGrid(filtered);
};

window.filterProductsBySmartSearch = function() {
  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const feedback = document.getElementById('searchResultFeedback');

  if (!query) {
    if (feedback) feedback.classList.add('hidden');
    filterByWorld(currentWorld);
    return;
  }

  const filtered = products.filter(p => {
    return p.title?.toLowerCase().includes(query) ||
           p.category?.toLowerCase().includes(query) ||
           p.world?.toLowerCase().includes(query);
  });

  if (feedback) {
    feedback.textContent = `Resultados: ${filtered.length}`;
    feedback.classList.remove('hidden');
  }

  renderProductGrid(filtered);
};

function renderProductGrid(items) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12">
        <i class="fa-solid fa-box-open text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
        <p class="text-xs text-gray-500 dark:text-gray-400">No se encontraron productos en esta categoría.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(p => {
    const isFav = favorites.some(fav => fav.id === p.id);
    const price = p.type === 'rental' ? (p.rental_price_per_day || 0) : (p.sale_price || 0);
    
    return `
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
        <div>
          <div class="relative w-full h-44 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden mb-3">
            <img src="${p.image_url || 'https://via.placeholder.com/300'}" alt="${p.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <button type="button" onclick="toggleFavorite('${p.id}', event)" class="absolute top-2 right-2 p-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-all">
              <i class="fa-solid fa-heart ${isFav ? 'text-brand-600' : 'text-gray-400 dark:text-gray-500'} text-xs"></i>
            </button>
            <span class="absolute bottom-2 left-2 bg-brand-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase">
              ${p.type === 'rental' ? 'Alquiler' : 'Venta'}
            </span>
          </div>
          <span class="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1">${p.category || 'General'}</span>
          <h3 class="font-extrabold text-xs text-gray-900 dark:text-white line-clamp-2 mb-2">${p.title}</h3>
        </div>
        <div>
          <div class="flex justify-between items-baseline mb-3">
            <span class="text-xs font-black text-brand-600 dark:text-brand-400">$${Number(price).toLocaleString()} COP</span>
            <span class="text-[10px] text-gray-400">Anticipo: ${p.advance_percentage || 50}%</span>
          </div>
          <button type="button" onclick="openProductDetail('${p.id}')" class="w-full bg-gray-100 dark:bg-gray-700 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 text-gray-800 dark:text-gray-200 font-bold py-2 rounded-xl text-xs transition-all">
            Ver Detalle
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   3. DETALLE DE PRODUCTO
   ========================================================================== */
window.openProductDetail = function(productId) {
  selectedProduct = products.find(p => p.id === productId);
  if (!selectedProduct) return;

  document.getElementById('detailImage').src = selectedProduct.image_url || 'https://via.placeholder.com/500';
  document.getElementById('detailTitle').textContent = selectedProduct.title;
  document.getElementById('detailDescription').textContent = selectedProduct.description || 'Sin descripción disponible.';
  document.getElementById('detailWorldBadge').textContent = selectedProduct.world || 'General';
  document.getElementById('detailCategoryBadge').textContent = selectedProduct.category || 'Producto';

  const modalTypeContainer = document.getElementById('modalTypeContainer');

  if (selectedProduct.type === 'both') {
    if (modalTypeContainer) modalTypeContainer.classList.remove('hidden');
    setProductMode('sale');
  } else {
    if (modalTypeContainer) modalTypeContainer.classList.add('hidden');
    setProductMode(selectedProduct.type || 'sale');
  }

  showSection('product-detail');
};

window.setProductMode = function(mode) {
  currentProductMode = mode;
  const rentalConfig = document.getElementById('rentalConfig');
  const btnSale = document.getElementById('btnSelectSale');
  const btnRental = document.getElementById('btnSelectRental');

  if (mode === 'rental') {
    if (rentalConfig) rentalConfig.classList.remove('hidden');
    if (btnRental) btnRental.className = "border-2 border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold py-2 rounded-lg text-sm";
    if (btnSale) btnSale.className = "border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm";
  } else {
    if (rentalConfig) rentalConfig.classList.add('hidden');
    if (btnSale) btnSale.className = "border-2 border-brand-500 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold py-2 rounded-lg text-sm";
    if (btnRental) btnRental.className = "border-2 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 py-2 rounded-lg text-sm";
  }

  updateProductPriceCalculations();
};

function updateProductPriceCalculations() {
  if (!selectedProduct) return;

  const isRental = currentProductMode === 'rental';
  const totalPrice = isRental ? (selectedProduct.rental_price_per_day || 0) : (selectedProduct.sale_price || 0);
  const pct = selectedProduct.advance_percentage || 50;
  const advance = (totalPrice * pct) / 100;
  const remaining = totalPrice - advance;

  document.getElementById('detailTotalPrice').textContent = `$${Number(totalPrice).toLocaleString()} COP`;
  document.getElementById('detailAdvancePct').textContent = pct;
  document.getElementById('detailAdvancePrice').textContent = `$${Number(advance).toLocaleString()} COP`;
  document.getElementById('detailRemainingPrice').textContent = `$${Number(remaining).toLocaleString()} COP`;

  if (isRental) {
    document.getElementById('detailDepositText').textContent = `$${Number(selectedProduct.rental_deposit || 0).toLocaleString()} COP`;
    document.getElementById('detailExtraHourText').textContent = `$${Number(selectedProduct.extra_hour_price || 0).toLocaleString()} COP`;
  }
}

/* ==========================================================================
   4. FAVORITOS
   ========================================================================== */
function loadFavoritesFromStorage() {
  const saved = localStorage.getItem('cupissa_favorites');
  favorites = saved ? JSON.parse(saved) : [];
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

  const index = favorites.findIndex(fav => fav.id === productId);
  if (index > -1) {
    favorites.splice(index, 1);
  } else {
    favorites.push(p);
  }

  saveFavoritesToStorage();
  renderProductGrid(products);
  renderFavoritesList();
};

window.toggleFavoriteCurrent = function() {
  if (selectedProduct) {
    toggleFavorite(selectedProduct.id);
  }
};

function updateFavBadge() {
  const badge = document.getElementById('favCount');
  if (badge) badge.textContent = favorites.length;
}

window.toggleFavoritesModal = function(show) {
  const modal = document.getElementById('favoritesModal');
  if (!modal) return;

  if (show) {
    renderFavoritesList();
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
};

function renderFavoritesList() {
  const list = document.getElementById('favoritesItemsList');
  if (!list) return;

  if (favorites.length === 0) {
    list.innerHTML = `
      <div class="text-center py-8">
        <i class="fa-regular fa-heart text-3xl text-gray-300 dark:text-gray-600 mb-2"></i>
        <p class="text-xs text-gray-400">Aún no tienes favoritos agregados.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = favorites.map(p => {
    const price = p.type === 'rental' ? (p.rental_price_per_day || 0) : (p.sale_price || 0);
    return `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
        <div class="flex items-center gap-3">
          <img src="${p.image_url || 'https://via.placeholder.com/100'}" alt="${p.title}" class="w-12 h-12 object-cover rounded-lg" />
          <div>
            <h4 class="font-bold text-xs text-gray-800 dark:text-white line-clamp-1">${p.title}</h4>
            <span class="text-[11px] text-brand-600 dark:text-brand-400 font-bold">$${Number(price).toLocaleString()} COP</span>
          </div>
        </div>
        <button type="button" onclick="toggleFavorite('${p.id}')" class="text-gray-400 hover:text-red-500 p-2">
          <i class="fa-solid fa-trash text-xs"></i>
        </button>
      </div>
    `;
  }).join('');
}

/* ==========================================================================
   5. CARRITO
   ========================================================================== */
function loadCartFromStorage() {
  const saved = localStorage.getItem('cupissa_cart');
  cart = saved ? JSON.parse(saved) : [];
  updateCartBadge();
}

function saveCartToStorage() {
  localStorage.setItem('cupissa_cart', JSON.stringify(cart));
  updateCartBadge();
}

window.addToCartCurrent = function() {
  if (!selectedProduct) return;

  const isRental = currentProductMode === 'rental';
  const price = isRental ? (selectedProduct.rental_price_per_day || 0) : (selectedProduct.sale_price || 0);
  const pct = selectedProduct.advance_percentage || 50;

  const cartItem = {
    id: selectedProduct.id,
    title: selectedProduct.title,
    mode: currentProductMode,
    price: price,
    advancePercentage: pct,
    advancePrice: (price * pct) / 100,
    rentalDate: isRental ? (document.getElementById('rentalDateInput')?.value || null) : null
  };

  cart.push(cartItem);
  saveCartToStorage();
  toggleCartModal(true);
};

window.removeFromCart = function(index) {
  cart.splice(index, 1);
  saveCartToStorage();
  renderCartList();
};

function updateCartBadge() {
  const badge = document.getElementById('cartCount');
  if (badge) badge.textContent = cart.length;
}

window.toggleCartModal = function(show) {
  const modal = document.getElementById('cartModal');
  if (!modal) return;

  if (show) {
    renderCartList();
    modal.classList.remove('hidden');
  } else {
    modal.classList.add('hidden');
  }
};

function renderCartList() {
  const list = document.getElementById('cartItemsList');
  const totalEl = document.getElementById('cartTotalText');
  const advanceEl = document.getElementById('cartAdvanceText');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `
      <div class="text-center py-8">
        <i class="fa-solid fa-bag-shopping text-3xl text-gray-300 dark:text-gray-600 mb-2"></i>
        <p class="text-xs text-gray-400">Tu carrito está vacío.</p>
      </div>
    `;
    if (totalEl) totalEl.textContent = '$0 COP';
    if (advanceEl) advanceEl.textContent = '$0 COP';
    return;
  }

  let totalSum = 0;
  let advanceSum = 0;

  list.innerHTML = cart.map((item, idx) => {
    totalSum += item.price;
    advanceSum += item.advancePrice;
    return `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
        <div>
          <h4 class="font-bold text-xs text-gray-800 dark:text-white">${item.title}</h4>
          <span class="text-[10px] text-gray-400 capitalize">Modo: ${item.mode}</span>
          <div class="text-[11px] font-bold text-brand-600">$${Number(item.price).toLocaleString()} COP</div>
        </div>
        <button type="button" onclick="removeFromCart(${idx})" class="text-gray-400 hover:text-red-500 p-2">
          <i class="fa-solid fa-xmark text-xs"></i>
        </button>
      </div>
    `;
  }).join('');

  if (totalEl) totalEl.textContent = `$${Number(totalSum).toLocaleString()} COP`;
  if (advanceEl) advanceEl.textContent = `$${Number(advanceSum).toLocaleString()} COP`;
}

window.goToCheckout = function() {
  if (cart.length === 0) return;
  toggleCartModal(false);

  let totalSum = cart.reduce((acc, i) => acc + i.price, 0);
  let advanceSum = cart.reduce((acc, i) => acc + i.advancePrice, 0);

  document.getElementById('checkoutTotalText').textContent = `$${Number(totalSum).toLocaleString()} COP`;
  document.getElementById('checkoutAdvanceText').textContent = `$${Number(advanceSum).toLocaleString()} COP`;
  document.getElementById('checkoutRemainingText').textContent = `$${Number(totalSum - advanceSum).toLocaleString()} COP`;

  showSection('checkout');
};

/* ==========================================================================
   6. AUTENTICACIÓN Y REGISTRO
   ========================================================================== */
window.openAuthModal = function() {
  toggleAuthModal(true);
};

window.toggleAuthModal = function(show) {
  const modal = document.getElementById('authModal');
  if (modal) {
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
  }
};

window.switchAuthMode = function(mode) {
  const formReg = document.getElementById('formRegisterContainer');
  const formLog = document.getElementById('formLoginContainer');
  const tabReg = document.getElementById('tabRoleRegister');
  const tabLog = document.getElementById('tabRoleLogin');

  if (mode === 'register') {
    if (formReg) formReg.classList.remove('hidden');
    if (formLog) formLog.classList.add('hidden');
    if (tabReg) tabReg.className = "flex-1 pb-3 font-bold text-xs border-b-2 border-brand-600 text-brand-600";
    if (tabLog) tabLog.className = "flex-1 pb-3 font-bold text-xs border-b-2 border-transparent text-gray-400";
  } else {
    if (formReg) formReg.classList.add('hidden');
    if (formLog) formLog.classList.remove('hidden');
    if (tabLog) tabLog.className = "flex-1 pb-3 font-bold text-xs border-b-2 border-brand-600 text-brand-600";
    if (tabReg) tabReg.className = "flex-1 pb-3 font-bold text-xs border-b-2 border-transparent text-gray-400";
  }
};

function generateMathCaptcha() {
  const n1 = Math.floor(Math.random() * 9) + 1;
  const n2 = Math.floor(Math.random() * 9) + 1;
  mathCaptchaAnswer = n1 + n2;
  const qEl = document.getElementById('mathCaptchaQuestion');
  if (qEl) qEl.textContent = `¿Cuánto es ${n1} + ${n2}?`;
}

window.handleClientRegister = async function(e) {
  e.preventDefault();
  const ansInput = parseInt(document.getElementById('mathCaptchaInput').value, 10);
  
  if (ansInput !== mathCaptchaAnswer) {
    alert("La respuesta a la verificación matemática es incorrecta.");
    generateMathCaptcha();
    return;
  }

  const fname = document.getElementById('regClientFirstName').value;
  const lname = document.getElementById('regClientLastName').value;
  const email = document.getElementById('regClientEmail').value;
  const pass = document.getElementById('regClientPassword').value;

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email: email,
      password: pass,
      options: { data: { first_name: fname, last_name: lname } }
    });

    if (error) throw error;

    alert("¡Cuenta creada exitosamente!");
    toggleAuthModal(false);
    checkUserSession();
  } catch (err) {
    alert("Error al registrarse: " + err.message);
  }
};

window.handleClientLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: email,
      password: pass
    });

    if (error) throw error;

    toggleAuthModal(false);
    checkUserSession();
  } catch (err) {
    alert("Error al iniciar sesión: " + err.message);
  }
};

window.loginWithGoogle = async function() {
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({ provider: 'google' });
    if (error) throw error;
  } catch (err) {
    alert("Error al ingresar con Google: " + err.message);
  }
};

async function checkUserSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  const authSec = document.getElementById('userAuthSection');
  if (!authSec) return;

  if (session && session.user) {
    const name = session.user.user_metadata?.first_name || 'Mi Cuenta';
    authSec.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-gray-700 dark:text-gray-200">${name}</span>
        <button type="button" onclick="logout()" class="text-xs text-gray-400 hover:text-brand-600 p-1">
          <i class="fa-solid fa-right-from-bracket"></i>
        </button>
      </div>
    `;
  } else {
    authSec.innerHTML = `
      <button type="button" onclick="openAuthModal()" class="flex items-center space-x-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-all py-2 px-3 rounded-xl shadow-sm">
        <i class="fa-regular fa-user"></i>
        <span class="hidden sm:inline">Ingresar</span>
      </button>
    `;
  }
}

window.logout = async function() {
  await supabaseClient.auth.signOut();
  checkUserSession();
};

/* ==========================================================================
   7. CONTROL DE VISTAS Y SECCIONES
   ========================================================================== */
window.showSection = function(sectionName) {
  const sections = ['catalog', 'product-detail', 'checkout'];
  sections.forEach(s => {
    const el = document.getElementById(`section-${s}`);
    if (el) {
      if (s === sectionName) el.classList.remove('hidden');
      else el.classList.add('hidden');
    }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};