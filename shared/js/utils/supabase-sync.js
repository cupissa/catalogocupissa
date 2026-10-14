/**
 * js/utils/supabase-sync.js
 * Capa de Sincronización Directa con Tablas Reales de Supabase (Cuentas por Cobrar, 4x1000 y Movimientos)
 */

window.SupabaseSync = {
  /**
   * Obtiene la lista general de clientes del CRM (Tabla 'clientes')
   */
  async getClientes() {
    try {
      if (!(window.supabaseClient || window.supabase)) return [];
      const client = window.supabaseClient || window.supabase;
      const { data, error } = await client
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const { data: altData } = await (window.supabaseClient || window.supabase).from('clientes').select('*');
        return altData || [];
      }
      return data || [];
    } catch (err) {
      console.error('Error al consultar tabla cliente en Supabase:', err);
      return [];
    }
  },

  /** Sincroniza los datos de Auth con la tabla clientes sin sobrescribir cupos ni totales existentes. */
  async syncClienteWeb(profile) {
    const client = window.supabaseClient || window.supabase;
    if (!client || !profile?.user_id) return { success: false, skipped: true };
    const now = new Date().toISOString();
    const has = key => Object.prototype.hasOwnProperty.call(profile, key);
    try {
      const { data: existing, error: lookupError } = await client
        .from('clientes').select('*').eq('user_id', profile.user_id).limit(1).maybeSingle();
      if (lookupError) throw lookupError;
      const old = existing || {};
      const nombre = String(profile.nombre ?? old.nombre ?? '').trim() || 'Cliente Web';
      const direccion = [profile.direccion ?? old.direccion, profile.barrio, profile.ciudad]
        .filter(v => String(v || '').trim()).join(', ') || old.direccion || null;
      const payload = {
        user_id: profile.user_id,
        nombre,
        telefono: String(profile.telefono ?? old.telefono ?? '').trim(),
        email: profile.email ?? old.email ?? null,
        direccion,
        cedula: profile.cedula ?? old.cedula ?? null,
        cupo_credito: Number(has('cupo_credito') ? profile.cupo_credito : (old.cupo_credito || 0)),
        cupo_disponible: Number(has('cupo_disponible') ? profile.cupo_disponible : (old.cupo_disponible ?? profile.cupo_credito ?? 0)),
        deuda_actual: Number(has('deuda_actual') ? profile.deuda_actual : (old.deuda_actual || 0)),
        estado_credito: profile.estado_credito || old.estado_credito || (Number(old.cupo_credito || 0) > 0 ? 'aprobado' : 'sin_credito'),
        pedidos_count: Number(has('pedidos_count') ? profile.pedidos_count : (old.pedidos_count || 0)),
        total_compras: Number(has('total_compras') ? profile.total_compras : (old.total_compras || 0)),
        updated_at: now
      };
      if (existing?.id) {
        const { error } = await client.from('clientes').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const generatedId = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID()
          : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => {
              const r = Math.random() * 16 | 0;
              return (ch === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
        const { error } = await client.from('clientes').insert({ id: generatedId, ...payload, created_at: now });
        if (error) throw error;
      }
      return { success: true };
    } catch (error) {
      console.warn('[Cupissa] No se pudo sincronizar el registro CRM del cliente:', error.message || error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /** Obtiene saldos financiados desde las cuentas reales de Crédito Cupissa. */
  async getCustomerAccounts() {
    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) return [];
      const { data, error } = await client.from('creditos_cupissa_cuentas').select('*');
      if (error) throw error;
      return (data || [])
        .filter(row => String(row.estado || '').toLowerCase() === 'activo')
        .map(row => ({
          ...row,
          current_balance: Math.max(0, Number(row.saldo_pendiente ?? (Number(row.total_credito || 0) - Number(row.total_pagado || 0) - Number(row.cuota_inicial || 0))))
        }))
        .filter(row => row.current_balance > 0);
    } catch (err) {
      console.error('Error al consultar saldos de Crédito Cupissa:', err);
      return [];
    }
  },

  /**
   * Obtiene los usuarios registrados en la Web (Tabla 'profile')
   */
  async getProfilesWeb() {
    try {
      if (!(window.supabaseClient || window.supabase)) return [];
      const client = window.supabaseClient || window.supabase;
      const { data, error } = await client
        .from('profile')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al consultar tabla profile en Supabase:', err);
      return [];
    }
  },

  /**
   * Obtiene los pedidos (Tabla 'pedidos')
   */
  async getPedidos() {
    try {
      if (!(window.supabaseClient || window.supabase)) return [];
      const client = window.supabaseClient || window.supabase;
      const { data, error } = await client
        .from('pedidos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al consultar tabla pedidos en Supabase:', err);
      return [];
    }
  },

  /** Pedidos realizados desde la tienda web; separados de los pedidos internos. */
  async getPedidosWeb() {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('No se ha podido conectar. Intenta nuevamente.');
    const { data, error } = await client.from('pedidos_web').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async insertPedidoWeb(payload) {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('No se ha podido conectar. Intenta nuevamente.');
    const { data, error } = await client.from('pedidos_web').insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  /** Guarda pedidos originados en el catálogo exclusivamente en pedidos_web. */
  async createOrderFromStore(orderPayload, cartItems = []) {
    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('No se ha podido conectar con la tienda.');
      const items = (Array.isArray(cartItems) ? cartItems : []).map(item => ({
        id: item.productId || item.id || null,
        nombre: item.nombre || item.name || item.title || item.nombre_producto || 'Producto',
        cantidad: Number(item.cantidad ?? item.quantity ?? 1),
        precio: Number(item.precioUnitario ?? item.precio ?? item.price ?? 0),
        imagen: item.imagen_original || item.imagen || item.image_url || item.image || '',
        talla: item.talla || item.size || null,
        color: item.color || null,
        opciones: item.opciones || item.personalizacion || {}
      }));
      const total = Number(orderPayload.total || items.reduce((sum, item) => sum + item.cantidad * item.precio, 0));
      const paid = Math.max(0, Number(orderPayload.pagado || orderPayload.advance_payment || 0));
      const orderCode = orderPayload.order_code || ('CUP-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase());
      const customer = orderPayload.customer || {};
      const { data, error } = await client.from('pedidos_web').insert({
        order_code: orderCode,
        user_id: orderPayload.user_id || orderPayload.cliente_id || null,
        customer_name: orderPayload.customer_name || customer.fullName || customer.nombre || '',
        customer_phone: orderPayload.customer_phone || customer.phone || customer.telefono || '',
        customer_address: orderPayload.customer_address || customer.address || customer.direccion || '',
        neighborhood: orderPayload.neighborhood || customer.neighborhood || customer.barrio || '',
        city: orderPayload.city || customer.city || customer.ciudad || '',
        delivery_date: orderPayload.delivery_date || orderPayload.fecha_entrega || customer.deliveryDate || null,
        preparation_days: Number(orderPayload.preparation_days || 0),
        items,
        details: { observaciones: orderPayload.observaciones || '', tipo_operacion: orderPayload.tipo_operacion || 'Venta Web' },
        shipping_fee: Number(orderPayload.domicilio || orderPayload.shipping_fee || 0),
        payment_method: orderPayload.metodo_pago || orderPayload.payment_method || '',
        total_amount: total,
        advance_payment: paid,
        pending_balance: Math.max(0, total - paid),
        status: 'PENDIENTE',
        payment_status: 'PENDIENTE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }).select().single();
      if (error) throw error;
      return { success: true, data, pedido: { ...data, referencia_pedido: data.order_code }, orderCode };
    } catch (error) {
      console.error('No se pudo crear el pedido web:', error);
      return { success: false, error };
    }
  },

  /** Actualiza la deuda del CRM por teléfono; no depende de tablas duplicadas de cuentas. */
  async updateCustomerBalanceRetroactively(customerPhone, amount, mode = 'discount') {
    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Supabase no inicializado.');
      const phone = String(customerPhone || '').trim();
      const value = Number(amount || 0);
      if (!phone || !Number.isFinite(value) || value <= 0) return { success: false, skipped: true };
      const { data: customer, error: findError } = await client.from('clientes').select('*').eq('telefono', phone).limit(1).maybeSingle();
      if (findError) throw findError;
      if (!customer) return { success: false, skipped: true, error: 'Cliente no encontrado en CRM.' };
      const oldDebt = Number(customer.deuda_actual || 0);
      const newDebt = mode === 'add' ? oldDebt + value : Math.max(0, oldDebt - value);
      const payload = { deuda_actual: newDebt, updated_at: new Date().toISOString() };
      if (customer.cupo_credito !== undefined) payload.cupo_disponible = Math.max(0, Number(customer.cupo_credito || 0) - newDebt);
      const { error } = await client.from('clientes').update(payload).eq('id', customer.id);
      if (error) throw error;
      return { success: true, currentBalance: newDebt };
    } catch (error) {
      console.error('No se pudo actualizar la deuda del cliente en CRM:', error);
      return { success: false, error: error.message || String(error) };
    }
  },

  /**
   * Obtiene los movimientos de caja (Tabla 'flujo_caja')
   */
  async getFlujoCaja() {
    try {
      if (!(window.supabaseClient || window.supabase)) return [];
      const client = window.supabaseClient || window.supabase;
      const { data, error } = await client
        .from('flujo_caja')
        .select('*')
        .order('fecha', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al consultar tabla flujo_caja en Supabase:', err);
      return [];
    }
  },

  /**
   * Registra un movimiento en 'flujo_caja' con cálculo automático del 4x1000
   */
  async insertFlujoCaja(movimiento) {
    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Cliente Supabase no disponible');
      
      const rawValor = movimiento.valor !== undefined ? movimiento.valor : (movimiento.monto || 0);
      const valorNum = typeof window.parseMonto === 'function' ? window.parseMonto(rawValor) : (typeof rawValor === 'number' ? rawValor : Number(String(rawValor).replace(/[^0-9,.-]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0);
      if (!Number.isFinite(valorNum) || valorNum <= 0) throw new Error('El valor del movimiento debe ser mayor que cero.');
      const metodo = String(movimiento.metodo_pago || 'Efectivo').trim().toLowerCase();
      // Regla solicitada: únicamente EGRESOS pagados por Nequi causan 4x1000 automático.
      const aplica4x1000 = String(movimiento.tipo || 'INGRESO').toUpperCase() === 'EGRESO' && metodo === 'nequi';
      const impuestoCalculado = aplica4x1000 ? Number((valorNum * 0.004).toFixed(2)) : 0;

      const payload = {
        fecha: movimiento.fecha || new Date().toISOString().split('T')[0],
        tipo: movimiento.tipo || 'INGRESO',
        concepto: movimiento.concepto,
        tercero: movimiento.tercero || '',
        metodo_pago: movimiento.metodo_pago || 'Efectivo',
        valor: valorNum,
        descripcion: movimiento.descripcion || '',
        impuesto_4x1000: impuestoCalculado
      };

      const { data, error } = await client
        .from('flujo_caja')
        .insert([payload])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error al insertar en flujo_caja:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Actualiza el 4x1000 de un registro en 'flujo_caja'
   */
  async update4x1000(id, impuestoVal) {
    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Cliente Supabase no disponible');
      const { error } = await client
        .from('flujo_caja')
        .update({ impuesto_4x1000: window.parseMonto(impuestoVal) })
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error al actualizar 4x1000 en Supabase:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Obtiene los productos de la tienda web (Tabla 'productos_web')
   */
  async getPublicProducts() {
    try {
      if (!(window.supabaseClient || window.supabase)) return [];
      const client = window.supabaseClient || window.supabase;
      const { data, error } = await client
        .from('productos_web')
        .select('*')
        .or('oculto_web.eq.false,oculto_web.is.null')
        .order('nombre', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al consultar productos:', err);
      return [];
    }
  },

  /**
   * Obtiene las deudas programadas (Tabla 'deudas_mensuales')
   */
  async getDeudas() {
    try {
      if (!(window.supabaseClient || window.supabase)) return [];
      const client = window.supabaseClient || window.supabase;
      const { data, error } = await client
        .from('deudas_mensuales')
        .select('*')
        .order('dia_pago', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al consultar deudas_mensuales:', err);
      return [];
    }
  },

  /**
   * Inserta una nueva deuda mensual
   */
  async insertDeuda(deudaPayload) {
    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Cliente Supabase no disponible');
      const { data, error } = await client
        .from('deudas_mensuales')
        .insert([deudaPayload])
        .select();

      if (error) throw error;
      return { success: true, data };
    } catch (err) {
      console.error('Error al insertar deuda:', err);
      return { success: false, error: err.message };
    }
  },

  /**
   * Elimina una deuda mensual
   */
  async deleteDeuda(id) {
    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error('Cliente Supabase no disponible');
      const { error } = await window.supabaseClient
        .from('deudas_mensuales')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (err) {
      console.error('Error al eliminar deuda:', err);
      return { success: false, error: err.message };
    }
  }
};
window.updateCustomerBalanceRetroactively = (...args) => window.SupabaseSync.updateCustomerBalanceRetroactively(...args);
