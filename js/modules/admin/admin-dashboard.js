/**
 * js/modules/admin/admin-dashboard.js
 * Módulo de Dashboard, Indicadores, Alertas y Gráficos del Panel Administrativo
 */

window.chartDiarioInstance = null;

/**
 * Verifica deudas vencidas y próximas a vencer para mostrar alerta visual y configurar envío por correo
 */
window.verificarAvisosDeudas = function() {
  const hoy = new Date();
  const diaActual = hoy.getDate();
  const banner = document.getElementById('banner-deudas-proximas');
  const texto = document.getElementById('texto-alerta-deudas');
  const btnCorreo = document.getElementById('btn-enviar-correo-deudas');

  if (!banner || !texto) return;

  let deudasVencidas = [];
  let deudasProximas = [];

  const deudas = window.deudasMensualesCache || [];

  deudas.forEach(d => {
    let diaPago = Number(d.dia_pago);
    if (diaActual > diaPago) {
      deudasVencidas.push(d);
    } else if ((diaPago - diaActual) <= 5) {
      deudasProximas.push(d);
    }
  });

  if (deudasVencidas.length > 0 || deudasProximas.length > 0) {
    let listaStr = "";
    let correoCuerpo = "RESUMEN DE DEUDAS VENCIDAS Y PRÓXIMAS A VENCERSE:\n\n";

    if (deudasVencidas.length > 0) {
      listaStr += `<p class="text-red-700 font-bold mt-1">🚨 VENCIDAS:</p>`;
      correoCuerpo += "--- 🚨 VENCIDAS ---\n";
      deudasVencidas.forEach(d => {
        let txt = `• ${d.concepto} ($${formatMoneda(parseMonto(d.monto))}) - Día ${d.dia_pago}`;
        listaStr += `<span class="text-red-600 font-semibold block pl-2">${txt}</span>`;
        correoCuerpo += `${txt}\n`;
      });
    }

    if (deudasProximas.length > 0) {
      listaStr += `<p class="text-amber-700 font-bold mt-2">⚠️ PRÓXIMAS (en 5 días o menos):</p>`;
      correoCuerpo += "\n--- ⚠️ PRÓXIMAS A VENCER ---\n";
      deudasProximas.forEach(d => {
        let txt = `• ${d.concepto} ($${formatMoneda(parseMonto(d.monto))}) - Día ${d.dia_pago}`;
        listaStr += `<span class="text-amber-700 font-semibold block pl-2">${txt}</span>`;
        correoCuerpo += `${txt}\n`;
      });
    }

    texto.innerHTML = listaStr;
    banner.classList.remove('hidden');

    let email = "DAVIDDEINER956@GMAIL.COM";
    let subject = encodeURIComponent("🚨 Resumen de Deudas Vencidas y Próximas - Cupissa");
    let body = encodeURIComponent(correoCuerpo);
    if (btnCorreo) btnCorreo.href = `mailto:${email}?subject=${subject}&body=${body}`;

    if (deudasVencidas.length > 0) {
      banner.classList.remove('bg-amber-50', 'border-amber-500');
      banner.classList.add('bg-red-50', 'border-red-500');
    } else {
      banner.classList.remove('bg-red-50', 'border-red-500');
      banner.classList.add('bg-amber-50', 'border-amber-500');
    }
  } else {
    banner.classList.add('hidden');
  }
};

/**
 * Renderiza el gráfico de barras de Ingresos vs Egresos diarios
 */
window.renderizarGraficoDiario = function() {
  const ctx = document.getElementById('chart-flujo-diario');
  if (!ctx || typeof Chart === 'undefined') return;

  const agrupado = {};
  const flujoCaja = window.flujoCajaCache || [];

  flujoCaja.forEach(mov => {
    let fecha = mov.fecha || 'Sin fecha';
    if (!agrupado[fecha]) agrupado[fecha] = { ingresos: 0, egresos: 0 };
    if (mov.tipo === 'INGRESO') agrupado[fecha].ingresos += parseMonto(mov.valor || 0);
    if (mov.tipo === 'EGRESO') agrupado[fecha].egresos += parseMonto(mov.valor || 0);
  });

  const labels = Object.keys(agrupado).sort();
  const dataIngresos = labels.map(l => agrupado[l].ingresos);
  const dataEgresos = labels.map(l => agrupado[l].egresos);

  if (window.chartDiarioInstance) window.chartDiarioInstance.destroy();

  window.chartDiarioInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        { label: 'Ingresos Diarios ($)', data: dataIngresos, backgroundColor: '#059669', borderRadius: 4 },
        { label: 'Egresos Diarios ($)', data: dataEgresos, backgroundColor: '#dc2626', borderRadius: 4 }
      ]
    },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true } } }
  });
};

/**
 * Buscador Global Integrado 360° (Clientes y Productos)
 */
window.ejecutarBuscadorGlobal360 = function() {
  const queryInput = document.getElementById('input-buscador-global-360');
  const box = document.getElementById('resultado-buscador-global-box');
  if (!queryInput || !box) return;

  const query = queryInput.value.toLowerCase().trim();
  if (!query) { box.classList.add('hidden'); return; }

  let html = '';
  const clientes = window.clientesCache || [];
  const productos = window.productosCache || [];
  const pedidos = window.pedidosCache || [];

  let clientesEncontrados = clientes.filter(c => (c.nombre || '').toLowerCase().includes(query) || (c.telefono || '').toLowerCase().includes(query));
  let productosEncontrados = productos.filter(p => (p.nombre || '').toLowerCase().includes(query) || (p.referencia || '').toLowerCase().includes(query));

  if (clientesEncontrados.length === 0 && productosEncontrados.length === 0) {
    box.innerHTML = `<p class="text-slate-400 text-center py-2">No se encontraron coincidencias para "${query}".</p>`;
    box.classList.remove('hidden');
    return;
  }

  if (clientesEncontrados.length > 0) {
    html += `<h4 class="font-extrabold text-indigo-900 border-b pb-1 mb-2 uppercase text-[11px]">👤 Clientes Encontrados</h4>`;
    clientesEncontrados.forEach(c => {
      let pedsCli = pedidos.filter(p => p.cliente_id === c.id);
      let totalPedidos = pedsCli.length;
      let totalComprado = pedsCli.reduce((acc, p) => acc + parseMonto(p.total || 0), 0);
      let totalDeuda = pedsCli.reduce((acc, p) => acc + (parseMonto(p.total || 0) - parseMonto(p.pagado || 0)), 0);

      html += `
        <div class="p-2.5 bg-indigo-50/50 rounded-xl mb-2 border border-indigo-100">
          <strong>${c.nombre}</strong> (📞 ${c.telefono || 'Sin Tel'})<br>
          <span class="text-slate-600 font-semibold">Pedidos:</span> ${totalPedidos} | 
          <span class="text-indigo-700 font-bold">Ha comprado: $${formatMoneda(totalComprado)}</span> | 
          <span class="text-red-600 font-black">Debe: $${formatMoneda(totalDeuda)}</span>
        </div>
      `;
    });
  }

  if (productosEncontrados.length > 0) {
    html += `<h4 class="font-extrabold text-indigo-900 border-b pb-1 mb-2 mt-3 uppercase text-[11px]">📦 Productos en Inventario</h4>`;
    productosEncontrados.forEach(p => {
      let stockActual = p.sin_stock ? 'Bajo Pedido' : (p.stock || 0);
      html += `
        <div class="p-2.5 bg-slate-50 rounded-xl mb-2 border border-slate-200">
          <strong>[${p.referencia || 'REF'}] ${p.nombre}</strong><br>
          <span class="text-emerald-700">Stock Actual:</span> <strong>${stockActual}</strong> | Detal: $${formatMoneda(parseMonto(p.precio_detal || 0))}
        </div>
      `;
    });
  }

  box.innerHTML = html;
  box.classList.remove('hidden');
};

/**
 * Alterna vistas en la pestaña de Reportes PDF Gerenciales
 */
window.cambiarTipoReportePDF = function(tipo) {
  ['consolidado', 'detallado', 'deudas'].forEach(t => {
    const el = document.getElementById(`vista-pdf-${t}`);
    const btn = document.getElementById(`btn-rep-${t === 'consolidado' ? 'cons' : (t === 'detallado' ? 'det' : 'deudas')}`);
    if (el) el.classList.add('hidden');
    if (btn) btn.className = 'px-3 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold';
  });

  const vistaActiva = document.getElementById(`vista-pdf-${tipo}`);
  const btnActivo = document.getElementById(`btn-rep-${tipo === 'consolidado' ? 'cons' : (tipo === 'detallado' ? 'det' : 'deudas')}`);
  if (vistaActiva) vistaActiva.classList.remove('hidden');
  if (btnActivo) btnActivo.className = 'px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow';

  const fechaEl = document.getElementById('fecha-reporte-pdf');
  if (fechaEl) fechaEl.innerText = `Fecha de emisión: ${new Date().toLocaleDateString('es-CO')}`;

  const prods = window.productosCache || [];
  const peds = window.pedidosCache || [];
  const clis = window.clientesCache || [];
  const deudas = window.deudasMensualesCache || [];

  if (tipo === 'consolidado') {
    let tbody = document.getElementById('tabla-reporte-inv');
    if (tbody) {
      tbody.innerHTML = '';
      prods.forEach(p => {
        tbody.innerHTML += `<tr><td>${p.referencia || ''}</td><td>${p.nombre}</td><td>${p.origen_compra || ''}</td><td>${p.stock || 0}</td><td>$${formatMoneda(parseMonto(p.precio_detal || 0))}</td></tr>`;
      });
    }
  } else if (tipo === 'detallado') {
    let tbody = document.getElementById('tabla-reporte-pedidos-detallado');
    if (tbody) {
      tbody.innerHTML = '';
      peds.forEach(p => {
        let cli = clis.find(c => c.id === p.cliente_id) || {};
        let totalP = parseMonto(p.total);
        let pagadoP = parseMonto(p.pagado);
        tbody.innerHTML += `<tr><td>${p.id.slice(0, 6)}<br>${p.fecha_entrega || ''}</td><td>${cli.nombre || ''}</td><td>${p.tipo_operacion}</td><td>Total: $${formatMoneda(totalP)}</td><td>Saldo: $${formatMoneda(totalP - pagadoP)}</td></tr>`;
      });
    }
  } else if (tipo === 'deudas') {
    let tbody = document.getElementById('tabla-reporte-deudas-pdf');
    if (tbody) {
      tbody.innerHTML = '';
      deudas.forEach(d => {
        tbody.innerHTML += `<tr><td>${d.concepto}</td><td>$${formatMoneda(parseMonto(d.monto))}</td><td>Día ${d.dia_pago}</td></tr>`;
      });
    }
  }
};