// Tarifas de domicilio local por barrio (Barranquilla y Soledad)
window.LOCAL_NEIGHBORHOODS = [
  // Barranquilla - Norte / Centro / Sur
  { name: "Alto Prado (Barranquilla)", fee: 8000 },
  { name: "El Poblado (Barranquilla)", fee: 8000 },
  { name: "Villa Santos (Barranquilla)", fee: 8000 },
  { name: "Riomar (Barranquilla)", fee: 8000 },
  { name: "Miramar (Barranquilla)", fee: 9000 },
  { name: "Boston (Barranquilla)", fee: 9000 },
  { name: "El Recreo (Barranquilla)", fee: 9000 },
  { name: "Centro (Barranquilla)", fee: 10000 },
  { name: "San José (Barranquilla)", fee: 10000 },
  { name: "Simón Bolívar (Barranquilla)", fee: 11000 },
  { name: "Chiquinquirá (Barranquilla)", fee: 10000 },
  { name: "Metropolitana (Barranquilla)", fee: 12000 },

  // Soledad
  { name: "Las Gaviotas (Soledad)", fee: 12000 },
  { name: "Los Almendros (Soledad)", fee: 12000 },
  { name: "El Hipódromo (Soledad)", fee: 11000 },
  { name: "Costa Hermosa (Soledad)", fee: 11000 },
  { name: "Soledad 2000 (Soledad)", fee: 13000 },
  { name: "Normandía (Soledad)", fee: 13000 }
];

// Tarifa por defecto para barrios no listados en Barranquilla/Soledad
window.DEFAULT_LOCAL_FEE = 10000;

// Tarifas estandarizadas de envío nacional (Interrapidísimo desde Barranquilla)
window.NATIONAL_CITIES = [
  { name: "Bogotá", fee: 15000 },
  { name: "Medellín", fee: 15000 },
  { name: "Cali", fee: 16000 },
  { name: "Cartagena", fee: 12000 },
  { name: "Santa Marta", fee: 12000 },
  { name: "Bucaramanga", fee: 15000 },
  { name: "Pereira", fee: 16000 },
  { name: "Manizales", fee: 16000 },
  { name: "Cúcuta", fee: 17000 },
  { name: "Montería", fee: 14000 },
  { name: "Valledupar", fee: 14000 },
  { name: "Otras ciudades", fee: 18000 }
];

/**
 * Obtiene el costo de envío según la ciudad y el barrio.
 */
window.calculateShippingFee = function(city, neighborhoodName) {
  const normalizedCity = (city || '').trim().toLowerCase();

  if (normalizedCity === 'barranquilla' || normalizedCity === 'soledad') {
    if (!neighborhoodName) return window.DEFAULT_LOCAL_FEE;
    const found = window.LOCAL_NEIGHBORHOODS.find(
      item => item.name.toLowerCase() === neighborhoodName.trim().toLowerCase()
    );
    return found ? found.fee : window.DEFAULT_LOCAL_FEE;
  }

  const foundCity = window.NATIONAL_CITIES.find(
    item => item.name.toLowerCase() === normalizedCity
  );
  return foundCity ? foundCity.fee : 18000; // Tarifa nacional por defecto
};

/**
 * Devuelve la fecha mínima permitida para entrega (3 días calendario en el futuro)
 * Formato YYYY-MM-DD para usar en <input type="date">
 */
window.getMinDeliveryDate = function(minDaysAhead = 3) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + minDaysAhead);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}; 