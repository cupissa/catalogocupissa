function loadCartFromStorage() {
  try {
    cart = JSON.parse(localStorage.getItem('cupissa_cart') || '[]');
  } catch (e) {
    cart = [];
  }
  updateCartBadge();
}

function saveCartToStorage() {
  localStorage.setItem('cupissa_cart', JSON.stringify(cart));
  updateCartBadge();
}

window.toggleCartModal = function(show) {
  if (show) {
    renderCartList();
    if (typeof openModal === 'function') {
      openModal('cartModal');
    } else {
      const modal = document.getElementById('cartModal');
      if (modal) modal.classList.remove('hidden');
    }
  } else {
    if (typeof closeModal === 'function') {
      closeModal('cartModal');
    } else {
      const modal = document.getElementById('cartModal');
      if (modal) modal.classList.add('hidden');
    }
  }
};

window.addToCart = function(prod) {
  if (!prod) return;
  const price = Number(prod.precio || prod.sale_price || prod.rental_price_per_day || 0);
  const pct = prod.advance_percentage || 50;

  cart.push({
    id: prod.id,
    title: prod.nombre || prod.title || 'Producto',
    mode: 'sale',
    price: price,
    advancePrice: (price * pct) / 100
  });

  saveCartToStorage();
  window.toggleCartModal(true);
};

window.addToCartCurrent = function() {
  let prod = selectedProduct;
  if (!prod && typeof currentSelectedProduct !== 'undefined') {
    prod = currentSelectedProduct;
  }
  if (!prod) return;

  const isRental = (typeof currentProductMode !== 'undefined' ? currentProductMode : 'sale') === 'rental';
  const price = isRental ? (prod.rental_price_per_day || prod.precio || 0) : (prod.sale_price || prod.precio || 0);
  const pct = prod.advance_percentage || 50;

  cart.push({
    id: prod.id,
    title: prod.nombre || prod.title || 'Producto',
    mode: isRental ? 'rental' : 'sale',
    price: Number(price),
    advancePrice: (Number(price) * pct) / 100
  });

  saveCartToStorage();
  window.toggleCartModal(true);
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

function renderCartList() {
  const list = document.getElementById('cartItemsList');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `<p class="text-center text-xs text-gray-400 py-6">Tu carrito está vacío.</p>`;
    const totalEl = document.getElementById('cartTotalText');
    const advEl = document.getElementById('cartAdvanceText');
    if (totalEl) totalEl.textContent = '$0 COP';
    if (advEl) advEl.textContent = '$0 COP';
    return;
  }

  let total = cart.reduce((acc, i) => acc + i.price, 0);
  let advance = cart.reduce((acc, i) => acc + i.advancePrice, 0);

  list.innerHTML = cart.map((item, idx) => `
    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
      <div>
        <h4 class="font-bold text-xs text-gray-800 dark:text-white">${item.title}</h4>
        <span class="text-[10px] text-gray-400 font-bold">$${Number(item.price).toLocaleString('es-CO')} COP</span>
      </div>
      <button type="button" onclick="window.removeFromCart(${idx})" class="text-gray-400 hover:text-red-500 p-1">
        <i class="fa-solid fa-xmark text-xs"></i>
      </button>
    </div>
  `).join('');

  const totalEl = document.getElementById('cartTotalText');
  const advEl = document.getElementById('cartAdvanceText');
  if (totalEl) totalEl.textContent = `$${Number(total).toLocaleString('es-CO')} COP`;
  if (advEl) advEl.textContent = `$${Number(advance).toLocaleString('es-CO')} COP`;
}