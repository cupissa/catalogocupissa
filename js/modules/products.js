async function fetchCatalogProducts() {
  try {
    const { data, error } = await supabaseClient.from('products').select('*');
    if (error) throw error;
    products = data || [];
    return products;
  } catch (err) {
    console.error('Error al cargar productos:', err);
    return [];
  }
}

async function loadSeasonalProducts(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const activeSeason = 'navidad';
    let { data: seasonalProducts, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('temporada', activeSeason)
      .limit(5);

    if (error) throw error;

    if (!seasonalProducts || seasonalProducts.length === 0) {
      let fallback = await supabaseClient.from('products').select('*').limit(5);
      seasonalProducts = fallback.data || [];
    }

    if (seasonalProducts.length === 0) {
      container.innerHTML = `<div class="col-span-full text-center py-6 text-gray-400 text-xs">No hay productos destacados.</div>`;
      return;
    }

    container.innerHTML = seasonalProducts.map(prod => `
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
        <div>
          <div class="relative w-full h-36 rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700">
            <img src="${prod.imagen || 'images/hero-banner.jpg'}" alt="${prod.nombre}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            ${prod.temporada ? `<span class="absolute top-2 left-2 bg-brand-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">${prod.temporada}</span>` : ''}
          </div>
          <h4 class="text-xs font-bold text-gray-800 dark:text-gray-100 line-clamp-1 mb-1">${prod.nombre || prod.title}</h4>
          <p class="text-[11px] font-black text-brand-600 dark:text-brand-400 mb-2">
            $${Number(prod.precio || prod.sale_price || 0).toLocaleString('es-CO')} COP
          </p>
        </div>
        <a href="catalogo.html?id=${prod.id}" class="w-full bg-gray-100 dark:bg-gray-700 hover:bg-brand-600 hover:text-white text-gray-700 dark:text-gray-200 font-bold text-[11px] py-1.5 rounded-lg text-center transition-colors block">
          Ver Detalle
        </a>
      </div>
    `).join('');

  } catch (err) {
    container.innerHTML = `<div class="col-span-full text-center py-6 text-red-400 text-xs">No se pudieron cargar los productos de la temporada.</div>`;
  }
}

function renderProductGrid(itemsList) {
  const grid = document.getElementById('productGrid');
  if (!grid) return;

  if (itemsList.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-400 text-xs">No se encontraron productos.</div>`;
    return;
  }

  grid.innerHTML = itemsList.map(prod => {
    const isFav = favorites.some(fav => String(fav.id) === String(prod.id));
    return `
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
        <div>
          <div class="relative w-full h-40 rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700">
            <img src="${prod.imagen || prod.image_url || 'images/hero-banner.jpg'}" alt="${prod.nombre || prod.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            ${prod.mundo ? `<span class="absolute top-2 left-2 bg-brand-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">${prod.mundo}</span>` : ''}
            <button type="button" onclick="toggleFavorite('${prod.id}', event)" class="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full shadow-sm hover:bg-white dark:hover:bg-gray-800 transition-all">
              <i class="fa-solid fa-heart ${isFav ? 'text-brand-600' : 'text-gray-400 hover:text-brand-600'} text-xs"></i>
            </button>
          </div>
          <h3 class="text-xs font-bold text-gray-800 dark:text-gray-100 line-clamp-1 mb-1">${prod.nombre || prod.title}</h3>
          <p class="text-[11px] font-black text-brand-600 dark:text-brand-400 mb-2">
            $${Number(prod.precio || prod.sale_price || 0).toLocaleString('es-CO')} COP
          </p>
        </div>
        <button type="button" onclick="openProductDetailById('${prod.id}')" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs py-2 rounded-xl text-center transition-colors">
          Ver Detalle
        </button>
      </div>
    `;
  }).join('');
}