/* ==========================================
   CUPISSA STUDIO - CONFIGURACIÓN Y SUPABASE
   ========================================== */

// Configuración de Supabase
const SUPABASE_URL = "https://njwiobfjtmwsxyigxgrp.supabase.co"; // Reemplaza con tu URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qd2lvYmZqdG13c3h5aWd4Z3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4OTkxNjYsImV4cCI6MjEwNjQ3NTE2Nn0.YISPVeUpk-gAImCRkr1TmFfP6fX6Mps7HPJ3MXfVkYI";                   // Reemplaza con tu Key

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