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
    openModal('cartModal');
  } else {
    closeModal('cartModal');
  }
};

window.addToCartCurrent = function() {
  if (!selectedProduct) return;

  const isRental = currentProductMode === 'rental';
  const price = isRental ? (selectedProduct.rental_price_per_day || selectedProduct.precio || 0) : (selectedProduct.sale_price || selectedProduct.precio || 0);
  const pct = selectedProduct.advance_percentage || 50;

  cart.push({
    id: selectedProduct.id,
    title: selectedProduct.title || selectedProduct.nombre || 'Producto',
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