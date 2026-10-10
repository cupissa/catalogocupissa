/**
 * catalogocupissa/js/modules/admin/web/web-products.js
 * Módulo de Carga Inteligente de Productos para el Catálogo Web
 * Actualizado con: Filtro ¿Para quién?, Días de producción, Atributos reutilizables,
 * Recorte de imagen Libre (Cropper), Storage por Color/Ref. Única y Crédito CUPISSA.
 */

window.webCropperInstance = null;
window.currentProductWebImgBase64 = null;

// Arreglos temporales para variantes del producto en edición
window.currentAdminTallas = [];
window.currentAdminColores = []; // Estructura: [{ name: 'Rojo', imageBase64: '...' }]
window.currentAdminVariablesAccesorios = []; // Variables, materiales y complementos
window.atributosGlobalesCache = [];

function safeParseMontoWeb(val) {
  if (typeof window.parseMonto === 'function') return window.parseMonto(val);
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? 0 : num;
}

function safeFormatMonedaWeb(val) {
  if (typeof window.formatMoneda === 'function') return window.formatMoneda(val);
  return new Intl.NumberFormat('es-CO').format(val || 0);
}

function safeShowToastWeb(msg, type = 'success') {
  if (typeof window.showToast === 'function') {
    window.showToast(msg, type);
  } else {
    console.log(`[Toast ${type}]: ${msg}`);
  }
}

/**
 * 6. CALCULADORA Y SIMULADOR DE CRÉDITO CUPISSA
 * Calcula Cuota Inicial, 4 Mensuales, 8 Quincenales y 16 Semanales
 */
window.calcularCreditoCupissaWeb = function({ precio_detal, cuota_inicial_porcentaje = 0, tasa_interes_mensual = 0, meses = 4 }) {
  const precio = Number(precio_detal) || 0;
  const pctInicial = Number(cuota_inicial_porcentaje) || 0;
  const pctInteres = Number(tasa_interes_mensual) || 0;
  const numMeses = Number(meses) || 4;

  const cuotaInicial = precio * (pctInicial / 100);
  const saldoAFinanciar = precio - cuotaInicial;
  
  // Interés simple acumulado durante los meses pactados
  const totalConInteres = saldoAFinanciar * (1 + (pctInteres / 100) * numMeses);

  return {
    precioTotal: Math.round(precio),
    cuotaInicial: Math.round(cuotaInicial),
    saldoAFinanciar: Math.round(saldoAFinanciar),
    totalFinanciado: Math.round(totalConInteres),
    
    // Proyecciones
    cuotaMensual4x: Math.round(totalConInteres / 4),       // 4 Cuotas Mensuales
    cuotaQuincenal8x: Math.round(totalConInteres / 8),     // 8 Cuotas Quincenales
    cuotaSemanal16x: Math.round(totalConInteres / 16)      // 16 Cuotas Semanales
  };
};

/**
 * Recalcula la simulación de crédito en vivo dentro del formulario modal
 */
window.actualizarSimulacionCreditoModal = function() {
  const container = document.getElementById('resumen-simulacion-credito');
  if (!container) return;

  const precio = safeParseMontoWeb(document.getElementById('prod-web-precio-detal')?.value);
  const permiteCredito = document.getElementById('prod-web-check-credito')?.checked || false;
  const pctInicial = safeParseMontoWeb(document.getElementById('prod-web-cuota-inicial-pct')?.value);
  const pctInteres = safeParseMontoWeb(document.getElementById('prod-web-tasa-interes')?.value);

  if (!permiteCredito) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  const sim = window.calcularCreditoCupissaWeb({
    precio_detal: precio,
    cuota_inicial_porcentaje: pctInicial,
    tasa_interes_mensual: pctInteres,
    meses: 4
  });

  container.innerHTML = `
    <div class="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-xs space-y-1 mt-2">
      <div class="font-bold text-indigo-900 flex justify-between">
        <span>💳 Proyección Crédito CUPISSA (4 Meses)</span>
        <span>Inicial: $${safeFormatMonedaWeb(sim.cuotaInicial)}</span>
      </div>
      <div class="grid grid-cols-3 gap-2 pt-1 text-[11px] text-slate-700 font-semibold">
        <div class="bg-white p-1.5 rounded-lg text-center border">
          <div class="text-[9px] text-slate-500 uppercase">4 Mensuales</div>
          <div class="text-indigo-700 font-black">$${safeFormatMonedaWeb(sim.cuotaMensual4x)}</div>
        </div>
        <div class="bg-white p-1.5 rounded-lg text-center border">
          <div class="text-[9px] text-slate-500 uppercase">8 Quincenales</div>
          <div class="text-indigo-700 font-black">$${safeFormatMonedaWeb(sim.cuotaQuincenal8x)}</div>
        </div>
        <div class="bg-white p-1.5 rounded-lg text-center border">
          <div class="text-[9px] text-slate-500 uppercase">16 Semanales</div>
          <div class="text-indigo-700 font-black">$${safeFormatMonedaWeb(sim.cuotaSemanal16x)}</div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Carga los productos para el módulo de Gestión Web
 */
window.cargarProductosWeb = async function() {
  const tbody = document.getElementById('tabla-productos-web');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="7" class="py-8 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-lg mb-2"></i>
        <p>Sincronizando productos desde Supabase...</p>
      </td>
    </tr>
  `;

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('Supabase no está disponible.');

    const { data: prods, error } = await client
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;

    window.productosCache = prods || [];
    
    // Cargar biblioteca de Atributos Globales Reutilizables (3)
    await window.cargarAtributosGlobalesWeb();

    window.renderizarTablaProductosWeb(window.productosCache);
  } catch (err) {
    console.error("Error al cargar catálogo de productos web:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-6 text-center text-red-500 font-bold">
          Error al conectar con la base de datos de Supabase. Revisa la configuración o RLS.
        </td>
      </tr>
    `;
  }
};

/**
 * 3. Carga Atributos Globales Reutilizables (Materiales, Tallas, Accesorios)
 */
window.cargarAtributosGlobalesWeb = async function() {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) return;

    const { data, error } = await client
      .from('atributos_globales')
      .select('*')
      .order('nombre', { ascending: true });

    if (!error && data) {
      window.atributosGlobalesCache = data;
      window.renderizarDatalistAtributosGlobales();
    }
  } catch (e) {
    console.warn("No se pudieron cargar los atributos globales reutilizables:", e);
  }
};

/**
 * Genera el Datalist para autocompletar opciones reutilizables guardadas
 */
window.renderizarDatalistAtributosGlobales = function() {
  let datalist = document.getElementById('datalist-atributos-globales');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'datalist-atributos-globales';
    document.body.appendChild(datalist);
  }

  datalist.innerHTML = (window.atributosGlobalesCache || []).map(a => 
    `<option value="${a.nombre}" data-tipo="${a.tipo}" data-incremento="${a.incremento_precio}">${a.nombre} (${a.tipo.toUpperCase()} - +$${safeFormatMonedaWeb(a.incremento_precio)})</option>`
  ).join('');
};

/**
 * Renderiza la tabla de productos de la tienda online
 */
window.renderizarTablaProductosWeb = function(lista) {
  const tbody = document.getElementById('tabla-productos-web');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-400">
          No hay productos creados en Supabase o coincidentes con la búsqueda.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const foto = (p.imagenes && p.imagenes.length > 0) ? p.imagenes[0] : (p.image_url || p.imagen || 'images/logo.png');
    const esOculto = Boolean(p.oculto_web);
    const esPersonalizable = Boolean(p.es_personalizable);
    const esMayorista = Boolean(p.es_mayorista);

    const precioDetal = safeParseMontoWeb(p.precio_detal || p.price);
    const precioMayor = safeParseMontoWeb(p.precio_mayorista);
    const precioAlquiler = safeParseMontoWeb(p.precio_alquiler);
    const temporadaLabel = p.temporada ? `<span class="px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 text-[9px] font-bold uppercase">${p.temporada}</span>` : '';

    // 1. Render de Badges ¿Para quién?
    const paraQuienBadges = Array.isArray(p.para_quien) 
      ? p.para_quien.map(pq => `<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px] font-bold">${pq}</span>`).join(' ')
      : (p.para_quien ? `<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px] font-bold">${p.para_quien}</span>` : '');

    // 2. Días de Producción
    const diasProd = p.dias_fabricacion || 0;
    const badgeProduccion = diasProd > 0 
      ? `<span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">🛠️ ${diasProd} días fab.</span>`
      : `<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">⚡ Inmediata</span>`;

    // 6. Resumen Crédito CUPISSA
    const permiteCredito = Boolean(p.permitir_credito);
    const infoCredito = permiteCredito ? window.calcularCreditoCupissaWeb({
      precio_detal: precioDetal,
      cuota_inicial_porcentaje: p.cuota_inicial_porcentaje || 0,
      tasa_interes_mensual: p.tasa_interes_mensual || 0,
      meses: 4
    }) : null;

    return `
      <tr class="border-b hover:bg-slate-50/80 transition-colors ${esOculto ? 'bg-slate-100/60 opacity-60' : ''}">
        <td class="p-3">
          <div class="flex items-center gap-3">
            <img src="${foto}" alt="${p.nombre}" class="w-12 h-12 object-contain bg-white rounded-xl border p-1 shrink-0">
            <div>
              <div class="font-bold text-slate-900">${p.nombre}</div>
              <div class="text-[10px] text-indigo-600 font-semibold flex items-center gap-1.5">
                <span>${p.mundo || 'General'} / ${p.categoria || 'Sin Categoría'}</span>
                ${temporadaLabel}
              </div>
              <div class="mt-1 flex flex-wrap gap-1">${paraQuienBadges}</div>
            </div>
          </div>
        </td>
        <td class="p-3 text-xs">
          <div class="font-bold text-slate-700">Detal: $${safeFormatMonedaWeb(precioDetal)}</div>
          ${precioAlquiler > 0 ? `<div class="text-[10px] font-bold text-purple-700">Alquiler: $${safeFormatMonedaWeb(precioAlquiler)}</div>` : ''}
          ${esMayorista ? `<div class="text-[10px] font-black text-amber-700">Mayor: $${safeFormatMonedaWeb(precioMayor)} (x${p.cant_minima_mayorista || 6})</div>` : ''}
          <div class="mt-1">${badgeProduccion}</div>
        </td>
        <td class="p-3 text-xs">
          <div class="flex flex-wrap gap-1">
            ${p.permitir_venta !== false ? '<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">Venta</span>' : ''}
            ${p.permitir_alquiler ? '<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px] font-bold">Alquiler</span>' : ''}
            ${permiteCredito ? '<span class="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 text-[9px] font-bold">Crédito CUPISSA</span>' : ''}
          </div>
        </td>
        <td class="p-3 text-xs">
          ${permiteCredito && infoCredito ? `
            <div class="text-[10px]">
              <div class="font-bold text-indigo-900">Inicial: $${safeFormatMonedaWeb(infoCredito.cuotaInicial)}</div>               <div class="text-slate-600">4M: $${safeFormatMonedaWeb(infoCredito.cuotaMensual4x)}</div>
              <div class="text-slate-600">8Q: $${safeFormatMonedaWeb(infoCredito.cuotaQuincenal8x)}</div>               <div class="text-slate-600">16S: $${safeFormatMonedaWeb(infoCredito.cuotaSemanal16x)}</div>
            </div>
          ` : '<span class="text-slate-300">N/A</span>'}
        </td>
        <td class="p-3 text-center">
          ${esPersonalizable ? '<span class="text-indigo-600 text-xs font-extrabold" title="Requiere personalización"><i class="fa-solid fa-wand-magic-sparkles"></i> Sí</span>' : '<span class="text-slate-300 text-xs">No</span>'}
        </td>
        <td class="p-3 text-center">
          <button type="button" onclick="toggleVisibilidadProductoWeb('${p.id}', ${esOculto})" class="px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${esOculto ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'}">
            <i class="fa-solid ${esOculto ? 'fa-eye-slash' : 'fa-eye'} mr-1"></i>
            ${esOculto ? 'Oculto' : 'Visible'}
          </button>
        </td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button type="button" onclick='abrirModalProductoWeb(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all" title="Editar Producto">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" onclick="eliminarProductoWeb('${p.id}')" class="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all" title="Eliminar">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

/**
 * 1. Filtro de búsqueda en tiempo real (Incluyendo ¿Para quién?)
 */
window.filtrarProductosWeb = function() {
  const query = (document.getElementById('buscador-productos-web')?.value || '').toLowerCase().trim();
  const paraQuienSel = document.getElementById('filtro-para-quien-web')?.value || 'todos';

  const filtrados = (window.productosCache || []).filter(p => {
    const okQuery = !query ||
      (p.nombre || '').toLowerCase().includes(query) ||
      (p.mundo || '').toLowerCase().includes(query) ||
      (p.categoria || '').toLowerCase().includes(query) ||
      (p.subcategoria || '').toLowerCase().includes(query) ||
      (p.temporada || '').toLowerCase().includes(query) ||
      (p.referencia || '').toLowerCase().includes(query);

    let okParaQuien = true;
    if (paraQuienSel !== 'todos') {
      if (Array.isArray(p.para_quien)) {
        okParaQuien = p.para_quien.some(pq => pq.toLowerCase() === paraQuienSel.toLowerCase());
      } else if (typeof p.para_quien === 'string') {
        okParaQuien = p.para_quien.toLowerCase().includes(paraQuienSel.toLowerCase());
      } else {
        okParaQuien = false;
      }
    }

    return okQuery && okParaQuien;
  });

  window.renderizarTablaProductosWeb(filtrados);
};

/**
 * Alterna el estado oculto_web / visible_web de un producto
 */
window.toggleVisibilidadProductoWeb = async function(id, estadoActualOculto) {
  try {
    const client = window.supabaseClient || window.supabase;
    const { error } = await client
      .from('productos')
      .update({
        oculto_web: !estadoActualOculto,
        visible_web: estadoActualOculto
      })
      .eq('id', id);

    if (error) throw error;

    safeShowToastWeb(!estadoActualOculto ? "Producto ocultado de la tienda pública." : "Producto visible nuevamente.");
    window.cargarProductosWeb();
  } catch (err) {
    console.error("Error al actualizar visibilidad en Supabase:", err);
    safeShowToastWeb("Error al modificar visibilidad.", "error");
  }
};

/**
 * Elimina un producto permanentemente
 */
window.eliminarProductoWeb = async function(id) {
  if (!confirm("¿Eliminar este producto permanentemente de Supabase?")) return;

  try {
    const client = window.supabaseClient || window.supabase;
    const { error } = await client.from('productos').delete().eq('id', id);
    if (error) throw error;

    safeShowToastWeb("Producto eliminado de Supabase.");
    window.cargarProductosWeb();
  } catch (err) {
    console.error("Error al eliminar producto:", err);
    safeShowToastWeb("Error al eliminar producto.", "error");
  }
};

/**
 * Muestra u oculta la sección de alquiler según el checkbox
 */
window.toggleSeccionAlquilerAdmin = function(isRent) {
  const box = document.getElementById('seccion-alquiler-admin-box');
  if (box) {
    if (isRent) box.classList.remove('hidden');
    else box.classList.add('hidden');
  }
};

/**
 * 3. Gestión de Tallas Seleccionables con Modificadores de Precio
 */
window.agregarTallaAlProductoAdmin = function() {
  const inpNombre = document.getElementById('input-nueva-talla-nombre');
  const inpPrecio = document.getElementById('input-nueva-talla-precio');
  const chkGuardar = document.getElementById('chk-guardar-talla-global');

  if (!inpNombre) return;

  const name = inpNombre.value.trim().toUpperCase();
  const price = safeParseMontoWeb(inpPrecio?.value);
  const guardarGlobal = chkGuardar?.checked || false;

  if (!name) {
    safeShowToastWeb("Ingresa el nombre o código de la talla.", "error");
    return;
  }

  window.currentAdminTallas.push({ name, price, guardarGlobal });
  inpNombre.value = '';
  if (inpPrecio) inpPrecio.value = '';
  if (chkGuardar) chkGuardar.checked = false;

  window.renderListaTallasAdmin();
};

window.eliminarTallaAdmin = function(index) {
  window.currentAdminTallas.splice(index, 1);
  window.renderListaTallasAdmin();
};

window.renderListaTallasAdmin = function() {
  const container = document.getElementById('contenedor-lista-tallas-admin');
  if (!container) return;

  if (window.currentAdminTallas.length === 0) {
    container.innerHTML = `<span class="text-[11px] text-slate-400 italic">No hay tallas agregadas aún.</span>`;
    return;
  }

  container.innerHTML = window.currentAdminTallas.map((t, idx) => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-xs">
      <span>Talla: ${t.name}</span>
      ${t.price > 0 ? `<span class="text-emerald-700 text-[10px]">(+$${safeFormatMonedaWeb(t.price)})</span>` : ''}
      <button type="button" onclick="eliminarTallaAdmin(${idx})" class="text-rose-500 hover:text-rose-700 ml-1">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </span>
  `).join('');
};

/**
 * 3. Gestión de Variables, Materiales y Accesorios/Complementos Reutilizables
 */
window.agregarVariableAccesorioProductoAdmin = function() {
  const selTipo = document.getElementById('input-variable-tipo')?.value || 'material';
  const inpNombre = document.getElementById('input-variable-nombre');
  const inpPrecio = document.getElementById('input-variable-precio');
  const chkGuardar = document.getElementById('chk-guardar-variable-global');

  const nombre = (inpNombre?.value || '').trim();
  const incremento = safeParseMontoWeb(inpPrecio?.value);
  const guardarGlobal = chkGuardar?.checked || false;

  if (!nombre) {
    safeShowToastWeb("Ingresa el nombre del material o accesorio.", "error");
    return;
  }

  window.currentAdminVariablesAccesorios.push({
    tipo: selTipo,
    nombre,
    incremento_precio: incremento,
    guardar_en_catalogo: guardarGlobal
  });

  inpNombre.value = '';
  if (inpPrecio) inpPrecio.value = '';
  if (chkGuardar) chkGuardar.checked = false;

  window.renderListaVariablesAccesoriosAdmin();
};

window.eliminarVariableAccesorioAdmin = function(index) {
  window.currentAdminVariablesAccesorios.splice(index, 1);
  window.renderListaVariablesAccesoriosAdmin();
};

window.renderListaVariablesAccesoriosAdmin = function() {
  const container = document.getElementById('contenedor-lista-variables-admin');
  if (!container) return;

  if (window.currentAdminVariablesAccesorios.length === 0) {
    container.innerHTML = `<span class="text-[11px] text-slate-400 italic">No hay materiales ni accesorios agregados.</span>`;
    return;
  }

  container.innerHTML = window.currentAdminVariablesAccesorios.map((v, idx) => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold text-xs">
      <span class="uppercase text-[9px] bg-amber-200 px-1 rounded">${v.tipo}</span>
      <span>${v.nombre}</span>
      <span class="text-emerald-700 text-[10px]">(+$${safeFormatMonedaWeb(v.incremento_precio)})</span>
      <button type="button" onclick="eliminarVariableAccesorioAdmin(${idx})" class="text-rose-500 hover:text-rose-700 ml-1">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </span>
  `).join('');
};

/**
 * 5. Gestión de Colores y Fotos por Color o Referencia Única
 */
window.agregarColorAlProductoAdmin = function() {
  const inpNombre = document.getElementById('input-nuevo-color-nombre');
  if (!inpNombre) return;

  const name = inpNombre.value.trim();

  if (!name) {
    safeShowToastWeb("Ingresa el nombre del color.", "error");
    return;
  }

  window.currentAdminColores.push({ name, imageBase64: null });
  inpNombre.value = '';

  window.renderListaColoresAdmin();
};

window.eliminarColorAdmin = function(index) {
  window.currentAdminColores.splice(index, 1);
  window.renderListaColoresAdmin();
};

window.asignarFotoAColorAdmin = function(index, inputElement) {
  if (inputElement.files && inputElement.files[0]) {
    const reader = new FileReader();
    reader.onload = function(e) {
      window.currentAdminColores[index].imageBase64 = e.target.result;
      window.renderListaColoresAdmin();
    };
    reader.readAsDataURL(inputElement.files[0]);
  }
};

window.renderListaColoresAdmin = function() {
  const container = document.getElementById('contenedor-lista-colores-admin');
  if (!container) return;

  if (window.currentAdminColores.length === 0) {
    container.innerHTML = `<span class="text-[11px] text-slate-400 italic">No hay colores. (Se guardará como Referencia Única).</span>`;
    return;
  }

  container.innerHTML = window.currentAdminColores.map((c, idx) => `
    <div class="flex items-center gap-2 p-2 rounded-xl bg-pink-50 border border-pink-200 text-pink-900 font-bold text-xs">
      <span>Color: ${c.name}</span>
      ${c.imageBase64 ? `<img src="${c.imageBase64}" class="w-7 h-7 object-cover rounded-lg border">` : '<span class="text-[10px] text-slate-400">(Sin foto)</span>'}
      <label class="px-2 py-0.5 bg-white border border-pink-300 text-pink-700 rounded-lg text-[10px] cursor-pointer hover:bg-pink-100">
        📷 Foto
        <input type="file" accept="image/*" class="hidden" onchange="asignarFotoAColorAdmin(${idx}, this)">
      </label>
      <button type="button" onclick="eliminarColorAdmin(${idx})" class="text-rose-500 hover:text-rose-700 ml-auto">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </div>
  `).join('');
};

/**
 * Abre el modal de producto para creación o edición
 */
window.abrirModalProductoWeb = function(prod = null) {
  const modal = document.getElementById('modal-producto-web');
  const form = document.getElementById('form-producto-web');
  if (!modal || !form) return;

  form.reset();
  window.currentProductWebImgBase64 = null;
  window.currentAdminTallas = [];
  window.currentAdminColores = [];
  window.currentAdminVariablesAccesorios = [];

  if (prod) {
    document.getElementById('prod-web-id').value = prod.id || '';
    document.getElementById('prod-web-nombre').value = prod.nombre || '';
    document.getElementById('prod-web-mundo').value = prod.mundo || '';
    document.getElementById('prod-web-categoria').value = prod.categoria || '';
    document.getElementById('prod-web-subcategoria').value = prod.subcategoria || '';
    document.getElementById('prod-web-temporada').value = prod.temporada || '';

    // 1. Cargar ¿Para quién?
    const selParaQuien = document.getElementById('prod-web-para-quien');
    if (selParaQuien) {
      if (Array.isArray(prod.para_quien)) {
        Array.from(selParaQuien.options).forEach(opt => {
          opt.selected = prod.para_quien.includes(opt.value);
        });
      } else if (typeof prod.para_quien === 'string') {
        selParaQuien.value = prod.para_quien;
      }
    }

    if (document.getElementById('prod-web-origen')) {
      document.getElementById('prod-web-origen').value = prod.origen || 'sobre_pedido';
    }
    
    // 2. Cargar días de producción
    if (document.getElementById('prod-web-dias-fabricacion')) {
      document.getElementById('prod-web-dias-fabricacion').value = prod.dias_fabricacion || 0;
    }

    document.getElementById('prod-web-precio-detal').value = prod.precio_detal || prod.price || 0;
    document.getElementById('prod-web-precio-mayor').value = prod.precio_mayorista || 0;
    document.getElementById('prod-web-cant-mayor').value = prod.cant_minima_mayorista || 6;

    if (document.getElementById('prod-web-porcentaje-anticipo')) {
      document.getElementById('prod-web-porcentaje-anticipo').value = prod.porcentaje_anticipo || 50;
    }

    if (document.getElementById('prod-web-precio-alquiler')) {
      document.getElementById('prod-web-precio-alquiler').value = prod.precio_alquiler || 0;
    }
    if (document.getElementById('prod-web-valor-deposito')) {
      document.getElementById('prod-web-valor-deposito').value = prod.valor_deposito || 0;
    }

    // 6. Cargar datos de Crédito CUPISSA
    if (document.getElementById('prod-web-cuota-inicial-pct')) {
      document.getElementById('prod-web-cuota-inicial-pct').value = prod.cuota_inicial_porcentaje || 20;
    }
    if (document.getElementById('prod-web-tasa-interes')) {
      document.getElementById('prod-web-tasa-interes').value = prod.tasa_interes_mensual || 2.5;
    }

    document.getElementById('prod-web-check-personalizable').checked = prod.es_personalizable || false;
    document.getElementById('prod-web-check-mayorista').checked = prod.es_mayorista || false;
    document.getElementById('prod-web-check-venta').checked = prod.permitir_venta !== false;
    
    const esAlquiler = Boolean(prod.permitir_alquiler);
    document.getElementById('prod-web-check-alquiler').checked = esAlquiler;
    window.toggleSeccionAlquilerAdmin(esAlquiler);

    const permiteCredito = Boolean(prod.permitir_credito);
    document.getElementById('prod-web-check-credito').checked = permiteCredito;

    // Cargar tallas existentes
    try {
      window.currentAdminTallas = typeof prod.tallas === 'string' ? JSON.parse(prod.tallas) : (prod.tallas || []);
    } catch (e) { window.currentAdminTallas = []; }

    // Cargar colores existentes
    try {
      window.currentAdminColores = typeof prod.colores === 'string' ? JSON.parse(prod.colores) : (prod.colores || []);
    } catch (e) { window.currentAdminColores = []; }

    // Cargar variables/complementos
    try {
      window.currentAdminVariablesAccesorios = typeof prod.variables === 'string' ? JSON.parse(prod.variables) : (prod.variables || []);
    } catch (e) { window.currentAdminVariablesAccesorios = []; }

    const imgPreview = document.getElementById('prod-web-img-preview');
    const foto = (prod.imagenes && prod.imagenes.length > 0) ? prod.imagenes[0] : (prod.image_url || prod.imagen || 'images/logo.png');
    if (imgPreview) imgPreview.src = foto;
    window.currentProductWebImgBase64 = foto;

  } else {
    document.getElementById('prod-web-id').value = '';
    if (document.getElementById('prod-web-porcentaje-anticipo')) {
      document.getElementById('prod-web-porcentaje-anticipo').value = 50;
    }
    if (document.getElementById('prod-web-dias-fabricacion')) {
      document.getElementById('prod-web-dias-fabricacion').value = 0;
    }
    if (document.getElementById('prod-web-cuota-inicial-pct')) {
      document.getElementById('prod-web-cuota-inicial-pct').value = 20;
    }
    if (document.getElementById('prod-web-tasa-interes')) {
      document.getElementById('prod-web-tasa-interes').value = 2.5;
    }
    window.toggleSeccionAlquilerAdmin(false);

    const imgPreview = document.getElementById('prod-web-img-preview');
    if (imgPreview) imgPreview.src = 'images/logo.png';
  }

  window.renderListaTallasAdmin();
  window.renderListaColoresAdmin();
  window.renderListaVariablesAccesoriosAdmin();
  window.actualizarSimulacionCreditoModal();

  modal.classList.remove('hidden');
};

/**
 * Eventos para Drag & Drop e imagen pegada
 */
window.initDragDropAndPasteImageWeb = function() {
  const dropZone = document.getElementById('prod-web-drop-zone');
  const fileInput = document.getElementById('prod-web-file-input');

  if (dropZone && fileInput) {
    dropZone.onclick = function(e) {
      if (e.target !== fileInput) {
        e.preventDefault();
        fileInput.click();
      }
    };

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-indigo-500', 'bg-indigo-50/50');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        window.procesarFotoProductoWeb(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        window.procesarFotoProductoWeb(e.target.files[0]);
      }
    });

    window.addEventListener('paste', (e) => {
      const modal = document.getElementById('modal-producto-web');
      if (modal && !modal.classList.contains('hidden')) {
        const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items || [];
        for (let item of items) {
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            window.procesarFotoProductoWeb(blob);
            break;
          }
        }
      }
    });
  }
};

/**
 * 4. Lee la imagen y activa Cropper.js configurado con Recorte Libre (aspectRatio: NaN)
 */
window.procesarFotoProductoWeb = function(file) {
  if (!file || !file.type.startsWith('image/')) {
    safeShowToastWeb("Por favor selecciona una imagen válida.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    const src = e.target.result;
    const cropImg = document.getElementById('cropper-web-target');
    const cropModal = document.getElementById('modal-cropper-web');

    if (cropImg && cropModal && typeof Cropper !== 'undefined') {
      cropImg.src = src;
      cropModal.classList.remove('hidden');

      if (window.webCropperInstance) {
        window.webCropperInstance.destroy();
      }

      // 4. Recorte LIBRE para fotos de cuerpo completo
      window.webCropperInstance = new Cropper(cropImg, {
        aspectRatio: NaN, // Modo Libre (Sin relación fija 1:1)
        viewMode: 1,
        autoCropArea: 0.95,
        responsive: true,
        movable: true,
        zoomable: true,
        rotatable: true
      });
    } else {
      window.currentProductWebImgBase64 = src;
      const imgPreview = document.getElementById('prod-web-img-preview');
      if (imgPreview) imgPreview.src = src;
    }
  };
  reader.readAsDataURL(file);
};

/**
 * Confirma el recorte libre con Cropper.js
 */
window.confirmarRecorteFotoWeb = function() {
  if (window.webCropperInstance) {
    const canvas = window.webCropperInstance.getCroppedCanvas();

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.90);
    window.currentProductWebImgBase64 = croppedBase64;

    const imgPreview = document.getElementById('prod-web-img-preview');
    if (imgPreview) imgPreview.src = croppedBase64;

    const cropModal = document.getElementById('modal-cropper-web');
    if (cropModal) cropModal.classList.add('hidden');

    window.webCropperInstance.destroy();
    window.webCropperInstance = null;

    safeShowToastWeb("Imagen recortada libremente.");
  }
};

/**
 * Helper para subir un DataURL (Base64) a una subcarpeta específica en Supabase Storage
 */
async function subirBase64AStorageWeb(client, base64Data, refLimpia, carpetaColor) {
  try {
    const fetchRes = await fetch(base64Data);
    const blob = await fetchRes.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    const storagePath = `productos/${refLimpia}/${carpetaColor}/foto_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;

    const { error: uploadError } = await client.storage
      .from('imagenes-productos')
      .upload(storagePath, blob, {
        contentType: blob.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = client.storage
      .from('imagenes-productos')
      .getPublicUrl(storagePath);

    return {
      storage_path: storagePath,
      url: publicUrlData?.publicUrl || base64Data
    };
  } catch (err) {
    console.warn("Fallback de imagen por error de subida a Storage:", err);
    return { storage_path: null, url: base64Data };
  }
}

/**
 * Inserción o actualización completa en Supabase
 */
window.guardarProductoWeb = async function(e) {
  if (e) e.preventDefault();

  const btnSubmit = e?.target?.querySelector('button[type="submit"]');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Guardando en Supabase...`;
  }

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error("El cliente de Supabase no está inicializado.");

    const id = document.getElementById('prod-web-id')?.value;
    const nombre = (document.getElementById('prod-web-nombre')?.value || '').trim();
    const mundo = (document.getElementById('prod-web-mundo')?.value || '').trim().toUpperCase();
    const categoria = (document.getElementById('prod-web-categoria')?.value || '').trim();
    const subcategoria = (document.getElementById('prod-web-subcategoria')?.value || '').trim();
    const temporada = (document.getElementById('prod-web-temporada')?.value || '').trim().toUpperCase();

    // 1. Capturar Array de ¿Para quién? (Multiselect o Array)
    const selParaQuien = document.getElementById('prod-web-para-quien');
    let para_quien = [];
    if (selParaQuien) {
      para_quien = Array.from(selParaQuien.selectedOptions).map(opt => opt.value);
    }

    const origen = document.getElementById('prod-web-origen')?.value || 'sobre_pedido';
    // 2. Días de fabricación
    const dias_fabricacion = parseInt(document.getElementById('prod-web-dias-fabricacion')?.value || 0, 10) || 0;

    const precio_detal = safeParseMontoWeb(document.getElementById('prod-web-precio-detal')?.value);
    const precio_mayorista = safeParseMontoWeb(document.getElementById('prod-web-precio-mayor')?.value);
    const cant_minima_mayorista = parseInt(document.getElementById('prod-web-cant-mayor')?.value || 6, 10) || 6;
    const porcentaje_anticipo = parseInt(document.getElementById('prod-web-porcentaje-anticipo')?.value || 50, 10) || 50;

    const precio_alquiler = safeParseMontoWeb(document.getElementById('prod-web-precio-alquiler')?.value);
    const valor_deposito = safeParseMontoWeb(document.getElementById('prod-web-valor-deposito')?.value);

    // 6. Configuración Crédito CUPISSA
    const permitir_credito = document.getElementById('prod-web-check-credito')?.checked || false;
    const cuota_inicial_porcentaje = safeParseMontoWeb(document.getElementById('prod-web-cuota-inicial-pct')?.value);
    const tasa_interes_mensual = safeParseMontoWeb(document.getElementById('prod-web-tasa-interes')?.value);

    const es_personalizable = document.getElementById('prod-web-check-personalizable')?.checked || false;
    const es_mayorista = document.getElementById('prod-web-check-mayorista')?.checked || false;
    const permitir_venta = document.getElementById('prod-web-check-venta')?.checked || false;
    const permitir_alquiler = document.getElementById('prod-web-check-alquiler')?.checked || false;

    if (!nombre || !mundo) {
      throw new Error("El nombre y el mundo del producto son obligatorios.");
    }

    const referenciaLimpia = (document.getElementById('prod-web-referencia')?.value || 'REF-' + Math.floor(1000 + Math.random() * 9000)).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '_');

    // 5. Organizar subida de imágenes a carpetas en Storage por Color / Referencia Única
    const fotosColorGuardadas = [];
    let finalImageUrl = null;

    // A. Subir foto principal
    if (window.currentProductWebImgBase64 && window.currentProductWebImgBase64.startsWith('data:')) {
      const resMain = await subirBase64AStorageWeb(client, window.currentProductWebImgBase64, referenciaLimpia, 'general');
      finalImageUrl = resMain.url;
    } else {
      finalImageUrl = window.currentProductWebImgBase64;
    }

    // B. Subir fotos individuales de cada Color
    const esReferenciaUnica = window.currentAdminColores.length === 0;
    for (const itemColor of window.currentAdminColores) {
      const folderColor = itemColor.name ? itemColor.name.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '_') : 'general';
      if (itemColor.imageBase64 && itemColor.imageBase64.startsWith('data:')) {
        const resCol = await subirBase64AStorageWeb(client, itemColor.imageBase64, referenciaLimpia, folderColor);
        fotosColorGuardadas.push({
          color: itemColor.name,
          url: resCol.url,
          storage_path: resCol.storage_path
        });
      } else {
        fotosColorGuardadas.push({
          color: itemColor.name,
          url: itemColor.imageBase64 || finalImageUrl
        });
      }
    }

    // 3. Procesar y Guardar Atributos en la Biblioteca Global si se solicitó
    for (const attr of window.currentAdminVariablesAccesorios) {
      if (attr.guardar_en_catalogo) {
        await client.from('atributos_globales').upsert([{
          tipo: attr.tipo,
          nombre: attr.nombre,
          incremento_precio: attr.incremento_precio
        }], { onConflict: 'tipo,nombre' });
      }
    }

    const payload = {
      nombre,
      mundo,
      categoria,
      subcategoria,
      temporada,
      para_quien, // 1
      origen,
      dias_fabricacion, // 2
      precio_detal,
      price: precio_detal,
      precio_mayorista,
      cant_minima_mayorista,
      porcentaje_anticipo,
      precio_alquiler,
      valor_deposito,
      tallas: window.currentAdminTallas, // 3
      colores: window.currentAdminColores, // 5
      variables: window.currentAdminVariablesAccesorios, // 3
      fotos_color: fotosColorGuardadas, // 5
      permitir_credito, // 6
      cuota_inicial_porcentaje, // 6
      tasa_interes_mensual, // 6
      meses_credito_disponibles: 4, // 6
      es_personalizable,
      es_mayorista,
      permitir_venta,
      permitir_alquiler,
      visible_web: true,
      oculto_web: false
    };

    if (finalImageUrl) {
      payload.image_url = finalImageUrl;
      payload.imagen = finalImageUrl;
      payload.imagenes = [finalImageUrl];
    }

    let productoId = id;
    if (id) {
      const { error } = await client.from('productos').update(payload).eq('id', id);
      if (error) throw error;
      safeShowToastWeb("Producto actualizado con éxito en la tienda.");
    } else {
      payload.referencia = referenciaLimpia;
      const { data: nuevoP, error } = await client.from('productos').insert([payload]).select().single();
      if (error) throw error;
      productoId = nuevoP.id;
      safeShowToastWeb("¡Producto publicado correctamente!");
    }

    // Guardar relaciones de atributos del producto en `producto_atributos`
    if (productoId && window.currentAdminVariablesAccesorios.length > 0) {
      const relAtributos = window.currentAdminVariablesAccesorios.map(v => ({
        producto_id: productoId,
        tipo: v.tipo,
        nombre: v.nombre,
        incremento_precio: v.incremento_precio
      }));
      await client.from('producto_atributos').insert(relAtributos);
    }

    const modal = document.getElementById('modal-producto-web');
    if (modal) modal.classList.add('hidden');
    window.cargarProductosWeb();
  } catch (err) {
    console.error("Error al guardar producto en Supabase:", err);
    safeShowToastWeb(err.message || "Error al guardar producto en Supabase.", "error");
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `💾 Guardar Producto Web`;
    }
  }
};

// Auto-inicialización de eventos
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.initDragDropAndPasteImageWeb();
  });
} else {
  window.initDragDropAndPasteImageWeb();
}