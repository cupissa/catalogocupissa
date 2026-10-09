/**
 * js/modules/admin/web/web-products.js
 * Carga Inteligente de Productos en Supabase, Visibilidad en Tienda Cliente, Precios Mayoristas e Imágenes
 */

window.webCropperInstance = null;
window.currentProductWebImgBase64 = null;

/**
 * Carga el catálogo completo de productos directamente desde Supabase
 */
window.cargarProductosWeb = async function() {
  const tbody = document.getElementById('tabla-productos-web');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-8 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-lg mb-2"></i>
        <p>Sincronizando productos desde Supabase...</p>
      </td>
    </tr>
  `;

  try {
    const { data: prods, error } = await supabaseClient
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;

    window.productosCache = prods || [];
    window.renderizarTablaProductosWeb(window.productosCache);
  } catch (err) {
    console.error("Error al cargar catálogo de productos web:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-red-500 font-bold">
          Error al conectar con el inventario de Supabase.
        </td>
      </tr>
    `;
  }
};

/**
 * Renderizado de productos con estado de visibilidad pública en la tienda
 */
window.renderizarTablaProductosWeb = function(lista) {
  const tbody = document.getElementById('tabla-productos-web');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400">
          No hay productos creados en Supabase o coincidentes con la búsqueda.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(p => {
    const foto = p.image_url || p.imagen || 'images/logo.png';
    const esOculto = p.oculto_web || false;
    const esPersonalizable = p.es_personalizable || false;
    const esMayorista = p.es_mayorista || false;

    return `
      <tr class="border-b hover:bg-slate-50/80 transition-colors ${esOculto ? 'bg-slate-100/60 opacity-60' : ''}">
        <td class="p-3">
          <div class="flex items-center gap-3">
            <img src="${foto}" alt="${p.nombre}" class="w-12 h-12 object-contain bg-white rounded-xl border p-1">
            <div>
              <div class="font-bold text-slate-900">${p.nombre}</div>
              <div class="text-[10px] text-indigo-600 font-semibold">${p.mundo || 'General'} / ${p.categoria || 'Sin Categoría'}</div>
            </div>
          </div>
        </td>
        <td class="p-3 text-xs">
          <div class="font-bold text-slate-700">Detal: $${formatMoneda(parseMonto(p.precio_detal || p.price))}</div>
          ${esMayorista ? `<div class="text-[10px] font-black text-amber-700">Mayor: $${formatMoneda(parseMonto(p.precio_mayorista))} (x${p.cant_minima_mayorista || 6})</div>` : ''}
        </td>
        <td class="p-3 text-xs">
          <div class="flex flex-wrap gap-1">
            ${p.permitir_venta ? '<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">Venta</span>' : ''}
            ${p.permitir_alquiler ? '<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px] font-bold">Alquiler</span>' : ''}
            ${p.permitir_credito ? '<span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">Crédito</span>' : ''}
          </div>
        </td>
        <td class="p-3 text-center">
          ${esPersonalizable ? '<span class="text-indigo-600 text-xs font-extrabold" title="Requiere datos de personalización"><i class="fa-solid fa-wand-magic-sparkles"></i> Sí</span>' : '<span class="text-slate-300 text-xs">No</span>'}
        </td>
        <td class="p-3 text-center">
          <button onclick="toggleVisibilidadProductoWeb('${p.id}', ${esOculto})" class="px-2.5 py-1 rounded-xl text-xs font-bold transition-all ${esOculto ? 'bg-slate-200 text-slate-700' : 'bg-emerald-100 text-emerald-800'}" title="Haga clic para ocultar o mostrar en la tienda visible para clientes">
            <i class="fa-solid ${esOculto ? 'fa-eye-slash' : 'fa-eye'} mr-1"></i>
            ${esOculto ? 'Oculto' : 'Visible'}
          </button>
        </td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick='abrirModalProductoWeb(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition-all" title="Editar Producto">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button onclick="eliminarProductoWeb('${p.id}')" class="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition-all" title="Eliminar de Supabase">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

/**
 * Filtrado dinámico de productos en la tabla del panel
 */
window.filtrarProductosWeb = function() {
  const query = (document.getElementById('buscador-productos-web')?.value || '').toLowerCase().trim();
  if (!query) {
    window.renderizarTablaProductosWeb(window.productosCache);
    return;
  }

  const filtrados = window.productosCache.filter(p =>
    (p.nombre || '').toLowerCase().includes(query) ||
    (p.mundo || '').toLowerCase().includes(query) ||
    (p.categoria || '').toLowerCase().includes(query) ||
    (p.referencia || '').toLowerCase().includes(query)
  );

  window.renderizarTablaProductosWeb(filtrados);
};

/**
 * Alterna la propiedad 'oculto_web' en Supabase para mostrar u ocultar un producto de la tienda cliente de inmediato
 */
window.toggleVisibilidadProductoWeb = async function(id, estadoActualOculto) {
  try {
    const { error } = await supabaseClient
      .from('productos')
      .update({ oculto_web: !estadoActualOculto })
      .eq('id', id);

    if (error) throw error;

    if (typeof showToast === 'function') {
      showToast(!estadoActualOculto ? "Producto ocultado de la tienda pública." : "Producto visible nuevamente en la tienda.");
    }
    window.cargarProductosWeb();
  } catch (err) {
    console.error("Error al actualizar visibilidad en Supabase:", err);
    if (typeof showToast === 'function') showToast("Error al modificar visibilidad.", "error");
  }
};

/**
 * Elimina permanentemente un producto de la tabla 'productos' en Supabase
 */
window.eliminarProductoWeb = async function(id) {
  if (!confirm("¿Eliminar este producto permanentemente de Supabase? No estará disponible ni en la tienda ni en el inventario.")) return;

  try {
    const { error } = await supabaseClient.from('productos').delete().eq('id', id);
    if (error) throw error;

    if (typeof showToast === 'function') showToast("Producto eliminado de Supabase.");
    window.cargarProductosWeb();
  } catch (err) {
    console.error("Error al eliminar producto:", err);
    if (typeof showToast === 'function') showToast("Error al eliminar el producto.", "error");
  }
};

/**
 * Abre el formulario modal para crear o editar un producto y sincronizarlo con Supabase
 */
window.abrirModalProductoWeb = function(prod = null) {
  const modal = document.getElementById('modal-producto-web');
  const form = document.getElementById('form-producto-web');
  if (!modal || !form) return;

  form.reset();
  window.currentProductWebImgBase64 = null;

  if (prod) {
    document.getElementById('prod-web-id').value = prod.id;
    document.getElementById('prod-web-nombre').value = prod.nombre || '';
    document.getElementById('prod-web-mundo').value = prod.mundo || '';
    document.getElementById('prod-web-categoria').value = prod.categoria || '';
    document.getElementById('prod-web-subcategoria').value = prod.subcategoria || '';
    document.getElementById('prod-web-temporada').value = prod.temporada || '';
    document.getElementById('prod-web-precio-detal').value = prod.precio_detal || prod.price || 0;
    document.getElementById('prod-web-precio-mayor').value = prod.precio_mayorista || 0;
    document.getElementById('prod-web-cant-mayor').value = prod.cant_minima_mayorista || 6;

    document.getElementById('prod-web-check-personalizable').checked = prod.es_personalizable || false;
    document.getElementById('prod-web-check-mayorista').checked = prod.es_mayorista || false;
    document.getElementById('prod-web-check-venta').checked = prod.permitir_venta !== false;
    document.getElementById('prod-web-check-alquiler').checked = prod.permitir_alquiler || false;
    document.getElementById('prod-web-check-credito').checked = prod.permitir_credito || false;

    const imgPreview = document.getElementById('prod-web-img-preview');
    if (imgPreview) imgPreview.src = prod.image_url || prod.imagen || 'images/logo.png';
  } else {
    document.getElementById('prod-web-id').value = '';
    const imgPreview = document.getElementById('prod-web-img-preview');
    if (imgPreview) imgPreview.src = 'images/logo.png';
  }

  modal.classList.remove('hidden');
};

/**
 * Inicia el escuchador de eventos para arrastrar, soltar y pegar fotos directamente desde el portapapeles (Ctrl + V)
 */
window.initDragDropAndPasteImageWeb = function() {
  const dropZone = document.getElementById('prod-web-drop-zone');
  const fileInput = document.getElementById('prod-web-file-input');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('border-brand-500', 'bg-brand-50/50');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('border-brand-500', 'bg-brand-50/50');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('border-brand-500', 'bg-brand-50/50');
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
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
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
 * Lee la foto ingresada e inicia el módulo de recorte interactivo Cropper.js
 */
window.procesarFotoProductoWeb = function(file) {
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

      window.webCropperInstance = new Cropper(cropImg, {
        aspectRatio: 1,
        viewMode: 1
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
 * Aplica el recorte realizado en Cropper.js y guarda el resultado base64
 */
window.confirmarRecorteFotoWeb = function() {
  if (window.webCropperInstance) {
    const canvas = window.webCropperInstance.getCroppedCanvas({
      width: 600,
      height: 600
    });

    const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
    window.currentProductWebImgBase64 = croppedBase64;

    const imgPreview = document.getElementById('prod-web-img-preview');
    if (imgPreview) imgPreview.src = croppedBase64;

    document.getElementById('modal-cropper-web').classList.add('hidden');
    window.webCropperInstance.destroy();
    window.webCropperInstance = null;
  }
};

/**
 * Realiza la inserción o actualización del producto en la base de datos de Supabase
 */
window.guardarProductoWeb = async function(e) {
  if (e) e.preventDefault();

  const id = document.getElementById('prod-web-id').value;
  const nombre = document.getElementById('prod-web-nombre').value.trim();
  const mundo = document.getElementById('prod-web-mundo').value.trim();
  const categoria = document.getElementById('prod-web-categoria').value.trim();
  const subcategoria = document.getElementById('prod-web-subcategoria').value.trim();
  const temporada = document.getElementById('prod-web-temporada').value.trim();

  const precio_detal = parseMonto(document.getElementById('prod-web-precio-detal').value);
  const precio_mayorista = parseMonto(document.getElementById('prod-web-precio-mayor').value);
  const cant_minima_mayorista = parseInt(document.getElementById('prod-web-cant-mayor').value, 10) || 6;

  const es_personalizable = document.getElementById('prod-web-check-personalizable').checked;
  const es_mayorista = document.getElementById('prod-web-check-mayorista').checked;
  const permitir_venta = document.getElementById('prod-web-check-venta').checked;
  const permitir_alquiler = document.getElementById('prod-web-check-alquiler').checked;
  const permitir_credito = document.getElementById('prod-web-check-credito').checked;

  const payload = {
    nombre,
    mundo,
    categoria,
    subcategoria,
    temporada,
    precio_detal,
    price: precio_detal,
    precio_mayorista,
    cant_minima_mayorista,
    es_personalizable,
    es_mayorista,
    permitir_venta,
    permitir_alquiler,
    permitir_credito,
    is_active: true
  };

  if (window.currentProductWebImgBase64) {
    payload.image_url = window.currentProductWebImgBase64;
    payload.imagen = window.currentProductWebImgBase64;
  }

  try {
    if (id) {
      const { error } = await supabaseClient.from('productos').update(payload).eq('id', id);
      if (error) throw error;
      if (typeof showToast === 'function') showToast("Producto actualizado en Supabase.");
    } else {
      payload.referencia = 'CUP-' + Math.floor(1000 + Math.random() * 9000);
      const { error } = await supabaseClient.from('productos').insert([payload]);
      if (error) throw error;
      if (typeof showToast === 'function') showToast("Nuevo producto registrado en Supabase.");
    }

    document.getElementById('modal-producto-web').classList.add('hidden');
    window.cargarProductosWeb();
  } catch (err) {
    console.error("Error al guardar producto en Supabase:", err);
    if (typeof showToast === 'function') showToast("Error al guardar el producto. Verifica la conexión con Supabase.", "error");
  }
};