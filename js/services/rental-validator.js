// js/services/rental-validator.js

export function validateRentalBooking(eventDateString) {
  if (!eventDateString) {
    return { valid: false, error: 'Debe seleccionar una fecha para el evento.' };
  }

  const selectedDate = new Date(eventDateString);
  const today = new Date();
  
  // Normalizar horas
  today.setHours(0, 0, 0, 0);
  selectedDate.setHours(0, 0, 0, 0);

  const diffTime = selectedDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 7) {
    return {
      valid: false,
      error: 'Las reservas en línea requieren mínimo 7 días de anticipación. Para servicios inmediatos comuníquese directamente al WhatsApp 3147671380.'
    };
  }

  return { valid: true, daysNotice: diffDays };
}

export function calculateRentalTotal(price24h, deposit, extraHours = 0, extraHourFee = 0) {
  const baseRental = price24h;
  const extraFeeTotal = extraHours * extraHourFee;
  const grandTotal = baseRental + extraFeeTotal;

  return {
    baseRental,
    deposit,
    extraFeeTotal,
    totalPayable: grandTotal,
    refundableDeposit: deposit
  };
}