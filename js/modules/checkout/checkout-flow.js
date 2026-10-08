// js/modules/checkout/checkout-flow.js

import { supabase } from '../../config/supabase.js';
import { getCartItems, clearCart } from '../cart.js';

let selectedPaymentMethod = 'direct'; // 'direct' o 'cupissa_credit'

export function selectCheckoutMethod(method) {
  selectedPaymentMethod = method;
  const btnDirect = document.getElementById('tabPaymentDirect');
  const btnCredit = document.getElementById('tabPaymentCredit');
  const directForm = document.getElementById('directPaymentForm');
  const creditForm = document.getElementById('cupissaCreditForm');

  if (method === 'direct') {
    btnDirect.className = 'flex-1 py-3 px-4 rounded-2xl border-2 border-brand-600 bg-brand-50 text-brand-700 font-bold text-xs transition-all flex items-center justify-center gap-2';
    btnCredit.className = 'flex-1 py-3 px-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 font-bold text-xs transition-all flex items-center justify-center gap-2';
    directForm.classList.remove('hidden');
    creditForm.classList.add('hidden');
  } else {
    btnCredit.className = 'flex-1 py-3 px-4 rounded-2xl border-2 border-brand-600 bg-brand-50 text-brand-700 font-bold text-xs transition-all flex items-center justify-center gap-2';
    btnDirect.className = 'flex-1 py-3 px-4 rounded-2xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 font-bold text-xs transition-all flex items-center justify-center gap-2';
    creditForm.classList.remove('hidden');
    directForm.classList.add('hidden');
  }
}

export async function handleCheckoutSubmission(event) {
  event.preventDefault();
  
  const cart = getCartItems();
  if (cart.length === 0) {
    alert('El carrito está vacío.');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

  // 1. Recolección de datos del formulario
  const fullName = document.getElementById('checkoutFullName').value.trim();
  const phone = document.getElementById('checkoutPhone').value.trim();
  const address = document.getElementById('checkoutAddress').value.trim();
  const city = document.getElementById('checkoutCity').value.trim();
  const neighborhood = document.getElementById('checkoutNeighborhood').value.trim();
  const deliveryDate = document.getElementById('checkoutDeliveryDate').value;

  // Totales
  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const advanceAmount = cart.reduce((acc, item) => acc + (item.advance * item.quantity), 0);
  const remainingAmount = totalAmount - advanceAmount;

  try {
    // 2. Crear registro de Orden en Supabase
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: user ? user.id : null,
        order_type: cart.some(i => i.isRental) ? 'ALQUILER' : 'VENTA',
        payment_method: selectedPaymentMethod === 'direct' ? 'ANTICIPO_DIRECTO' : 'CREDITO_CUPISSA',
        total_amount: totalAmount,
        advance_amount: advanceAmount,
        remaining_amount: remainingAmount,
        shipping_fee: 0, // Se calcula/informa manualmente por el asesor según ciudad y peso
        shipping_status: 'PENDIENTE_COTIZACION',
        order_status: 'RECIBIDO',
        delivery_address: `${address}, Barrio: ${neighborhood}`,
        delivery_city: city,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // 3. Si escogió Crédito Cupissa, subir documentos y guardar solicitud
    if (selectedPaymentMethod === 'cupissa_credit') {
      const cedulaNumber = document.getElementById('creditCedula').value.trim();
      const ref1Name = document.getElementById('creditRef1Name').value.trim();
      const ref1Phone = document.getElementById('creditRef1Phone').value.trim();
      const ref2Name = document.getElementById('creditRef2Name').value.trim();
      const ref2Phone = document.getElementById('creditRef2Phone').value.trim();

      const frontFile = document.getElementById('creditCedulaFront').files[0];
      const backFile = document.getElementById('creditCedulaBack').files[0];

      let frontUrl = '';
      let backUrl = '';

      if (frontFile) {
        const frontPath = `cedulas/${orderData.id}_front_${Date.now()}`;
        const { data: uploadFront } = await supabase.storage.from('credit-documents').upload(frontPath, frontFile);
        if (uploadFront) frontUrl = uploadFront.path;
      }

      if (backFile) {
        const backPath = `cedulas/${orderData.id}_back_${Date.now()}`;
        const { data: uploadBack } = await supabase.storage.from('credit-documents').upload(backPath, backFile);
        if (uploadBack) backUrl = uploadBack.path;
      }

      const { error: creditError } = await supabase
        .from('cupissa_credits')
        .insert([{
          order_id: orderData.id,
          user_id: user ? user.id : null,
          financed_amount: remainingAmount,
          periodicity: 'mensual',
          number_of_installments: 3,
          installment_amount: Math.round((remainingAmount * 1.20) / 3),
          id_card_front_url: frontUrl,
          id_card_back_url: backUrl,
          reference_1_name: ref1Name,
          reference_1_phone: ref1Phone,
          reference_2_name: ref2Name,
          reference_2_phone: ref2Phone,
          contract_accepted: true,
          status: 'PENDIENTE',
          created_at: new Date().toISOString()
        }]);

      if (creditError) throw creditError;
    }

    // 4. Limpieza del carrito y aviso de confirmación
    clearCart();
    alert(`¡Pedido #${orderData.id.slice(0, 8)} agendado con éxito!\n\nEl asesor revisará la orden y se comunicará al ${phone} para confirmar el valor final de envío y los datos del anticipo.`);
    window.location.href = `rastreo.html?codigo=${orderData.id}`;

  } catch (err) {
    alert('Ocurrió un error al procesar el pedido: ' + err.message);
  }
}