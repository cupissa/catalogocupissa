/**
 * js/modules/admin/web/web-clients.js
 * Directorio de Clientes Registrados en la Tienda, Historial de Pedidos y Gestión de Crédito en Supabase
 */

window.webClientsCache = [];

/**
 * Carga los perfiles reales desde la tabla 'profile' y cruza sus pedidos desde 'pedidos'
 */
window.cargarClientesWeb = async function() {
  const tbody = document.getElementById('tabla-clientes-web');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-8 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-lg mb-2"></i>
        <p>Sincronizando perfiles de clientes reales con Supabase...</p>
      </td>
    </tr>
  `;

  try {
    // 1. Obtener perfiles de usuarios registrados en la tienda
    const { data: perfiles, error: profErr } = await supabaseClient
      .from('profile')
      .select('*')
      .order('first_name', { ascending: true });

    if (profErr) throw profErr;

    // 2. Obtener pedidos reales para cálculo de historial y deudas
    const { data: pedidos, error: pedErr } = await supabaseClient
      .from('pedidos')
      .select('*');

    if (pedErr) console.warn('Error al obtener pedidos para clientes web:', pedErr);

    const listaPedidos = pedidos || [];

    // 3. Vincular historial de compras a cada cliente
    window.webClientsCache = (perfiles || []).map(cli => {
      const pedsCliente = listaPedidos.filter(p => p.cliente_id === cli.id || p.user_id === cli.id);
      const totalComprado = pedsCliente.reduce((acc, p) => acc + parseMonto(p.total || 0), 0);
      const saldoDeuda = pedsCliente.reduce((acc, p) => acc + (parseMonto(p.total || 0) - parseMonto(p.pagado || 0)), 0);

      return {
        ...cli,
        pedidosCount: pedsCliente.length,
        totalComprado,
        saldoDeuda,
        pedidos: pedsCliente
      };
    });

    window.renderizarTablaClientesWeb(window.webClientsCache);
  } catch (err) {
    console.error("Error al cargar clientes desde Supabase:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-red-500 font-bold">
          Error al sincronizar clientes desde la base de datos.
        </td>
      </tr>
    `;
  }
};

/**
 * Renderiza el directorio de clientes con estado de crédito e indicadores clave
 */
window.renderizarTablaClientesWeb = function(lista) {
  const tbody = document.getElementById('tabla-clientes-web');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400">
          No hay clientes registrados en la tienda online o no coinciden con la búsqueda.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(c => {
    const nombreComp = `${c.first_name || c.nombre || 'Cliente'} ${c.last_name || ''}`.trim();
    const cupoAprobado = parseMonto(c.cupo_credito || 0);
    const estadoCredito = c.estado_credito || 'sin_solicitud';

    let badgeCredito = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Sin Crédito</span>`;
    if (estadoCredito === 'aprobado') {
      badgeCredito = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">Aprobado ($${formatMoneda(cupoAprobado)})</span>`;
    } else if (estadoCredito === 'pendiente') {
      badgeCredito = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 animate-pulse">Por Aprobar</span>`;
    } else if (estadoCredito === 'rechazado') {
      badgeCredito = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800">Rechazado</span>`;
    }

    return `
      <tr class="border-b hover:bg-slate-50/80 transition-colors">
        <td class="p-3">
          <div class="font-bold text-slate-900">${nombreComp}</div>
          <div class="text-[10px] text-slate-400">${c.email || 'Sin correo registrado'}</div>
        </td>
        <td class="p-3 text-xs">
          <div><i class="fa-solid fa-phone text-indigo-500 mr-1"></i> ${c.telefono || c.phone || 'N/A'}</div>
          <div class="text-[10px] text-slate-500"><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i> ${c.direccion || c.city || 'Barranquilla'}</div>
        </td>
        <td class="p-3 text-center font-bold text-indigo-700">
          ${c.pedidosCount}
        </td>
        <td class="p-3">
          <div class="font-black text-emerald-600">$${formatMoneda(c.totalComprado)}</div>
          ${c.saldoDeuda > 0 ? `<div class="text-[10px] font-bold text-red-600">Debe: $${formatMoneda(c.saldoDeuda)}</div>` : ''}
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

/**
 * Buscador inteligente en tiempo real para el directorio de clientes
 */
window.filtrarClientesWeb = function() {
  const query = (document.getElementById('buscador-clientes-web')?.value || '').toLowerCase().trim();
  if (!query) {
    window.renderizarTablaClientesWeb(window.webClientsCache);
    return;
  }

  const filtrados = window.webClientsCache.filter(c => {
    const nombre = `${c.first_name || ''} ${c.last_name || ''} ${c.nombre || ''}`.toLowerCase();
    const email = (c.email || '').toLowerCase();
    const tel = (c.telefono || c.phone || '').toLowerCase();
    const dir = (c.direccion || '').toLowerCase();

    return nombre.includes(query) || email.includes(query) || tel.includes(query) || dir.includes(query);
  });

  window.renderizarTablaClientesWeb(filtrados);
};

/**
 * Abre la ficha interactiva del cliente, muestra su historial de compras reales y permite aprobar o ajustar cupos de crédito
 */
window.verDetalleClienteWeb = function(clienteId) {
  const cliente = window.webClientsCache.find(c => c.id === clienteId);
  if (!cliente) return;

  const modal = document.getElementById('modal-detalle-cliente-web');
  if (!modal) return;

  const nombreComp = `${cliente.first_name || cliente.nombre || 'Cliente'} ${cliente.last_name || ''}`.trim();
  document.getElementById('cli-web-modal-nombre').textContent = nombreComp;
  document.getElementById('cli-web-modal-email').textContent = cliente.email || 'Sin Correo';
  document.getElementById('cli-web-modal-tel').textContent = cliente.telefono || cliente.phone || 'Sin Teléfono';
  document.getElementById('cli-web-modal-dir').textContent = cliente.direccion || 'Sin Dirección';
  document.getElementById('cli-web-id-hidden').value = cliente.id;

  // Cargar crédito actual desde Supabase
  document.getElementById('cli-web-cupo-input').value = cliente.cupo_credito || 0;
  document.getElementById('cli-web-estado-credito-select').value = cliente.estado_credito || 'sin_solicitud';
  document.getElementById('cli-web-fecha-pago-input').value = cliente.fecha_limite_pago || '';

  // Renderizar lista de pedidos reales del cliente
  const pedsContainer = document.getElementById('cli-web-modal-pedidos-list');
  if (pedsContainer) {
    if (cliente.pedidos.length === 0) {
      pedsContainer.innerHTML = `<p class="text-slate-400 text-xs italic py-4 text-center">Este cliente aún no registra compras o pedidos en la tienda.</p>`;
    } else {
      pedsContainer.innerHTML = cliente.pedidos.map(p => `
        <div class="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-xs">
          <div>
            <span class="font-bold text-indigo-900">Ref: ${p.referencia_pedido || p.id.slice(0, 6)}</span>
            <span class="text-slate-400 block text-[10px]">${new Date(p.created_at || p.fecha_agendamiento).toLocaleDateString('es-CO')}</span>
          </div>
          <div class="text-right">
            <span class="font-black text-slate-800">$${formatMoneda(parseMonto(p.total))}</span>
            <span class="block text-[10px] font-bold ${p.estado === 'Entregado' || p.estado === 'Finalizado' ? 'text-emerald-600' : 'text-amber-600'}">${p.estado}</span>
          </div>
        </div>
      `).join('');
    }
  }

  modal.classList.remove('hidden');
};

/**
 * Guarda o actualiza la condición de crédito del cliente en la tabla 'profile' de Supabase
 */
window.guardarCreditoClienteWeb = async function(e) {
  if (e) e.preventDefault();

  const clienteId = document.getElementById('cli-web-id-hidden').value;
  const cupo_credito = parseMonto(document.getElementById('cli-web-cupo-input').value);
  const estado_credito = document.getElementById('cli-web-estado-credito-select').value;
  const fecha_limite_pago = document.getElementById('cli-web-fecha-pago-input').value || null;

  try {
    const { error } = await supabaseClient
      .from('profile')
      .update({
        cupo_credito,
        estado_credito,
        fecha_limite_pago,
        updated_at: new Date().toISOString()
      })
      .eq('id', clienteId);

    if (error) throw error;

    if (typeof showToast === 'function') showToast("Cupo de crédito actualizado en Supabase.");
    document.getElementById('modal-detalle-cliente-web').classList.add('hidden');
    window.cargarClientesWeb();
  } catch (err) {
    console.error("Error al actualizar crédito en Supabase:", err);
    if (typeof showToast === 'function') showToast("Error al guardar los datos de crédito.", "error");
  }
};