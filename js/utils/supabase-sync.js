/**
 * js/utils/supabase-sync.js
 * Utilidades de Sincronización en Tiempo Real entre la Tienda Cliente y Supabase
 */

window.SupabaseSync = {
  /**
   * Obtiene todos los productos visibles para el catálogo cliente (no ocultos)
   */
  async getPublicProducts() {
    try {
      if (typeof supabaseClient === 'undefined' || !supabaseClient) {
        console.warn('Supabase Client no disponible.');
        return [];
      }

      const { data, error } = await supabaseClient
        .from('productos')
        .select('*')
        .or('oculto_web.eq.false,oculto_web.is.null')
        .order('nombre', { ascending: true });

      if (error) {
        console.error('Error al sincronizar productos con Supabase:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Excepción en getPublicProducts:', err);
      return [];
    }
  },

  /**
   * Obtiene o actualiza el perfil completo de un cliente autenticado desde la tabla 'profile'
   */
  async syncUserProfile(userId) {
    if (!userId || typeof supabaseClient === 'undefined') return null;

    try {
      const { data, error } = await supabaseClient
        .from('profile')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error obteniendo perfil desde Supabase:', error);
        return null;
      }

      return data;
    } catch (err) {
      console.error('Excepción en syncUserProfile:', err);
      return null;
    }
  },

  /**
   * Obtiene el historial de pedidos de un cliente específico
   */
  async getClientOrders(userId) {
    if (!userId || typeof supabaseClient === 'undefined') return [];

    try {
      const { data, error } = await supabaseClient
        .from('pedidos')
        .select('*')
        .or(`cliente_id.eq.${userId},user_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error cargando historial de pedidos:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Excepción en getClientOrders:', err);
      return [];
    }
  },

  /**
   * Registra un nuevo pedido en las tablas 'pedidos' y 'detalle_pedido' de Supabase
   */
  async createOrderFromStore(orderData, items) {
    if (typeof supabaseClient === 'undefined') {
      throw new Error('Supabase no está configurado.');
    }

    try {
      const referenciaGen = 'CUP-' + Math.floor(100000 + Math.random() * 900000);

      const payloadPedido = {
        referencia_pedido: referenciaGen,
        cliente_id: orderData.cliente_id || null,
        user_id: orderData.user_id || null,
        tipo_operacion: orderData.tipo_operacion || 'Venta Contado',
        total: parseMonto(orderData.total),
        pagado: parseMonto(orderData.pagado || 0),
        domicilio: parseMonto(orderData.domicilio || 0),
        estado: 'Pendiente',
        estado_pago: parseMonto(orderData.pagado || 0) >= parseMonto(orderData.total) ? 'Pagado' : 'Pendiente',
        fecha_agendamiento: orderData.fecha_agendamiento || new Date().toISOString().split('T')[0],
        fecha_entrega: orderData.fecha_entrega || new Date().toISOString().split('T')[0],
        metodo_pago: orderData.metodo_pago || 'Efectivo',
        created_at: new Date().toISOString()
      };

      const { data: pedidoIns, error: pErr } = await supabaseClient
        .from('pedidos')
        .insert([payloadPedido])
        .select();

      if (pErr || !pedidoIns || pedidoIns.length === 0) {
        throw pErr || new Error('No se pudo insertar el pedido.');
      }

      const pedidoId = pedidoIns[0].id;

      // Insertar detalle del pedido
      if (items && items.length > 0) {
        const detallesPayload = items.map(item => ({
          pedido_id: pedidoId,
          producto_id: item.producto_id || null,
          nombre_producto: item.nombre || item.nombre_producto,
          cantidad: item.cantidad || 1,
          precio_unitario: parseMonto(item.precio || item.precio_unitario),
          personalizacion: item.personalizacion || null
        }));

        const { error: dErr } = await supabaseClient
          .from('detalle_pedido')
          .insert(detallesPayload);

        if (dErr) console.error('Error guardando detalle del pedido:', dErr);
      }

      return { success: true, pedido: pedidoIns[0] };
    } catch (err) {
      console.error('Error al procesar pedido en Supabase:', err);
      return { success: false, error: err };
    }
  }
};