/* ==========================================
   CUPISSA STUDIO - CONFIGURACIÓN Y SUPABASE
   ========================================== */

// Configuración de Supabase
const SUPABASE_URL = "https://wuobahmvpvtuqvtkqnwg.supabase.co/rest/v1/"; // Reemplaza con tu URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1b2JhaG12cHZ0dXF2dGtxbndnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyMTE2OTksImV4cCI6MjEwNjc4NzY5OX0.syTrgZ7qgYJlZSD94Fm4-Zm_Zd6XfyOGqOaXUiW0A1c";                   // Reemplaza con tu Key

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