// Variable global para almacenar el tema y las diapositivas del Hero
let currentHeroSlide = 0;

// ==========================================
// CONFIGURA AQUÍ TUS IMÁGENES Y LEYENDAS
// ==========================================
const heroSlides = [
  {
    image: 'hero-banner.jpg', // Reemplaza con la ruta de tu primera imagen (ej: 'images/banner1.jpg')
    caption: 'Variedad y calidad en cada detalle para tus fechas especiales.'
  },
  {
    image: 'hero-banner-2.jpg', // Reemplaza con la ruta de tu segunda imagen (ej: 'images/banner2.jpg')
    caption: 'Mobiliario exclusivo y decoración personalizada para eventos.'
  },
  {
    image: 'hero-banner-3.jpg', // Puedes agregar más diapositivas duplicando esta estructura
    caption: 'Soluciones integrales, fabricación a medida y crédito directo.'
  }
];

// 1. Inicialización de Tema Claro/Oscuro
function initTheme() {
  const savedTheme = localStorage.getItem('theme');
  const themeIcon = document.getElementById('themeIcon');

  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
    if (themeIcon) {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    }
  } else {
    document.documentElement.classList.remove('dark');
    if (themeIcon) {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    }
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  
  const themeIcon = document.getElementById('themeIcon');
  if (themeIcon) {
    if (isDark) {
      themeIcon.classList.remove('fa-sun');
      themeIcon.classList.add('fa-moon');
    } else {
      themeIcon.classList.remove('fa-moon');
      themeIcon.classList.add('fa-sun');
    }
  }
}

// 2. Control del Hero Interactivo (Slider con Transición)
function renderHeroSlide(index) {
  const slideImg = document.getElementById('heroSlideImg');
  const slideCaption = document.getElementById('heroSlideCaption');

  if (!slideImg || !slideCaption || heroSlides.length === 0) return;

  if (index >= heroSlides.length) currentHeroSlide = 0;
  else if (index < 0) currentHeroSlide = heroSlides.length - 1;
  else currentHeroSlide = index;

  // Transición suave al cambiar la imagen
  slideImg.style.opacity = '0.2';
  setTimeout(() => {
    slideImg.src = heroSlides[currentHeroSlide].image;
    slideCaption.textContent = heroSlides[currentHeroSlide].caption;
    slideImg.style.opacity = '1';
  }, 200);
}

function nextHeroSlide() {
  renderHeroSlide(currentHeroSlide + 1);
}

function prevHeroSlide() {
  renderHeroSlide(currentHeroSlide - 1);
}

// 3. Carga de Productos Destacados de la Temporada desde Supabase
async function loadSeasonalProducts() {
  const container = document.getElementById('seasonProductGrid');
  const seasonTitle = document.getElementById('seasonTitle');
  if (!container) return;

  try {
    const activeSeason = 'navidad'; 

    if (seasonTitle) {
      seasonTitle.textContent = `Especial de Temporada - ${activeSeason.toUpperCase()}`;
    }

    let { data: products, error } = await supabaseClient
      .from('products')
      .select('*')
      .eq('temporada', activeSeason)
      .limit(5);

    if (error) throw error;

    if (!products || products.length === 0) {
      let fallback = await supabaseClient
        .from('products')
        .select('*')
        .limit(5);
      products = fallback.data || [];
    }

    if (products.length === 0) {
      container.innerHTML = `
        <div class="col-span-full text-center py-6 text-gray-400 text-xs">
          No hay productos destacados disponibles en este momento.
        </div>`;
      return;
    }

    container.innerHTML = products.map(prod => `
      <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 p-3 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
        <div>
          <div class="relative w-full h-36 rounded-xl overflow-hidden mb-3 bg-gray-100 dark:bg-gray-700">
            <img src="${prod.imagen || 'hero-banner.png'}" alt="${prod.nombre}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
            ${prod.temporada ? `<span class="absolute top-2 left-2 bg-brand-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase">${prod.temporada}</span>` : ''}
          </div>
          <h4 class="text-xs font-bold text-gray-800 dark:text-gray-100 line-clamp-1 mb-1">${prod.nombre}</h4>
          <p class="text-[11px] font-black text-brand-600 dark:text-brand-400 mb-2">
            $${Number(prod.precio || 0).toLocaleString('es-CO')} COP
          </p>
        </div>
        <a href="catalogo.html?id=${prod.id}" class="w-full bg-gray-100 dark:bg-gray-700 hover:bg-brand-600 hover:text-white text-gray-700 dark:text-gray-200 font-bold text-[11px] py-1.5 rounded-lg text-center transition-colors block">
          Ver Detalle
        </a>
      </div>
    `).join('');

  } catch (err) {
    console.error('Error al cargar productos de temporada:', err);
    container.innerHTML = `
      <div class="col-span-full text-center py-6 text-red-400 text-xs">
        No se pudieron cargar los productos de la temporada.
      </div>`;
  }
}

// 4. Búsqueda directa desde el Navbar
function initSmartSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim() !== '') {
      window.location.href = `catalogo.html?search=${encodeURIComponent(searchInput.value.trim())}`;
    }
  });
}

// Inicialización general al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  loadSeasonalProducts();
  initSmartSearch();

  // Rotación automática del Hero cada 6 segundos
  setInterval(() => {
    nextHeroSlide();
  }, 6000);
});