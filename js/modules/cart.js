/**
 * js/modules/cart.js
 * Módulo de gestión del Carrito sincronizado para Inicio y Catálogo
 */

window.cartState = JSON.parse(localStorage.getItem('cupissa_cart') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  window.updateCartUI();
});

window.addToCart = function(product, quantity = 1, mode = 'buy', options = {}) {
  const itemIndex = window.cartState.findIndex(i => i.id === product.id && i.mode === mode);

  if (itemIndex > -1) {
    window.cartState[itemIndex].quantity += quantity;
  } else {
    window.cartState.push({
      id: product.id,
      name: product.name || product.title,
      price: product.price || 0,
      image_url: product.image_url || product.image || 'images/logo.png',
      quantity: quantity,
      mode: mode,
      advancePercentage: product.advancePercentage || 30,
      ...options
    });
  }

  localStorage.setItem('cupissa_cart', JSON.stringify(window.cartState));
  window.updateCartUI();
  window.toggleCartModal(true);
};

window.updateCartUI = function() {
  const cartCount = document.getElementById('cartCount');
  if (cartCount) {
    cartCount.textContent = window.cartState.reduce((acc, curr) => acc + curr.quantity, 0).toString();
  }

  const cartList = document.getElementById('cartItemsList');
  if (!cartList) return;

  if (window.cartState.length === 0) {
    cartList.innerHTML = `
      <div class="py-12 text-center text-gray-400 text-xs">
        <i class="fa-solid fa-bag-shopping text-2xl mb-2 text-gray-300"></i>
        <p>Tu carrito está vacío.</p>
      </div>
    `;
    const totalElem = document.getElementById('cartTotalText');
    const advElem = document.getElementById('cartAdvanceText');
    if (totalElem) totalElem.textContent = '$0 COP';
    if (advElem) advElem.textContent = '$0 COP';
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
              <span>Modo: <strong class="uppercase">${item.mode || 'Comprar'}</strong></span>
            </div>
            <span class="text-xs font-black text-brand-600">$${itemTotal.toLocaleString('es-CO')} COP</span>
          </div>
        </div>
        <button onclick="window.removeCartItem(${index})" class="p-2 text-gray-400 hover:text-red-500 transition-colors">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>
    `;
  }).join('');

  const totalElem = document.getElementById('cartTotalText');
  const advElem = document.getElementById('cartAdvanceText');
  if (totalElem) totalElem.textContent = `$${total.toLocaleString('es-CO')} COP`;
  if (advElem) advElem.textContent = `$${totalAdvance.toLocaleString('es-CO')} COP`;
};

window.removeCartItem = function(index) {
  window.cartState.splice(index, 1);
  localStorage.setItem('cupissa_cart', JSON.stringify(window.cartState));
  window.updateCartUI();
};

window.toggleCartModal = function(show) {
  const modal = document.getElementById('cartModal');
  if (modal) {
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
  }
}; 