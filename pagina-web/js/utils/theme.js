/**
 * js/utils/theme.js
 * Gestión del Tema (Modo Claro / Modo Oscuro) y sincronización con LocalStorage
 */

/**
 * Inicializa el tema al cargar la aplicación
 */
window.initTheme = function() {
  const savedTheme = localStorage.getItem('cupissa_theme');
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  window.updateThemeIcon();
};

/**
 * Alterna entre Modo Oscuro y Modo Claro
 */
window.toggleTheme = function() {
  document.documentElement.classList.toggle('dark');
  const isDark = document.documentElement.classList.contains('dark');
  localStorage.setItem('cupissa_theme', isDark ? 'dark' : 'light');
  
  window.updateThemeIcon();
};

/**
 * Actualiza el ícono del botón de cambio de tema si está presente en el DOM
 */
window.updateThemeIcon = function() {
  const themeIcon = document.getElementById('themeIcon');
  if (!themeIcon) return;

  const isDark = document.documentElement.classList.contains('dark');
  if (isDark) {
    themeIcon.className = 'fa-solid fa-moon text-lg text-yellow-300';
  } else {
    themeIcon.className = 'fa-solid fa-sun text-lg text-amber-500';
  }
};

// Inicialización automática al cargar el documento
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.initTheme);
} else {
  window.initTheme();
}