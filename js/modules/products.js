// ==========================================
// MÓDULO DE PRODUCTOS Y CATALOGO - CUPISSA
// ==========================================

if (typeof window.products === 'undefined') window.products = [];
if (typeof window.isWholesale === 'undefined') window.isWholesale = false;
if (typeof window.selectedProduct === 'undefined') window.selectedProduct = null;
if (typeof window.currentProductMode === 'undefined') window.currentProductMode = 'sale';

window.fetchProducts = async function() {
  try {
    const grid = document.getElementById('productsGrid');
    if (grid) {
      grid.innerHTML = `
        <div class="col-span-full text-center py-12">
          <i class="fa-solid fa-spinner fa-spin text-2xl text-brand-600 mb-2"></i>
          <p class="text-xs text-gray-500">Cargando productos del ecosistema...</p>
        </div>
      `;
    }

    const { data, error } = await supabaseClient
      .from('products')
      .select('*, product_variants(*)');

    if (error) throw error;

    window.products = data || [];
    window.renderProductGrid(window.products);
  } catch (err) {
    console.error('Error al obtener productos desde Supabase:', err);
    if (typeof window.showToast === 'function') {
      window.showToast('Error de conexión al cargar el catálogo', 'error');
    }
  }
};

window.setWholesaleMode = function(enabled) {
  window.isWholesale = enabled;
  const badge = document.getElementById('wholesaleModeBadge');
  if (badge) {
    if (enabled) {
      badge.classList.remove('hidden');
      badge.textContent = 'Modo Mayorista Activo';
    } else {
      badge.classList.add('hidden');
    }
  }
  if (window.products && window.products.length > 0) {
    window.renderProductGrid(window.products);
  }
};

window.filterByWorld = function(worldSlug) {
  window.currentWorld = worldSlug;
  
  // Actualizar UI de botones de categoría
  const buttons = document.querySelectorAll('.world-filter-btn');
  buttons.forEach(btn => {
    if (btn.dataset.world === worldSlug) {
      btn.classList.add('bg-brand-600', 'text-white');
      btn.classList.remove('bg-gray-100', 'text-gray-700', 'dark:bg-gray-800', 'dark:text-gray-300');
    } else {
      btn.classList.remove('bg-brand-600', 'text-white');
      btn.classList.add('bg-gray-100', 'text-gray-700', 'dark:bg-gray-800', 'dark:text-gray-300');
    }
  });

  if (!window.products) return;

  const filtered = worldSlug === 'all' 
    ? window.products 
    : window.products.filter(p => p.world_slug === worldSlug || p.world_id === worldSlug);

  window.renderProductGrid(filtered);
};

window.renderProductGrid = function(items) {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (!items || items.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
        <i class="fa-solid fa-box-open text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
        <p class="text-sm font-semibold text-gray-600 dark:text-gray-300">No se encontraron productos en este mundo.</p>
        <p class="text-xs text-gray-400 mt-1">Prueba seleccionando otra categoría o limpiando los filtros.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(p => {
    const isFav = (window.favorites || []).some(f => String(f.id) === String(p.id));
    const basePrice = Number(p.base_price || p.precio || p.sale_price || 0);
    
    // Aplicar descuento mayorista si el usuario está en modo mayorista (ej. 15% descuento)
    const displayPrice = window.isWholesale ? basePrice * 0.85 : basePrice;

    return `
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-md transition-all duration-200 p-4 flex flex-col justify-between group cursor-pointer"
           onclick="window.openProductDetail('${p.id}')">
        <div>
          <div class="relative overflow-hidden rounded-xl mb-3">
            <img src="${p.main_image || p.imagen || 'images/logo.png'}" alt="${p.title || p.nombre}" class="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300" />
            
            <button type="button" onclick="window.toggleFavorite('${p.id}', event)" class="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-md flex items-center justify-center text-gray-400 hover:text-red-500 transition shadow-sm">
              <i class="fa-${isFav ? 'solid' : 'regular'} fa-heart text-sm ${isFav ? 'text-red-500' : ''}"></i>
            </button>

            ${p.is_rental ? `
              <span class="absolute bottom-2 left-2 bg-purple-600/90 backdrop-blur-sm text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Alquiler Disponible
              </span>
            ` : ''}
          </div>

          <span class="text-[10px] font-bold text-brand-600 uppercase tracking-widest">${p.world_slug || 'Cupissa Studio'}</span>
          <h3 class="font-bold text-sm text-gray-800 dark:text-white line-clamp-1 mt-0.5">${p.title || p.nombre}</h3>
          <p class="text-xs text-gray-400 line-clamp-2 mt-1">${p.description || p.descripcion || 'Producto con opciones de personalización bajo demanda.'}</p>
        </div>

        <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
          <div>
            <span class="text-[10px] text-gray-400 block">Desde</span>
            <span class="font-extrabold text-brand-600 text-sm">$${Number(displayPrice).toLocaleString('es-CO')} COP</span>
          </div>
          <button type="button" class="px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-300 font-bold text-xs group-hover:bg-brand-600 group-hover:text-white transition-colors">
            Ver detalle
          </button>
        </div>
      </div>
    `;
  }).join('');
};

window.openProductDetail = function(productId) {
  window.selectedProduct = window.products.find(p => String(p.id) === String(productId));
  if (!window.selectedProduct) return;

  const prod = window.selectedProduct;
  window.currentProductMode = 'sale';

  // Asignación de textos e imágenes al modal
  const titleEl = document.getElementById('productDetailTitle');
  const imgEl = document.getElementById('productDetailImage');
  const descEl = document.getElementById('productDetailDescription');
  const daysEl = document.getElementById('productDetailProductionDays');
  const advancePctEl = document.getElementById('productDetailAdvancePct');

  if (titleEl) titleEl.textContent = prod.title || prod.nombre;
  if (imgEl) imgEl.src = prod.main_image || prod.imagen || 'images/logo.png';
  if (descEl) descEl.textContent = prod.description || prod.descripcion || 'Sin descripción detallada.';
  if (daysEl) daysEl.textContent = `${prod.production_days || 3} días hábiles`;
  if (advancePctEl) advancePctEl.textContent = `${prod.advance_percentage || 50}%`;

  // Selector Venta / Alquiler
  const rentalTab = document.getElementById('productModeRentalBtn');
  if (rentalTab) {
    if (prod.is_rental) {
      rentalTab.classList.remove('hidden');
    } else {
      rentalTab.classList.add('hidden');
    }
  }

  // Renderizar Variantes
  const variantContainer = document.getElementById('productVariantsContainer');
  const variantSelect = document.getElementById('productVariantSelect');
  if (variantContainer && variantSelect) {
    if (prod.product_variants && prod.product_variants.length > 0) {
      variantContainer.classList.remove('hidden');
      variantSelect.innerHTML = prod.product_variants.map(v => `
        <option value="${v.id}">
          ${v.variant_name} ${Number(v.price_adjustment) > 0 ? `(+$${Number(v.price_adjustment).toLocaleString('es-CO')})` : ''}
        </option>
      `).join('');
    } else {
      variantContainer.classList.add('hidden');
      variantSelect.innerHTML = '';
    }
  }

  window.recalculateProductPriceSim();

  if (typeof window.openModal === 'function') {
    window.openModal('productDetailModal');
  } else {
    const modal = document.getElementById('productDetailModal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }
  }
};

window.setProductMode = function(mode) {
  window.currentProductMode = mode;
  const saleBtn = document.getElementById('productModeSaleBtn');
  const rentalBtn = document.getElementById('productModeRentalBtn');

  if (mode === 'rental') {
    if (saleBtn) saleBtn.className = 'px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700';
    if (rentalBtn) rentalBtn.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-sm';
  } else {
    if (saleBtn) saleBtn.className = 'px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white shadow-sm';
    if (rentalBtn) rentalBtn.className = 'px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700';
  }

  window.recalculateProductPriceSim();
};

window.recalculateProductPriceSim = function() {
  if (!window.selectedProduct) return;

  const prod = window.selectedProduct;
  const isRental = window.currentProductMode === 'rental';

  // Ajuste por variante
  const variantSelect = document.getElementById('productVariantSelect');
  let priceAdj = 0;
  if (variantSelect && variantSelect.value && prod.product_variants) {
    const v = prod.product_variants.find(varObj => String(varObj.id) === String(variantSelect.value));
    if (v) priceAdj = Number(v.price_adjustment || 0);
  }

  const basePrice = isRental 
    ? Number(prod.rental_price_24h || 60000)
    : Number(prod.base_price || prod.precio || 0);

  const finalTotal = basePrice + priceAdj;
  const advancePct = Number(prod.advance_percentage || 50);
  const advanceAmount = (finalTotal * advancePct) / 100;
  const remainingAmount = finalTotal - advanceAmount;

  // Actualizar Elementos DOM
  const priceDisplay = document.getElementById('productDetailPrice');
  const advanceDisplay = document.getElementById('productDetailAdvanceAmount');
  const remainingDisplay = document.getElementById('productDetailRemainingAmount');

  if (priceDisplay) priceDisplay.textContent = `$${Number(finalTotal).toLocaleString('es-CO')} COP`;
  if (advanceDisplay) advanceDisplay.textContent = `$${Number(advanceAmount).toLocaleString('es-CO')} COP`;
  if (remainingDisplay) remainingDisplay.textContent = `$${Number(remainingAmount).toLocaleString('es-CO')} COP`;

  // Simulador de Crédito Cupissa
  const periodicitySelect = document.getElementById('creditPeriodicitySelect');
  const installmentsSelect = document.getElementById('creditInstallmentsSelect');
  const creditSimContainer = document.getElementById('creditSimulatorContainer');

  if (creditSimContainer) {
    if (prod.allows_credit && remainingAmount > 0) {
      creditSimContainer.classList.remove('hidden');

      const interestPct = Number(prod.interest_percentage || 20); // 20% interés estándar o dinámico por producto
      const periodicity = periodicitySelect ? periodicitySelect.value : 'quincenal';
      const numInstallments = installmentsSelect ? Number(installmentsSelect.value) : 2;

      const totalWithInterest = remainingAmount * (1 + (interestPct / 100));
      const installmentValue = totalWithInterest / numInstallments;

      const instValEl = document.getElementById('creditInstallmentValueText');
      const instTotalEl = document.getElementById('creditTotalFinancedText');

      if (instValEl) instValEl.textContent = `$${Number(installmentValue).toLocaleString('es-CO')} COP / ${periodicity}`;
      if (instTotalEl) instTotalEl.textContent = `$${Number(totalWithInterest).toLocaleString('es-CO')} COP`;
    } else {
      creditSimContainer.classList.add('hidden');
    }
  }
};