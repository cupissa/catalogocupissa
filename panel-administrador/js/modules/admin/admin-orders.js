/**
 * js/modules/admin/admin-orders.js
 * Módulo de Gestión de Pedidos y CRM con soporte de abonos interactivo integrado con la columna 'pagado' en Supabase
 */

window.adminCarritoItems = [];

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
  return Number(val || 0).toLocaleString('es-CO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

window.cargarPedidosAdmin = async function() {
  const tbody = document.getElementById('tabla-pedidos-gral');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="py-8 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-lg mb-2"></i>
        <p>Cargando pedidos y clientes desde Supabase...</p>
      </td>
    </tr>
  `;

  try {
    const [pedidos, clientes] = await Promise.all([
      SupabaseSync.getPedidos(),
      SupabaseSync.getClientes()
    ]);

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

      const nomReal = p.cliente_nombre || p.customer_name || p.nombre_cliente || (cli ? cli.nombre || `${cli.first_name || ''} ${cli.last_name || ''}`.trim() : '') || 'CLIENTE';
      const telReal = p.cliente_telefono || p.customer_phone || p.telefono || (cli ? cli.telefono || cli.phone || cli.celular : '') || 'N/A';

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
    const okEstado = filtroEstado === 'todos' || (p.estado || p.status || '').toLowerCase() === filtroEstado.toLowerCase();
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
    const tot = parseMontoSeguro(p.total !== undefined ? p.total : (p.monto || p.valor || 0));
    const pag = parseMontoSeguro(p.pagado !== undefined ? p.pagado : 0);
    const saldo = Math.max(0, tot - pag);
    
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
          <div class="font-bold text-slate-900">Total: $${formatMonedaSeguro(tot)}</div>
          <div class="text-[10px] font-extrabold ${saldo > 0 ? 'text-amber-600' : 'text-emerald-600'}">
            Saldo: $${formatMonedaSeguro(saldo)}
          </div>
        </td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick="registrarAbonoPedidoModal('${p.id}', ${tot}, ${pag}, '${p.cliente_telefono_completo}', '${p.cliente_nombre_completo}')" class="px-2.5 py-1 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-xl font-bold text-[10px] transition">
              Abonar
            </button>
            <button onclick="cambiarEstadoPedido('${p.id}', 'Entregado')" class="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl font-bold text-[10px] transition">
              Entregar
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

/**
 * Ventana modal interactiva para registrar abonos y actualizar la columna 'pagado'
 */
window.registrarAbonoPedidoModal = function(pedidoId, totalActual, pagadoActual, clienteTelefono = '', clienteNombre = '') {
  const modalAnterior = document.getElementById('modal-abono-interactivo');
  if (modalAnterior) modalAnterior.remove();

  const fechaHoy = new Date().toISOString().split('T')[0];
  const saldoCalculadoActual = Math.max(0, totalActual - pagadoActual);

  const htmlModal = `
    <div id="modal-abono-interactivo" class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div class="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl text-xs animate-fade-in">
        <div class="flex justify-between items-center border-b pb-2">
          <h3 class="text-base font-black text-indigo-700">
            <i class="fa-solid fa-cash-register mr-1"></i> Registrar Abono / Pago
          </h3>
          <button onclick="document.getElementById('modal-abono-interactivo').remove()" class="text-slate-400 hover:text-slate-600 font-bold text-sm">✕</button>
        </div>

        <div class="bg-indigo-50 p-3 rounded-xl space-y-1 text-indigo-900">
          <p><strong>Cliente:</strong> ${clienteNombre}</p>
          <p><strong>Total Pedido:</strong> $${formatMonedaSeguro(totalActual)}</p>
          <p><strong>Ya Pagado:</strong> $${formatMonedaSeguro(pagadoActual)}</p>
          <p class="font-black text-amber-700"><strong>Saldo Actual:</strong> $${formatMonedaSeguro(saldoCalculadoActual)}</p>
        </div>

        <div>
          <label class="font-bold text-slate-700 block mb-1">Monto del Abono ($) *</label>
          <input type="number" step="any" id="input-modal-valor-abono" placeholder="Ej: 50000" class="p-2.5 border rounded-xl w-full font-bold text-indigo-700 bg-slate-50">
        </div>

        <div>
          <label class="font-bold text-slate-700 block mb-1">Fecha del Movimiento *</label>
          <input type="date" id="input-modal-fecha-abono" value="${fechaHoy}" class="p-2.5 border rounded-xl w-full font-bold bg-slate-50">
        </div>

        <div>
          <label class="font-bold text-slate-700 block mb-1">Medio de Pago *</label>
          <select id="input-modal-metodo-abono" class="p-2.5 border rounded-xl w-full font-bold bg-slate-50">
            <option value="Efectivo">Efectivo</option>
            <option value="Nequi">Nequi</option>
            <option value="Bancolombia">Bancolombia</option>
            <option value="Bre-B">Bre-B</option>
            <option value="Addi">Addi</option>
            <option value="Wompi">Wompi</option>
          </select>
        </div>

        <div class="flex justify-end gap-2 pt-3 border-t">
          <button type="button" onclick="document.getElementById('modal-abono-interactivo').remove()" class="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold transition">Cancelar</button>
          <button type="button" id="btn-confirmar-abono-supabase" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl shadow transition">💾 Guardar en Caja & Descontar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', htmlModal);

  document.getElementById('btn-confirmar-abono-supabase').onclick = async () => {
    const valInput = document.getElementById('input-modal-valor-abono').value;
    const fechaInput = document.getElementById('input-modal-fecha-abono').value;
    const metodoInput = document.getElementById('input-modal-metodo-abono').value;

    const valorAbono = parseMontoSeguro(valInput);
    if (valorAbono <= 0) {
      alert("Por favor ingresa un monto de abono válido mayor a 0.");
      return;
    }

    const nuevoPagado = pagadoActual + valorAbono;
    const tax4x1000 = metodoInput.toLowerCase() !== 'efectivo' ? Number((valorAbono * 0.004).toFixed(2)) : 0;

    try {
      const client = window.supabaseClient;
      if (!client) throw new Error("Cliente de Supabase no disponible");

      // 1. Actualizar la columna 'pagado' en Supabase
      const { error: errPedido } = await client
        .from('pedidos')
        .update({ pagado: nuevoPagado })
        .eq('id', pedidoId);

      if (errPedido) throw errPedido;

      // 2. Registrar el ingreso en flujo_caja
      if (typeof SupabaseSync !== 'undefined' && typeof SupabaseSync.insertFlujoCaja === 'function') {
        await SupabaseSync.insertFlujoCaja({
          fecha: fechaInput || fechaHoy,
          tipo: 'INGRESO',
          concepto: `ABONO A PEDIDO REF-${String(pedidoId).slice(0, 6).toUpperCase()}`,
          tercero: clienteNombre || clienteTelefono,
          metodo_pago: metodoInput,
          valor: valorAbono,
          monto: valorAbono,
          impuesto_4x1000: tax4x1000,
          descripcion: `Abono registrado desde panel de pedidos`
        });
      }

      // 3. Descontar en el saldo del cliente
      if (clienteTelefono && clienteTelefono !== 'N/A' && typeof window.updateCustomerBalanceRetroactively === 'function') {
        await window.updateCustomerBalanceRetroactively(clienteTelefono, valorAbono, 'discount');
      }

      document.getElementById('modal-abono-interactivo').remove();
      
      if (typeof showToast === 'function') {
        showToast(`¡Abono registrado con éxito! Saldo descontado correctamente.`);
      }

      window.cargarPedidosAdmin();
      if (typeof window.cargarDashboardAdmin === 'function') window.cargarDashboardAdmin();
      if (typeof window.cargarContabilidad === 'function') window.cargarContabilidad();

    } catch (err) {
      console.error("Error al registrar abono interactivo:", err);
      alert("Error al registrar abono: " + (err.message || err));
    }
  };
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