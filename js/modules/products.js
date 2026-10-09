/**
 * js/modules/products.js
 * Módulo de Gestión de Productos y Catálogo Público para la Tienda Cliente
 */

window.StoreProducts = {
  cache: [],

  /**
   * Carga los productos reales desde Supabase evitando datos piloto de prueba
   */
  async loadProducts() {
    try {
      if (typeof SupabaseSync !== 'undefined' && SupabaseSync.getPublicProducts) {
        this.cache = await SupabaseSync.getPublicProducts();
      } else if (typeof supabaseClient !== 'undefined') {
        const { data, error } = await supabaseClient
          .from('productos')
          .select('*')
          .or('oculto_web.eq.false,oculto_web.is.null')
          .order('nombre', { ascending: true });

        if (!error) this.cache = data || [];
      }
      return this.cache;
    } catch (err) {
      console.error('Error cargando productos públicos en la tienda:', err);
      this.cache = [];
      return [];
    }
  },

  /**
   * Obtiene productos filtrados por mundo
   */
  getByWorld(mundo) {
    if (!mundo || mundo === 'todos') return this.cache;
    return this.cache.filter(p => (p.mundo || '').trim().toUpperCase() === mundo.trim().toUpperCase());
  },

  /**
   * Renderiza las tarjetas de productos en el contenedor de la tienda
   */
  renderGrid(containerId, productsList) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!productsList || productsList.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
          <i class="fa-solid fa-box-open text-4xl text-slate-300 mb-3"></i>
          <p class="text-slate-500 font-bold text-sm">Ndapóri mba'e'asy ko categoría-pe ko'ág̃a.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = productsList.map(p => {
      const foto = p.image_url || p.imagen || 'images/logo.png';
      const precioDetal = parseMonto(p.precio_detal || p.price);
      const esMayorista = p.es_mayorista && p.precio_mayorista > 0;
      const esPersonalizable = p.es_personalizable;

      return `
        <div class="bg-white rounded-3xl p-4 shadow-sm hover:shadow-md border border-slate-100 transition-all duration-300 flex flex-col justify-between group">
          <div>
            <div class="relative overflow-hidden rounded-2xl bg-slate-50 mb-3 aspect-square flex items-center justify-center p-2">
              <img src="${foto}" alt="${p.nombre}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300">
              
              <div class="absolute top-2 left-2 flex flex-col gap-1">
                ${esPersonalizable ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-pink-500 text-white shadow"><i class="fa-solid fa-wand-magic-sparkles mr-0.5"></i> Personalizable</span>' : ''}
                ${p.permitir_alquiler ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-600 text-white shadow">Alquiler</span>' : ''}
              </div>
            </div>

            <span class="text-[10px] font-black uppercase tracking-wider text-indigo-600">${p.mundo || 'General'}</span>
            <h3 class="font-bold text-slate-800 text-sm line-clamp-2 mt-0.5">${p.nombre}</h3>
          </div>

          <div class="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div>
              <span class="text-xs text-slate-400 block font-medium">Tepy Unitario</span>
              <span class="text-base font-black text-indigo-900">$${formatMoneda(precioDetal)}</span>
              ${esMayorista ? `<span class="block text-[10px] font-bold text-amber-600">Mayor: $${formatMoneda(parseMonto(p.precio_mayorista))} (x${p.cant_minima_mayorista || 6})</span>` : ''}
            </div>

            <button onclick='StoreProducts.openDetailModal(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="bg-indigo-600 hover:bg-indigo-700 text-white p-2.5 rounded-2xl shadow-sm transition-all flex items-center justify-center">
              <i class="fa-solid fa-cart-plus text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Abre el modal de detalles, personalización y variables del producto
   */
  openDetailModal(product) {
    const modal = document.getElementById('modal-detalle-producto-tienda');
    if (!modal) return;

    window.selectedStoreProduct = product;

    const foto = product.image_url || product.imagen || 'images/logo.png';
    const precioDetal = parseMonto(product.precio_detal || product.price);

    const modalFoto = document.getElementById('modal-prod-foto');
    const modalNombre = document.getElementById('modal-prod-nombre');
    const modalMundo = document.getElementById('modal-prod-mundo');
    const modalPrecio = document.getElementById('modal-prod-precio');
    const modalDesc = document.getElementById('modal-prod-desc');
    const secPersonalizable = document.getElementById('sec-modal-personalizacion');

    if (modalFoto) modalFoto.src = foto;
    if (modalNombre) modalNombre.textContent = product.nombre;
    if (modalMundo) modalMundo.textContent = `${product.mundo || 'General'} / ${product.categoria || 'Catálogo'}`;
    if (modalPrecio) modalPrecio.textContent = `$${formatMoneda(precioDetal)}`;
    if (modalDesc) modalDesc.textContent = product.descripcion || 'Producto oficial CUPISSA S.A.S. de alta calidad.';

    if (secPersonalizable) {
      if (product.es_personalizable) {
        secPersonalizable.classList.remove('hidden');
      } else {
        secPersonalizable.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
  }
};