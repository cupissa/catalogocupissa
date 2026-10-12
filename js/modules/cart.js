/**
 * js/modules/cart.js
 * Módulo de gestión del Carrito de Compras sincronizado para Inicio y Catálogo.
 * Soporta productos simples y configuraciones avanzadas (Talla, Color, Personalización,
 * Modalidad Alquiler vs Venta, Depósitos de Garantía y Crédito Cupissa).
 */

window.cartState = JSON.parse(localStorage.getItem('cupissa_cart') || '[]');

document.addEventListener('DOMContentLoaded', () => {
  window.updateCartUI();
});

/**
 * Agrega un ítem al carrito de compras
 * Soporta firma directa de cartItem desde product-detail-modal o parámetros legados
 */
window.addToCart = function(productOrItem, quantity = 1, mode = 'buy', options = {}) {
  let cartItem = null;

  // Si viene con el objeto estructurado desde product-detail-modal
  if (productOrItem && (productOrItem.productId || productOrItem.precioUnitario)) {
    cartItem = productOrItem;
  } else {
    // Estructura legada
    const p = productOrItem || {};
    const parseNum = (val) => typeof window.parseMonto === 'function' ? window.parseMonto(val) : (parseFloat(val) || 0);
    const unitPrice = parseNum(p.price || p.precio_detal || 0);
    const modeName = mode === 'rent' || mode === 'alquiler' ? 'alquiler' : 'venta';

    cartItem = {
      id: `${p.id || Date.now()}_${modeName}_std`,
      productId: p.id,
      nombre: p.name || p.nombre || p.title || 'Producto Cupissa',
      imagen: p.image_url || p.imagen || p.image || 'images/logo.png',
      precioUnitario: unitPrice,
      cantidad: quantity,
      modalidad: modeName,
      talla: options.talla || options.size || null,
      color: options.color || null,
      personalizacion: options.personalizacion || options.customText || '',
      esCredito: Boolean(options.esCredito),
      cuotasCredito: options.cuotasCredito || null,
      depositoGarantia: parseNum(options.depositoGarantia || p.valor_deposito || 0),
      porcentajeAnticipo: parseNum(p.porcentaje_anticipo) > 0 ? parseNum(p.porcentaje_anticipo) : 50
    };
  }

  // Verificar si ya existe un ítem idéntico en el carrito
  const existingIndex = window.cartState.findIndex(item => item.id === cartItem.id);

  if (existingIndex > -1) {
    window.cartState[existingIndex].cantidad += cartItem.cantidad;
  } else {
    window.cartState.push(cartItem);
  }

  localStorage.setItem('cupissa_cart', JSON.stringify(window.cartState));
  window.updateCartUI();
  window.toggleCartModal(true);

  if (typeof window.showToast === 'function') {
    window.showToast("Producto agregado al carrito con éxito.");
  }
};

/**
 * Actualiza la interfaz del carrito (badget de conteo, lista de ítems, totales y anticipos)
 */
window.updateCartUI = function() {
  const totalQty = window.cartState.reduce((acc, curr) => acc + (curr.cantidad || curr.quantity || 1), 0);

  // Actualizar badges de conteo en header
  const cartCount = document.getElementById('cartCount');
  const badgeCartCount = document.getElementById('badge-cart-count');
  if (cartCount) cartCount.textContent = totalQty.toString();
  if (badgeCartCount) badgeCartCount.textContent = totalQty.toString();

  const cartList = document.getElementById('cartItemsList');
  if (!cartList) return;

  if (window.cartState.length === 0) {
    cartList.innerHTML = `
      <div class="py-12 text-center text-gray-400 text-xs">
        <i class="fa-solid fa-bag-shopping text-3xl mb-2 text-gray-300 dark:text-gray-600 block"></i>
        <p class="font-semibold">Tu carrito está vacío.</p>
        <p class="text-[10px] text-gray-400 mt-1">Explora nuestro catálogo para agregar productos.</p>
      </div>
    `;

    const totalElem = document.getElementById('cartTotalText');
    const advElem = document.getElementById('cartAdvanceText');
    if (totalElem) totalElem.textContent = '$0 COP';
    if (advElem) advElem.textContent = '$0 COP';
    return;
  }

  const fmtMoney = (val) => typeof window.formatMoneda === 'function' ? window.formatMoneda(val) : new Intl.NumberFormat('es-CO').format(val || 0);

  let totalGeneral = 0;
  let totalAnticipoRequerido = 0;

  cartList.innerHTML = window.cartState.map((item, index) => {
    const qty = item.cantidad || item.quantity || 1;
    const precioU = item.precioUnitario || item.price || 0;
    const depositoU = item.depositoGarantia || 0;

    const subtotalProducto = precioU * qty;
    const subtotalDeposito = depositoU * qty;
    const subtotalItem = subtotalProducto + subtotalDeposito;

    const pctAnticipo = item.porcentajeAnticipo || 50;
    const abonoItem = subtotalItem * (pctAnticipo / 100);

    totalGeneral += subtotalItem;
    totalAnticipoRequerido += abonoItem;

    const esAlquiler = item.modalidad === 'alquiler' || item.mode === 'rent';
    const esCredito = Boolean(item.esCredito);

    return `
      <div class="p-3 bg-gray-50 dark:bg-gray-700/40 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2 text-xs">
        <div class="flex items-start justify-between gap-3">
          <div class="flex items-center gap-3">
            <img src="${item.imagen || item.image_url || 'images/logo.png'}" class="w-12 h-12 object-contain rounded-xl bg-white p-1 shrink-0 border">
            <div>
              <h4 class="font-bold text-gray-800 dark:text-gray-100 line-clamp-1">${item.nombre || item.name}</h4>
              <div class="text-[10px] text-gray-400 flex flex-wrap gap-1.5 mt-0.5">
                <span class="px-1.5 py-0.2 rounded font-extrabold uppercase ${esAlquiler ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'}">
                  ${esAlquiler ? '🔑 Alquiler' : '🛒 Venta'}
                </span>
                ${esCredito ? `<span class="px-1.5 py-0.2 rounded font-extrabold bg-amber-100 text-amber-800">💳 Crédito (${item.cuotasCredito || 1}m)</span>` : ''}
              </div>
            </div>
          </div>
          <button onclick="window.removeCartItem(${index})" class="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="Eliminar ítem">
            <i class="fa-solid fa-trash-can text-xs"></i>
          </button>
        </div>

        <!-- Variaciones e indicaciones de personalización -->
        <div class="text-[10px] text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-100 dark:border-gray-700/60 space-y-0.5">
          ${item.talla ? `<div><strong class="text-gray-700 dark:text-gray-200">Talla:</strong> ${item.talla}</div>` : ''}
          ${item.color ? `<div><strong class="text-gray-700 dark:text-gray-200">Color:</strong> ${item.color}</div>` : ''}
          ${item.personalizacion ? `<div class="text-pink-600 dark:text-pink-400 font-medium"><i class="fa-solid fa-wand-magic-sparkles mr-1"></i>"${item.personalizacion}"</div>` : ''}
          ${subtotalDeposito > 0 ? `<div class="text-purple-600 dark:text-purple-400">Depósito garantía (+): $${fmtMoney(subtotalDeposito)} COP</div>` : ''}
        </div>

        <div class="flex items-center justify-between pt-1">
          <div class="flex items-center gap-2 bg-white dark:bg-gray-800 border rounded-lg px-2 py-0.5">
            <button onclick="window.changeCartQty(${index}, -1)" class="font-bold text-gray-500 hover:text-black dark:hover:text-white px-1">-</button>
            <span class="font-black text-xs text-gray-800 dark:text-gray-100">${qty}</span>
            <button onclick="window.changeCartQty(${index}, 1)" class="font-bold text-gray-500 hover:text-black dark:hover:text-white px-1">+</button>
          </div>
          <div class="text-right">
            <span class="text-[10px] text-gray-400 block">Subtotal</span>
            <span class="font-black text-brand-600 dark:text-brand-400 text-xs">$${fmtMoney(subtotalItem)} COP</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const totalElem = document.getElementById('cartTotalText');
  const advElem = document.getElementById('cartAdvanceText');
  if (totalElem) totalElem.textContent = `$${fmtMoney(totalGeneral)} COP`;
  if (advElem) advElem.textContent = `$${fmtMoney(totalAnticipoRequerido)} COP`;
};

/**
 * Modifica la cantidad de un ítem en el carrito
 */
window.changeCartQty = function(index, delta) {
  if (!window.cartState[index]) return;
  
  let q = (window.cartState[index].cantidad || window.cartState[index].quantity || 1) + delta;
  if (q <= 0) {
    window.removeCartItem(index);
    return;
  }

  window.cartState[index].cantidad = q;
  window.cartState[index].quantity = q;

  localStorage.setItem('cupissa_cart', JSON.stringify(window.cartState));
  window.updateCartUI();
};

/**
 * Elimina un ítem del carrito
 */
window.removeCartItem = function(index) {
  window.cartState.splice(index, 1);
  localStorage.setItem('cupissa_cart', JSON.stringify(window.cartState));
  window.updateCartUI();
};

/**
 * Muestra u oculta el modal / drawer del carrito
 */
window.toggleCartModal = function(show) {
  const modal = document.getElementById('cartModal') || document.getElementById('cart-drawer');
  if (modal) {
    if (show) modal.classList.remove('hidden');
    else modal.classList.add('hidden');
  }
};

window.toggleCartDrawer = function() {
  const modal = document.getElementById('cartModal') || document.getElementById('cart-drawer');
  if (modal) {
    modal.classList.toggle('hidden');
  }
};