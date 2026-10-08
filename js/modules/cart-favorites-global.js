// ==========================================
// MÓDULO GLOBAL DE CARRITO Y FAVORITOS - CUPISSA
// ==========================================

// --- ESTADO GLOBAL ---
if (typeof window.cart === 'undefined') window.cart = [];
if (typeof window.favorites === 'undefined') window.favorites = [];

// --- GESTIÓN DE CARRITO ---

window.loadCartFromStorage = function() {
  try {
    window.cart = JSON.parse(localStorage.getItem('cupissa_cart') || '[]');
  } catch (e) {
    console.error('Error al cargar carrito:', e);
    window.cart = [];
  }
  window.updateCartBadge();
};

window.saveCartToStorage = function() {
  localStorage.setItem('cupissa_cart', JSON.stringify(window.cart));
  window.updateCartBadge();
};

window.updateCartBadge = function() {
  const badges = document.querySelectorAll('#cartCount, .cart-count-badge');
  badges.forEach(badge => {
    if (badge) {
      badge.textContent = window.cart.length;
      if (window.cart.length > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  });
};

window.toggleCartModal = function(show) {
  if (show) {
    window.renderCartList();
    if (typeof window.openModal === 'function') {
      window.openModal('cartModal');
    } else {
      const m = document.getElementById('cartModal');
      if (m) {
        m.classList.remove('hidden');
        m.classList.add('flex');
      }
    }
  } else {
    if (typeof window.closeModal === 'function') {
      window.closeModal('cartModal');
    } else {
      const m = document.getElementById('cartModal');
      if (m) {
        m.classList.add('hidden');
        m.classList.remove('flex');
      }
    }
  }
};

window.addToCartCurrent = function() {
  if (!window.selectedProduct) {
    if (typeof window.showToast === 'function') window.showToast('No hay producto seleccionado', 'error');
    return;
  }

  const prod = window.selectedProduct;
  const isRental = window.currentProductMode === 'rental';
  
  // Obtener variante seleccionada si aplica
  const variantSelect = document.getElementById('productVariantSelect');
  let selectedVariant = null;
  let priceAdjustment = 0;

  if (variantSelect && variantSelect.value) {
    const variantId = variantSelect.value;
    if (prod.product_variants && Array.isArray(prod.product_variants)) {
      selectedVariant = prod.product_variants.find(v => String(v.id) === String(variantId));
      if (selectedVariant) {
        priceAdjustment = Number(selectedVariant.price_adjustment || 0);
      }
    }
  }

  const basePrice = isRental 
    ? Number(prod.rental_price_24h || prod.precio || prod.base_price || 0)
    : Number(prod.base_price || prod.sale_price || prod.precio || 0);

  const finalUnitPrice = basePrice + priceAdjustment;
  const advancePct = Number(prod.advance_percentage || 50);
  const advancePrice = (finalUnitPrice * advancePct) / 100;

  const itemToAdd = {
    cartItemId: Date.now() + '_' + Math.random().toString(36).substr(2, 4),
    productId: prod.id,
    title: prod.title || prod.nombre || 'Producto Cupissa',
    image: prod.main_image || prod.imagen || prod.image_url || 'images/logo.png',
    mode: isRental ? 'rental' : 'sale',
    variantName: selectedVariant ? selectedVariant.variant_name : null,
    unitPrice: finalUnitPrice,
    advancePercentage: advancePct,
    advanceAmount: advancePrice,
    remainingAmount: finalUnitPrice - advancePrice,
    rentalDeposit: isRental ? Number(prod.rental_deposit || 20000) : 0,
    allowsCredit: prod.allows_credit !== false
  };

  window.cart.push(itemToAdd);
  window.saveCartToStorage();

  if (typeof window.showToast === 'function') {
    window.showToast(`${itemToAdd.title} agregado al carrito`, 'success');
  }

  if (typeof window.closeModal === 'function') window.closeModal('productDetailModal');
  window.toggleCartModal(true);
};

window.removeFromCart = function(index) {
  if (index >= 0 && index < window.cart.length) {
    window.cart.splice(index, 1);
    window.saveCartToStorage();
    window.renderCartList();
  }
};

window.renderCartList = function() {
  const list = document.getElementById('cartItemsList');
  if (!list) return;

  if (!window.cart || window.cart.length === 0) {
    list.innerHTML = `
      <div class="text-center py-8">
        <i class="fa-solid fa-basket-shopping text-3xl text-gray-300 dark:text-gray-600 mb-2"></i>
        <p class="text-xs text-gray-400 font-medium">Tu carrito está vacío.</p>
      </div>
    `;
    window.updateCartTotals(0, 0, 0);
    return;
  }

  let totalCombined = 0;
  let totalAdvance = 0;
  let totalDeposits = 0;

  list.innerHTML = window.cart.map((item, idx) => {
    totalCombined += item.unitPrice + (item.rentalDeposit || 0);
    totalAdvance += item.advanceAmount + (item.rentalDeposit || 0);
    totalDeposits += (item.rentalDeposit || 0);

    return `
      <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 mb-2">
        <div class="flex items-center gap-3">
          <img src="${item.image}" alt="${item.title}" class="w-12 h-12 object-cover rounded-lg" />
          <div>
            <h4 class="font-bold text-xs text-gray-800 dark:text-white line-clamp-1">${item.title}</h4>
            <div class="flex items-center gap-2 mt-0.5">
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.mode === 'rental' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'}">
                ${item.mode === 'rental' ? 'Alquiler (24h)' : 'Venta'}
              </span>
              ${item.variantName ? `<span class="text-[10px] text-gray-500 font-medium">Talla/Var: ${item.variantName}</span>` : ''}
            </div>
            <div class="text-[11px] font-bold text-brand-600 mt-1">
              $${Number(item.unitPrice).toLocaleString('es-CO')} COP 
              <span class="text-[9px] text-gray-400 font-normal">(Ant. ${item.advancePercentage}%: $${Number(item.advanceAmount).toLocaleString('es-CO')})</span>
            </div>
            ${item.rentalDeposit > 0 ? `<div class="text-[9px] text-purple-500 font-semibold">+ Depósito reembolsable: $${Number(item.rentalDeposit).toLocaleString('es-CO')}</div>` : ''}
          </div>
        </div>
        <button type="button" onclick="window.removeFromCart(${idx})" class="text-gray-400 hover:text-red-500 p-2 transition">
          <i class="fa-solid fa-trash-can text-sm"></i>
        </button>
      </div>
    `;
  }).join('');

  window.updateCartTotals(totalCombined, totalAdvance, totalDeposits);
};

window.updateCartTotals = function(total, advance, deposits) {
  const totalEl = document.getElementById('cartTotalText');
  const advEl = document.getElementById('cartAdvanceText');
  const depEl = document.getElementById('cartDepositText');

  if (totalEl) totalEl.textContent = `$${Number(total).toLocaleString('es-CO')} COP`;
  if (advEl) advEl.textContent = `$${Number(advance).toLocaleString('es-CO')} COP`;
  if (depEl) {
    if (deposits > 0) {
      depEl.textContent = `(Incluye $${Number(deposits).toLocaleString('es-CO')} en depósitos de alquiler)`;
      depEl.classList.remove('hidden');
    } else {
      depEl.classList.add('hidden');
    }
  }
};

// --- GESTIÓN DE FAVORITOS ---

window.loadFavoritesFromStorage = function() {
  try {
    window.favorites = JSON.parse(localStorage.getItem('cupissa_favorites') || '[]');
  } catch (e) {
    console.error('Error al cargar favoritos:', e);
    window.favorites = [];
  }
  window.updateFavBadge();
};

window.saveFavoritesToStorage = function() {
  localStorage.setItem('cupissa_favorites', JSON.stringify(window.favorites));
  window.updateFavBadge();
};

window.updateFavBadge = function() {
  const badges = document.querySelectorAll('#favCount, .fav-count-badge');
  badges.forEach(badge => {
    if (badge) {
      badge.textContent = window.favorites.length;
      if (window.favorites.length > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  });
};

window.toggleFavoritesModal = function(show) {
  if (show) {
    window.renderFavoritesList();
    if (typeof window.openModal === 'function') {
      window.openModal('favoritesModal');
    } else {
      const m = document.getElementById('favoritesModal');
      if (m) {
        m.classList.remove('hidden');
        m.classList.add('flex');
      }
    }
  } else {
    if (typeof window.closeModal === 'function') {
      window.closeModal('favoritesModal');
    } else {
      const m = document.getElementById('favoritesModal');
      if (m) {
        m.classList.add('hidden');
        m.classList.remove('flex');
      }
    }
  }
};

window.toggleFavorite = function(productId, event) {
  if (event) event.stopPropagation();
  if (!productId) return;

  const prodList = window.products || [];
  const foundProd = prodList.find(p => String(p.id) === String(productId));
  const favIndex = window.favorites.findIndex(fav => String(fav.id) === String(productId));

  if (favIndex > -1) {
    window.favorites.splice(favIndex, 1);
    if (typeof window.showToast === 'function') window.showToast('Eliminado de favoritos', 'success');
  } else if (foundProd) {
    window.favorites.push({
      id: foundProd.id,
      title: foundProd.title || foundProd.nombre || 'Producto',
      image: foundProd.main_image || foundProd.imagen || foundProd.image_url || 'images/logo.png',
      price: Number(foundProd.base_price || foundProd.precio || foundProd.sale_price || 0)
    });
    if (typeof window.showToast === 'function') window.showToast('Agregado a favoritos', 'success');
  }

  window.saveFavoritesToStorage();

  if (typeof window.renderProductGrid === 'function' && window.products && window.products.length > 0) {
    window.renderProductGrid(window.products);
  }
  window.renderFavoritesList();
};

window.renderFavoritesList = function() {
  const list = document.getElementById('favoritesItemsList');
  if (!list) return;

  if (!window.favorites || window.favorites.length === 0) {
    list.innerHTML = `
      <div class="text-center py-8">
        <i class="fa-regular fa-heart text-3xl text-gray-300 dark:text-gray-600 mb-2"></i>
        <p class="text-xs text-gray-400 font-medium">Aún no tienes productos en favoritos.</p>
      </div>
    `;
    return;
  }

  list.innerHTML = window.favorites.map(p => `
    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 mb-2">
      <div class="flex items-center gap-3">
        <img src="${p.image}" alt="${p.title}" class="w-10 h-10 object-cover rounded-lg" />
        <div>
          <h4 class="font-bold text-xs text-gray-800 dark:text-white line-clamp-1">${p.title}</h4>
          <span class="text-[10px] text-brand-600 font-bold">$${Number(p.price).toLocaleString('es-CO')} COP</span>
        </div>
      </div>
      <button type="button" onclick="window.toggleFavorite('${p.id}', event)" class="text-gray-400 hover:text-red-500 p-2 transition">
        <i class="fa-solid fa-trash-can text-xs"></i>
      </button>
    </div>
  `).join('');
};

// Inicializar al cargar el script
document.addEventListener('DOMContentLoaded', () => {
  window.loadCartFromStorage();
  window.loadFavoritesFromStorage();
});