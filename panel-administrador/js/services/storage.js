/**
 * ==========================================================================
 * MÓDULO DE ALMACENAMIENTO Y PERSISTENCIA (STORAGE) - CUPISSA S.A.S.
 * Maneja la subida de archivos a Supabase Storage y la persistencia local de clientes.
 * ==========================================================================
 */

/**
 * Sube la imagen seleccionada del producto a Supabase Storage y retorna la URL pública
 * @param {File} file - Archivo capturado desde el input type="file"
 * @param {string} bucket - Nombre del bucket en Supabase Storage (por defecto 'productos')
 * @returns {Promise<string>} URL pública de la imagen
 */
window.uploadProductImage = async function(file, bucket = 'productos') {
  if (!file) {
    throw new Error('No se seleccionó ningún archivo de imagen.');
  }

  const client = window.supabaseClient || window.supabase;
  if (!client) {
    throw new Error('Cliente Supabase no disponible.');
  }

  // Generar nombre de archivo único para evitar sobrescribir existentes
  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
  const filePath = `catalog/${fileName}`;

  // Subir archivo al bucket
  const { data, error } = await client.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Error al subir imagen a Supabase Storage:', error.message);
    throw new Error(`Error en el servidor de imágenes: ${error.message}`);
  }

  // Obtener URL pública
  const { data: publicUrlData } = client.storage
    .from(bucket)
    .getPublicUrl(filePath);

  return publicUrlData.publicUrl;
};

/**
 * Utilidades de almacenamiento local (Local Storage) para el perfil del cliente,
 * créditos y pedidos dentro del ecosistema Cupissa.
 */
window.CupissaStorage = {
  /**
   * Obtiene los datos del cliente autenticado actual.
   * @returns {Object}
   */
  getClientUser() {
    try {
      return JSON.parse(localStorage.getItem("cupissa_client_user") || "{}");
    } catch (e) {
      return {};
    }
  },

  /**
   * Guarda o actualiza los datos del cliente en almacenamiento local.
   * @param {Object} userData 
   */
  setClientUser(userData) {
    localStorage.setItem("cupissa_client_user", JSON.stringify(userData));
  },

  /**
   * Obtiene la lista de pedidos guardados.
   * @returns {Array}
   */
  getOrders() {
    try {
      return JSON.parse(localStorage.getItem("cupissa_orders") || "[]");
    } catch (e) {
      return [];
    }
  },

  /**
   * Registra un nuevo pedido en el historial local.
   * @param {Object} order 
   */
  saveOrder(order) {
    const orders = this.getOrders();
    orders.unshift(order);
    localStorage.setItem("cupissa_orders", JSON.stringify(orders));
  }
};