/**
 * js/pages/admin-page.js
 * Controlador Principal del Panel Administrativo (admin.html), Pestañas, Flujo de Caja y Deudas
 */

document.addEventListener('DOMContentLoaded', async () => {
  window.switchTab('dashboard');

  window.initFormularioCajaManual();
  window.initFormularioDeudasMensuales();
});

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
  }
};

window.switchSubTabWeb = function(subtab) {
  const secClientes = document.getElementById('subtab-web-clientes');
  const secProds = document.getElementById('subtab-web-productos');
  const btnClientes = document.getElementById('btn-subtab-web-clientes');
  const btnProds = document.getElementById('btn-subtab-web-productos');

  if (subtab === 'clientes') {
    if (secClientes) secClientes.classList.remove('hidden');
    if (secProds) secProds.classList.add('hidden');

    if (btnClientes) btnClientes.className = 'px-4 py-2 bg-brand-600 text-white font-extrabold rounded-xl text-xs shadow transition';
    if (btnProds) btnProds.className = 'px-4 py-2 bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition';

    if (typeof cargarClientesWeb === 'function') cargarClientesWeb();
  } else {
    if (secProds) secProds.classList.remove('hidden');
    if (secClientes) secClientes.classList.add('hidden');

    if (btnProds) btnProds.className = 'px-4 py-2 bg-pink-600 text-white font-extrabold rounded-xl text-xs shadow transition';
    if (btnClientes) btnClientes.className = 'px-4 py-2 bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition';

    if (typeof cargarProductosWeb === 'function') cargarProductosWeb();
  }
};

window.cargarContabilidad = async function() {
  const [movimientos, deudas] = await Promise.all([
    SupabaseSync.getFlujoCaja(),
    SupabaseSync.getDeudas()
  ]);

  window.renderizarTablaCajaHistorial(movimientos);
  window.renderizarTablaDeudasMensuales(deudas);
  window.calcularBalancesCaja(movimientos);
};

window.renderizarTablaCajaHistorial = function(lista = []) {
  const tbody = document.getElementById('tabla-caja-historial');
  if (!tbody) return;

  const query = (document.getElementById('buscador-caja')?.value || '').toLowerCase().trim();
  const metodoSel = document.getElementById('filtro-metodo-caja')?.value || 'todos';

  let filtrados = (lista || []).filter(m => {
    const okQuery = !query ||
      (m.concepto || '').toLowerCase().includes(query) ||
      (m.tercero || '').toLowerCase().includes(query);

    const okMetodo = metodoSel === 'todos' || (m.metodo_pago || '').toLowerCase() === metodoSel.toLowerCase();

    return okQuery && okMetodo;
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400 text-xs">Sin movimientos registrados en caja.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados.map(m => {
    const esIngreso = (m.tipo || '').toUpperCase() === 'INGRESO';
    const val = window.parseMonto(m.valor !== undefined ? m.valor : m.monto || 0);
    const fechaFormatted = m.fecha ? m.fecha.split('T')[0] : 'Hoy';
    const esBancos = (m.metodo_pago || '').toLowerCase() === 'nequi' || (m.metodo_pago || '').toLowerCase() === 'bancos';

    const campo4x1000 = esBancos
      ? `<div class="flex items-center gap-1 justify-end">
           <span class="text-slate-400">$</span>
           <input type="number" step="0.01" id="input-4x1000-${m.id}" value="${m.impuesto_4x1000 || 0}" class="w-16 p-1 border rounded text-xs font-bold text-rose-600 bg-white">
           <button onclick="guardar4x1000('${m.id}')" class="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition" title="Guardar 4x1000">
             <i class="fa-solid fa-floppy-disk text-[10px]"></i>
           </button>
         </div>`
      : `-`;

    return `
      <tr class="border-b hover:bg-slate-50 transition-colors text-xs">
        <td class="p-3 font-semibold text-slate-700">${fechaFormatted}</td>
        <td class="p-3">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black ${esIngreso ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
            ${m.tipo || 'INGRESO'}
          </span>
        </td>
        <td class="p-3">
          <div class="font-bold text-slate-800 uppercase">${m.concepto || 'Movimiento'}</div>
          ${m.tercero ? `<div class="text-[10px] text-slate-400">(${m.tercero})</div>` : ''}
        </td>
        <td class="p-3 font-semibold text-slate-700">${m.metodo_pago || 'Efectivo'}</td>
        <td class="p-3 font-black ${esIngreso ? 'text-emerald-600' : 'text-slate-900'}">$${window.formatMoneda(val)}</td>
        <td class="p-3 text-right">${campo4x1000}</td>
      </tr>
    `;
  }).join('');
};

window.guardar4x1000 = async function(id) {
  const input = document.getElementById(`input-4x1000-${id}`);
  if (!input) return;

  const val = input.value;
  const res = await SupabaseSync.update4x1000(id, val);
  if (res.success) {
    if (typeof showToast === 'function') showToast("Impuesto 4x1000 actualizado.");
    window.cargarContabilidad();
  }
};

window.renderizarTablaDeudasMensuales = function(lista = []) {
  const tbody = document.getElementById('tabla-deudas-mensuales');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 text-xs">Sin deudas activas guardadas.</td></tr>`;
    return;
  }

  tbody.innerHTML = lista.map(d => `
    <tr class="border-b hover:bg-slate-50 text-xs">
      <td class="p-2.5 font-bold text-slate-800">${d.concepto}</td>
      <td class="p-2.5 font-black text-amber-700">$${window.formatMoneda(d.monto)}</td>
      <td class="p-2.5 font-bold">Día ${d.dia_pago} de cada mes</td>
      <td class="p-2.5 text-right">
        <button onclick="eliminarDeudaMensual('${d.id}')" class="text-rose-600 hover:text-rose-800 font-bold">
          🗑️
        </button>
      </td>
    </tr>
  `).join('');
};

window.calcularBalancesCaja = function(movimientos = []) {
  let efec = 0;
  let banc = 0;
  let imp4x1000 = 0;

  (movimientos || []).forEach(m => {
    const val = window.parseMonto(m.valor !== undefined ? m.valor : m.monto || 0);
    const esIngreso = (m.tipo || '').toUpperCase() === 'INGRESO';
    const metodo = (m.metodo_pago || '').toLowerCase().trim();

    if (metodo === 'efectivo') {
      efec += esIngreso ? val : -val;
    } else {
      banc += esIngreso ? val : -val;
      if (m.impuesto_4x1000) {
        imp4x1000 += window.parseMonto(m.impuesto_4x1000);
      }
    }
  });

  const elEfec = document.getElementById('bal-efectivo');
  const elBanc = document.getElementById('bal-bancos');
  const elImp = document.getElementById('bal-4x1000');

  if (elEfec) elEfec.textContent = `$${window.formatMoneda(efec)}`;
  if (elBanc) elBanc.textContent = `$${window.formatMoneda(banc)}`;
  if (elImp) elImp.textContent = `$${window.formatMoneda(imp4x1000)}`;
};

window.initFormularioCajaManual = function() {
  const form = document.getElementById('form-caja-manual');
  if (!form) return;

  const inputFecha = document.getElementById('caja-fecha');
  if (inputFecha && !inputFecha.value) {
    inputFecha.value = new Date().toISOString().split('T')[0];
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const fecha = document.getElementById('caja-fecha')?.value || new Date().toISOString().split('T')[0];
    const tipo = document.getElementById('caja-tipo')?.value || 'INGRESO';
    const concepto = document.getElementById('caja-concepto')?.value.trim();
    const tercero = document.getElementById('caja-tercero')?.value.trim();
    const metodo_pago = document.getElementById('caja-metodo')?.value || 'Efectivo';
    const valor = window.parseMonto(document.getElementById('caja-valor')?.value);
    const descripcion = document.getElementById('caja-desc')?.value.trim();

    if (!concepto || valor <= 0) {
      if (typeof showToast === 'function') showToast("Ingresa un concepto y un valor válido.", "error");
      return;
    }

    const res = await SupabaseSync.insertFlujoCaja({
      fecha,
      tipo,
      concepto,
      tercero,
      metodo_pago,
      valor,
      monto: valor,
      descripcion
    });

    if (res.success) {
      if (typeof showToast === 'function') showToast("Movimiento de caja guardado en Supabase.");
      form.reset();
      if (inputFecha) inputFecha.value = new Date().toISOString().split('T')[0];
      window.cargarContabilidad();
    } else {
      if (typeof showToast === 'function') showToast("Error al guardar movimiento.", "error");
    }
  });
};

window.initFormularioDeudasMensuales = function() {
  const form = document.getElementById('form-deuda-mensual');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const concepto = document.getElementById('deuda-concepto')?.value.trim();
    const monto = window.parseMonto(document.getElementById('deuda-monto')?.value);
    const dia_pago = parseInt(document.getElementById('deuda-dia')?.value, 10) || 1;

    if (!concepto || monto <= 0) {
      if (typeof showToast === 'function') showToast("Ingresa el concepto y monto de la deuda.", "error");
      return;
    }

    const res = await SupabaseSync.insertDeuda({
      concepto,
      monto,
      dia_pago
    });

    if (res.success) {
      if (typeof showToast === 'function') showToast("Deuda guardada en Supabase.");
      form.reset();
      window.cargarContabilidad();
    } else {
      if (typeof showToast === 'function') showToast("Error al guardar deuda.", "error");
    }
  });
};

window.eliminarDeudaMensual = async function(id) {
  if (!confirm("¿Deseas borrar esta deuda mensual?")) return;

  const res = await SupabaseSync.deleteDeuda(id);
  if (res.success) {
    if (typeof showToast === 'function') showToast("Deuda eliminada.");
    window.cargarContabilidad();
  }
};

window.toggleRelacionPedido = function() {
  const tipo = document.getElementById('caja-tipo')?.value;
  const secPed = document.getElementById('seccion-relacionar-pedido');
  const secDeuda = document.getElementById('seccion-relacionar-deuda');

  if (tipo === 'INGRESO') {
    if (secPed) secPed.classList.remove('hidden');
    if (secDeuda) secDeuda.classList.add('hidden');
  } else {
    if (secPed) secPed.classList.add('hidden');
    if (secDeuda) secDeuda.classList.remove('hidden');
  }
};