/**
 * Cambia el método de pago seleccionado en el Paso 2
 * @param {'direct' | 'cupissa_credit'} method 
 */
window.selectPaymentMethod = function(method) {
  window.checkoutState.paymentMethod = method;

  const directContainer = document.getElementById('directPaymentForm');
  const creditContainer = document.getElementById('cupissaCreditForm');
  const tabDirect = document.getElementById('tabPaymentDirect');
  const tabCredit = document.getElementById('tabPaymentCredit');

  if (method === 'direct') {
    if (directContainer) directContainer.classList.remove('hidden');
    if (creditContainer) creditContainer.classList.add('hidden');

    if (tabDirect) tabDirect.className = "flex-1 py-3 px-4 rounded-xl border-2 border-brand-600 bg-brand-50 text-brand-700 font-bold text-sm transition-all";
    if (tabCredit) tabCredit.className = "flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-500 font-bold text-sm transition-all";
  } else {
    if (directContainer) directContainer.classList.add('hidden');
    if (creditContainer) creditContainer.classList.remove('hidden');

    if (tabCredit) tabCredit.className = "flex-1 py-3 px-4 rounded-xl border-2 border-brand-600 bg-brand-50 text-brand-700 font-bold text-sm transition-all";
    if (tabDirect) tabDirect.className = "flex-1 py-3 px-4 rounded-xl border-2 border-gray-200 bg-white text-gray-500 font-bold text-sm transition-all";
  }

  // Recalcular el total si cambia a crédito (+20% recargo en los productos)
  if (typeof window.updateCheckoutSummary === 'function') {
    window.updateCheckoutSummary();
  }
};

/**
 * Procesa la orden o la solicitud según la modalidad seleccionada
 */
window.submitCheckoutOrder = async function() {
  // 1. Validar primero el Paso 1 (Datos de envío y cliente)
  if (typeof window.validateStep1Shipping === 'function') {
    const isStep1Valid = window.validateStep1Shipping();
    if (!isStep1Valid) return;
  }

  const cart = (typeof window.getCart === 'function') ? window.getCart() : [];
  if (!cart || cart.length === 0) {
    if (typeof showToast === 'function') showToast("El carrito está vacío.", "error");
    else alert("El carrito está vacío.");
    return;
  }

  const method = window.checkoutState.paymentMethod;

  // OPCIÓN A: PAGO DIRECTO (ANTICIPO + SALDO CONTRA ENTREGA)
  if (method === 'direct') {
    const orderPayload = {
      customer: window.checkoutState.customer,
      items: cart,
      shippingFee: window.checkoutState.shippingFee,
      paymentMethod: 'direct',
      status: 'pending_advance_payment', // Pendiente de anticipo
      created_at: new Date().toISOString()
    };

    console.log("Procesando pedido directo:", orderPayload);

    // Guardar pedido en Supabase si está disponible la función de servicio
    if (typeof window.createOrderInSupabase === 'function') {
      const { data, error } = await window.createOrderInSupabase(orderPayload);
      if (error) {
        if (typeof showToast === 'function') showToast("Error al registrar pedido.", "error");
        return;
      }
    }

    if (typeof showToast === 'function') showToast("¡Pedido agendado! Redirigiendo al pago de anticipo...", "success");
    else alert("¡Pedido agendado! Procediendo al pago de anticipo.");

    // Redirección a pasarela/confirmación
    // window.location.href = "confirmacion.html";
  } 

  // OPCIÓN B: SOLICITUD DE CRÉDITO CUPISSA (+20% INTERÉS)
  else if (method === 'cupissa_credit') {
    const idNumber = document.getElementById('creditCedula')?.value.trim();
    const ref1Name = document.getElementById('creditRef1Name')?.value.trim();
    const ref1Phone = document.getElementById('creditRef1Phone')?.value.trim();
    const ref2Name = document.getElementById('creditRef2Name')?.value.trim();
    const ref2Phone = document.getElementById('creditRef2Phone')?.value.trim();

    if (!idNumber || !ref1Name || !ref1Phone || !ref2Name || !ref2Phone) {
      if (typeof showToast === 'function') showToast("Por favor completa los datos de cédula y las 2 referencias.", "error");
      else alert("Por favor completa los datos de cédula y las 2 referencias.");
      return;
    }

    const creditRequestPayload = {
      customer: window.checkoutState.customer,
      document_id: idNumber,
      references: [
        { name: ref1Name, phone: ref1Phone },
        { name: ref2Name, phone: ref2Phone }
      ],
      items: cart,
      shippingFee: window.checkoutState.shippingFee,
      paymentMethod: 'cupissa_credit',
      interestRate: 0.20, // 20%
      status: 'pending_approval', // Esperando aprobación del admin
      created_at: new Date().toISOString()
    };

    console.log("Enviando solicitud de Crédito Cupissa:", creditRequestPayload);

    if (typeof window.createCreditRequestInSupabase === 'function') {
      const { error } = await window.createCreditRequestInSupabase(creditRequestPayload);
      if (error) {
        if (typeof showToast === 'function') showToast("Error al enviar solicitud de crédito.", "error");
        return;
      }
    }

    if (typeof showToast === 'function') {
      showToast("Solicitud de Crédito Cupissa enviada. Espera la aprobación del administrador.", "info");
    } else {
      alert("Solicitud enviada. Tu pedido quedará en espera de aprobación por el administrador Cupissa.");
    }

    // Limpiar carrito tras solicitud de crédito
    if (typeof window.clearCart === 'function') window.clearCart();
  }
};