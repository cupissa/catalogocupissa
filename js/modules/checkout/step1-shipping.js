window.checkoutState = window.checkoutState || {
  customer: {},
  shippingFee: 0,
  paymentMethod: 'direct' // 'direct' o 'cupissa_credit'
};

/**
 * Inicializa los selectores dinámicos de ciudad, barrios y fecha mínima
 */
window.initShippingForm = function() {
  const cityInput = document.getElementById('checkoutCity');
  const neighborhoodContainer = document.getElementById('neighborhoodSelectContainer');
  const neighborhoodSelect = document.getElementById('checkoutNeighborhoodSelect');
  const deliveryDateInput = document.getElementById('checkoutDeliveryDate');

  if (deliveryDateInput) {
    const minDate = window.getMinDeliveryDate(3);
    deliveryDateInput.min = minDate;
    if (!deliveryDateInput.value) {
      deliveryDateInput.value = minDate;
    }
  }

  if (neighborhoodSelect && window.LOCAL_NEIGHBORHOODS) {
    neighborhoodSelect.innerHTML = '<option value="">Selecciona o escribe tu barrio...</option>';
    window.LOCAL_NEIGHBORHOODS.forEach(item => {
      const opt = document.createElement('option');
      opt.value = item.name;
      opt.textContent = `${item.name} ($${item.fee.toLocaleString('es-CO')})`;
      neighborhoodSelect.appendChild(opt);
    });
  }

  if (cityInput) {
    cityInput.addEventListener('input', window.onCityOrNeighborhoodChange);
  }
  if (neighborhoodSelect) {
    neighborhoodSelect.addEventListener('change', window.onCityOrNeighborhoodChange);
  }
};

/**
 * Evento cuando cambia ciudad o barrio para recálculo del envío en tiempo real
 */
window.onCityOrNeighborhoodChange = function() {
  const cityVal = document.getElementById('checkoutCity')?.value || '';
  const neighborhoodVal = document.getElementById('checkoutNeighborhoodSelect')?.value || 
                          document.getElementById('checkoutNeighborhoodInput')?.value || '';

  const isLocal = ['barranquilla', 'soledad'].includes(cityVal.trim().toLowerCase());
  const neighborhoodContainer = document.getElementById('neighborhoodSelectContainer');
  
  if (neighborhoodContainer) {
    neighborhoodContainer.style.display = isLocal ? 'block' : 'none';
  }

  const fee = window.calculateShippingFee(cityVal, neighborhoodVal);
  window.checkoutState.shippingFee = fee;

  if (typeof window.updateCheckoutSummary === 'function') {
    window.updateCheckoutSummary();
  }
};

/**
 * Valida el Formulario de Envíos (Paso 1)
 */
window.validateStep1Shipping = function() {
  const fullName = document.getElementById('checkoutFullName')?.value.trim();
  const phone = document.getElementById('checkoutPhone')?.value.trim();
  const address = document.getElementById('checkoutAddress')?.value.trim();
  const city = document.getElementById('checkoutCity')?.value.trim();
  const date = document.getElementById('checkoutDeliveryDate')?.value;

  if (!fullName || !phone || !address || !city || !date) {
    if (typeof showToast === 'function') showToast("Por favor completa todos los campos requeridos.", "error");
    else alert("Por favor completa todos los campos requeridos.");
    return false;
  }

  const minAllowed = window.getMinDeliveryDate(3);
  if (date < minAllowed) {
    if (typeof showToast === 'function') showToast(`La fecha de entrega debe ser mínimo desde el ${minAllowed}.`, "error");
    else alert(`La fecha de entrega debe ser mínimo desde el ${minAllowed}.`);
    return false;
  }

  const neighborhood = document.getElementById('checkoutNeighborhoodSelect')?.value || 
                       document.getElementById('checkoutNeighborhoodInput')?.value || '';

  window.checkoutState.customer = {
    fullName,
    phone,
    address,
    city,
    neighborhood,
    deliveryDate: date
  };

  return true;
};