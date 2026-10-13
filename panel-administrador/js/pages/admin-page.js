/**
 * js/pages/admin-page.js
 * Controlador Principal del Panel Administrativo (admin.html), Pestañas, Flujo de Caja, Deudas, 4x1000 y Ajustes Web
 */

const initializePage = async () => {
  // Sincronización y recálculo automático retroactivo de saldos en segundo plano al cargar el panel
  try {
    if (typeof window.recalculateAllPastOrdersAndBalances === 'function') {
      console.log("Ejecutando sincronización automática de saldos y cuentas por cobrar...");
      await window.recalculateAllPastOrdersAndBalances();
    }
  } catch (syncErr) {
    console.warn("Aviso en sincronización automática:", syncErr);
  }

  window.switchTab('dashboard');

  window.initFormularioCajaManual();
  window.initFormularioDeudasMensuales();
  window.cargarConfiguracionTemporada();
};

window.switchTab = function(tabName) {
  const tabs = ['dashboard', 'pedidos', 'inventario', 'contabilidad', 'reportes', 'gestionar-web'];
  tabs.forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`btn-tab-${t}`);

    if (section) section.classList.add('hidden');
    if (btn) {
      btn.classList.remove('bg-indigo-800', 'bg-indigo-600', 'shadow');
      btn.classList.add('hover:bg-indigo-800');
    }
  });

  const targetSection = document.getElementById(`tab-${tabName}`);
  const targetBtn = document.getElementById(`btn-tab-${tabName}`);

  if (targetSection) targetSection.classList.remove('hidden');
  if (targetBtn) {
    targetBtn.classList.add('bg-indigo-800', 'shadow');
  }

  if (tabName === 'dashboard') {
    if (typeof cargarDashboardAdmin === 'function') cargarDashboardAdmin();
  } else if (tabName === 'pedidos') {
    if (typeof cargarPedidosAdmin === 'function') cargarPedidosAdmin();
    if (typeof cargarClientesCRMSelector === 'function') cargarClientesCRMSelector();
  } else if (tabName === 'inventario') {
    if (typeof cargarInventarioAdmin === 'function') cargarInventarioAdmin();
  } else if (tabName === 'contabilidad') {
    window.cargarContabilidad();
  } else if (tabName === 'gestionar-web') {
    if (typeof cargarClientesWeb === 'function') cargarClientesWeb();
    if (typeof cargarProductosWeb === 'function') cargarProductosWeb();
    window.cargarConfiguracionTemporada();
  }
};

window.switchSubTabWeb = function(subtab) {
  const names = ['clientes', 'productos', 'creditos', 'pedidos'];
  names.forEach(name => {
    const section = document.getElementById(`subtab-web-${name}`);
    const button = document.getElementById(`btn-subtab-web-${name}`);
    if (section) section.classList.toggle('hidden', name !== subtab);
    if (button) button.className = name === subtab
      ? 'px-4 py-2 bg-pink-600 text-white font-extrabold rounded-xl text-xs shadow transition'
      : 'px-4 py-2 bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition';
  });
  if (subtab === 'clientes' && typeof cargarClientesWeb === 'function') cargarClientesWeb();
  if (subtab === 'productos') {
    if (typeof cargarProductosWeb === 'function') cargarProductosWeb();
    window.cargarConfiguracionTemporada();
  }
  if ((subtab === 'creditos' || subtab === 'pedidos') && typeof window.initModulosPilotoWeb === 'function') {
    window.initModulosPilotoWeb();
    window.renderModuloPilotoWeb(subtab);
  }
};


