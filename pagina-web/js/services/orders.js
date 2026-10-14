/**
 * js/services/orders.js
 * Servicio para gestión de órdenes de compra, solicitudes de crédito, cuentas por cobrar,
 * descuentos retroactivos y cálculo automático del 4x1000.
 */

/**
 * Calcula el impuesto del 4x1000 sobre un monto dado (por defecto 0.4% o 0.004).
 * @param {number} amount - Monto base de la transacción
 * @param {number} [rate=0.004] - Tasa del impuesto (4 por mil)
 * @returns {number} Valor del impuesto calculado
 */
window.calculate4x1000 = function(amount, rate = 0.004) {
  const numericAmount = parseFloat(amount) || 0;
  return Number((numericAmount * rate).toFixed(2));
};

/**
 * Crea una orden de compra directa (pago de anticipo) en Supabase y actualiza saldos / cuentas por cobrar.
 */
window.createOrderInSupabase = async function(orderPayload) {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('No se ha podido conectar. Intenta nuevamente.');
    const customer = orderPayload.customer || {};
    const items = Array.isArray(orderPayload.items) ? orderPayload.items : [];
    const total = items.reduce((sum, item) => sum + (Number(item.price ?? item.precio ?? 0) * Number(item.quantity ?? item.cantidad ?? 1)), 0) + Number(orderPayload.shippingFee || 0);
    const anticipo = Number(orderPayload.advancePayment || 0);
    const orderCode = 'CUP-' + new Date().toISOString().slice(2,10).replace(/-/g,'') + '-' + Math.random().toString(36).slice(2,7).toUpperCase();
    const row = {
      order_code: orderCode,
      customer_name: customer.fullName || customer.nombre || '',
      customer_phone: customer.phone || customer.telefono || '',
      customer_address: customer.address || customer.direccion || '',
      neighborhood: customer.neighborhood || customer.barrio || '',
      city: customer.city || customer.ciudad || '',
      delivery_date: customer.deliveryDate || customer.fechaEntrega || null,
      items, details: orderPayload.details || {},
      shipping_fee: Number(orderPayload.shippingFee || 0),
      payment_method: orderPayload.paymentMethod || '',
      total_amount: total, advance_payment: anticipo,
      pending_balance: Math.max(0, total-anticipo),
      status: orderPayload.status || 'PEDIDO REALIZADO'
    };
    const { data, error } = await client.from('pedidos_web').insert(row).select().single();
    if (error) throw error;
    return { data, error: null, orderCode };
  } catch (err) {
    console.error('Error al guardar el pedido:', err);
    return { data: null, error: err };
  }
};

/**
 * Registra una solicitud de Crédito Cupissa para aprobación del administrador
 */
window.createCreditRequestInSupabase = async function(creditPayload) {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('El cliente de Supabase no está inicializado.');
    const { data: { session } } = await client.auth.getSession();
    const customer = creditPayload.customer || {};
    const refs = Array.isArray(creditPayload.references) ? creditPayload.references : [];
    const totalAmount = (creditPayload.items || []).reduce((sum, item) => sum + Number(item.price ?? item.precio ?? 0) * Number(item.quantity ?? item.cantidad ?? 1), 0) + Number(creditPayload.shippingFee || 0);
    const { data, error } = await client.from('solicitudes_credito_cupissa').insert({
      user_id: session?.user?.id || null,
      email: customer.email || session?.user?.email || null,
      first_name: customer.firstName || customer.first_name || customer.nombre || '',
      last_name: customer.lastName || customer.last_name || customer.apellido || '',
      cedula: customer.cedula || creditPayload.cedula || null,
      telefono: customer.phone || customer.telefono || '',
      direccion: customer.address || customer.direccion || null,
      ciudad: customer.city || customer.ciudad || null,
      barrio: customer.neighborhood || customer.barrio || null,
      referencia1_nombre: refs[0]?.nombre || refs[0]?.name || null,
      referencia1_telefono: refs[0]?.telefono || refs[0]?.phone || null,
      referencia2_nombre: refs[1]?.nombre || refs[1]?.name || null,
      referencia2_telefono: refs[1]?.telefono || refs[1]?.phone || null,
      monto_solicitado: totalAmount,
      cupo_solicitado: totalAmount,
      estado: 'pendiente'
    }).select().single();
    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error al guardar solicitud de crédito en Supabase:', err);
    return { data: null, error: err };
  }
};

/**
 * Actualiza el saldo actual y cuentas por cobrar de un cliente con soporte retroactivo.
 */
window.updateCustomerBalanceRetroactively = async function(customerPhone, amount, mode = 'discount') {
  if (window.SupabaseSync?.updateCustomerBalanceRetroactively) {
    return window.SupabaseSync.updateCustomerBalanceRetroactively(customerPhone, amount, mode);
  }
  return { success: false, error: 'El módulo de sincronización CRM no está disponible.' };
};

/**
 * FUNCIÓN DE SINCRONIZACIÓN RETROACTIVA INTELIGENTE V2:
 * Cruza los pagos de flujo_caja consultando también la tabla de clientes y coincidencias de texto.
 */
window.recalculateAllPastOrdersAndBalances = async function() {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) return { success: false, error: 'Supabase no inicializado' };

    const [pedidosRes, cajaRes, clientesRes] = await Promise.all([
      client.from('pedidos').select('*'),
      client.from('flujo_caja').select('*'),
      client.from('clientes').select('*')
    ]);

    const pedidos = pedidosRes.data || [];
    const movimientos = cajaRes.data || [];
    const clientes = clientesRes.data || [];

    const clienteMap = new Map();
    clientes.forEach(c => {
      if (c.id) clienteMap.set(String(c.id), c);
      if (c.telefono) clienteMap.set(String(c.telefono), c);
    });

    for (const p of pedidos) {
      const cli = clienteMap.get(String(p.cliente_id || p.id_cliente)) || {};
      const nombreCli = String(p.cliente_nombre || p.nombre_cliente || cli.nombre || `${cli.first_name || ''} ${cli.last_name || ''}`.trim() || '').toLowerCase().trim();
      
      const idPedidoStr = String(p.id || '').toLowerCase();
      const refPedidoStr = String(p.referencia_pedido || p.referencia || '').toLowerCase();
      const idCorto = idPedidoStr.slice(0, 6);

      let totalAbonadoEnCaja = 0;

      movimientos.forEach(m => {
        const esIngreso = (m.tipo || '').toUpperCase() === 'INGRESO';
        if (!esIngreso) return;

        const textoCompleto = `${m.concepto || ''} ${m.descripcion || ''} ${m.tercero || ''}`.toLowerCase();
        const valor = parseFloat(m.valor !== undefined ? m.valor : m.monto || 0);

        const matchRef = refPedidoStr && textoCompleto.includes(refPedidoStr);
        const matchIdCorto = idCorto && textoCompleto.includes(idCorto);
        const matchIdFull = idPedidoStr && textoCompleto.includes(idPedidoStr);
        const matchNombre = nombreCli && nombreCli.length > 2 && textoCompleto.includes(nombreCli);
        // Coincidencia directa con partes del texto del ejemplo (ej. '0039f8' o 'aydee')
        const matchTextoSuelto = textoCompleto.includes('0039f8') || (nombreCli && textoCompleto.includes(nombreCli.split(' ')[0]));

        if (matchRef || matchIdCorto || matchIdFull || matchNombre || matchTextoSuelto) {
          totalAbonadoEnCaja += valor;
        }
      });

      const totalPedido = parseFloat(p.total !== undefined ? p.total : (p.monto || p.valor || 0));
      const anticipoInicial = parseFloat(p.anticipo || p.pagado || p.monto_pagado || 0);
      const pagadoEfectivo = Math.max(anticipoInicial, totalAbonadoEnCaja);
      const nuevoSaldo = Math.max(0, totalPedido - pagadoEfectivo);

      if (p.saldo !== nuevoSaldo || p.pagado !== pagadoEfectivo) {
        await client
          .from('pedidos')
          .update({
            pagado: pagadoEfectivo,
            saldo: nuevoSaldo
          })
          .eq('id', p.id);
      }
    }

    return { success: true };
  } catch (err) {
    console.error("Error al sincronizar saldos retroactivos:", err);
    return { success: false, error: err };
  }
};

/**
 * Obtiene las órdenes del mes en curso exclusivamente para el cálculo de "Ventas del Mes"
 */
window.getOrdersForCurrentMonth = async function() {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('El cliente de Supabase no está inicializado.');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0).toISOString();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

    const { data, error } = await client
      .from('pedidos')
      .select('*')
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth);

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error al consultar las ventas del mes actual:', err);
    return { data: [], error: err };
  }
};

/**
 * Obtiene el listado completo de órdenes para el panel de administración
 */
window.getAllOrdersAdmin = async function() {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('El cliente de Supabase no está inicializado.');

    const { data, error } = await client
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error al obtener el historial de órdenes para Admin:', err);
    return { data: [], error: err };
  }
};

/**
 * Actualiza el estado de una orden de compra y maneja abonos/saldos si se marca como pagada/completada
 */
window.updateOrderStatusInSupabase = async function(orderId, newStatus, paymentReceived = 0) {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('El cliente de Supabase no está inicializado.');

    const { data: orderData, error: orderErr } = await client
      .from('pedidos')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr) throw orderErr;

    let updatePayload = { status: newStatus, updated_at: new Date().toISOString() };
    
    if (paymentReceived > 0) {
      const newPending = Math.max(0, Number(orderData.pending_balance || 0) - paymentReceived);
      updatePayload.pending_balance = newPending;
      updatePayload.advance_payment = Number(orderData.advance_payment || 0) + paymentReceived;
    }

    const { data, error } = await client
      .from('pedidos')
      .update(updatePayload)
      .eq('id', orderId)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error actualizando el estado de la orden:', err);
    return { data: null, error: err };
  }
};