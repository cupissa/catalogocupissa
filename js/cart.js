function loadCartFromStorage() {
  cart = JSON.parse(localStorage.getItem('cupissa_cart') || '[]');
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

  cart.push({
    id: selectedProduct.id,
    title: selectedProduct.title,
    mode: currentProductMode,
    price: price,
    advancePrice: (price * pct) / 100
  });

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
  if (modal) {
    if (show) renderCartList();
    modal.classList.toggle('hidden', !show);
  }
};

function renderCartList() {
  const list = document.getElementById('cartItemsList');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `<p class="text-center text-xs text-gray-400 py-6">Tu carrito está vacío.</p>`;
    document.getElementById('cartTotalText').textContent = '$0 COP';
    document.getElementById('cartAdvanceText').textContent = '$0 COP';
    return;
  }

  let total = cart.reduce((acc, i) => acc + i.price, 0);
  let advance = cart.reduce((acc, i) => acc + i.advancePrice, 0);

  list.innerHTML = cart.map((item, idx) => `
    <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
      <div>
        <h4 class="font-bold text-xs text-gray-800 dark:text-white">${item.title}</h4>
        <span class="text-[10px] text-gray-400 font-bold">$${Number(item.price).toLocaleString()} COP</span>
      </div>
      <button type="button" onclick="removeFromCart(${idx})" class="text-gray-400 hover:text-red-500"><i class="fa-solid fa-xmark text-xs"></i></button>
    </div>
  `).join('');

  document.getElementById('cartTotalText').textContent = `$${Number(total).toLocaleString()} COP`;
  document.getElementById('cartAdvanceText').textContent = `$${Number(advance).toLocaleString()} COP`;
}

window.goToCheckout = function() {
  if (cart.length === 0) return;
  toggleCartModal(false);
  showSection('checkout');
};