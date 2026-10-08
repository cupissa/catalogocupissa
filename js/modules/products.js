window.selectedProductState = {
  product: null,
  quantity: 1,
  size: null,
  sizePriceExtra: 0,
  mode: 'buy', // 'buy' o 'rent'
  isCredit: false,
  installments: 3 // Cuotas por defecto (máximo 6)
};

/**
 * Abre el modal con los detalles completos del producto y el simulador de crédito
 */
window.openProductDetailModal = function(productData) {
  window.selectedProductState.product = productData;
  window.selectedProductState.quantity = 1;
  window.selectedProductState.size = productData.sizes?.[0]?.name || null;
  window.selectedProductState.sizePriceExtra = productData.sizes?.[0]?.extraPrice || 0;
  window.selectedProductState.mode = 'buy';
  window.selectedProductState.isCredit = false;
  window.selectedProductState.installments = 3;

  window.renderProductModalContent();

  const modal = document.getElementById('productDetailModal');
  if (modal) modal.classList.remove('hidden');
};

/**
 * Renderiza dinámicamente los controles e interactividad del modal
 */
window.renderProductModalContent = function() {
  const p = window.selectedProductState.product;
  if (!p) return;

  const basePrice = p.price + window.selectedProductState.sizePriceExtra;
  const qty = window.selectedProductState.quantity;
  const isCredit = window.selectedProductState.isCredit && window.selectedProductState.mode === 'buy';

  // Si es crédito se añade 20% de interés
  const unitPrice = isCredit ? basePrice * 1.20 : basePrice;
  const subtotal = unitPrice * qty;
  const advancePayment = subtotal * (p.advancePercentage || 0.30); // 30% anticipo por defecto
  const remaining = subtotal - advancePayment;

  const installments = window.selectedProductState.installments;
  const monthlyFee = installments > 0 ? (remaining / installments) : remaining;

  // Actualización en el DOM
  const imgEl = document.getElementById('modalProductImage');
  const titleEl = document.getElementById('modalProductTitle');
  const basePriceEl = document.getElementById('modalProductBasePrice');
  const subtotalEl = document.getElementById('modalProductSubtotal');
  const advanceEl = document.getElementById('modalProductAdvance');
  const feeEl = document.getElementById('modalProductMonthlyFee');
  const rentalWarningEl = document.getElementById('modalRentalCreditWarning');

  if (imgEl) imgEl.src = p.image || 'https://via.placeholder.com/300';
  if (titleEl) titleEl.textContent = p.name;
  if (basePriceEl) basePriceEl.textContent = `$${basePrice.toLocaleString('es-CO')}`;
  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toLocaleString('es-CO')}`;
  if (advanceEl) advanceEl.textContent = `$${advancePayment.toLocaleString('es-CO')}`;
  if (feeEl) feeEl.textContent = `$${Math.round(monthlyFee).toLocaleString('es-CO')} / mes (${installments} cuotas)`;

  // Deshabilitar Crédito si está en modo Alquiler
  if (rentalWarningEl) {
    if (window.selectedProductState.mode === 'rent') {
      rentalWarningEl.classList.remove('hidden');
      window.selectedProductState.isCredit = false;
    } else {
      rentalWarningEl.classList.add('hidden');
    }
  }
};

/**
 * Eventos de interacción del Modal de Producto
 */
window.updateProductQuantity = function(delta) {
  let newQty = window.selectedProductState.quantity + delta;
  if (newQty < 1) newQty = 1;
  window.selectedProductState.quantity = newQty;
  window.renderProductModalContent();
};

window.setProductSize = function(sizeName, extraPrice) {
  window.selectedProductState.size = sizeName;
  window.selectedProductState.sizePriceExtra = extraPrice || 0;
  window.renderProductModalContent();
};

window.setProductMode = function(mode) {
  if (mode === 'rent' && !window.selectedProductState.product?.allowRent) {
    if (typeof showToast === 'function') showToast("Este producto no está disponible para alquiler.", "info");
    return;
  }
  window.selectedProductState.mode = mode;
  if (mode === 'rent') window.selectedProductState.isCredit = false;
  window.renderProductModalContent();
};

window.toggleCreditSimulation = function(enabled) {
  if (window.selectedProductState.mode === 'rent' && enabled) {
    if (typeof showToast === 'function') showToast("El Crédito Cupissa no está disponible para alquiler.", "error");
    return;
  }
  window.selectedProductState.isCredit = enabled;
  window.renderProductModalContent();
};

window.setInstallmentsCount = function(count) {
  const num = parseInt(count, 10);
  if (num >= 1 && num <= 6) {
    window.selectedProductState.installments = num;
    window.renderProductModalContent();
  }
};

/**
 * Agrega el producto configurado al carrito
 */
window.addCurrentProductToCart = function() {
  const p = window.selectedProductState.product;
  if (!p) return;

  const basePrice = p.price + window.selectedProductState.sizePriceExtra;
  const isCredit = window.selectedProductState.isCredit && window.selectedProductState.mode === 'buy';
  const finalUnitPrice = isCredit ? basePrice * 1.20 : basePrice;

  const cartItem = {
    id: `${p.id}-${window.selectedProductState.size || 'unique'}-${window.selectedProductState.mode}`,
    productId: p.id,
    name: p.name,
    image: p.image,
    price: finalUnitPrice,
    originalPrice: basePrice,
    quantity: window.selectedProductState.quantity,
    size: window.selectedProductState.size,
    mode: window.selectedProductState.mode, // 'buy' o 'rent'
    isCredit: isCredit,
    installments: isCredit ? window.selectedProductState.installments : 0
  };

  if (typeof window.addToCart === 'function') {
    window.addToCart(cartItem);
    if (typeof showToast === 'function') showToast("Producto agregado al carrito con éxito.");
  }

  const modal = document.getElementById('productDetailModal');
  if (modal) modal.classList.add('hidden');
};