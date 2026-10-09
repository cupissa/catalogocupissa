/**
 * js/modules/checkout/step2-payment.js
 * Confirmación de Pedido y Pago de la Tienda con Sincronización en Tiempo Real a Supabase
 */

window.CheckoutStep2 = {
  /**
   * Procesa el pedido del cliente, guarda la información en Supabase y notifica la confirmación
   */
  async confirmOrder(event) {
    if (event) event.preventDefault();

    const btnConfirm = document.getElementById('btn-confirmar-pedido-tienda');
    if (btnConfirm) {
      btnConfirm.disabled = true;
      btnConfirm.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Procesando Pedido...`;
    }

    try {
      // 1. Obtener carrito actual desde localStorage o estado global
      const carrito = JSON.parse(localStorage.getItem('cupissa_cart') || '[]');
      if (carrito.length === 0) {
        if (typeof showToast === 'function') showToast("Tu carrito de compras está vacío.", "error");
        return;
      }

      // 2. Verificar datos de usuario autenticado
      let activeUser = null;
      if (typeof ClientAuth !== 'undefined') {
        const clientData = await ClientAuth.getActiveClient();
        if (clientData) activeUser = clientData;
      }

      // 3. Capturar campos del formulario de Checkout
      const nombreInput = document.getElementById('checkout-nombre')?.value.trim();
      const telefonoInput = document.getElementById('checkout-telefono')?.value.trim();
      const direccionInput = document.getElementById('checkout-direccion')?.value.trim();
      const fechaEntrega = document.getElementById('checkout-fecha-entrega')?.value || new Date().toISOString().split('T')[0];
      const metodoPago = document.getElementById('checkout-metodo-pago')?.value || 'Efectivo';
      const observaciones = document.getElementById('checkout-observaciones')?.value.trim() || '';

      // Total del pedido
      const totalCarrito = carrito.reduce((sum, item) => sum + (parseMonto(item.precio) * (item.cantidad || 1)), 0);
      const costoEnvio = parseMonto(document.getElementById('checkout-costo-envio')?.value || 0);
      const totalDefinitivo = totalCarrito + costoEnvio;

      // 4. Preparar la estructura de datos del pedido para Supabase
      const orderData = {
        cliente_id: activeUser ? activeUser.user.id : null,
        user_id: activeUser ? activeUser.user.id : null,
        tipo_operacion: 'Venta Web',
        total: totalDefinitivo,
        pagado: 0, // Inicia como pedido pendiente por confirmación de pago
        domicilio: costoEnvio,
        metodo_pago: metodoPago,
        fecha_agendamiento: new Date().toISOString().split('T')[0],
        fecha_entrega: fechaEntrega,
        observaciones: observaciones
      };

      // 5. Enviar directamente a Supabase mediante la utilidad de sincronización
      const result = await SupabaseSync.createOrderFromStore(orderData, carrito);

      if (!result.success) {
        throw new Error("No se pudo guardar el pedido en la base de datos.");
      }

      // 6. Limpiar el carrito y mostrar mensaje de éxito
      localStorage.removeItem('cupissa_cart');
      if (typeof updateCartBadge === 'function') updateCartBadge();

      if (typeof showToast === 'function') {
        showToast("¡Pedido realizado con éxito! Un asesor se comunicará contigo.");
      }

      // Redireccionar o mostrar ventana de confirmación
      const modalExito = document.getElementById('modal-pedido-confirmado');
      if (modalExito) {
        document.getElementById('lbl-ref-pedido-confirmado').textContent = result.pedido.referencia_pedido || result.pedido.id.slice(0, 6);
        modalExito.classList.remove('hidden');
      } else {
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 2000);
      }

    } catch (err) {
      console.error("Error al confirmar el pedido:", err);
      if (typeof showToast === 'function') {
        showToast("Ocurrió un error al procesar tu pedido. Inténtalo de nuevo.", "error");
      }
    } finally {
      if (btnConfirm) {
        btnConfirm.disabled = false;
        btnConfirm.innerHTML = `🛒 Confirmar y Enviar Pedido`;
      }
    }
  }
};