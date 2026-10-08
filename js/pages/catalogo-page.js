/**
 * js/pages/catalogo-page.js
 * Orquestador e Inicializador de Catálogo CUPISSA S.A.S.
 */

window.favoritesState = JSON.parse(localStorage.getItem('cupissa_favorites') || '[]');
window.cartState = JSON.parse(localStorage.getItem('cupissa_cart') || '[]');

const catalogState = {
  products: [],
  filteredProducts: [],
  activeWorld: 'all',
  selectedProduct: null,
  selectedPaymentMethod: 'direct', // 'direct' | 'cupissa_credit'
  productOptions: {
    mode: 'buy',
    size: null,
    quantity: 1,
    isCredit: false,
    installments: 3
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  await loadCatalogProducts();
  updateFavoritesUI();
  updateCartUI();
  setupEventListeners();
  updateWorldTabUI('all');
});

/**
 * Carga de Productos
 */
async function loadCatalogProducts() {
  try {
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
      const { data, error } = await window.supabaseClient
        .from('products')
        .select('*')
        .eq('is_active', true);

      if (!error && data && data.length > 0) {
        catalogState.products = data;
      } else {
        catalogState.products = getFallbackProducts();
      }
    } else {
      catalogState.products = getFallbackProducts();
    }
  } catch (err) {
    catalogState.products = getFallbackProducts();
  }

  catalogState.filteredProducts = [...catalogState.products];
  renderProductsGrid(catalogState.filteredProducts);
}

/**
 * Renderizado de Tarjetas de Productos
 */
function renderProductsGrid(products) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (!products || products.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-gray-400">
        <i class="fa-solid fa-box-open text-3xl mb-2"></i>
        <p class="text-xs font-semibold">No se encontraron productos disponibles.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(prod => {
    const isFav = window.favoritesState.some(item => item.id === prod.id);
    const priceFmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(prod.price || 0);

    return `
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-3.5 flex flex-col justify-between hover:shadow-lg transition-all group">
        <div>
          <div class="relative bg-gray-50 dark:bg-gray-700/40 rounded-xl p-3 mb-3 aspect-square flex items-center justify-center overflow-hidden">
            <img src="${prod.image_url || 'images/logo.png'}" alt="${prod.name}" class="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300" onerror="this.src='images/logo.png'">
            
            <button type="button" onclick="event.stopPropagation(); window.toggleFavoriteItem('${prod.id}')" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-brand-600 shadow-sm transition-colors" title="Favorito">
              <i class="${isFav ? 'fa-solid text-brand-600' : 'fa-regular'} fa-heart text-sm"></i>
            </button>
          </div>

          <div class="flex items-center gap-1.5 mb-1.5">
            <span class="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300">
              ${prod.world || 'General'}
            </span>
          </div>

          <h3 class="font-bold text-xs text-gray-900 dark:text-white line-clamp-2 mb-1">${prod.name}</h3>
          <p class="text-[11px] text-gray-400 dark:text-gray-400 line-clamp-2 mb-2">${prod.description || ''}</p>
        </div>

        <div class="pt-2 border-t border-gray-50 dark:border-gray-700/50 flex items-center justify-between gap-2">
          <div>
            <span class="text-[10px] text-gray-400 block font-medium">Desde</span>
            <span class="font-black text-xs text-brand-600 dark:text-brand-400">${priceFmt}</span>
          </div>
          <button type="button" onclick="openProductDetail('${prod.id}')" class="bg-brand-600 hover:bg-brand-700 text-white text-[11px] font-bold px-3 py-2 rounded-xl transition-all shadow-sm">
            Ver / Pedir
          </button>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * FUNCIONALIDAD CORAZÓN / FAVORITOS
 */
window.toggleFavoriteItem = function(productId) {
  const index = window.favoritesState.findIndex(i => i.id === productId);
  
  if (index > -1) {
    window.favoritesState.splice(index, 1);
  } else {
    const prod = catalogState.products.find(p => p.id === productId);
    if (prod) {
      window.favoritesState.push({
        id: prod.id,
        name: prod.name,
        price: prod.price,
        image_url: prod.image_url
      });
    }
  }

  localStorage.setItem('cupissa_favorites', JSON.stringify(window.favoritesState));
  updateFavoritesUI();
  renderProductsGrid(catalogState.filteredProducts);
};

window.openProductDetailFromFavorites = function(productId) {
  window.toggleFavoritesModal(false);
  window.openProductDetail(productId);
};

function updateFavoritesUI() {
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
      <div onclick="openProductDetailFromFavorites('${item.id}')" class="flex items-center gap-2.5 cursor-pointer flex-1 group">
        <img src="${item.image_url || 'images/logo.png'}" alt="${item.name}" class="w-12 h-12 object-contain rounded-lg bg-white p-1 group-hover:scale-105 transition-transform">
        <div>
          <h4 class="text-xs font-bold text-gray-800 dark:text-gray-100 line-clamp-1 group-hover:text-brand-600 transition-colors">${item.name}</h4>
          <span class="text-[10px] font-black text-brand-600">$${(item.price || 0).toLocaleString('es-CO')} COP</span>
          <span class="block text-[9px] text-gray-400">Haz clic para ver en grande</span>
        </div>
      </div>
      <button onclick="window.toggleFavoriteItem('${item.id}')" class="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Quitar de Favoritos">
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
    </div>
  `).join('');
}

window.toggleFavoritesModal = function(show) {
  const modal = document.getElementById('favoritesModal');
  if (modal) {
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
  }
};

/**
 * FUNCIONALIDAD CARRITO
 */
window.addCurrentProductToCart = function() {
  const prod = catalogState.selectedProduct;
  if (!prod) return;

  const itemToAdd = {
    id: `${prod.id}_${catalogState.productOptions.mode}_${catalogState.productOptions.size || 'std'}`,
    productId: prod.id,
    name: prod.name,
    image_url: prod.image_url,
    price: prod.price,
    mode: catalogState.productOptions.mode,
    size: catalogState.productOptions.size,
    quantity: catalogState.productOptions.quantity,
    advancePercentage: prod.advance_percentage || 30
  };

  const existingIndex = window.cartState.findIndex(i => i.id === itemToAdd.id);
  if (existingIndex > -1) {
    window.cartState[existingIndex].quantity += itemToAdd.quantity;
  } else {
    window.cartState.push(itemToAdd);
  }

  localStorage.setItem('cupissa_cart', JSON.stringify(window.cartState));
  updateCartUI();
  window.toggleCartModal(true);
};

function updateCartUI() {
  const cartCount = document.getElementById('cartCount');
  if (cartCount) cartCount.textContent = window.cartState.reduce((acc, curr) => acc + curr.quantity, 0).toString();

  const cartList = document.getElementById('cartItemsList');
  if (!cartList) return;

  if (window.cartState.length === 0) {
    cartList.innerHTML = `
      <div class="py-12 text-center text-gray-400 text-xs">
        <i class="fa-solid fa-bag-shopping text-2xl mb-2 text-gray-300"></i>
        <p>Tu carrito está vacío.</p>
      </div>
    `;
    document.getElementById('cartTotalText').textContent = '$0 COP';
    document.getElementById('cartAdvanceText').textContent = '$0 COP';
    return;
  }

  let total = 0;
  let totalAdvance = 0;

  cartList.innerHTML = window.cartState.map((item, index) => {
    const itemTotal = item.price * item.quantity;
    const itemAdvance = itemTotal * ((item.advancePercentage || 30) / 100);
    total += itemTotal;
    totalAdvance += itemAdvance;

    return `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <img src="${item.image_url || 'images/logo.png'}" class="w-12 h-12 object-contain rounded-xl bg-white p-1">
          <div>
            <h4 class="text-xs font-bold text-gray-800 dark:text-gray-100 line-clamp-1">${item.name}</h4>
            <div class="text-[10px] text-gray-400 flex gap-2">
              <span>Cant: <strong>${item.quantity}</strong></span>
              <span>Modo: <strong class="uppercase">${item.mode}</strong></span>
            </div>
            <span class="text-xs font-black text-brand-600">$${itemTotal.toLocaleString('es-CO')} COP</span>
          </div>
        </div>
        <button onclick="removeCartItem(${index})" class="p-2 text-gray-400 hover:text-red-500">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>
    `;
  }).join('');

  document.getElementById('cartTotalText').textContent = `$${total.toLocaleString('es-CO')} COP`;
  document.getElementById('cartAdvanceText').textContent = `$${totalAdvance.toLocaleString('es-CO')} COP`;
}

window.removeCartItem = function(index) {
  window.cartState.splice(index, 1);
  localStorage.setItem('cupissa_cart', JSON.stringify(window.cartState));
  updateCartUI();
};

window.toggleCartModal = function(show) {
  const modal = document.getElementById('cartModal');
  if (modal) {
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
  }
};

/**
 * VALIDACIÓN DE IR A PAGAR (CARRITO VACÍO)
 */
window.proceedToCheckoutFromCart = function() {
  if (window.cartState.length === 0) {
    alert('Tu carrito está vacío. Agrega productos antes de ir a pagar.');
    return;
  }
  window.toggleCartModal(false);
  window.toggleCheckoutModal(true);
};

/**
 * MÉTODOS DE CHECKOUT Y BOTÓN DINÁMICO
 */
window.selectCheckoutMethod = function(method) {
  catalogState.selectedPaymentMethod = method;

  const btnDirect = document.getElementById('tabPaymentDirect');
  const btnCredit = document.getElementById('tabPaymentCredit');
  const formDirect = document.getElementById('directPaymentForm');
  const formCredit = document.getElementById('cupissaCreditForm');
  const btnSubmit = document.getElementById('btnSubmitCheckout');

  if (method === 'direct') {
    btnDirect.className = 'flex-1 py-3 px-4 rounded-2xl border-2 border-brand-600 bg-brand-50 text-brand-700 font-bold text-xs transition-all flex items-center justify-center gap-2';
    btnCredit.className = 'flex-1 py-3 px-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-500 font-bold text-xs transition-all flex items-center justify-center gap-2';
    
    formDirect.classList.remove('hidden');
    formCredit.classList.add('hidden');

    if (btnSubmit) {
      btnSubmit.innerHTML = `<i class="fa-solid fa-calendar-check"></i> <span>Confirmar y Agendar Orden</span>`;
    }
  } else {
    btnCredit.className = 'flex-1 py-3 px-4 rounded-2xl border-2 border-brand-600 bg-brand-50 text-brand-700 font-bold text-xs transition-all flex items-center justify-center gap-2';
    btnDirect.className = 'flex-1 py-3 px-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-500 font-bold text-xs transition-all flex items-center justify-center gap-2';
    
    formCredit.classList.remove('hidden');
    formDirect.classList.add('hidden');

    if (btnSubmit) {
      btnSubmit.innerHTML = `<i class="fa-solid fa-paper-plane"></i> <span>Solicitar Crédito</span>`;
    }
  }
};

/**
 * ENVÍO DE CHECKOUT CON VALIDACIÓN DE DOCUMENTOS EN CRÉDITO
 */
window.handleCheckoutSubmission = function(event) {
  event.preventDefault();

  const name = document.getElementById('checkoutFullName').value.trim();
  const phone = document.getElementById('checkoutPhone').value.trim();
  const city = document.getElementById('checkoutCity').value.trim();
  const neighborhood = document.getElementById('checkoutNeighborhood').value.trim();
  const method = catalogState.selectedPaymentMethod;

  if (method === 'cupissa_credit') {
    const cedula = document.getElementById('creditCedula').value.trim();
    const frontFile = document.getElementById('creditCedulaFront').files[0];
    const backFile = document.getElementById('creditCedulaBack').files[0];

    if (!cedula) {
      alert('Por favor ingresa tu número de Cédula.');
      return;
    }
    if (!frontFile || !backFile) {
      alert('Debes adjuntar las fotos de tu cédula por delante y por detrás para procesar la solicitud de crédito.');
      return;
    }
    
    alert(`¡Solicitud de Crédito enviada con éxito, ${name}!\n\nVerificaremos tus fotos de documento y referencias para su aprobación en breve.`);
  } else {
    alert(`¡Orden confirmada y agendada con éxito, ${name}!\n\nTe contactaremos al ${phone} para la gestión del anticipo y entrega en ${city} - ${neighborhood}.`);
  }

  // Limpiar carrito tras completar
  window.cartState = [];
  localStorage.setItem('cupissa_cart', JSON.stringify([]));
  updateCartUI();
  window.toggleCheckoutModal(false);
};

window.toggleCheckoutModal = function(show) {
  const modal = document.getElementById('checkoutModal');
  if (modal) {
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
  }
};

/**
 * VISTA DETALLE DE PRODUCTO
 */
window.openProductDetail = function(productId) {
  const prod = catalogState.products.find(p => p.id === productId);
  if (!prod) return;

  catalogState.selectedProduct = prod;
  catalogState.productOptions = {
    mode: 'buy',
    size: prod.sizes && prod.sizes.length > 0 ? prod.sizes[0] : null,
    quantity: 1,
    isCredit: false,
    installments: 3
  };

  document.getElementById('detailImage').src = prod.image_url || 'images/logo.png';
  document.getElementById('detailTitle').textContent = prod.name;
  document.getElementById('detailDescription').textContent = prod.description || '';
  document.getElementById('detailWorldBadge').textContent = prod.world || 'General';
  document.getElementById('detailCategoryBadge').textContent = prod.category || 'Producto';

  const sizeContainer = document.getElementById('sizeSelectorContainer');
  const sizesList = document.getElementById('sizesList');
  if (prod.sizes && prod.sizes.length > 0) {
    sizeContainer.classList.remove('hidden');
    sizesList.innerHTML = prod.sizes.map(sz => `
      <button type="button" onclick="selectProductSize('${sz}')" class="size-btn font-bold text-xs py-1.5 px-3 rounded-xl border border-gray-200 dark:border-gray-600 transition-all ${sz === catalogState.productOptions.size ? 'bg-brand-600 text-white' : 'bg-white dark:bg-gray-800'}">
        ${sz}
      </button>
    `).join('');
  } else {
    sizeContainer.classList.add('hidden');
  }

  document.getElementById('modalProductQty').textContent = '1';
  setProductMode('buy');
  recalculateDetailPrices();

  document.getElementById('section-catalog').classList.add('hidden');
  document.getElementById('section-product-detail').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.showCatalogView = function() {
  document.getElementById('section-product-detail').classList.add('hidden');
  document.getElementById('section-catalog').classList.remove('hidden');
};

window.setProductMode = function(mode) {
  catalogState.productOptions.mode = mode;
  recalculateDetailPrices();
};

window.updateProductQuantity = function(delta) {
  const newQty = catalogState.productOptions.quantity + delta;
  if (newQty >= 1) {
    catalogState.productOptions.quantity = newQty;
    document.getElementById('modalProductQty').textContent = newQty.toString();
    recalculateDetailPrices();
  }
};

window.toggleCreditSimulation = function(enabled) {
  catalogState.productOptions.isCredit = enabled;
  recalculateDetailPrices();
};

window.setInstallmentsCount = function(val) {
  catalogState.productOptions.installments = parseInt(val, 10) || 1;
  recalculateDetailPrices();
};

function recalculateDetailPrices() {
  const prod = catalogState.selectedProduct;
  if (!prod) return;

  const basePrice = prod.price || 0;
  const qty = catalogState.productOptions.quantity;
  const isCredit = catalogState.productOptions.isCredit;
  const installments = catalogState.productOptions.installments;

  const unitPrice = isCredit ? basePrice * 1.20 : basePrice;
  const totalPrice = unitPrice * qty;
  const advanceAmount = totalPrice * ((prod.advance_percentage || 30) / 100);
  const monthlyFee = installments > 0 ? ((totalPrice - advanceAmount) / installments) : 0;

  const fmt = (num) => `$${Math.round(num).toLocaleString('es-CO')} COP`;

  document.getElementById('detailUnitPrice').textContent = fmt(unitPrice);
  document.getElementById('detailTotalPrice').textContent = fmt(totalPrice);
  document.getElementById('detailAdvancePrice').textContent = fmt(advanceAmount);

  const monthlyFeeRow = document.getElementById('detailMonthlyFeeRow');
  if (isCredit && installments > 0) {
    if (monthlyFeeRow) monthlyFeeRow.classList.remove('hidden');
    document.getElementById('detailMonthlyFee').textContent = `${fmt(monthlyFee)} / mes (${installments} cuotas)`;
  } else {
    if (monthlyFeeRow) monthlyFeeRow.classList.add('hidden');
  }
}

window.filterByWorld = function(worldKey) {
  catalogState.activeWorld = worldKey;
  updateWorldTabUI(worldKey);

  if (worldKey === 'all') {
    catalogState.filteredProducts = [...catalogState.products];
  } else {
    catalogState.filteredProducts = catalogState.products.filter(p => (p.world || '').toLowerCase() === worldKey.toLowerCase());
  }

  renderProductsGrid(catalogState.filteredProducts);
};

function updateWorldTabUI(worldKey) {
  document.querySelectorAll('.world-tab').forEach(btn => {
    btn.classList.remove('border-b-2', 'border-brand-600', 'text-brand-600');
    btn.classList.add('text-gray-600', 'dark:text-gray-300');
  });

  const activeBtn = document.getElementById(`tab-${worldKey}`);
  if (activeBtn) {
    activeBtn.classList.add('border-b-2', 'border-brand-600', 'text-brand-600');
    activeBtn.classList.remove('text-gray-600', 'dark:text-gray-300');
  }
}

window.filterProductsBySmartSearch = function() {
  const input = document.getElementById('searchInput');
  if (!input) return;

  const q = input.value.trim().toLowerCase();
  if (!q) {
    window.filterByWorld(catalogState.activeWorld);
    return;
  }

  const results = catalogState.products.filter(p => 
    (p.name || '').toLowerCase().includes(q) ||
    (p.description || '').toLowerCase().includes(q) ||
    (p.world || '').toLowerCase().includes(q)
  );

  renderProductsGrid(results);
};

function setupEventListeners() {}

function getFallbackProducts() {
  return [
    {
      id: 'p1',
      name: 'Silla Tiffany Blanca Resina',
      description: 'Silla elegancia clásica ideal para banquetes y eventos sociales.',
      world: 'eventos',
      category: 'Mobiliario',
      price: 18000,
      advance_percentage: 30,
      sizes: ['Estándar'],
      image_url: 'images/logo.png'
    },
    {
      id: 'p2',
      name: 'Caja Sorpresa Personalizada Regalo',
      description: 'Caja rígida decorada con mensajes personalizados y detalles dulces.',
      world: 'familiar',
      category: 'Regalos',
      price: 85000,
      advance_percentage: 50,
      sizes: ['Pequeña', 'Mediana', 'Grande'],
      image_url: 'images/logo.png'
    },
    {
      id: 'p3',
      name: 'Kit Corporativo Navideño / Aniversario',
      description: 'Set de regalos empresariales con termo de acero, libreta y empaque de lujo.',
      world: 'empresas',
      category: 'B2B',
      price: 120000,
      advance_percentage: 40,
      sizes: ['Set Básico', 'Set Premium'],
      image_url: 'images/logo.png'
    }
  ];
} 