/**
 * js/utils/ui.js
 * Formato Monetario Colombiano (COP), Parseo Numérico Seguro y Notificaciones Flotantes
 */

/**
 * Parsea un monto numérico proveniente de Supabase (number) o string de input
 */
window.parseMonto = function(val) {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;

  let str = String(val).trim().replace(/[$ ]/g, '');
  if (!str) return 0;

  // Manejo de punto y coma (ej: "1.234.567,89" o "256.000")
  if (str.includes('.') && str.includes(',')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    const parts = str.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes('.')) {
    const parts = str.split('.');
    if (parts.length > 2) {
      str = str.replace(/\./g, '');
    } else if (parts.length === 2) {
      if (parts[1].length === 3) {
        str = str.replace('.', '');
      }
    }
  }

  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

/**
 * Formatea valores al estándar de moneda en Colombia (ej: 256000 -> "256.000")
 */
window.formatMoneda = function(val, mostrarDecimales = false) {
  const num = window.parseMonto(val);
  const fractionDigits = mostrarDecimales ? 2 : 0;

  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(num);
};

/**
 * Notificaciones flotantes tipo Toast en pantalla con soporte para Modo Oscuro
 */
window.showToast = function(mensaje, tipo = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed bottom-5 right-5 z-50 space-y-2 pointer-events-none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  
  let bgClasses = 'bg-gray-900 dark:bg-gray-800 text-white border-l-4 border-brand-500';
  let iconClass = 'fa-circle-check text-emerald-400';

  if (tipo === 'error') {
    bgClasses = 'bg-rose-900 text-white border-l-4 border-rose-500';
    iconClass = 'fa-triangle-exclamation text-rose-300';
  } else if (tipo === 'warning') {
    bgClasses = 'bg-amber-900 text-white border-l-4 border-amber-500';
    iconClass = 'fa-circle-exclamation text-amber-300';
  }

  toast.className = `${bgClasses} px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold flex items-center gap-2.5 transition-all transform translate-y-3 opacity-0 pointer-events-auto`;
  
  toast.innerHTML = `
    <i class="fa-solid ${iconClass} text-sm shrink-0"></i>
    <span class="leading-tight">${mensaje}</span>
  `;

  container.appendChild(toast);

  // Animación de entrada
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
  });

  // Salida automática tras 3.5 segundos
  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-3');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
};