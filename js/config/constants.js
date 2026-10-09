/**
 * js/config/constants.js
 * Credenciales Globales y Variables de Configuración del Proyecto CUPISSA PROYECTS
 */

// Credenciales oficiales de Supabase (Importante: La URL NO debe llevar '/rest/v1/' al final)
window.SUPABASE_URL = 'https://njwiobfjtmwsxyigxgrp.supabase.co';
window.SUPABASE_ANON_KEY = 'sb_publishable_z9FRc9Z312kNfGbR_seecQ_9Sq2rUPj'; // Verifica en Supabase Settings -> API que sea tu anon public key

// Estado global de la tienda (evita redefiniciones)
if (typeof window.products === 'undefined') window.products = [];
if (typeof window.cart === 'undefined') window.cart = [];
if (typeof window.favorites === 'undefined') window.favorites = [];
if (typeof window.currentWorld === 'undefined') window.currentWorld = 'all';
if (typeof window.currentProductMode === 'undefined') window.currentProductMode = 'sale';
if (typeof window.selectedProduct === 'undefined') window.selectedProduct = null;
if (typeof window.currentHeroSlide === 'undefined') window.currentHeroSlide = 0;
if (typeof window.mathCaptchaAnswer === 'undefined') window.mathCaptchaAnswer = 0;

window.heroSlides = [
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