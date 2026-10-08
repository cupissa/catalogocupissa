let products = [];
let cart = [];
let favorites = [];
let currentWorld = 'all';
let currentProductMode = 'sale';
let selectedProduct = null;
let currentHeroSlide = 0;
let mathCaptchaAnswer = 0;

const heroSlides = [
  {
    image: 'images/hero-banner.jpg',
    caption: 'Variedad y calidad en cada detalle para tus fechas especiales.'
  },
  {
    image: 'images/hero-banner-2.jpg',
    caption: 'Mobiliario exclusivo y decoración personalizada para eventos.'
  },
  {
    image: 'images/hero-banner-3.jpg',
    caption: 'Soluciones integrales, fabricación a medida y crédito directo.'
  }
];