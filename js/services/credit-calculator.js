// js/services/credit-calculator.js

export const CREDIT_RULES = {
  MIN_FINANCED_AMOUNT: 200000,
  GRACE_DAYS: 5,
  MAX_INSTALLMENTS: {
    semanal: 8,
    quincenal: 8,
    mensual: 4,
    diario: 40
  }
};

/**
 * Calcula el desglose completo del pedido y la propuesta de crédito.
 */
export function calculateOrderBreakdown(itemBasePrice, advancePercentage, interestPercentage, qty = 1) {
  const totalPrice = itemBasePrice * qty;
  const advanceAmount = Math.round(totalPrice * ((advancePercentage || 30) / 100));
  const remainingAmount = totalPrice - advanceAmount;

  return {
    totalPrice,
    advanceAmount,
    remainingAmount
  };
}

/**
 * Calcula el plan de pagos del Crédito Cupissa sobre el saldo restante.
 */
export function calculateCreditPlan(remainingAmount, periodicity, installments, interestRate = 20) {
  if (remainingAmount < CREDIT_RULES.MIN_FINANCED_AMOUNT) {
    return {
      eligible: false,
      reason: `El monto mínimo a financiar después del anticipo es de $${CREDIT_RULES.MIN_FINANCED_AMOUNT.toLocaleString('es-CO')} COP.`
    };
  }

  const maxAllowed = CREDIT_RULES.MAX_INSTALLMENTS[periodicity] || 4;
  const numInstallments = Math.min(installments, maxAllowed);

  // Interés fijo sobre el capital financiado
  const interestAmount = Math.round(remainingAmount * (interestRate / 100));
  const totalFinanced = remainingAmount + interestAmount;
  const installmentAmount = Math.round(totalFinanced / numInstallments);

  return {
    eligible: true,
    remainingAmount,
    interestRate,
    interestAmount,
    totalFinanced,
    periodicity,
    numInstallments,
    installmentAmount
  };
}