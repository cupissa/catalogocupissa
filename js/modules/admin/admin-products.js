/**
 * js/modules/admin/admin-products.js
 * Módulo de Gestión de Inventario, Subida de Imágenes y Catálogo en Supabase
 */

window.adminProductsCache = [];
window.currentProdImageBase64 = '';

// Helpers de conversión de moneda
function parseMontoLocal(val) {
  if (typeof window.parseMonto === 'function') {
    return window.parseMonto(val);
  }
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? 0 : num;
}

function formatMonedaLocal(val) {
  if (typeof window.formatMoneda === 'function') {
    return window.formatMoneda(val);
  }
  return Number(val || 0).toLocaleString('es-CO');
}

/**
 * Carga el inventario desde la tabla 'productos' en Supabase
 */
window.cargarInventarioAdmin = async function() {
  const tbody = document.getElementById('tabla-inventario-admin');
  const countSpan = document.getElementById('count-productos-inv');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="py-8 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-lg mb-2"></i>
        <p>Cargando inventario real desde Supabase...</p>
      </td>
    </tr>
  `;

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('Cliente Supabase no inicializado');

    const { data: productos, error } = await client
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;

    window.adminProductsCache = productos || [];
    window.productosCache = window.adminProductsCache;

    if (countSpan) countSpan.textContent = window.adminProductsCache.length;

    window.renderizarTablaInventarioAdmin(window.adminProductsCache);
  } catch (err) {
    console.error("Error al cargar inventario admin desde Supabase:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-6 text-center text-rose-500 font-bold">
          Error al consultar el catálogo en la base de datos.
        </td>
      </tr>
    `;
  }
};

/**
 * Renderiza la lista de productos en la tabla del panel de control
 */
window.renderizarTablaInventarioAdmin = function(lista) {
  const tbody = document.getElementById('tabla-inventario-admin');
  if (!tbody) return;

  const query = (document.getElementById('buscador-inventario')?.value || '').toLowerCase().trim();
  const origenSel = document.getElementById('filtro-origen-inv')?.value || 'todos';

  let filtrados = (lista || []).filter(p => {
    const okQuery = !query || 
      (p.nombre || '').toLowerCase().includes(query) ||
      (p.mundo || '').toLowerCase().includes(query) ||
      (p.referencia || '').toLowerCase().includes(query);

    const okOrigen = origenSel === 'todos' || (p.origen || '').toLowerCase().includes(origenSel.toLowerCase());

    return okQuery && okOrigen;
  });

  if (filtrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-8 text-center text-slate-400 font-bold">
          No hay productos registrados en el inventario.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtrados.map(p => {
    const refCode = p.referencia || 'REF-' + (p.id ? String(p.id).slice(0, 6) : '000');
    const precioDetal = parseMontoLocal(p.precio_detal || p.price);
    const precioMayor = parseMontoLocal(p.precio_mayorista);
    const foto = p.image_url || p.imagen || 'images/logo.png';

    return `
      <tr class="border-b hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors text-xs">
        <td class="p-3">
          <div class="flex items-center gap-3">
            <img src="${foto}" alt="${p.nombre}" class="w-10 h-10 object-cover rounded-xl border border-gray-200 shadow-sm bg-white shrink-0">
            <div>
              <div class="font-extrabold text-indigo-900 dark:text-indigo-300">${refCode}</div>
              <div class="text-[10px] text-slate-400">${p.origen || 'Colombia'}</div>
            </div>
          </div>
        </td>
        <td class="p-3">
          <div class="font-black text-slate-900 dark:text-white uppercase">${p.nombre}</div>
          <div class="text-[10px] font-bold text-pink-600 dark:text-pink-400">${p.mundo || 'General'}</div>
        </td>
        <td class="p-3">
          <div class="flex items-center gap-2">
            <span class="font-black text-slate-900 dark:text-white">${p.stock || 0} unid.</span>
            <button type="button" onclick="sumarStockLote('${p.id}')" class="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg text-[10px] font-extrabold transition">
              + Sumar Lote
            </button>
          </div>
        </td>
        <td class="p-3">
          <div class="font-bold text-slate-800 dark:text-gray-200">Detal: $${formatMonedaLocal(precioDetal)}</div>
          <div class="text-[10px] font-extrabold text-amber-700 dark:text-amber-400">Mayor: $${formatMonedaLocal(precioMayor)}</div>
        </td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button type="button" onclick='editarProductoAdmin(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-xl transition" title="Editar">
              ✏️
            </button>
            <button type="button" onclick="eliminarProductoAdmin('${p.id}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-300 rounded-xl transition" title="Eliminar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

/**
 * Inicialización de eventos del formulario e interfaz de subida de imágenes
 */
window.initAdminProductsForm = function() {
  const form = document.getElementById('form-producto-admin');
  if (form) {
    form.addEventListener('submit', window.guardarProductoAdmin);
  }

  window.initImageUploadZone();
};

/**
 * Conecta el clic y arrastrar/soltar a la zona de subida de imagen (Dropzone)
 */
window.initImageUploadZone = function() {
  const dropZone = document.getElementById('drop-zone-prod') || document.querySelector('.drop-zone-area');
  const fileInput = document.getElementById('prod-imagen-file') || document.getElementById('prod-file');

  if (!dropZone || !fileInput) return;

  // Al hacer clic sobre el recuadro visual, abre la ventana de archivos
  dropZone.onclick = function(e) {
    if (e.target !== fileInput) {
      fileInput.click();
    }
  };

  // Arrastrar y soltar archivos (Drag and Drop)
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    }, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    }, false);
  });

  dropZone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files && files.length > 0) {
      fileInput.files = files;
      window.procesarArchivoImagen(files[0]);
    }
  }, false);

  fileInput.onchange = function(e) {
    if (e.target.files && e.target.files[0]) {
      window.procesarArchivoImagen(e.target.files[0]);
    }
  };
};

/**
 * Lee el archivo de imagen seleccionado y genera una vista previa
 */
window.procesarArchivoImagen = function(file) {
  if (!file || !file.type.startsWith('image/')) {
    if (typeof showToast === 'function') showToast("Por favor selecciona un archivo de imagen válido.", "error");
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    window.currentProdImageBase64 = e.target.result;

    // Actualizar vista previa en pantalla
    const imgPreview = document.getElementById('preview-prod-imagen');
    const containerPreview = document.getElementById('container-preview-imagen');
    const txtDrop = document.getElementById('txt-drop-zone');

    if (imgPreview) imgPreview.src = e.target.result;
    if (containerPreview) containerPreview.classList.remove('hidden');
    if (txtDrop) txtDrop.classList.add('hidden');

    if (typeof showToast === 'function') showToast("Imagen cargada correctamente.");
  };

  reader.readAsDataURL(file);
};

/**
 * Guarda o actualiza el producto en la base de datos Supabase
 */
window.guardarProductoAdmin = async function(e) {
  if (e) e.preventDefault();

  const id = document.getElementById('prod-id-edit')?.value || null;
  const nombre = document.getElementById('prod-nombre')?.value.trim();
  const mundo = (document.getElementById('prod-mundo')?.value || '').trim().toUpperCase();
  const origen = document.getElementById('prod-origen')?.value || 'Colombia';
  const sin_stock = document.getElementById('prod-sin-stock')?.checked || false;
  const stock = parseInt(document.getElementById('prod-stock')?.value, 10) || 0;
  const precio_detal = parseMontoLocal(document.getElementById('prod-detal')?.value);
  const precio_mayorista = parseMontoLocal(document.getElementById('prod-mayor')?.value);
  const urlDirecta = document.getElementById('prod-imagen-url')?.value.trim() || '';

  if (!nombre || !mundo) {
    if (typeof showToast === 'function') showToast("Ingresa el nombre y el mundo del producto.", "error");
    return;
  }

  // Determinar la imagen final (archivo subido Base64 o URL ingresada)
  const imagenFinal = window.currentProdImageBase64 || urlDirecta || 'images/logo.png';

  const payload = {
    nombre,
    mundo,
    origen,
    sin_stock,
    stock,
    precio_detal,
    price: precio_detal,
    precio_mayorista,
    image_url: imagenFinal,
    imagen: imagenFinal,
    oculto_web: false
  };

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('Cliente Supabase no inicializado');

    if (id) {
      const { error } = await client
        .from('productos')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      if (typeof showToast === 'function') showToast("Producto actualizado en Supabase con éxito.");
    } else {
      payload.referencia = 'CUP-' + Math.floor(1000 + Math.random() * 9000);
      const { error } = await client
        .from('productos')
        .insert([payload]);

      if (error) throw error;
      if (typeof showToast === 'function') showToast("Nuevo producto publicado en Supabase.");
    }

    window.cancelarEdicionProd();
    window.cargarInventarioAdmin();
  } catch (err) {
    console.error("Error al guardar producto en Supabase:", err);
    if (typeof showToast === 'function') showToast("Error al guardar el producto en la base de datos.", "error");
  }
};

/**
 * Carga los datos de un producto en el formulario para modificarlo
 */
window.editarProductoAdmin = function(prod) {
  if (!prod) return;

  const idInput = document.getElementById('prod-id-edit');
  const nombreInput = document.getElementById('prod-nombre');
  const mundoInput = document.getElementById('prod-mundo');
  const origenInput = document.getElementById('prod-origen');
  const sinStockInput = document.getElementById('prod-sin-stock');
  const stockInput = document.getElementById('prod-stock');
  const detalInput = document.getElementById('prod-detal');
  const mayorInput = document.getElementById('prod-mayor');
  const urlInput = document.getElementById('prod-imagen-url');

  if (idInput) idInput.value = prod.id || '';
  if (nombreInput) nombreInput.value = prod.nombre || '';
  if (mundoInput) mundoInput.value = prod.mundo || '';
  if (origenInput) origenInput.value = prod.origen || 'Colombia';
  if (sinStockInput) sinStockInput.checked = prod.sin_stock || false;
  if (stockInput) stockInput.value = prod.stock || 0;
  if (detalInput) detalInput.value = prod.precio_detal || prod.price || 0;
  if (mayorInput) mayorInput.value = prod.precio_mayorista || 0;

  const foto = prod.image_url || prod.imagen || '';
  window.currentProdImageBase64 = foto;

  if (urlInput) urlInput.value = foto.startsWith('http') ? foto : '';

  const imgPreview = document.getElementById('preview-prod-imagen');
  const containerPreview = document.getElementById('container-preview-imagen');
  const txtDrop = document.getElementById('txt-drop-zone');

  if (foto && imgPreview) {
    imgPreview.src = foto;
    if (containerPreview) containerPreview.classList.remove('hidden');
    if (txtDrop) txtDrop.classList.add('hidden');
  }

  const btnGuardar = document.getElementById('btn-guardar-prod');
  const btnCancelar = document.getElementById('btn-cancelar-edit-prod');

  if (btnGuardar) btnGuardar.textContent = '💾 Actualizar Producto';
  if (btnCancelar) btnCancelar.classList.remove('hidden');

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Limpia el formulario y restablece los botones
 */
window.cancelarEdicionProd = function() {
  const form = document.getElementById('form-producto-admin');
  if (form) form.reset();

  window.currentProdImageBase64 = '';

  const idInput = document.getElementById('prod-id-edit');
  if (idInput) idInput.value = '';

  const containerPreview = document.getElementById('container-preview-imagen');
  const txtDrop = document.getElementById('txt-drop-zone');

  if (containerPreview) containerPreview.classList.add('hidden');
  if (txtDrop) txtDrop.classList.remove('hidden');

  const btnGuardar = document.getElementById('btn-guardar-prod');
  const btnCancelar = document.getElementById('btn-cancelar-edit-prod');

  if (btnGuardar) btnGuardar.textContent = '💾 Guardar Catálogo';
  if (btnCancelar) btnCancelar.classList.add('hidden');
};

/**
 * Elimina un producto de la base de datos
 */
window.eliminarProductoAdmin = async function(id) {
  if (!confirm("¿Deseas eliminar este producto de Supabase?")) return;

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('Cliente Supabase no inicializado');

    const { error } = await client.from('productos').delete().eq('id', id);
    if (error) throw error;

    if (typeof showToast === 'function') showToast("Producto eliminado de Supabase.");
    window.cargarInventarioAdmin();
  } catch (err) {
    console.error("Error al eliminar producto:", err);
    if (typeof showToast === 'function') showToast("Error al eliminar producto.", "error");
  }
};

/**
 * Modales de incremento rápido de stock
 */
window.sumarStockLote = function(id) {
  const prod = (window.adminProductsCache || []).find(p => String(p.id) === String(id));
  if (!prod) return;

  const loteIdInput = document.getElementById('lote-prod-id');
  const loteNombreLbl = document.getElementById('lbl-lote-prod-nombre');
  const modal = document.getElementById('modal-sumar-lote');

  if (loteIdInput) loteIdInput.value = prod.id;
  if (loteNombreLbl) loteNombreLbl.textContent = prod.nombre;
  if (modal) modal.classList.remove('hidden');
};

window.cerrarModalLote = function() {
  const modal = document.getElementById('modal-sumar-lote');
  if (modal) modal.classList.add('hidden');
};

window.confirmarSumarLote = async function() {
  const idInput = document.getElementById('lote-prod-id');
  const cantInput = document.getElementById('lote-cantidad');

  if (!idInput) return;

  const id = idInput.value;
  const cantSumar = parseInt(cantInput ? cantInput.value : 0, 10) || 0;

  const prod = (window.adminProductsCache || []).find(p => String(p.id) === String(id));
  if (!prod) return;

  const nuevoStock = (prod.stock || 0) + cantSumar;

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) throw new Error('Cliente Supabase no inicializado');

    const { error } = await client
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', id);

    if (error) throw error;

    if (typeof showToast === 'function') showToast(`Stock actualizado: +${cantSumar} unidades.`);
    window.cerrarModalLote();
    window.cargarInventarioAdmin();
  } catch (err) {
    console.error("Error al sumar lote:", err);
    if (typeof showToast === 'function') showToast("Error al actualizar stock.", "error");
  }
};

// Inicialización de eventos al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  window.initAdminProductsForm();
});