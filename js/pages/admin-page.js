/**
 * js/pages/admin-page.js
 * Controlador Principal e Orquestador de admin.html
 */

// Variables globales de estado y caché
window.productosCache = [];
window.clientesCache = [];
window.pedidosCache = [];
window.flujoCajaCache = [];
window.detallesPedidosCache = {};
window.deudasMensualesCache = [];

/**
 * Función de utilidad para parsear cadenas de texto o números a un número flotante
 */
window.parseMonto = function(valor) {
  if (typeof valor === 'number') return isNaN(valor) ? 0 : valor;
  if (!valor) return 0;
  let str = String(valor).trim();
  if (str === '') return 0;

  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf(',') < str.indexOf('.')) {
      str = str.replace(/,/g, '');
    } else {
      str = str.replace(/\./g, '').replace(',', '.');
    }
  } else if (str.includes(',')) {
    let partes = str.split(',');
    if (partes.length === 2 && partes[1].length <= 2) {
      str = str.replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  }
  let num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

/**
 * Formatea un número al formato de moneda COP
 */
window.formatMoneda = function(num) {
  return (num || 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Cambia la pestaña activa del panel de administración
 */
window.switchTab = function(tab) {
  ['dashboard', 'pedidos', 'inventario', 'contabilidad', 'reportes'].forEach(t => {
    const section = document.getElementById(`tab-${t}`);
    const btn = document.getElementById(`btn-tab-${t}`);
    if (section) section.classList.add('hidden');
    if (btn) btn.classList.remove('bg-indigo-800');
  });

  const targetSection = document.getElementById(`tab-${tab}`);
  const targetBtn = document.getElementById(`btn-tab-${tab}`);
  if (targetSection) targetSection.classList.remove('hidden');
  if (targetBtn) targetBtn.classList.add('bg-indigo-800');

  window.cargarDatosGlobales();
};

/**
 * Carga todos los datos desde Supabase e invoca las funciones de re-renderizado
 */
window.cargarDatosGlobales = async function() {
  try {
    const { data: prods } = await supabaseClient.from('productos').select('*').order('nombre', { ascending: true });
    window.productosCache = prods || [];
  } catch (e) { console.error('Error cargando productos:', e); }

  try {
    const { data: clis } = await supabaseClient.from('clientes').select('*').order('nombre', { ascending: true });
    window.clientesCache = clis || [];
    if (typeof poblarSelectClientes === 'function') poblarSelectClientes();
  } catch (e) { console.error('Error cargando clientes:', e); }

  try {
    const { data: peds } = await supabaseClient.from('pedidos').select('*').order('fecha_agendamiento', { ascending: false });
    window.pedidosCache = peds || [];
    if (typeof poblarSelectPedidosCaja === 'function') poblarSelectPedidosCaja();
  } catch (e) { console.error('Error cargando pedidos:', e); }

  try {
    const { data: dets } = await supabaseClient.from('detalle_pedido').select('*');
    window.detallesPedidosCache = {};
    (dets || []).forEach(d => {
      if (!window.detallesPedidosCache[d.pedido_id]) window.detallesPedidosCache[d.pedido_id] = [];
      window.detallesPedidosCache[d.pedido_id].push(d);
    });
  } catch (e) { console.error('Error cargando detalles de pedido:', e); }

  try {
    const { data: deudas } = await supabaseClient.from('deudas_mensuales').select('*').order('dia_pago', { ascending: true });
    window.deudasMensualesCache = deudas || [];
  } catch (e) { window.deudasMensualesCache = []; }

  if (typeof cargarInventarioAdmin === 'function') await cargarInventarioAdmin();
  if (typeof cargarPedidosAdmin === 'function') await cargarPedidosAdmin();
  if (typeof cargarContabilidad === 'function') await cargarContabilidad();
  if (typeof cargarDeudasMensuales === 'function') await cargarDeudasMensuales();
  if (typeof verificarAvisosDeudas === 'function') verificarAvisosDeudas();
};

// ================= CONTABILIDAD Y DEUDAS =================

window.cargarDeudasMensuales = async function() {
  const tbody = document.getElementById('tabla-deudas-mensuales');
  if (!tbody) return;
  tbody.innerHTML = '';

  const deudas = window.deudasMensualesCache || [];

  if (deudas.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="p-3 text-center text-slate-400">No hay deudas mensuales registradas.</td></tr>`;
    if (typeof poblarSelectDeudasCaja === 'function') poblarSelectDeudasCaja();
    return;
  }

  deudas.forEach(d => {
    tbody.innerHTML += `
      <tr class="border-b">
        <td class="p-2.5 font-bold text-slate-800">${d.concepto}</td>
        <td class="p-2.5 font-black text-amber-700">$${formatMoneda(parseMonto(d.monto || 0))}</td>
        <td class="p-2.5">Día ${d.dia_pago}</td>
        <td class="p-2.5"><button onclick="eliminarDeudaMensual('${d.id}')" class="text-red-600 font-bold">🗑️</button></td>
      </tr>
    `;
  });
  if (typeof poblarSelectDeudasCaja === 'function') poblarSelectDeudasCaja();
};

window.eliminarDeudaMensual = async function(id) {
  if (!confirm("¿Eliminar esta deuda mensual?")) return;
  await supabaseClient.from('deudas_mensuales').delete().eq('id', id);
  if (typeof showToast === 'function') showToast("Deuda eliminada");
  window.cargarDatosGlobales();
};

window.toggleRelacionPedido = function() {
  const tipo = document.getElementById('caja-tipo')?.value;
  const secPedido = document.getElementById('seccion-relacionar-pedido');
  const secDeuda = document.getElementById('seccion-relacionar-deuda');

  if (tipo === 'INGRESO') {
    if (secPedido) secPedido.classList.remove('hidden');
    if (secDeuda) secDeuda.classList.add('hidden');
    const selD = document.getElementById('caja-deuda-relacionada');
    if (selD) selD.value = '';
  } else {
    if (secPedido) secPedido.classList.add('hidden');
    if (secDeuda) secDeuda.classList.remove('hidden');
    const selP = document.getElementById('caja-pedido-relacionado');
    if (selP) selP.value = '';
  }
};

window.poblarSelectPedidosCaja = function() {
  const sel = document.getElementById('caja-pedido-relacionado');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Seleccionar pedido para abonar/pagar --</option>';
  (window.pedidosCache || []).forEach(p => {
    if (p.estado !== 'Cancelado') {
      let cli = (window.clientesCache || []).find(c => c.id === p.cliente_id) || { nombre: 'Cliente General' };
      let totalP = parseMonto(p.total);
      let pagadoP = parseMonto(p.pagado);
      sel.innerHTML += `<option value="${p.id}">${cli.nombre} - Ref: ${p.id.slice(0, 6)} - Total: $${formatMoneda(totalP)} - Saldo: $${formatMoneda(totalP - pagadoP)}</option>`;
    }
  });
};

window.autocompletarMontoPedido = function() {
  const id = document.getElementById('caja-pedido-relacionado')?.value;
  if (!id) return;
  const p = (window.pedidosCache || []).find(x => x.id === id);
  if (p) {
    let saldo = parseMonto(p.total) - parseMonto(p.pagado);
    document.getElementById('caja-valor').value = saldo;
    document.getElementById('caja-concepto').value = 'Abono/Pago a Pedido Ref: ' + p.id.slice(0, 6);
  }
};

window.poblarSelectDeudasCaja = function() {
  const sel = document.getElementById('caja-deuda-relacionada');
  if (!sel) return;
  sel.innerHTML = '<option value="">-- Seleccionar deuda a pagar --</option>';
  (window.deudasMensualesCache || []).forEach(d => {
    sel.innerHTML += `<option value="${d.id}">${d.concepto} - Monto: $${formatMoneda(parseMonto(d.monto))}</option>`;
  });
};

window.autocompletarMontoDeuda = function() {
  const id = document.getElementById('caja-deuda-relacionada')?.value;
  if (!id) return;
  const d = (window.deudasMensualesCache || []).find(x => x.id === id);
  if (d) {
    document.getElementById('caja-valor').value = d.monto;
    document.getElementById('caja-concepto').value = 'Pago de Obligación: ' + d.concepto;
  }
};

window.cargarContabilidad = async function() {
  try {
    const { data } = await supabaseClient.from('flujo_caja').select('*').order('fecha', { ascending: false });
    window.flujoCajaCache = data || [];

    const tbody = document.getElementById('tabla-caja-historial');
    if (tbody) tbody.innerHTML = '';

    let filtro = document.getElementById('filtro-metodo-caja')?.value || 'todos';
    let b = (document.getElementById('buscador-caja')?.value || '').toLowerCase();

    let filtrados = window.flujoCajaCache.filter(m => {
      let okMetodo = filtro === 'todos' || m.metodo_pago === filtro;
      let okBusq = !b || (m.concepto || '').toLowerCase().includes(b) || (m.tercero || '').toLowerCase().includes(b);
      return okMetodo && okBusq;
    });

    let ef = 0, bco = 0, ret4x1000 = 0;
    filtrados.forEach(m => {
      let v = parseMonto(m.valor || 0);
      let retMov = (m.impuesto_4x1000 !== undefined && m.impuesto_4x1000 !== null) ? parseMonto(m.impuesto_4x1000) : (m.tipo === 'EGRESO' && m.metodo_pago !== 'Efectivo' ? v * 0.004 : 0);

      if (m.tipo === 'INGRESO') {
        if (m.metodo_pago === 'Efectivo') ef += v; else bco += v;
      } else {
        if (m.metodo_pago === 'Efectivo') {
          ef -= v;
        } else {
          bco -= (v + retMov);
          ret4x1000 += retMov;
        }
      }

      if (tbody) {
        let edicion4x1000Html = '-';
        if (m.tipo === 'EGRESO' && m.metodo_pago !== 'Efectivo') {
          edicion4x1000Html = `
            <div class="flex items-center gap-1">
              <span class="text-slate-400">$</span>
              <input type="text" id="input-4x1000-${m.id}" value="${retMov.toFixed(2)}" class="w-20 p-1 border rounded text-xs font-bold text-red-600 bg-white" onkeydown="if(event.key==='Enter') guardar4x1000Manual('${m.id}')">
              <button onclick="guardar4x1000Manual('${m.id}')" title="Guardar ajuste 4x1000" class="bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded text-xs font-bold transition">💾</button>
            </div>
          `;
        }

        tbody.innerHTML += `
          <tr class="border-b">
            <td class="p-2">${m.fecha}</td>
            <td class="p-2 font-bold ${m.tipo === 'INGRESO' ? 'text-emerald-600' : 'text-red-600'}">${m.tipo}</td>
            <td class="p-2">${m.concepto} ${m.tercero ? `(${m.tercero})` : ''}</td>
            <td class="p-2">${m.metodo_pago}</td>
            <td class="p-2 font-black">$${formatMoneda(v)}</td>
            <td class="p-2">${edicion4x1000Html}</td>
          </tr>
        `;
      }
    });

    const balEf = document.getElementById('bal-efectivo');
    const balBco = document.getElementById('bal-bancos');
    const balRet = document.getElementById('bal-4x1000');
    const statEf = document.getElementById('stat-saldo-efectivo');
    const statBco = document.getElementById('stat-saldo-bancos');

    if (balEf) balEf.innerText = `$${formatMoneda(ef)}`;
    if (balBco) balBco.innerText = `$${formatMoneda(bco)}`;
    if (balRet) balRet.innerText = `-$${formatMoneda(ret4x1000)}`;
    if (statEf) statEf.innerText = `$${formatMoneda(ef)}`;
    if (statBco) statBco.innerText = `$${formatMoneda(bco)}`;

    if (typeof renderizarGraficoDiario === 'function') renderizarGraficoDiario();
  } catch (e) { console.error('Error cargando contabilidad:', e); }
};

window.guardar4x1000Manual = async function(idMov) {
  const inputEl = document.getElementById(`input-4x1000-${idMov}`);
  if (!inputEl) return;
  const nuevoValor = parseMonto(inputEl.value);

  const { error } = await supabaseClient.from('flujo_caja').update({ impuesto_4x1000: nuevoValor }).eq('id', idMov);
  if (error) {
    if (typeof showToast === 'function') showToast("Error actualizando el 4x1000 en Supabase", "error");
    return;
  }

  if (typeof showToast === 'function') showToast("4x1000 ajustado y guardado correctamente");
  window.cargarContabilidad();
};

window.descargarMovimientosMes = function() {
  let csv = "Fecha,Tipo,Concepto,Tercero,Metodo,Valor,Impuesto_4x1000\n";
  (window.flujoCajaCache || []).forEach(m => {
    let v = parseMonto(m.valor);
    let ret = (m.impuesto_4x1000 !== undefined && m.impuesto_4x1000 !== null) ? parseMonto(m.impuesto_4x1000) : (m.tipo === 'EGRESO' && m.metodo_pago !== 'Efectivo' ? v * 0.004 : 0);
    csv += `"${m.fecha}","${m.tipo}","${m.concepto}","${m.tercero || ''}","${m.metodo_pago}","${v}","${ret}"\n`;
  });
  let blob = new Blob([csv], { type: 'text/csv' });
  let url = window.URL.createObjectURL(blob);
  let a = document.createElement('a');
  a.href = url;
  a.download = 'Movimientos_Caja_Cupissa.csv';
  a.click();
};

// ================= INICIALIZACIÓN =================

document.addEventListener('DOMContentLoaded', async () => {
  const hoyStr = new Date().toISOString().split('T')[0];
  const inputFechaCaja = document.getElementById('caja-fecha');
  if (inputFechaCaja) inputFechaCaja.value = hoyStr;

  if (typeof initAdminProductsForm === 'function') initAdminProductsForm();
  if (typeof initAdminOrdersForm === 'function') initAdminOrdersForm();

  // Formulario Flujo de Caja Manual
  const formCaja = document.getElementById('form-caja-manual');
  if (formCaja) {
    formCaja.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fecha = document.getElementById('caja-fecha').value;
      const tipo = document.getElementById('caja-tipo').value;
      const concepto = document.getElementById('caja-concepto').value;
      const tercero = document.getElementById('caja-tercero').value;
      const metodo = document.getElementById('caja-metodo').value;
      const valor = parseMonto(document.getElementById('caja-valor').value);
      const desc = document.getElementById('caja-desc').value;

      let impuesto_4x1000 = 0;
      if (tipo === 'EGRESO' && metodo !== 'Efectivo') {
        impuesto_4x1000 = valor * 0.004;
      }

      const { error } = await supabaseClient.from('flujo_caja').insert([{
        fecha, tipo, concepto, tercero, metodo_pago: metodo, valor, impuesto_4x1000, descripcion: desc
      }]);

      if (error) {
        if (typeof showToast === 'function') showToast("Error guardando flujo", "error");
        return;
      }

      if (typeof showToast === 'function') showToast("Movimiento de caja registrado con éxito");
      formCaja.reset();
      document.getElementById('caja-fecha').value = new Date().toISOString().split('T')[0];
      window.cargarContabilidad();
    });
  }

  // Formulario Deudas Mensuales
  const formDeuda = document.getElementById('form-deuda-mensual');
  if (formDeuda) {
    formDeuda.addEventListener('submit', async (e) => {
      e.preventDefault();
      const concepto = document.getElementById('deuda-concepto').value.trim();
      const monto = parseMonto(document.getElementById('deuda-monto').value);
      const dia_pago = parseInt(document.getElementById('deuda-dia').value, 10) || 1;

      const { error } = await supabaseClient.from('deudas_mensuales').insert([{ concepto, monto, dia_pago }]);
      if (error) {
        if (typeof showToast === 'function') showToast("Error guardando deuda en Supabase.", "error");
        return;
      }

      if (typeof showToast === 'function') showToast("Deuda mensual guardada exitosamente");
      formDeuda.reset();
      window.cargarDatosGlobales();
    });
  }

  await window.cargarDatosGlobales();
});