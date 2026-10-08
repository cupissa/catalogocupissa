/**
 * js/modules/admin/admin-orders.js
 * Módulo de Pedidos, CRM y Gestión de Clientes en el Panel Administrativo
 */

window.carritoAdmin = [];

/**
 * Poblar el selector de clientes existentes en el formulario de pedidos
 */
window.poblarSelectClientes = function() {
  const sel = document.getElementById('select-cliente-existente');
  if (!sel) return;
  sel.innerHTML = '<option value="">👤 Seleccionar cliente registrado...</option>';
  const clientes = window.clientesCache || [];
  clientes.forEach(c => {
    sel.innerHTML += `<option value="${c.id}">${c.nombre} (${c.telefono || 'Sin telf'})</option>`;
  });
};

/**
 * Autocompletar formulario con los datos del cliente seleccionado
 */
window.autocompletarClienteExistente = function() {
  const sel = document.getElementById('select-cliente-existente');
  if (!sel || !sel.value) return;
  const c = (window.clientesCache || []).find(x => x.id === sel.value);
  if (c) {
    document.getElementById('cli-id-seleccionado').value = c.id;
    document.getElementById('cli-nombre').value = c.nombre || '';
    document.getElementById('cli-telefono').value = c.telefono || '';
    document.getElementById('cli-direccion').value = c.direccion || '';
    document.getElementById('cli-email-cc').value = c.email || '';
  }
};

/**
 * Busca coincidencia de cliente por teléfono ingresado
 */
window.buscarClientePorTelefono = function() {
  const input = document.getElementById('cli-telefono');
  if (!input) return;
  const tel = input.value.trim();
  if (tel.length < 5) return;
  const c = (window.clientesCache || []).find(x => (x.telefono || '').includes(tel));
  if (c) {
    document.getElementById('cli-id-seleccionado').value = c.id;
    document.getElementById('cli-nombre').value = c.nombre || '';
    document.getElementById('cli-direccion').value = c.direccion || '';
    document.getElementById('cli-email-cc').value = c.email || '';
  }
};

/**
 * Filtra sugerencias de productos para agregar al pedido
 */
window.filtrarInvPedido = function() {
  const input = document.getElementById('buscador-prod-pedido');
  const box = document.getElementById('sugerencias-inv-box');
  if (!input || !box) return;

  const q = input.value.toLowerCase().trim();
  if (!q) { box.classList.add('hidden'); return; }

  const productos = window.productosCache || [];
  let matches = productos.filter(p => (p.nombre || '').toLowerCase().includes(q) || (p.referencia || '').toLowerCase().includes(q));
  if (matches.length === 0) { box.classList.add('hidden'); return; }

  box.innerHTML = '';
  matches.forEach(p => {
    box.innerHTML += `
      <div onclick='seleccionarProdParaItem(${JSON.stringify(p)})' class="p-2 hover:bg-indigo-50 cursor-pointer border-b text-xs flex justify-between">
        <span><strong>${p.nombre}</strong> (${p.mundo || 'General'})</span>
        <span class="text-indigo-600 font-bold">$${formatMoneda(parseMonto(p.precio_detal || 0))}</span>
      </div>
    `;
  });
  box.classList.remove('hidden');
};

/**
 * Selecciona un producto del autocompletado para el ítem del pedido
 */
window.seleccionarProdParaItem = function(p) {
  window.productoSeleccionadoCache = p;
  document.getElementById('buscador-prod-pedido').value = p.nombre;
  document.getElementById('item-nombre').value = p.nombre;
  window.actualizarPrecioItem();
  const box = document.getElementById('sugerencias-inv-box');
  if (box) box.classList.add('hidden');
};

/**
 * Actualiza el precio según sea detal o mayorista
 */
window.actualizarPrecioItem = function() {
  if (!window.productoSeleccionadoCache) return;
  const tipoP = document.getElementById('select-tipo-precio')?.value || 'detal';
  let precio = tipoP === 'detal' ? window.productoSeleccionadoCache.precio_detal : window.productoSeleccionadoCache.precio_mayorista;
  const priceInput = document.getElementById('item-precio');
  if (priceInput) priceInput.value = precio || 0;
};

/**
 * Agrega un ítem a la lista temporal del pedido
 */
window.agregarItemPedidoAdmin = function() {
  const nombre = document.getElementById('item-nombre')?.value.trim();
  const precio = parseMonto(document.getElementById('item-precio')?.value);
  const cantidad = parseFloat(document.getElementById('item-cantidad')?.value) || 1;

  if (!nombre || precio <= 0) {
    if (typeof showToast === 'function') showToast("Ingresa un nombre y precio válido para el ítem", "error");
    return;
  }

  window.carritoAdmin.push({
    producto_id: window.productoSeleccionadoCache ? window.productoSeleccionadoCache.id : null,
    nombre_producto: nombre,
    precio_unitario: precio,
    cantidad: cantidad,
    subtotal: precio * cantidad
  });

  window.productoSeleccionadoCache = null;
  document.getElementById('item-nombre').value = '';
  document.getElementById('item-precio').value = '';
  document.getElementById('buscador-prod-pedido').value = '';
  window.renderizarCarritoAdmin();
};

/**
 * Renderiza los ítems agregados al pedido actual
 */
window.renderizarCarritoAdmin = function() {
  const tbody = document.getElementById('tabla-carrito-admin');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (window.carritoAdmin.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-400 text-xs">No hay ítems agregados.</td></tr>`;
    window.calcularTotalAdmin();
    return;
  }

  window.carritoAdmin.forEach((item, idx) => {
    tbody.innerHTML += `
      <tr class="border-b">
        <td class="p-2 font-bold">${item.nombre_producto}</td>
        <td class="p-2">${item.cantidad}</td>
        <td class="p-2">$${formatMoneda(item.precio_unitario)}</td>
        <td class="p-2 font-black">$${formatMoneda(item.subtotal)}</td>
        <td class="p-2"><button type="button" onclick="window.carritoAdmin.splice(${idx},1);window.renderizarCarritoAdmin();" class="text-red-600 font-bold">🗑️</button></td>
      </tr>
    `;
  });
  window.calcularTotalAdmin();
};

/**
 * Calcula total, anticipo y saldo del pedido en tiempo real
 */
window.calcularTotalAdmin = function() {
  let subtotalCarrito = window.carritoAdmin.reduce((acc, i) => acc + i.subtotal, 0);
  let domicilio = parseMonto(document.getElementById('ped-domicilio')?.value);
  let total = subtotalCarrito + domicilio;
  let anticipo = parseMonto(document.getElementById('ped-anticipo')?.value);
  let saldo = total - anticipo;

  const lblTotal = document.getElementById('lbl-total-admin');
  const lblSaldo = document.getElementById('lbl-saldo-admin');
  if (lblTotal) lblTotal.innerText = `$${formatMoneda(total)}`;
  if (lblSaldo) lblSaldo.innerText = `$${formatMoneda(saldo)}`;
};

/**
 * Carga y renderiza la lista general de pedidos y alertas
 */
window.cargarPedidosAdmin = async function() {
  const tbody = document.getElementById('tabla-pedidos-gral');
  const tbodyAlertas = document.getElementById('tabla-alertas-dashboard');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (tbodyAlertas) tbodyAlertas.innerHTML = '';

  let filtroEstado = document.getElementById('filtro-estado-pedidos')?.value || 'todos';
  let busq = (document.getElementById('buscador-pedidos-gral')?.value || document.getElementById('buscador-alertas')?.value || '').toLowerCase();

  const pedidos = window.pedidosCache || [];
  const clientes = window.clientesCache || [];

  let filtrados = pedidos.filter(p => {
    let cli = clientes.find(c => c.id === p.cliente_id) || {};
    let okE = filtroEstado === 'todos' || p.estado === filtroEstado;
    let okB = !busq || (cli.nombre || '').toLowerCase().includes(busq) || p.id.toLowerCase().includes(busq);
    return okE && okB;
  });

  let ventasMes = 0, porCobrar = 0;
  let mesActual = new Date().getMonth();

  filtrados.forEach(p => {
    let cli = clientes.find(c => c.id === p.cliente_id) || { nombre: 'Cliente General', telefono: '' };
    let total = parseMonto(p.total || 0);
    let pagado = parseMonto(p.pagado || 0);
    let saldo = total - pagado;

    if (new Date(p.fecha_agendamiento).getMonth() === mesActual) {
      ventasMes += total;
    }
    porCobrar += saldo;

    let badgeEstado = `bg-amber-100 text-amber-800`;
    if (p.estado === 'Entregado' || p.estado === 'Finalizado') badgeEstado = 'bg-emerald-100 text-emerald-800';
    if (p.estado === 'Cancelado') badgeEstado = 'bg-red-100 text-red-800';

    let filaHtml = `
      <tr class="border-b">
        <td class="p-2.5 font-bold text-indigo-900">${p.id.slice(0, 6)}<br><span class="text-[10px] font-normal text-slate-400">Entrega: ${p.fecha_entrega || 'N/A'}</span></td>
        <td class="p-2.5"><strong>${cli.nombre}</strong><br><span class="text-[10px] text-slate-500">📞 ${cli.telefono || 'Sin telf'}</span></td>
        <td class="p-2.5">${p.tipo_operacion}<br><span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${badgeEstado}">${p.estado}</span></td>
        <td class="p-2.5">Total: <strong>$${formatMoneda(total)}</strong><br><span class="text-amber-600 font-bold">Saldo: $${formatMoneda(saldo)}</span></td>
        <td class="p-2.5 flex gap-1">
          <button onclick="cambiarEstadoPedido('${p.id}', 'Entregado')" class="bg-emerald-50 hover:bg-emerald-100 p-1.5 rounded text-emerald-700 font-bold text-[10px]">Entregar</button>
          <button onclick="cambiarEstadoPedido('${p.id}', 'Cancelado')" class="bg-red-50 hover:bg-red-100 p-1.5 rounded text-red-700 font-bold text-[10px]">Cancelar</button>
        </td>
      </tr>
    `;
    tbody.innerHTML += filaHtml;

    if (p.estado === 'Pendiente' && tbodyAlertas) {
      tbodyAlertas.innerHTML += filaHtml;
    }
  });

  const statVentas = document.getElementById('stat-ventas-mes');
  const statCobrar = document.getElementById('stat-por-cobrar');
  if (statVentas) statVentas.innerText = `$${formatMoneda(ventasMes)}`;
  if (statCobrar) statCobrar.innerText = `$${formatMoneda(porCobrar)}`;
};

/**
 * Cambia el estado del pedido en Supabase
 */
window.cambiarEstadoPedido = async function(id, nuevoEstado) {
  try {
    const { error } = await supabaseClient.from('pedidos').update({ estado: nuevoEstado }).eq('id', id);
    if (error) throw error;
    if (typeof showToast === 'function') showToast(`Pedido actualizado a ${nuevoEstado}`);
    if (typeof cargarDatosGlobales === 'function') cargarDatosGlobales();
  } catch (err) {
    console.error("Error cambiando estado de pedido:", err);
    if (typeof showToast === 'function') showToast("Error al actualizar pedido", "error");
  }
};

/**
 * Inicializador de escuchadores del formulario de creación de pedidos
 */
window.initAdminOrdersForm = function() {
  const form = document.getElementById('form-pedido-admin');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (window.carritoAdmin.length === 0) {
      if (typeof showToast === 'function') showToast("Agrega al menos un ítem al pedido", "error");
      return;
    }

    const nombre = document.getElementById('cli-nombre').value.trim();
    const telefono = document.getElementById('cli-telefono').value.trim();
    const direccion = document.getElementById('cli-direccion').value.trim();
    const emailCc = document.getElementById('cli-email-cc').value.trim();
    let cliId = document.getElementById('cli-id-seleccionado').value;

    try {
      if (!cliId) {
        const { data: cIns, error: cErr } = await supabaseClient.from('clientes').insert([{
          nombre, telefono, direccion, email: emailCc
        }]).select();
        if (cErr) throw cErr;
        if (cIns && cIns.length > 0) cliId = cIns[0].id;
      }

      let subtotalCarrito = window.carritoAdmin.reduce((acc, i) => acc + i.subtotal, 0);
      let domicilio = parseMonto(document.getElementById('ped-domicilio').value);
      let total = subtotalCarrito + domicilio;
      let pagado = parseMonto(document.getElementById('ped-anticipo').value);
      let costoManual = parseMonto(document.getElementById('ped-costo-manual').value);
      let fechaAgendamiento = document.getElementById('ped-fecha-agendamiento').value;
      let fechaEntrega = document.getElementById('ped-fecha-entrega').value;
      let tipoOp = document.getElementById('ped-tipo').value;
      let metodoPago = document.getElementById('ped-metodo').value;

      const referenciaGenerada = 'CUP-' + Math.floor(1000 + Math.random() * 9000);

      const { data: pIns, error: pErr } = await supabaseClient.from('pedidos').insert([{
        referencia_pedido: referenciaGenerada,
        cliente_id: cliId,
        tipo_operacion: tipoOp,
        total: total,
        pagado: pagado,
        domicilio: domicilio,
        costo_produccion_manual: costoManual,
        estado_pago: pagado >= total ? 'Pagado' : (pagado > 0 ? 'Abonado' : 'Pendiente'),
        estado: 'Pendiente',
        fecha_agendamiento: fechaAgendamiento,
        fecha_entrega: fechaEntrega
      }]).select();

      if (pErr || !pIns) throw pErr;

      let pedidoId = pIns[0].id;

      for (let item of window.carritoAdmin) {
        await supabaseClient.from('detalle_pedido').insert([{
          pedido_id: pedidoId,
          producto_id: item.producto_id,
          nombre_producto: item.nombre_producto,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario
        }]);

        if (item.producto_id && document.getElementById('ped-descontar-stock').value === 'si') {
          let prod = (window.productosCache || []).find(x => x.id === item.producto_id);
          if (prod && !prod.sin_stock) {
            let nuevoStock = Math.max(0, (prod.stock || 0) - item.cantidad);
            await supabaseClient.from('productos').update({ stock: nuevoStock }).eq('id', item.producto_id);
          }
        }
      }

      if (pagado > 0) {
        await supabaseClient.from('flujo_caja').insert([{
          fecha: new Date().toISOString().split('T')[0],
          tipo: 'INGRESO',
          concepto: 'Anticipo/Pago Pedido Ref: ' + pedidoId.slice(0, 6),
          tercero: nombre,
          metodo_pago: metodoPago,
          valor: pagado
        }]);
      }

      if (typeof showToast === 'function') showToast("¡Pedido guardado y sincronizado con éxito!");
      window.carritoAdmin = [];
      window.renderizarCarritoAdmin();
      form.reset();
      if (typeof cargarDatosGlobales === 'function') cargarDatosGlobales();
    } catch (err) {
      console.error("Error guardando pedido:", err);
      if (typeof showToast === 'function') showToast("Error al guardar pedido en Supabase", "error");
    }
  });
};