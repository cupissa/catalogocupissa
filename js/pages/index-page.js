function renderHeroSlide(index) {
  const slideImg = document.getElementById('heroSlideImg');
  const slideCaption = document.getElementById('heroSlideCaption');

  if (!slideImg || !slideCaption || heroSlides.length === 0) return;

  if (index >= heroSlides.length) currentHeroSlide = 0;
  else if (index < 0) currentHeroSlide = heroSlides.length - 1;
  else currentHeroSlide = index;

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

function initSmartSearch() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim() !== '') {
      window.location.href = `catalogo.html?search=${encodeURIComponent(searchInput.value.trim())}`;
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  initTheme();
  loadCartFromStorage();
  loadFavoritesFromStorage();
  generateMathCaptcha();
  checkUserSession();
  await loadSeasonalProducts('seasonProductGrid');
  initSmartSearch();

  setInterval(() => {
    nextHeroSlide();
  }, 6000);
}); 