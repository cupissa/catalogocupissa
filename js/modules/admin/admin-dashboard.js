/**
 * js/modules/admin/admin-dashboard.js
 * Indicadores del Dashboard y Gráfica Interactiva Mensual / Diaria
 */

window.chartFlujoDiario = null;
window.chartSelectedMonth = null;
window.dashboardMovimientosCache = [];

// Helper interno para parsing de montos seguro
function parseMontoSeguro(val) {
  if (typeof window.parseMonto === 'function') {
    return window.parseMonto(val);
  }
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

// Helper interno para formateo de moneda seguro
function formatMonedaSeguro(val) {
  if (typeof window.formatMoneda === 'function') {
    return window.formatMoneda(val);
  }
  return Number(val || 0).toLocaleString('es-CO');
}

window.cargarDashboardAdmin = async function() {
  try {
    let pedidos = [];
    let movimientos = [];
    let deudas = [];

    if (typeof SupabaseSync !== 'undefined') {
      [pedidos, movimientos, deudas] = await Promise.all([
        SupabaseSync.getPedidos ? SupabaseSync.getPedidos() : [],
        SupabaseSync.getFlujoCaja ? SupabaseSync.getFlujoCaja() : [],
        SupabaseSync.getDeudas ? SupabaseSync.getDeudas() : []
      ]);
    } else {
      const client = window.supabaseClient || window.supabase;
      if (client) {
        const [resPed, resMov, resDeu] = await Promise.all([
          client.from('orders').select('*'),
          client.from('flujo_caja').select('*'),
          client.from('deudas').select('*')
        ]);
        pedidos = resPed.data || [];
        movimientos = resMov.data || [];
        deudas = resDeu.data || [];
      }
    }

    window.dashboardMovimientosCache = movimientos || [];

    window.actualizarMetricasDashboard(pedidos, movimientos);
    window.verificarAlertasDeudas(deudas);
    window.renderizarGraficoFlujoDiario(window.dashboardMovimientosCache);
    window.renderizarTablaAlertasDashboard(pedidos);
  } catch (err) {
    console.warn("Carga de métricas finalizada con advertencias:", err);
  }
};

window.actualizarMetricasDashboard = function(pedidos = [], movimientos = []) {
  const ahora = new Date();
  const mesActual = ahora.getMonth();
  const anioActual = ahora.getFullYear();

  // 1. Ventas del Mes (Período actual)
  const ventasMes = (pedidos || []).reduce((acc, p) => {
    const fStr = p.created_at || p.fecha_entrega || p.fecha_agendamiento;
    const f = fStr ? new Date(fStr) : new Date();
    const est = (p.estado || p.status || '').toLowerCase();

    if (f.getMonth() === mesActual && f.getFullYear() === anioActual && est !== 'cancelado' && est !== 'cancelled') {
      return acc + parseMontoSeguro(p.total !== undefined ? p.total : (p.monto || p.valor || 0));
    }
    return acc;
  }, 0);

  // 2. Cuentas por cobrar
  const porCobrar = (pedidos || []).reduce((acc, p) => {
    const est = (p.estado || p.status || '').toLowerCase();
    if (est !== 'cancelado' && est !== 'cancelled') {
      const tot = parseMontoSeguro(p.total !== undefined ? p.total : (p.monto || p.valor || 0));
      const pag = parseMontoSeguro(p.pagado !== undefined ? p.pagado : (p.anticipo !== undefined ? p.anticipo : p.monto_pagado || 0));
      const saldo = p.saldo !== undefined ? parseMontoSeguro(p.saldo) : Math.max(0, tot - pag);
      return acc + saldo;
    }
    return acc;
  }, 0);

  // 3. Saldo Efectivo y Nequi / Bancos desde 'flujo_caja'
  let saldoEfectivo = 0;
  let saldoBancos = 0;

  (movimientos || []).forEach(m => {
    const val = parseMontoSeguro(m.valor !== undefined ? m.valor : m.monto || 0);
    const tax = parseMontoSeguro(m.impuesto_4x1000 || 0);
    const esIngreso = (m.tipo || '').toUpperCase() === 'INGRESO';
    const metodo = (m.metodo_pago || m.metodo || '').toLowerCase().trim();

    if (metodo === 'efectivo') {
      saldoEfectivo += esIngreso ? val : -val;
    } else if (metodo !== '') {
      if (esIngreso) {
        saldoBancos += val;
      } else {
        saldoBancos -= (val + tax);
      }
    }
  });

  const elVentas = document.getElementById('stat-ventas-mes');
  const elCobrar = document.getElementById('stat-por-cobrar');
  const elEfectivo = document.getElementById('stat-saldo-efectivo');
  const elBancos = document.getElementById('stat-saldo-bancos');

  if (elVentas) elVentas.textContent = `$${formatMonedaSeguro(ventasMes)}`;
  if (elCobrar) elCobrar.textContent = `$${formatMonedaSeguro(porCobrar)}`;
  if (elEfectivo) elEfectivo.textContent = `$${formatMonedaSeguro(saldoEfectivo)}`;
  if (elBancos) elBancos.textContent = `$${formatMonedaSeguro(saldoBancos)}`;
};

window.verificarAlertasDeudas = function(deudas = []) {
  const banner = document.getElementById('banner-deudas-proximas');
  const contenedorTexto = document.getElementById('texto-alerta-deudas');
  if (!banner || !contenedorTexto) return;

  if (!deudas || deudas.length === 0) {
    banner.classList.add('hidden');
    return;
  }

  const diaActual = new Date().getDate();
  const deudasCercanas = deudas.filter(d => {
    const diaPago = parseInt(d.dia_pago, 10);
    return Math.abs(diaPago - diaActual) <= 3 || diaActual > diaPago;
  });

  if (deudasCercanas.length > 0) {
    banner.classList.remove('hidden');
    contenedorTexto.innerHTML = deudasCercanas.map(d => `
      <div class="font-bold text-xs">
        📌 <strong>${d.concepto}</strong>: $${formatMonedaSeguro(d.monto)} - Pago reprogramado los días ${d.dia_pago} de cada mes.
      </div>
    `).join('');
  } else {
    banner.classList.add('hidden');
  }
};

/**
 * Gráfica Interactiva: Muestra resumen mensual desde Septiembre 2026.
 * Al hacer clic en un mes, expande a la vista de días de dicho mes.
 */
window.renderizarGraficoFlujoDiario = function(movimientos = []) {
  const canvas = document.getElementById('chart-flujo-diario');
  if (!canvas || typeof Chart === 'undefined') return;

  const movsValidos = (movimientos || []).filter(m => {
    const fStr = m.fecha ? m.fecha.split('T')[0] : '';
    return fStr >= '2026-09-01';
  });

  const btnReset = document.getElementById('btn-reset-chart-view');
  const lblTitle = document.getElementById('lbl-chart-title');

  let labels = [];
  let dataIngresos = [];
  let dataEgresos = [];
  let keysIndex = [];

  if (window.chartSelectedMonth === null) {
    // VISTA MENSUAL
    if (lblTitle) lblTitle.textContent = "📊 Ingresos vs Egresos (Movimiento Mensual desde Sept. 2026)";
    if (btnReset) btnReset.classList.add('hidden');

    const mapaMeses = {};
    movsValidos.forEach(m => {
      const fStr = m.fecha ? m.fecha.split('T')[0] : '2026-09-01';
      const keyMes = fStr.substring(0, 7);

      if (!mapaMeses[keyMes]) {
        mapaMeses[keyMes] = { ingresos: 0, egresos: 0 };
      }

      const val = parseMontoSeguro(m.valor !== undefined ? m.valor : m.monto || 0);
      if ((m.tipo || '').toUpperCase() === 'INGRESO') {
        mapaMeses[keyMes].ingresos += val;
      } else {
        mapaMeses[keyMes].egresos += val;
      }
    });

    keysIndex = Object.keys(mapaMeses).sort();
    labels = keysIndex.map(k => {
      const [y, m] = k.split('-');
      const dateObj = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return dateObj.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase();
    });

    dataIngresos = keysIndex.map(k => mapaMeses[k].ingresos);
    dataEgresos = keysIndex.map(k => mapaMeses[k].egresos);
  } else {
    // VISTA DIARIA
    const [ySel, mSel] = window.chartSelectedMonth.split('-');
    const dateSel = new Date(parseInt(ySel, 10), parseInt(mSel, 10) - 1, 1);
    const nomMes = dateSel.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }).toUpperCase();

    if (lblTitle) lblTitle.textContent = `📊 Movimientos Diarios - ${nomMes}`;
    if (btnReset) btnReset.classList.remove('hidden');

    const mapaDias = {};
    movsValidos.forEach(m => {
      const fStr = m.fecha ? m.fecha.split('T')[0] : '';
      if (fStr.startsWith(window.chartSelectedMonth)) {
        if (!mapaDias[fStr]) {
          mapaDias[fStr] = { ingresos: 0, egresos: 0 };
        }
        const val = parseMontoSeguro(m.valor !== undefined ? m.valor : m.monto || 0);
        if ((m.tipo || '').toUpperCase() === 'INGRESO') {
          mapaDias[fStr].ingresos += val;
        } else {
          mapaDias[fStr].egresos += val;
        }
      }
    });

    keysIndex = Object.keys(mapaDias).sort();
    labels = keysIndex;
    dataIngresos = keysIndex.map(k => mapaDias[k].ingresos);
    dataEgresos = keysIndex.map(k => mapaDias[k].egresos);
  }

  if (window.chartFlujoDiario) {
    window.chartFlujoDiario.destroy();
  }

  window.chartFlujoDiario = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels.length > 0 ? labels : ['Sin Datos'],
      datasets: [
        {
          label: 'Ingresos ($)',
          data: dataIngresos.length > 0 ? dataIngresos : [0],
          backgroundColor: '#059669',
          borderRadius: 6
        },
        {
          label: 'Egresos ($)',
          data: dataEgresos.length > 0 ? dataEgresos : [0],
          backgroundColor: '#dc2626',
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(ctx) {
              return `${ctx.dataset.label}: $${formatMonedaSeguro(ctx.raw)}`;
            }
          }
        }
      },
      onClick: (evt, elements) => {
        if (elements.length > 0 && window.chartSelectedMonth === null) {
          const index = elements[0].index;
          if (keysIndex[index]) {
            window.chartSelectedMonth = keysIndex[index];
            window.renderizarGraficoFlujoDiario(window.dashboardMovimientosCache);
          }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
};

window.resetearVistaGrafica = function() {
  window.chartSelectedMonth = null;
  window.renderizarGraficoFlujoDiario(window.dashboardMovimientosCache);
};

window.renderizarTablaAlertasDashboard = function(pedidos = []) {
  const tbody = document.getElementById('tabla-alertas-dashboard');
  if (!tbody) return;

  const pendientes = (pedidos || []).filter(p => {
    const est = p.estado || p.status || '';
    return est === 'Pendiente' || est === 'Fabricando' || est === 'pending_advance_payment';
  });

  if (pendientes.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="p-4 text-center text-slate-400 font-bold">
          No hay pedidos pendientes urgentes en el sistema.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pendientes.map(p => {
    const tot = parseMontoSeguro(p.total !== undefined ? p.total : (p.monto || p.valor || 0));
    const pag = parseMontoSeguro(p.pagado !== undefined ? p.pagado : (p.anticipo !== undefined ? p.anticipo : p.monto_pagado || 0));
    const saldo = p.saldo !== undefined ? parseMontoSeguro(p.saldo) : Math.max(0, tot - pag);
    const estadoNombre = p.estado || p.status || 'Pendiente';

    return `
      <tr class="border-b hover:bg-slate-50 transition-colors text-xs">
        <td class="p-3 font-extrabold text-indigo-900">${p.referencia_pedido || 'REF-' + (p.id ? String(p.id).slice(0, 4) : '00')}</td>
        <td class="p-3">
          <div class="font-bold text-slate-800">${p.cliente_nombre_completo || p.customer_name || p.cliente_nombre || 'Cliente'}</div>
          <div class="text-[10px] text-slate-400">${p.cliente_telefono_completo || p.customer_phone || p.cliente_telefono || ''}</div>
        </td>
        <td class="p-3 font-semibold text-slate-600">${p.fecha_entrega || p.delivery_date || 'Por definir'}</td>
        <td class="p-3 font-black text-amber-600">$${formatMonedaSeguro(saldo)}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
            ⚠️ ${estadoNombre}
          </span>
        </td>
        <td class="p-3 text-right">
          <button onclick="switchTab('pedidos')" class="px-3 py-1 bg-indigo-600 text-white rounded-xl font-bold text-xs shadow hover:bg-indigo-700 transition">
            Ver CRM
          </button>
        </td>
      </tr>
    `;
  }).join('');
};