/**
 * js/modules/product-detail-modal.js
 * Módulo para gestionar el modal interactivo de detalles de producto para clientes.
 * Soporta selección de talla, color, modalidad (compra vs alquiler con depósito),
 * simulador de crédito (+20%, 1 a 6 cuotas), campo de personalización y cálculo en tiempo real.
 */

window.currentDetailProduct = null;
window.selectedProductOptions = {
  mode: 'venta', // 'venta' | 'alquiler'
  size: null,    // { name: string, price: number }
  color: null,   // { name: string, price: number }
  customText: '',
  isCredit: false,
  creditMonths: 1,
  quantity: 1
};

/**
 * Muestra el modal detallado de producto
 * @param {Object} product - Objeto del producto
 */
window.showProductDetail = function(product) {
  if (!product) return;

  window.currentDetailProduct = product;
  
  // Parsear campos compuestos si vienen en JSON string desde la BD
  let tallas = [];
  let colores = [];
  try {
    tallas = typeof product.tallas === 'string' ? JSON.parse(product.tallas) : (product.tallas || []);
  } catch (e) { tallas = []; }

  try {
    colores = typeof product.colores === 'string' ? JSON.parse(product.colores) : (product.colores || []);
  } catch (e) { colores = []; }

  // Determinar modalidad por defecto
  const permiteVenta = product.permitir_venta !== false;
  const permiteAlquiler = Boolean(product.permitir_alquiler);
  const defaultMode = permiteVenta ? 'venta' : (permiteAlquiler ? 'alquiler' : 'venta');

  // Inicializar estado de opciones seleccionadas
  window.selectedProductOptions = {
    mode: defaultMode,
    size: tallas.length > 0 ? tallas[0] : null,
    color: colores.length > 0 ? colores[0] : null,
    customText: '',
    isCredit: false,
    creditMonths: 1,
    quantity: 1
  };

  // Asegurar o crear el modal en el DOM si no existe
  let modal = document.getElementById('modal-detalle-producto-tienda');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-detalle-producto-tienda';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 hidden overflow-y-auto';
    document.body.appendChild(modal);
  }

  // Formateadores seguros
  const parseNum = (val) => typeof window.parseMonto === 'function' ? window.parseMonto(val) : (parseFloat(val) || 0);
  const fmtMoney = (val) => typeof window.formatMoneda === 'function' ? window.formatMoneda(val) : new Intl.NumberFormat('es-CO').format(val || 0);

  const foto = product.image_url || product.imagen || 'images/logo.png';
  const esPersonalizable = Boolean(product.es_personalizable);
  const permiteCredito = Boolean(product.permitir_credito) && permiteVenta;

  modal.innerHTML = `
    <div class="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-5 sm:p-7 shadow-2xl relative max-h-[92vh] overflow-y-auto text-xs text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-gray-700 space-y-5 animate-fade-in">
      
      <button type="button" onclick="window.closeProductDetailModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-2 rounded-xl">
        <i class="fa-solid fa-xmark text-lg"></i>
      </button>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 items-start">
        <!-- Imagen -->
        <div class="relative bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 aspect-square flex items-center justify-center overflow-hidden group">
          <img src="${foto}" alt="${product.nombre}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300">
          <div class="absolute top-2 left-2 flex flex-col gap-1">
            <span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-brand-600 text-white shadow">${product.mundo || 'General'}</span>
            ${product.temporada ? `<span class="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-pink-600 text-white shadow">${product.temporada}</span>` : ''}
          </div>
        </div>

        <!-- Info Principal -->
        <div class="space-y-3">
          <div>
            <span class="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest">${product.categoria || 'Producto Cupissa'}</span>
            <h2 class="text-lg font-black text-gray-900 dark:text-white leading-tight mt-0.5">${product.nombre}</h2>
            ${product.referencia ? `<p class="text-[10px] text-gray-400 font-mono mt-0.5">Ref: ${product.referencia}</p>` : ''}
          </div>

          <!-- Modalidad: Compra vs Alquiler -->
          ${permiteVenta && permiteAlquiler ? `
            <div>
              <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Modalidad de Servicio *</label>
              <select id="modal-select-modalidad" onchange="window.updateProductDetailCalculations()" class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 font-bold text-xs">
                <option value="venta" selected>🛒 Venta Definitiva</option>
                <option value="alquiler">🔑 Alquiler de Vestuario / Mobiliario</option>
              </select>
            </div>
          ` : ''}

          <!-- Selección de Talla -->
          ${tallas.length > 0 ? `
            <div>
              <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Seleccionar Talla *</label>
              <select id="modal-select-talla" onchange="window.updateProductDetailCalculations()" class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 font-semibold text-xs">
                ${tallas.map((t, idx) => {
                  const inc = parseNum(t.price || t.precio || 0);
                  const txtInc = inc > 0 ? ` (+$${fmtMoney(inc)})` : '';
                  return `<option value="${idx}">${t.name || t.nombre}${txtInc}</option>`;
                }).join('')}
              </select>
            </div>
          ` : ''}

          <!-- Selección de Color -->
          ${colores.length > 0 ? `
            <div>
              <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Seleccionar Color / Tono *</label>
              <select id="modal-select-color" onchange="window.updateProductDetailCalculations()" class="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-2.5 font-semibold text-xs">
                ${colores.map((c, idx) => {
                  const inc = parseNum(c.price || c.precio || 0);
                  const txtInc = inc > 0 ? ` (+$${fmtMoney(inc)})` : '';
                  return `<option value="${idx}">${c.name || c.nombre}${txtInc}</option>`;
                }).join('')}
              </select>
            </div>
          ` : ''}

          <!-- Personalización de Texto -->
          ${esPersonalizable ? `
            <div class="p-3 bg-pink-50/60 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-800/40 rounded-2xl space-y-1">
              <label class="font-bold text-pink-900 dark:text-pink-300 flex items-center gap-1.5">
                <i class="fa-solid fa-wand-magic-sparkles text-pink-600"></i> Datos de Personalización *
              </label>
              <textarea id="modal-input-personalizacion" oninput="window.selectedProductOptions.customText = this.value" placeholder="Escribe el nombre, fecha o detalles para personalizar tu producto..." class="w-full bg-white dark:bg-gray-800 border rounded-xl p-2 text-xs focus:ring-2 focus:ring-pink-500 focus:outline-none" rows="2"></textarea>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- SIMULADOR DE CRÉDITO CUPISSA -->
      ${permiteCredito ? `
        <div id="modal-seccion-credito" class="p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl space-y-3">
          <div class="flex items-center justify-between">
            <label class="flex items-center gap-2 font-black text-amber-900 dark:text-amber-300 cursor-pointer">
              <input type="checkbox" id="modal-check-credito" onchange="window.updateProductDetailCalculations()" class="w-4 h-4 text-amber-600 rounded">
              <span>💳 Financiar con Crédito Cupissa (+20% del valor)</span>
            </label>
          </div>

          <div id="modal-box-simulador-credito" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-200 dark:border-amber-800/40">
            <div>
              <label class="font-bold text-gray-700 dark:text-gray-300 block mb-1">Número de Cuotas Mensuales</label>
              <select id="modal-select-cuotas" onchange="window.updateProductDetailCalculations()" class="w-full bg-white dark:bg-gray-800 border rounded-xl p-2 font-bold text-amber-800 dark:text-amber-300">
                <option value="1">1 Mes</option>
                <option value="2">2 Meses</option>
                <option value="3" selected>3 Meses</option>
                <option value="4">4 Meses</option>
                <option value="5">5 Meses</option>
                <option value="6">6 Meses</option>
              </select>
            </div>
            <div class="bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800/40 flex flex-col justify-center text-center">
              <span class="text-[10px] text-gray-400 font-bold uppercase">Cuota Estimada</span>
              <span id="lbl-modal-cuota-mensual" class="text-sm font-black text-amber-700 dark:text-amber-400">$0 COP / mes</span>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- CANTIDAD Y RESUMEN FINANCIERO -->
      <div class="bg-gray-50 dark:bg-gray-700/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div class="flex items-center gap-2">
            <span class="font-bold text-gray-700 dark:text-gray-300">Cantidad:</span>
            <div class="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden">
              <button type="button" onclick="window.changeProductDetailQty(-1)" class="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">-</button>
              <span id="lbl-modal-cantidad" class="px-3 py-1.5 font-black text-xs">1</span>
              <button type="button" onclick="window.changeProductDetailQty(1)" class="px-3 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 font-bold">+</button>
            </div>
          </div>

          <div class="text-right">
            <span class="text-[10px] text-gray-400 block font-bold uppercase">Total Estimado del Pedido</span>
            <span id="lbl-modal-total-pedido" class="text-lg font-black text-brand-600 dark:text-brand-400">$0 COP</span>
          </div>
        </div>

        <div id="box-modal-desglose-anticipo" class="flex items-center justify-between text-[11px] pt-2 border-t border-gray-200 dark:border-gray-600/60 font-semibold">
          <span class="text-gray-500 dark:text-gray-400">Anticipo / Abono Requerido (<span id="lbl-modal-pct-anticipo">50</span>%):</span>
          <span id="lbl-modal-total-anticipo" class="font-black text-emerald-600 dark:text-emerald-400">$0 COP</span>
        </div>

        <div id="box-modal-deposito-alquiler" class="hidden flex items-center justify-between text-[11px] pt-1 text-purple-700 dark:text-purple-300 font-semibold">
          <span>Depósito de Garantía (Reembolsable):</span>
          <span id="lbl-modal-total-deposito" class="font-black">$0 COP</span>
        </div>
      </div>

      <!-- BOTONES DE ACCIÓN (AGREGAR AL CARRITO & FAVORITOS) -->
      <div class="flex items-center gap-3 pt-2">
        <button type="button" onclick="window.toggleFavoriteFromDetail()" id="btn-modal-favorito" class="p-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 rounded-2xl transition-all shadow-sm shrink-0" title="Guardar en Favoritos">
          <i class="fa-solid fa-heart text-base"></i>
        </button>

        <button type="button" onclick="window.confirmAddToCartFromDetail()" class="flex-1 bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-3.5 px-5 rounded-2xl text-xs transition-all shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2">
          <i class="fa-solid fa-bag-shopping text-sm"></i>
          <span>Agregar al Carrito</span>
        </button>
      </div>

    </div>
  `;

  modal.classList.remove('hidden');
  window.updateProductDetailCalculations();
};

/**
 * Cierra el modal de detalle de producto
 */
window.closeProductDetailModal = function() {
  const modal = document.getElementById('modal-detalle-producto-tienda');
  if (modal) modal.classList.add('hidden');
  window.currentDetailProduct = null;
};

/**
 * Ajusta la cantidad deseada del producto
 */
window.changeProductDetailQty = function(delta) {
  let q = window.selectedProductOptions.quantity + delta;
  if (q < 1) q = 1;
  window.selectedProductOptions.quantity = q;

  const lblQty = document.getElementById('lbl-modal-cantidad');
  if (lblQty) lblQty.textContent = q;

  window.updateProductDetailCalculations();
};

/**
 * Recalcula en tiempo real los costos, depósito, anticipo y simulador de crédito
 */
window.updateProductDetailCalculations = function() {
  const p = window.currentDetailProduct;
  if (!p) return;

  const parseNum = (val) => typeof window.parseMonto === 'function' ? window.parseMonto(val) : (parseFloat(val) || 0);
  const fmtMoney = (val) => typeof window.formatMoneda === 'function' ? window.formatMoneda(val) : new Intl.NumberFormat('es-CO').format(val || 0);

  // Leer Modalidad seleccionada
  const selMod = document.getElementById('modal-select-modalidad');
  const mode = selMod ? selMod.value : (p.permitir_venta !== false ? 'venta' : 'alquiler');
  window.selectedProductOptions.mode = mode;

  // Leer Talla
  let tallas = [];
  try { tallas = typeof p.tallas === 'string' ? JSON.parse(p.tallas) : (p.tallas || []); } catch (e) { tallas = []; }
  const selTalla = document.getElementById('modal-select-talla');
  const sizeObj = (selTalla && tallas[selTalla.value]) ? tallas[selTalla.value] : null;
  window.selectedProductOptions.size = sizeObj;

  // Leer Color
  let colores = [];
  try { colores = typeof p.colores === 'string' ? JSON.parse(p.colores) : (p.colores || []); } catch (e) { colores = []; }
  const selColor = document.getElementById('modal-select-color');
  const colorObj = (selColor && colores[selColor.value]) ? colores[selColor.value] : null;
  window.selectedProductOptions.color = colorObj;

  // Leer Crédito
  const checkCredito = document.getElementById('modal-check-credito');
  const isCredit = Boolean(checkCredito && checkCredito.checked && mode === 'venta');
  window.selectedProductOptions.isCredit = isCredit;

  const boxSimulador = document.getElementById('modal-box-simulador-credito');
  if (boxSimulador) {
    if (isCredit) boxSimulador.classList.remove('hidden');
    else boxSimulador.classList.add('hidden');
  }

  const selCuotas = document.getElementById('modal-select-cuotas');
  const creditMonths = selCuotas ? parseInt(selCuotas.value, 10) || 1 : 1;
  window.selectedProductOptions.creditMonths = creditMonths;

  // Determinar Precio Base por Unidad según la Modalidad
  let baseUnitPrice = 0;
  let depositUnitPrice = 0;

  if (mode === 'alquiler') {
    baseUnitPrice = parseNum(p.precio_alquiler || p.precio_detal || p.price);
    depositUnitPrice = parseNum(p.valor_deposito || 0);
  } else {
    baseUnitPrice = parseNum(p.precio_detal || p.price);
  }

  // Sumar Incrementos por Talla y Color
  const sizeIncrement = sizeObj ? parseNum(sizeObj.price || sizeObj.precio || 0) : 0;
  const colorIncrement = colorObj ? parseNum(colorObj.price || colorObj.precio || 0) : 0;

  let unitTotal = baseUnitPrice + sizeIncrement + colorIncrement;

  // Aplicar +20% si se activa crédito
  if (isCredit) {
    unitTotal = unitTotal * 1.20;
  }

  const qty = window.selectedProductOptions.quantity || 1;
  const totalPedido = (unitTotal * qty) + (mode === 'alquiler' ? (depositUnitPrice * qty) : 0);

  // Calcular Porcentaje de Anticipo
  const pctAnticipo = parseNum(p.porcentaje_anticipo) > 0 ? parseNum(p.porcentaje_anticipo) : 50;
  const totalAnticipo = (totalPedido * (pctAnticipo / 100));

  // Actualizar Etiquetas en el DOM
  const lblTotal = document.getElementById('lbl-modal-total-pedido');
  const lblPctAnticipo = document.getElementById('lbl-modal-pct-anticipo');
  const lblTotalAnticipo = document.getElementById('lbl-modal-total-anticipo');
  const lblTotalDeposito = document.getElementById('lbl-modal-total-deposito');
  const boxDeposito = document.getElementById('box-modal-deposito-alquiler');
  const lblCuota = document.getElementById('lbl-modal-cuota-mensual');

  if (lblTotal) lblTotal.textContent = `$${fmtMoney(totalPedido)} COP`;
  if (lblPctAnticipo) lblPctAnticipo.textContent = pctAnticipo;
  if (lblTotalAnticipo) lblTotalAnticipo.textContent = `$${fmtMoney(totalAnticipo)} COP`;

  if (mode === 'alquiler' && depositUnitPrice > 0) {
    if (boxDeposito) boxDeposito.classList.remove('hidden');
    if (lblTotalDeposito) lblTotalDeposito.textContent = `$${fmtMoney(depositUnitPrice * qty)} COP`;
  } else {
    if (boxDeposito) boxDeposito.classList.add('hidden');
  }

  // Calcular cuota mensual del simulador de crédito
  if (isCredit && creditMonths > 0) {
    const saldoCredito = totalPedido - totalAnticipo;
    const cuotaMensual = saldoCredito / creditMonths;
    if (lblCuota) lblCuota.textContent = `$${fmtMoney(cuotaMensual)} COP / mes`;
  }
};

/**
 * Confirma el agregado del producto con todas sus opciones configuradas al Carrito
 */
window.confirmAddToCartFromDetail = function() {
  const p = window.currentDetailProduct;
  if (!p) return;

  if (p.es_personalizable && !window.selectedProductOptions.customText.trim()) {
    if (typeof showToast === 'function') {
      showToast("Por favor escribe las especificaciones para personalizar tu producto.", "error");
    } else {
      alert("Por favor escribe las especificaciones para personalizar tu producto.");
    }
    return;
  }

  const parseNum = (val) => typeof window.parseMonto === 'function' ? window.parseMonto(val) : (parseFloat(val) || 0);

  const mode = window.selectedProductOptions.mode;
  const sizeObj = window.selectedProductOptions.size;
  const colorObj = window.selectedProductOptions.color;
  const isCredit = window.selectedProductOptions.isCredit;
  const qty = window.selectedProductOptions.quantity || 1;

  let baseUnitPrice = mode === 'alquiler' ? parseNum(p.precio_alquiler || p.precio_detal || p.price) : parseNum(p.precio_detal || p.price);
  const sizeInc = sizeObj ? parseNum(sizeObj.price || sizeObj.precio || 0) : 0;
  const colorInc = colorObj ? parseNum(colorObj.price || colorObj.precio || 0) : 0;

  let unitPrice = baseUnitPrice + sizeInc + colorInc;
  if (isCredit) unitPrice = unitPrice * 1.20;

  const pctAnticipo = parseNum(p.porcentaje_anticipo) > 0 ? parseNum(p.porcentaje_anticipo) : 50;
  const depositVal = mode === 'alquiler' ? parseNum(p.valor_deposito || 0) : 0;

  const cartItem = {
    id: `${p.id}_${mode}_${sizeObj ? sizeObj.name : 'std'}_${colorObj ? colorObj.name : 'std'}_${isCredit ? 'cred' : 'norm'}`,
    productId: p.id,
    nombre: p.nombre,
    imagen: p.image_url || p.imagen || 'images/logo.png',
    precioUnitario: unitPrice,
    cantidad: qty,
    modalidad: mode,
    talla: sizeObj ? (sizeObj.name || sizeObj.nombre) : null,
    color: colorObj ? (colorObj.name || colorObj.nombre) : null,
    personalizacion: window.selectedProductOptions.customText.trim(),
    esCredito: isCredit,
    cuotasCredito: isCredit ? window.selectedProductOptions.creditMonths : null,
    depositoGarantia: depositVal,
    porcentajeAnticipo: pctAnticipo
  };

  if (typeof window.addToCart === 'function') {
    window.addToCart(cartItem);
  } else if (window.CartModule && typeof window.CartModule.addItem === 'function') {
    window.CartModule.addItem(cartItem);
  } else {
    console.log("Ítem para el carrito:", cartItem);
  }

  window.closeProductDetailModal();
};

/**
 * Agrega o remueve el producto de la lista de Favoritos desde el modal
 */
window.toggleFavoriteFromDetail = function() {
  const p = window.currentDetailProduct;
  if (!p) return;

  if (typeof window.toggleFavorite === 'function') {
    window.toggleFavorite(p);
  } else if (window.FavoritesModule && typeof window.FavoritesModule.toggle === 'function') {
    window.FavoritesModule.toggle(p);
  }
};