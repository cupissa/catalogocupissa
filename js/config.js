const SUPABASE_URL = "https://njwiobfjtmwsxyigxgrp.supabase.co"; // Reemplaza con tu URL
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qd2lvYmZqdG13c3h5aWd4Z3JwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4OTkxNjYsImV4cCI6MjEwNjQ3NTE2Nn0.YISPVeUpk-gAImCRkr1TmFfP6fX6Mps7HPJ3MXfVkYI";                   // Reemplaza con tu Key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Variables Globales Compartidas
let products = [];
let cart = [];
let favorites = [];
let currentWorld = 'all';
let currentProductMode = 'sale';
let selectedProduct = null;

// Tema Oscuro / Claro
function initTheme() {
  const savedTheme = localStorage.getItem('cupissa_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
    updateThemeIcon(true);
  } else {
    document.documentElement.classList.remove('dark');
    updateThemeIcon(false);
  }
}

window.toggleTheme = function() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('cupissa_theme', isDark ? 'dark' : 'light');
  updateThemeIcon(isDark);
};

function updateThemeIcon(isDark) {
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = isDark ? "fa-solid fa-moon text-lg text-yellow-400" : "fa-solid fa-sun text-lg text-amber-500";
}