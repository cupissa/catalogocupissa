/**
 * js/modules/products.js
 * Módulo de Gestión de Productos y Catálogo Público para la Tienda Cliente.
 * Soporta renderizado de Mundos, filtros, cuadrícula dinámica con Favoritos
 * y apertura del modal interactivo de detalle de producto.
 */

window.StoreProducts = {
  cache: [],

  /**
   * Carga los productos reales desde Supabase sin mockups
   */
  async loadProducts() {
    try {
      if (typeof SupabaseSync !== 'undefined' && SupabaseSync.getPublicProducts) {
        this.cache = await SupabaseSync.getPublicProducts();
      } else {
        const client = window.supabaseClient || window.supabase;
        if (client) {
          const { data, error } = await client
            .from('productos')
            .select('*')
            .or('oculto_web.eq.false,oculto_web.is.null')
            .order('nombre', { ascending: true });

          if (!error && data) {
            this.cache = data;
          }
        }
      }
      return this.cache || [];
    } catch (err) {
      console.error('Error cargando productos públicos en la tienda:', err);
      this.cache = [];
      return [];
    }
  },

  /**
   * Obtiene productos aleatorios de la temporada activa o del catálogo general
   */
  getSeasonProducts(seasonName = '', count = 5) {
    if (!this.cache || this.cache.length === 0) return [];

    const seasonClean = (seasonName || '').trim().toUpperCase();
    let pool = [];

    if (seasonClean) {
      pool = this.cache.filter(p => (p.temporada || '').trim().toUpperCase() === seasonClean);
    }

    if (pool.length === 0) {
      pool = [...this.cache];
    }

    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },

  /**
   * Obtiene la lista de Mundos únicos
   */
  getUniqueWorlds() {
    if (!this.cache || this.cache.length === 0) return [];
    
    const worldsMap = new Map();
    this.cache.forEach(p => {
      if (p.mundo && p.mundo.trim() !== '') {
        const normalized = p.mundo.trim().toUpperCase();
        if (!worldsMap.has(normalized)) {
          worldsMap.set(normalized, p.mundo.trim());
        }
      }
    });

    return Array.from(worldsMap.values());
  },

  /**
   * Renderiza la cuadrícula de Mundos en el Home (index.html)
   */
  renderWorldsGrid(containerId = 'contenedor-mundos-home') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const uniqueWorlds = this.getUniqueWorlds();

    if (uniqueWorlds.length === 0) {
      container.innerHTML = '';
      return;
    }

    const icons = [
      'fa-solid fa-heart',
      'fa-solid fa-champagne-glasses',
      'fa-solid fa-briefcase',
      'fa-solid fa-wand-magic-sparkles',
      'fa-solid fa-gift',
      'fa-solid fa-star'
    ];

    container.innerHTML = uniqueWorlds.map((mundoName, index) => {
      const iconClass = icons[index % icons.length];
      const count = this.cache.filter(p => (p.mundo || '').trim().toUpperCase() === mundoName.toUpperCase()).length;

      return `
        <a href="catalogo.html?mundo=${encodeURIComponent(mundoName)}" class="group bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700/60 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
          <div>
            <div class="w-12 h-12 bg-pink-100 dark:bg-pink-950/50 text-pink-600 dark:text-pink-400 rounded-2xl flex items-center justify-center text-xl font-bold mb-4 group-hover:scale-110 transition-transform">
              <i class="${iconClass}"></i>
            </div>
            <h3 class="text-base font-black text-gray-900 dark:text-white mb-2 group-hover:text-brand-600 transition-colors">
              Mundo ${mundoName}
            </h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
              Explora nuestra colección exclusiva de ${count} producto(s) disponibles.
            </p>
          </div>
          <div class="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between text-xs font-bold text-brand-600 dark:text-brand-400">
            <span>Ver Mundo</span>
            <i class="fa-solid fa-arrow-right group-hover:translate-x-1 transition-transform"></i>
          </div>
        </a>
      `;
    }).join('');
  },

  /**
   * Renderiza pestañas de Mundos en el Catálogo (catalogo.html)
   */
  renderWorldTabs(containerId = 'worldTabsContainer', activeWorld = 'all') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const uniqueWorlds = this.getUniqueWorlds();

    let html = `
      <button id="tab-all" onclick="filterByWorld('all')" class="world-tab ${activeWorld === 'all' ? 'active text-brand-600 border-b-2 border-brand-600' : 'text-gray-600 dark:text-gray-300'} text-xs font-bold whitespace-nowrap pb-2 hover:text-brand-600">
        <i class="fa-solid fa-border-all mr-1.5"></i>Todos los Mundos
      </button>
    `;

    uniqueWorlds.forEach(mundo => {
      const isSelected = activeWorld.toUpperCase() === mundo.toUpperCase();
      html += `
        <button id="tab-${mundo.toLowerCase()}" onclick="filterByWorld('${mundo}')" class="world-tab ${isSelected ? 'active text-brand-600 border-b-2 border-brand-600' : 'text-gray-600 dark:text-gray-300'} text-xs font-bold whitespace-nowrap pb-2 hover:text-brand-600">
          <i class="fa-solid fa-folder mr-1.5"></i>Mundo ${mundo}
        </button>
      `;
    });

    container.innerHTML = html;
  },

  /**
   * Obtiene productos filtrados por Mundo
   */
  getByWorld(mundo) {
    if (!mundo || mundo === 'all' || mundo === 'todos') return this.cache;
    return this.cache.filter(p => (p.mundo || '').trim().toUpperCase() === mundo.trim().toUpperCase());
  },

  /**
   * Renderiza la tarjeta de producto con botón de detalle y botón de favorito
   */
  renderGrid(containerId, productsList) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!productsList || productsList.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700/60 p-6 shadow-sm">
          <i class="fa-solid fa-box-open text-4xl text-gray-300 dark:text-gray-600 mb-3"></i>
          <p class="text-gray-500 dark:text-gray-400 font-bold text-sm">No hay productos disponibles por el momento.</p>
        </div>
      `;
      return;
    }

    const favs = window.favoritesState || [];

    container.innerHTML = productsList.map(p => {
      const foto = p.image_url || p.imagen || 'images/logo.png';
      const precioDetal = typeof parseMonto === 'function' ? parseMonto(p.precio_detal || p.price) : Number(p.precio_detal || p.price || 0);
      const formattedPrice = typeof formatMoneda === 'function' ? formatMoneda(precioDetal) : precioDetal.toLocaleString('es-CO');

      const isFav = favs.some(f => f.id === p.id);
      const strObj = JSON.stringify(p).replace(/'/g, "&apos;");

      return `
        <div class="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-sm hover:shadow-md border border-gray-100 dark:border-gray-700/60 transition-all duration-300 flex flex-col justify-between group relative">
          
          <!-- Botón flotante de Favoritos en la tarjeta -->
          <button type="button" onclick='event.stopPropagation(); window.toggleFavoriteItem(${strObj});' class="absolute top-6 right-6 z-10 w-8 h-8 rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm flex items-center justify-center text-gray-400 hover:text-pink-600 shadow-sm transition-all">
            <i class="fa-solid fa-heart ${isFav ? 'text-pink-600' : ''}"></i>
          </button>

          <div onclick='StoreProducts.openDetailModal(${strObj})' class="cursor-pointer">
            <div class="relative overflow-hidden rounded-2xl bg-gray-50 dark:bg-gray-700/40 mb-3 aspect-square flex items-center justify-center p-2">
              <img src="${foto}" alt="${p.nombre}" class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300">
              
              <div class="absolute top-2 left-2 flex flex-col gap-1">
                ${p.temporada ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-pink-600 text-white shadow">${p.temporada}</span>` : ''}
                ${p.es_personalizable ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-indigo-600 text-white shadow"><i class="fa-solid fa-wand-magic-sparkles mr-0.5"></i> Personalizable</span>' : ''}
                ${p.permitir_alquiler ? '<span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-600 text-white shadow">Alquiler</span>' : ''}
              </div>
            </div>

            <span class="text-[10px] font-black uppercase tracking-wider text-brand-600 dark:text-brand-400">${p.mundo || 'General'}</span>
            <h3 class="font-bold text-gray-900 dark:text-white text-sm line-clamp-2 mt-0.5">${p.nombre}</h3>
          </div>

          <div class="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
            <div>
              <span class="text-xs text-gray-400 block font-medium">Precio Base</span>
              <span class="text-base font-black text-gray-900 dark:text-white">$${formattedPrice} COP</span>
            </div>

            <button type="button" onclick='StoreProducts.openDetailModal(${strObj})' class="bg-brand-600 hover:bg-brand-700 text-white p-2.5 rounded-2xl shadow-sm transition-all flex items-center justify-center gap-1.5 font-bold text-xs">
              <i class="fa-solid fa-bag-shopping text-xs"></i>
              <span>Ver Op.</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * Abre el modal interactivo de detalles de producto
   */
  openDetailModal(product) {
    if (typeof window.showProductDetail === 'function') {
      window.showProductDetail(product);
      return;
    }

    const modal = document.getElementById('modal-detalle-producto-tienda');
    if (!modal) return;

    window.selectedStoreProduct = product;
    modal.classList.remove('hidden');
  }
};