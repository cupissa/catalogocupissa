/**
 * js/utils/supabase-sync.js
 * Capa de Sincronización Directa con Tablas Reales de Supabase
 */

window.SupabaseSync = {
  /**
   * Obtiene la lista general de clientes del CRM (Tabla 'cliente')
   */
  async getClientes() {
    try {
      if (!window.supabaseClient) return [];
      const { data, error } = await window.supabaseClient
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Fallback si la columna created_at varía
        const { data: altData } = await window.supabaseClient.from('clientes').select('*');
        return altData || [];
      }
      return data || [];
    } catch (err) {
      console.error('Error al consultar tabla cliente en Supabase:', err);
      return [];
    }
  },

  /**
   * Obtiene los usuarios registrados en la Web (Tabla 'profile')
   */
  async getProfilesWeb() {
    try {
      if (!window.supabaseClient) return [];
      const { data, error } = await window.supabaseClient
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
      if (!window.supabaseClient) return [];
      const { data, error } = await window.supabaseClient
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

  /**
   * Obtiene los movimientos de caja (Tabla 'flujo_caja')
   */
  async getFlujoCaja() {
    try {
      if (!window.supabaseClient) return [];
      const { data, error } = await window.supabaseClient
        .from('flujo_caja')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al consultar tabla flujo_caja en Supabase:', err);
      return [];
    }
  },

  /**
   * Registra un movimiento en 'flujo_caja'
   */
  async insertFlujoCaja(movimiento) {
    try {
      if (!window.supabaseClient) throw new Error('Cliente Supabase no disponible');
      
      const valorNum = window.parseMonto(movimiento.valor !== undefined ? movimiento.valor : movimiento.monto || 0);
      const payload = {
        fecha: movimiento.fecha || new Date().toISOString().split('T')[0],
        tipo: movimiento.tipo || 'INGRESO',
        concepto: movimiento.concepto,
        tercero: movimiento.tercero || '',
        metodo_pago: movimiento.metodo_pago || 'Efectivo',
        valor: valorNum,
        monto: valorNum,
        descripcion: movimiento.descripcion || '',
        impuesto_4x1000: movimiento.impuesto_4x1000 || 0
      };

      const { data, error } = await window.supabaseClient
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
      if (!window.supabaseClient) throw new Error('Cliente Supabase no disponible');
      const { error } = await window.supabaseClient
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
   * Obtiene los productos (Tabla 'productos')
   */
  async getPublicProducts() {
    try {
      if (!window.supabaseClient) return [];
      const { data, error } = await window.supabaseClient
        .from('productos')
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
      if (!window.supabaseClient) return [];
      const { data, error } = await window.supabaseClient
        .from('deudas_mensuales')
        .select('*')
        .order('dia_pago', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Error al consultar deudas_mensuales:', err);
      return [];
    }
  }
};