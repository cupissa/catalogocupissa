/**
 * js/services/orders.js
 * Servicio para gestión de órdenes de compra, solicitudes de crédito y métricas de ventas
 */

/**
 * Crea una orden de compra directa (pago de anticipo) en Supabase
 */
window.createOrderInSupabase = async function(orderPayload) {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('El cliente de Supabase no está inicializado.');

    const { data: { session } } = await client.auth.getSession();
    const userId = session?.user?.id || null;

    const { data, error } = await client
      .from('orders')
      .insert([
        {
          user_id: userId,
          customer_name: orderPayload.customer.fullName,
          customer_phone: orderPayload.customer.phone,
          customer_address: orderPayload.customer.address,
          city: orderPayload.customer.city,
          neighborhood: orderPayload.customer.neighborhood,
          delivery_date: orderPayload.customer.deliveryDate,
          shipping_fee: orderPayload.shippingFee,
          payment_method: orderPayload.paymentMethod,
          items: orderPayload.items,
          status: orderPayload.status || 'pending_advance_payment'
        }
      ])
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error guardando la orden en Supabase:', err);
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
    const userId = session?.user?.id || null;

    const { data, error } = await client
      .from('credit_requests')
      .insert([
        {
          user_id: userId,
          customer_name: creditPayload.customer.fullName,
          customer_phone: creditPayload.customer.phone,
          customer_address: creditPayload.customer.address,
          city: creditPayload.customer.city,
          neighborhood: creditPayload.customer.neighborhood,
          delivery_date: creditPayload.customer.deliveryDate,
          document_id: creditPayload.document_id,
          references: creditPayload.references,
          shipping_fee: creditPayload.shippingFee,
          interest_rate: creditPayload.interestRate,
          items: creditPayload.items,
          status: 'pending_approval'
        }
      ])
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error al guardar solicitud de crédito en Supabase:', err);
    return { data: null, error: err };
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
      .from('orders')
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
      .from('orders')
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
 * Actualiza el estado de una orden de compra
 */
window.updateOrderStatusInSupabase = async function(orderId, newStatus) {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('El cliente de Supabase no está inicializado.');

    const { data, error } = await client
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Error actualizando el estado de la orden:', err);
    return { data: null, error: err };
  }
};