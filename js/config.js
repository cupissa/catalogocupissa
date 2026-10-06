/* ==========================================
   CUPISSA STUDIO - CONFIGURACIÓN Y SUPABASE
   ========================================== */

// Configuración de Supabase
const SUPABASE_URL = "https://TU_SUPABASE_PROJECT_URL.supabase.co"; // Reemplaza con tu URL
const SUPABASE_ANON_KEY = "TU_SUPABASE_ANON_KEY";                   // Reemplaza con tu Key

// Inicialización del cliente Supabase
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables Globales
let currentProducts = [];
let currentCart = [];
let selectedProduct = null;
let currentMode = "sale"; // 'sale' o 'rental'
let currentUser = null;

// Inicialización de iconos Lucide al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide) {
    lucide.createIcons();
  }
});