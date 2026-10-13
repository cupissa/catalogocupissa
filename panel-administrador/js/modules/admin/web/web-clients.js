/**
 * js/modules/admin/web/web-clients.js
 * Directorio Exclusivo de Usuarios Registrados en la Web (Tabla 'profile')
 */

window.webClientsCache = [];

// Helper interno para parsing de montos seguro y exacto
function parseMontoSeguro(val) {
  if (typeof window.parseMonto === 'function') {
    return window.parseMonto(val);
  }
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

// Helper interno para formateo de moneda seguro conservando decimales exactos
function formatMonedaSeguro(val) {
  if (typeof window.formatMoneda === 'function') {
    return window.formatMoneda(val);
  }
  return Number(val || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

window.cargarClientesWeb = async function() {
  const tbody = document.getElementById('tabla-clientes-web');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" class="py-8 text-center text-slate-400">Sincronizando perfiles, pedidos y créditos…</td></tr>';
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('Supabase no está inicializado.');
    const [pr, or, cr] = await Promise.all([
      client.from('profile').select('*'),
      client.from('pedidos_web').select('id,user_id,cliente_id,customer_email,total_amount,advance_payment,pending_balance,status,created_at'),
      client.from('creditos_cupissa_cuentas').select('user_id,cliente_id,saldo_pendiente,total_credito,total_pagado,cuota_inicial,estado')
    ]);
    if (pr.error) throw pr.error;
    // Compatibilidad con instalaciones anteriores donde los pedidos aún están en la tabla legacy.
    let pedidos = or.error ? (await (window.SupabaseSync?.getPedidos?.() || Promise.resolve([]))) : (or.data || []);
    const creditos = cr.error ? [] : (cr.data || []);
    window.webClientsCache = (pr.data || []).map(cli => {
      const peds = pedidos.filter(p => p.cliente_id === cli.id || p.user_id === cli.id || (p.customer_email && cli.email && p.customer_email.toLowerCase() === cli.email.toLowerCase()) || (p.cliente_email && cli.email && p.cliente_email.toLowerCase() === cli.email.toLowerCase()));
      const valid = peds.filter(p => !['cancelado','cancelled','anulado'].includes(String(p.status || p.estado || '').toLowerCase()));
      const totalComprado = valid.reduce((sum,p)=>sum+parseMontoSeguro(p.total_amount ?? p.total ?? p.monto ?? p.valor ?? 0),0);
      const clientCredits = creditos.filter(c => (c.user_id === cli.id || c.cliente_id === cli.id) && String(c.estado||'').toLowerCase()==='activo');
      const saldoDeuda = clientCredits.length ? clientCredits.reduce((sum,c)=>sum+Math.max(0,parseMontoSeguro(c.saldo_pendiente ?? (Number(c.total_credito||0)-Number(c.total_pagado||0)-Number(c.cuota_inicial||0))),0),0) : valid.reduce((sum,p)=>sum+parseMontoSeguro(p.pending_balance ?? p.saldo ?? Math.max(0,Number(p.total_amount ?? p.total ?? 0)-Number(p.advance_payment ?? p.pagado ?? 0))),0);
      const cupoCredito = cli.cupo_credito == null || cli.cupo_credito === '' ? 0 : parseMontoSeguro(cli.cupo_credito);
      return {...cli,cupo_credito:cupoCredito,estado_credito:cli.estado_credito||'sin_credito',pedidosCount:peds.length,totalComprado,saldoDeuda,pedidos:peds};
    });
    window.renderizarTablaClientesWeb(window.webClientsCache);
  } catch (err) {
    console.error('Error al cargar perfiles web:', err);
    tbody.innerHTML = `<tr><td colspan="6" class="py-6 text-rose-500 font-bold">No se pudieron consultar los perfiles: ${String(err.message||err)}</td></tr>`;
  }
};

window.renderizarTablaClientesWeb = function(lista) {
  const tbody = document.getElementById('tabla-clientes-web');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400 font-bold">
          No hay perfiles de usuario web registrados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(c => {
    const nombreComp = `${c.first_name || c.nombre || 'Cliente Web'} ${c.last_name || ''}`.trim();
    const cupoAprobado = parseMontoSeguro(c.cupo_credito);
    const estadoCredito = c.estado_credito;

    let badgeCredito = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Sin Crédito</span>`;
    if (['aprobado','activo'].includes(String(estadoCredito).toLowerCase())) {
      badgeCredito = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">Aprobado ($${formatMonedaSeguro(cupoAprobado)})</span>`;
    } else if (estadoCredito === 'pendiente') {
      badgeCredito = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 animate-pulse">Por Aprobar</span>`;
    } else if (estadoCredito === 'rechazado') {
      badgeCredito = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">Rechazado</span>`;
    }

    return `
      <tr class="border-b hover:bg-slate-50/80 transition-colors text-xs">
        <td class="p-3">
          <div class="font-bold text-slate-900">${nombreComp}</div>
          <div class="text-[10px] text-slate-400">${c.email || 'Sin correo'}</div>
        </td>
        <td class="p-3 text-xs">
          <div><i class="fa-solid fa-phone text-indigo-500 mr-1"></i> ${c.telefono || c.phone || 'N/A'}</div>
          <div class="text-[10px] text-slate-500"><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i> ${c.direccion || c.city || 'Barranquilla'}</div>
        </td>
        <td class="p-3 text-center font-bold text-indigo-700">
          ${c.pedidosCount}
        </td>
        <td class="p-3">
          <div class="font-black text-emerald-600">$${formatMonedaSeguro(c.totalComprado)}</div>
          ${c.saldoDeuda > 0 ? `<div class="text-[10px] font-bold text-red-600">Debe: $${formatMonedaSeguro(c.saldoDeuda)}</div>` : ''}
        </td>
        <td class="p-3">
          ${badgeCredito}
        </td>
        <td class="p-3 text-right">
          <button onclick="verDetalleClienteWeb('${c.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 ml-auto">
            <i class="fa-solid fa-user-gear"></i> Ficha 360°
          </button>
        </td>
      </tr>
    `;
  }).join('');
};

window.filtrarClientesWeb = function(){
  const query=document.getElementById('buscador-clientes-web')?.value||'';
  const rows=window.webClientsCache||[];
  if(!query.trim())return window.renderizarTablaClientesWeb(rows);
  const text=c=>[c.first_name,c.last_name,c.nombre,c.email,c.telefono,c.cedula,c.direccion,c.ciudad].filter(Boolean).join(' ');
  let filtered=window.CupissaSearch?window.CupissaSearch.rank(rows,query,text,.25):rows.filter(c=>text(c).toLowerCase().includes(query.toLowerCase()));
  if(!filtered.length&&window.CupissaSearch){filtered=window.CupissaSearch.rank(rows,query,text,0).slice(0,8);}
  window.renderizarTablaClientesWeb(filtered);
};

/**
 * Abre el modal de la Ficha 360° separando claramente el Cupo de Crédito y la Deuda Activa
 */
window.verDetalleClienteWeb = function(clienteId) {
  const cliente = (window.webClientsCache || []).find(c => String(c.id) === String(clienteId));
  const modal = document.getElementById('modal-detalle-cliente-web');
  if (!modal) {
    console.error("No se encontró el modal #modal-detalle-cliente-web en el HTML.");
    return;
  }

  if (!cliente) {
    alert("No se encontró la información de este cliente.");
    return;
  }

  // Rellenar datos principales en el modal
  const nombreComp = `${cliente.first_name || cliente.nombre || 'Cliente Web'} ${cliente.last_name || ''}`.trim();
  document.getElementById('cli-web-modal-nombre').textContent = nombreComp;
  document.getElementById('cli-web-modal-email').textContent = cliente.email || 'Sin correo';
  document.getElementById('cli-web-modal-tel').textContent = cliente.telefono || cliente.phone || 'N/A';
  document.getElementById('cli-web-modal-dir').textContent = cliente.direccion || cliente.city || 'Barranquilla';

  // Mostrar indicadores financieros separados en pantalla
  document.getElementById('cli-web-modal-cupo-display').textContent = `$${formatMonedaSeguro(cliente.cupo_credito)}`;
  document.getElementById('cli-web-modal-deuda-display').textContent = `$${formatMonedaSeguro(cliente.saldoDeuda)}`;

  // Campos del formulario
  document.getElementById('cli-web-id-hidden').value = cliente.id;
  document.getElementById('cli-web-cupo-input').value = cliente.cupo_credito || 200000;
  document.getElementById('cli-web-estado-credito-select').value = cliente.estado_credito || 'aprobado';

  // Controlar visibilidad de la fecha límite de pago (SOLO si tiene deuda activa > 0)
  const boxFechaLimite = document.getElementById('box-fecha-limite-pago');
  const inputFechaPago = document.getElementById('cli-web-fecha-pago-input');

  if (cliente.saldoDeuda > 0) {
    boxFechaLimite.classList.remove('hidden');
    inputFechaPago.value = cliente.fecha_limite_pago || '';
  } else {
    boxFechaLimite.classList.add('hidden');
    inputFechaPago.value = '';
  }

  // Renderizar historial de pedidos del cliente dentro del modal
  const listaPedidosContainer = document.getElementById('cli-web-modal-pedidos-list');
  const pedidosCli = cliente.pedidos || [];

  if (pedidosCli.length === 0) {
    listaPedidosContainer.innerHTML = `<p class="text-slate-400 italic text-xs py-2">Este cliente no registra pedidos en la tienda aún.</p>`;
  } else {
    listaPedidosContainer.innerHTML = pedidosCli.map(p => {
      const ref = p.referencia_pedido || p.referencia || 'CUP-' + String(p.id).slice(0, 4);
      const tot = parseMontoSeguro(p.total || p.monto || 0);
      const est = p.estado || 'Pendiente';
      return `
        <div class="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border text-xs">
          <div>
            <span class="font-extrabold text-indigo-900">${ref}</span>
            <span class="text-[10px] text-slate-400 block">${p.fecha_agendamiento || p.created_at?.split('T')[0] || ''}</span>
          </div>
          <div>
            <span class="font-bold text-slate-700">$${formatMonedaSeguro(tot)}</span>
            <span class="block text-[10px] text-indigo-600 font-semibold">${est}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Mostrar modal
  modal.classList.remove('hidden');
};

/**
 * Guarda el cupo de crédito y estado actualizado en la tabla 'profile' de Supabase
 */
window.guardarCreditoClienteWeb = async function(event) {
  event.preventDefault();
  const clienteId = document.getElementById('cli-web-id-hidden').value;
  const nuevoCupo = parseMontoSeguro(document.getElementById('cli-web-cupo-input').value);
  const nuevoEstadoCredito = document.getElementById('cli-web-estado-credito-select').value;
  const nuevaFechaPago = document.getElementById('cli-web-fecha-pago-input').value;

  if (!clienteId) return;

  try {
    const client = window.supabaseClient;
    if (!client) throw new Error("Cliente de Supabase no disponible");

    const clienteActual = (window.webClientsCache || []).find(c => String(c.id) === String(clienteId));
    const tieneDeuda = clienteActual && clienteActual.saldoDeuda > 0;

    const datosUpdate = {
      cupo_credito: nuevoCupo,
      estado_credito: nuevoEstadoCredito
    };

    // Solo se actualiza la fecha de pago si tiene deuda activa
    if (tieneDeuda) {
      datosUpdate.fecha_limite_pago = nuevaFechaPago || null;
    }

    const { error } = await client
      .from('profile')
      .update(datosUpdate)
      .eq('id', clienteId);

    if (error) throw error;

    if (typeof showToast === 'function') {
      showToast("¡Cupo de crédito y estado actualizados con éxito!");
    } else {
      alert("¡Cupo de crédito y estado actualizados con éxito!");
    }

    document.getElementById('modal-detalle-cliente-web').classList.add('hidden');
    window.cargarClientesWeb();

  } catch (err) {
    console.error("Error al actualizar crédito del cliente web:", err);
    alert("Error al guardar: " + (err.message || err));
  }
};
(function subscribeClientDirectoryRealtime(){const c=window.supabaseClient||window.supabase;if(!c||window.__cupissaClientsLive||!c.channel)return;window.__cupissaClientsLive=true;c.channel('cupissa-client-directory-live').on('postgres_changes',{event:'*',schema:'public',table:'profile'},()=>window.cargarClientesWeb?.()).on('postgres_changes',{event:'*',schema:'public',table:'pedidos_web'},()=>window.cargarClientesWeb?.()).on('postgres_changes',{event:'*',schema:'public',table:'creditos_cupissa_cuentas'},()=>window.cargarClientesWeb?.()).subscribe();})();
