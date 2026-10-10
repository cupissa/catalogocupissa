/**
 * js/modules/admin/admin-orders.js
 * Módulo de Gestión de Pedidos y CRM (Vinculado a la tabla 'cliente')
 */

window.adminCarritoItems = [];

window.cargarPedidosAdmin = async function() {
  const tbody = document.getElementById('tabla-pedidos-gral');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="py-8 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-lg mb-2"></i>
        <p>Cargando pedidos y clientes desde Supabase ('pedidos' & 'cliente')...</p>
      </td>
    </tr>
  `;

  try {
    // Consultar pedidos y la tabla 'cliente' en paralelo
    const [pedidos, clientes] = await Promise.all([
      SupabaseSync.getPedidos(),
      SupabaseSync.getClientes()
    ]);

    // Mapeo rápido de clientes por id, cedula y teléfono
    const clienteMap = new Map();
    (clientes || []).forEach(c => {
      if (c.id) clienteMap.set(String(c.id), c);
      if (c.cedula) clienteMap.set(String(c.cedula), c);
      if (c.telefono) clienteMap.set(String(c.telefono), c);
    });

    const pedidosConCliente = (pedidos || []).map(p => {
      const cli = clienteMap.get(String(p.cliente_id || p.id_cliente)) ||
                  clienteMap.get(String(p.cedula_cliente || p.cliente_cedula)) ||
                  clienteMap.get(String(p.cliente_telefono || p.telefono));

      const nomReal = p.cliente_nombre || p.nombre_cliente || (cli ? cli.nombre || `${cli.first_name || ''} ${cli.last_name || ''}`.trim() : '') || 'CLIENTE';
      const telReal = p.cliente_telefono || p.telefono || (cli ? cli.telefono || cli.phone || cli.celular : '') || 'N/A';

      return {
        ...p,
        cliente_nombre_completo: nomReal,
        cliente_telefono_completo: telReal
      };
    });

    window.renderizarTablaPedidosGral(pedidosConCliente);
  } catch (err) {
    console.warn("Error al procesar pedidos y clientes:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-6 text-center text-slate-400 font-bold">
          No hay pedidos registrados en Supabase.
        </td>
      </tr>
    `;
  }
};

window.renderizarTablaPedidosGral = function(lista = []) {
  const tbody = document.getElementById('tabla-pedidos-gral');
  if (!tbody) return;

  const filtroEstado = document.getElementById('filtro-estado-pedidos')?.value || 'todos';
  const query = (document.getElementById('buscador-pedidos-gral')?.value || '').toLowerCase().trim();

  let filtrados = (lista || []).filter(p => {
    const okEstado = filtroEstado === 'todos' || (p.estado || '').toLowerCase() === filtroEstado.toLowerCase();
    const okQuery = !query ||
      (p.cliente_nombre_completo || '').toLowerCase().includes(query) ||
      (p.cliente_telefono_completo || '').toLowerCase().includes(query) ||
      (p.referencia_pedido || p.referencia || '').toLowerCase().includes(query) ||
      (p.id || '').toLowerCase().includes(query);

    return okEstado && okQuery;
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-400 font-bold">No se encontraron pedidos en la base de datos.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtrados.map(p => {
    const tot = window.parseMonto(p.total !== undefined ? p.total : (p.monto || p.valor || 0));
    const pag = window.parseMonto(p.pagado !== undefined ? p.pagado : (p.anticipo !== undefined ? p.anticipo : p.monto_pagado || 0));
    const saldo = p.saldo !== undefined ? window.parseMonto(p.saldo) : Math.max(0, tot - pag);
    const refDisplay = p.referencia_pedido || p.referencia || (p.id ? 'CUP-' + String(p.id).slice(0, 4) : 'CUP-0000');
    const fechaDisplay = p.fecha_entrega || p.fecha_agendamiento || (p.created_at ? p.created_at.split('T')[0] : 'Hoy');

    return `
      <tr class="border-b hover:bg-slate-50 text-xs transition-colors">
        <td class="p-3">
          <div class="font-extrabold text-indigo-900">${refDisplay}</div>
          <div class="text-[10px] text-slate-400">Entrega: ${fechaDisplay}</div>
        </td>
        <td class="p-3">
          <div class="font-bold text-slate-800 uppercase">${p.cliente_nombre_completo}</div>
          <div class="text-[10px] text-slate-500"><i class="fa-solid fa-phone mr-1"></i> ${p.cliente_telefono_completo}</div>
        </td>
        <td class="p-3">
          <div class="font-bold text-slate-700">${p.tipo_operacion || 'Venta Contado'}</div>
          <span class="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${p.estado === 'Entregado' || p.estado === 'Finalizado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
            ${p.estado || 'Pendiente'}
          </span>
        </td>
        <td class="p-3">
          <div class="font-bold text-slate-900">Total: $${window.formatMoneda(tot)}</div>
          <div class="text-[10px] font-extrabold ${saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}">
            Saldo: $${window.formatMoneda(saldo)}
          </div>
        </td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="cambiarEstadoPedido('${p.id}', 'Entregado')" class="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl font-bold text-[10px] transition">
              Entregar
            </button>
            <button onclick="cambiarEstadoPedido('${p.id}', 'Cancelado')" class="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-xl font-bold text-[10px] transition">
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

window.cargarClientesCRMSelector = async function() {
  const select = document.getElementById('select-cliente-existente');
  if (!select) return;

  try {
    const clientes = await SupabaseSync.getClientes();
    if (!clientes || clientes.length === 0) {
      select.innerHTML = '<option value="">👤 No hay clientes en la tabla "cliente"...</option>';
      return;
    }

    select.innerHTML = '<option value="">👤 Seleccionar cliente registrado...</option>' +
      clientes.map(c => {
        const nom = c.nombre || `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Cliente';
        const tel = c.telefono || c.phone || c.celular || 'Sin teléfono';
        return `
          <option value='${JSON.stringify(c).replace(/'/g, "&apos;")}'>
            ${nom} (${tel})
          </option>
        `;
      }).join('');
  } catch (err) {
    console.warn("Error cargando selector de clientes CRM:", err);
  }
};

window.autocompletarClienteExistente = function() {
  const select = document.getElementById('select-cliente-existente');
  if (!select || !select.value) return;

  try {
    const cli = JSON.parse(select.value);
    const idElem = document.getElementById('cli-id-seleccionado');
    const nomElem = document.getElementById('cli-nombre');
    const telElem = document.getElementById('cli-telefono');
    const dirElem = document.getElementById('cli-direccion');

    if (idElem) idElem.value = cli.id || '';
    if (nomElem) nomElem.value = cli.nombre || `${cli.first_name || ''} ${cli.last_name || ''}`.trim();
    if (telElem) telElem.value = cli.telefono || cli.phone || cli.celular || '';
    if (dirElem) dirElem.value = cli.direccion || cli.city || '';
  } catch (err) {
    console.error("Error al autocompletar cliente:", err);
  }
};

window.cambiarEstadoPedido = async function(id, nuevoEstado) {
  try {
    const client = window.supabaseClient;
    if (!client) return;

    const { error } = await client
      .from('pedidos')
      .update({ estado: nuevoEstado })
      .eq('id', id);

    if (error) throw error;

    if (typeof showToast === 'function') showToast(`Estado actualizado: ${nuevoEstado}`);
    window.cargarPedidosAdmin();
  } catch (err) {
    console.error("Error al cambiar estado:", err);
  }
};