/**
 * js/modules/admin/admin-products.js
 * Carga y gestión de productos de la tabla 'productos' (inventario interno)
 */

window.webCropperInstance = null;
window.currentProductWebImgBase64 = null;

function safeParseMontoWeb(val) {
  if (typeof parseMonto === 'function') return parseMonto(val);
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? 0 : num;
}

function safeFormatMonedaWeb(val) {
  if (typeof formatMoneda === 'function') return formatMoneda(val);
  return new Intl.NumberFormat('es-CO').format(val || 0);
}

function safeShowToastWeb(msg, type = 'success') {
  if (typeof showToast === 'function') {
    showToast(msg, type);
  } else {
    console.log(`[Toast ${type}]: ${msg}`);
  }
}

/**
 * Carga el inventario completo de productos directamente desde la tabla 'productos' de Supabase
 */
window.cargarInventarioAdmin = async function() {
  const tbody = document.getElementById('tabla-inventario-admin') || document.getElementById('tabla-productos-web');
  const countSpan = document.getElementById('count-productos-inv');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-8 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-lg mb-2"></i>
        <p>Sincronizando inventario ('productos') desde Supabase...</p>
      </td>
    </tr>
  `;

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) {
      throw new Error('Supabase no está disponible.');
    }

    const { data: prods, error } = await client
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;

    window.adminProductsCache = prods || [];
    window.productosCache = window.adminProductsCache;

    if (countSpan) countSpan.textContent = window.adminProductsCache.length;

    window.renderizarTablaInventarioAdmin(window.adminProductsCache);
  } catch (err) {
    console.error("Error al cargar inventario interno:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-red-500 font-bold">
          Error al conectar con la tabla 'productos' de Supabase.
        </td>
      </tr>
    `;
  }
};

/**
 * Renderizado de productos en la tabla de inventario administrativo
 */
window.renderizarTablaInventarioAdmin = function(lista) {
  const tbody = document.getElementById('tabla-inventario-admin') || document.getElementById('tabla-productos-web');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400">
          No hay productos registrados en el inventario interno.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const foto = p.image_url || p.imagen || 'assets/images/logo.png';
    const stock = p.sin_stock ? '<span class="text-amber-600 font-bold">Sin Stock (Bajo Pedido)</span>' : `<span class="font-black ${(p.stock || 0) <= 3 ? 'text-red-600' : 'text-slate-800'}">${p.stock || 0} unid.</span>`;
    const precioDetal = safeParseMontoWeb(p.precio_detal || p.price);
    const precioMayor = safeParseMontoWeb(p.precio_mayorista);

    return `
      <tr class="border-b hover:bg-slate-50/80 transition-colors">
        <td class="p-3">
          <div class="flex items-center gap-3">
            <img src="${foto}" alt="${p.nombre}" class="w-12 h-12 object-contain bg-white rounded-xl border p-1 shrink-0">
            <div>
              <div class="font-bold text-slate-900">${p.nombre}</div>
              <div class="text-[10px] text-indigo-600 font-semibold">Ref: ${p.referencia || 'N/A'} | Mundo: ${p.mundo || 'General'}</div>
            </div>
          </div>
        </td>
        <td class="p-3 text-xs">
          <div class="font-bold text-slate-700">Detal: $${safeFormatMonedaWeb(precioDetal)}</div>
          ${precioMayor > 0 ? `<div class="text-[10px] font-black text-amber-700">Mayor: $${safeFormatMonedaWeb(precioMayor)}</div>` : ''}
        </td>
        <td class="p-3 text-xs">
          <div class="flex items-center gap-2">
            ${stock}
            <button type="button" onclick="sumarStockLote('${p.id}')" class="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-extrabold transition" title="Sumar lote al stock">
              + Lote
            </button>
          </div>
        </td>
        <td class="p-3 text-center">
          <span class="px-2 py-1 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">${p.origen || p.origen_compra || 'Colombia'}</span>
        </td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button type="button" onclick='editarProductoAdmin(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all" title="Editar Producto">
              ✏️
            </button>
            <button type="button" onclick="eliminarProductoAdmin('${p.id}')" class="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

/**
 * Filtro de búsqueda en tiempo real para el inventario
 */
window.filtrarInventarioAdmin = function() {
  const query = (document.getElementById('buscador-inventario')?.value || '').toLowerCase().trim();
  const origenSel = document.getElementById('filtro-origen-inv')?.value || 'todos';

  const filtrados = (window.adminProductsCache || []).filter(p => {
    const okQuery = !query || 
      (p.nombre || '').toLowerCase().includes(query) ||
      (p.mundo || '').toLowerCase().includes(query) ||
      (p.referencia || '').toLowerCase().includes(query);

    const origenVal = p.origen || p.origen_compra || '';
    const okOrigen = origenSel === 'todos' || origenVal.toLowerCase().includes(origenSel.toLowerCase());

    return okQuery && okOrigen;
  });

  window.renderizarTablaInventarioAdmin(filtrados);
};

/**
 * Elimina un producto únicamente de la tabla 'productos' del inventario interno
 */
window.eliminarProductoAdmin = async function(id) {
  if (!confirm("¿Deseas eliminar este producto del inventario interno y de la web?")) return;

  try {
    const client = window.supabaseClient || window.supabase;
    // Eliminar de productos internos
    const { error } = await client.from('productos').delete().eq('id', id);
    if (error) throw error;

    safeShowToastWeb("Producto eliminado del inventario interno.");
    window.cargarInventarioAdmin();
  } catch (err) {
    console.error("Error al eliminar producto del inventario:", err);
    safeShowToastWeb("Error al eliminar producto.", "error");
  }
};

/**
 * Abre el formulario / modal para editar un producto del inventario
 */
window.editarProductoAdmin = function(prod) {
  if (!prod) return;

  const idField = document.getElementById('prod-id-edit');
  const nombreField = document.getElementById('prod-nombre');
  const mundoField = document.getElementById('prod-mundo');
  const origenField = document.getElementById('prod-origen');
  const sinStockField = document.getElementById('prod-sin-stock');
  const stockField = document.getElementById('prod-stock');
  const detalField = document.getElementById('prod-detal');
  const mayorField = document.getElementById('prod-mayor');

  if (idField) idField.value = prod.id || '';
  if (nombreField) nombreField.value = prod.nombre || '';
  if (mundoField) mundoField.value = prod.mundo || '';
  if (origenField) origenField.value = prod.origen || prod.origen_compra || 'Colombia';
  if (sinStockField) sinStockField.checked = prod.sin_stock || false;
  if (stockField) stockField.value = prod.stock || 0;
  if (detalField) detalField.value = prod.precio_detal || prod.price || 0;
  if (mayorField) mayorField.value = prod.precio_mayorista || 0;

  const btnGuardar = document.getElementById('btn-guardar-prod');
  const btnCancelar = document.getElementById('btn-cancelar-edit-prod');

  if (btnGuardar) btnGuardar.textContent = '💾 Actualizar Producto';
  if (btnCancelar) btnCancelar.classList.remove('hidden');
};

/**
 * Restablece el formulario de inventario
 */
window.cancelarEdicionProd = function() {
  const form = document.getElementById('form-producto-admin');
  if (form) form.reset();

  const idField = document.getElementById('prod-id-edit');
  if (idField) idField.value = '';

  const btnGuardar = document.getElementById('btn-guardar-prod');
  const btnCancelar = document.getElementById('btn-cancelar-edit-prod');

  if (btnGuardar) btnGuardar.textContent = '💾 Guardar Catálogo';
  if (btnCancelar) btnCancelar.classList.add('hidden');
};

/**
 * Sumar lote de stock rápido
 */
window.sumarStockLote = function(id) {
  const prod = (window.adminProductsCache || []).find(p => p.id === id);
  if (!prod) return;

  const loteIdField = document.getElementById('lote-prod-id');
  const lblNombre = document.getElementById('lbl-lote-prod-nombre');
  const modalLote = document.getElementById('modal-sumar-lote');

  if (loteIdField) loteIdField.value = prod.id;
  if (lblNombre) lblNombre.textContent = prod.nombre;
  if (modalLote) modalLote.classList.remove('hidden');
};

window.cerrarModalLote = function() {
  const modalLote = document.getElementById('modal-sumar-lote');
  if (modalLote) modalLote.classList.add('hidden');
};

window.confirmarSumarLote = async function() {
  const loteIdField = document.getElementById('lote-prod-id');
  const cantidadInput = document.getElementById('lote-cantidad');
  if (!loteIdField) return;

  const id = loteIdField.value;
  const cantSumar = parseInt(cantidadInput?.value || 0, 10) || 0;

  const prod = (window.adminProductsCache || []).find(p => p.id === id);
  if (!prod) return;

  const nuevoStock = (prod.stock || 0) + cantSumar;

  try {
    const client = window.supabaseClient || window.supabase;
    const { error } = await client
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', id);

    if (error) throw error;


    safeShowToastWeb(`Stock actualizado: +${cantSumar} unidades.`);
    window.cerrarModalLote();
    window.cargarInventarioAdmin();
  } catch (err) {
    console.error("Error al sumar lote:", err);
    safeShowToastWeb("Error al actualizar stock.", "error");
  }
};

/**
 * Inicializador del formulario de productos del inventario y sincronización web
 */
window.initAdminProductsForm = function() {
  const form = document.getElementById('form-producto-admin');
  if (!form) return;

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const id = document.getElementById('prod-id-edit')?.value;
    const nombre = (document.getElementById('prod-nombre')?.value || '').trim();
    const mundo = (document.getElementById('prod-mundo')?.value || '').trim().toUpperCase();
    const origen = document.getElementById('prod-origen')?.value || 'Colombia';
    const sin_stock = document.getElementById('prod-sin-stock')?.checked || false;
    const stock = parseInt(document.getElementById('prod-stock')?.value || 0, 10) || 0;
    const precio_detal = safeParseMontoWeb(document.getElementById('prod-detal')?.value);
    const precio_mayorista = safeParseMontoWeb(document.getElementById('prod-mayor')?.value);

    if (!nombre || !mundo) {
      safeShowToastWeb("El nombre y el mundo del producto son obligatorios.", "error");
      return;
    }

    const payload = {
      nombre,
      mundo,
      origen,
      origen_compra: origen,
      sin_stock,
      stock,
      precio_detal,
      price: precio_detal,
      precio_mayorista,
      is_active: true
    };

    try {
      const client = window.supabaseClient || window.supabase;
      if (!client) throw new Error("Supabase no disponible.");

      if (id) {
        // Actualizar en inventario interno
        const { error } = await client.from('productos').update(payload).eq('id', id);
        if (error) throw error;

        safeShowToastWeb("Producto actualizado en el inventario interno.");
      } else {
        const ref = 'CUP-' + Math.floor(1000 + Math.random() * 9000);
        payload.referencia = ref;
        
        // Insertar en inventario interno
        const { data: insertedData, error } = await client.from('productos').insert([payload]).select().single();
        if (error) throw error;

        safeShowToastWeb("Nuevo producto registrado en el inventario interno.");
      }

      window.cancelarEdicionProd();
      window.cargarInventarioAdmin();
    } catch (err) {
      console.error("Error al guardar en inventario:", err);
      safeShowToastWeb("Error al guardar en la base de datos.", "error");
    }
  });
};

// Inicialización automática de eventos de búsqueda o formularios si aplica
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.initAdminProductsForm();
  });
} else {
  window.initAdminProductsForm();
}