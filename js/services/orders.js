/**
 * Crea una orden de compra directa (pago de anticipo) en Supabase
 */
window.createOrderInSupabase = async function(orderPayload) {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    const userId = session?.user?.id || null;

    const { data, error } = await supabaseClient
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
    const { data: { session } } = await supabaseClient.auth.getSession();
    const userId = session?.user?.id || null;

    const { data, error } = await supabaseClient
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
          status: 'pending_approval' // Espera aprobación del Admin
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