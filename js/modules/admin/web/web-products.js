/**
 * js/modules/admin/web/web-products.js
 * Carga Inteligente de Productos en Supabase, Visibilidad en Tienda Cliente,
 * Precios Mayoristas, Tallas/Colores con Incrementos, Alquiler, Depósitos e Imágenes.
 */

window.webCropperInstance = null;
window.currentProductWebImgBase64 = null;

// Arreglos temporales para tallas y colores del producto en edición
window.currentAdminTallas = [];
window.currentAdminColores = [];

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
    const client = window.supabaseClient || window.supabase;
    if (!client) {
      throw new Error('Supabase no está disponible.');
    }

    const { data: prods, error } = await client
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
          Error al conectar con la base de datos de Supabase. Revisa la configuración o RLS.
        </td>
      </tr>
    `;
  }
};

/**
 * Renderizado de productos en la tabla administrativa de la tienda
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

    const precioDetal = safeParseMontoWeb(p.precio_detal || p.price);
    const precioMayor = safeParseMontoWeb(p.precio_mayorista);
    const precioAlquiler = safeParseMontoWeb(p.precio_alquiler);
    const temporadaLabel = p.temporada ? `<span class="px-1.5 py-0.5 rounded bg-pink-100 text-pink-800 text-[9px] font-bold uppercase">${p.temporada}</span>` : '';

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
            </div>
          </div>
        </td>
        <td class="p-3 text-xs">
          <div class="font-bold text-slate-700">Detal: $${safeFormatMonedaWeb(precioDetal)}</div>
          ${precioAlquiler > 0 ? `<div class="text-[10px] font-bold text-purple-700">Alquiler: $${safeFormatMonedaWeb(precioAlquiler)}</div>` : ''}
          ${esMayorista ? `<div class="text-[10px] font-black text-amber-700">Mayor: $${safeFormatMonedaWeb(precioMayor)} (x${p.cant_minima_mayorista || 6})</div>` : ''}
        </td>
        <td class="p-3 text-xs">
          <div class="flex flex-wrap gap-1">
            ${p.permitir_venta !== false ? '<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold">Venta</span>' : ''}
            ${p.permitir_alquiler ? '<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 text-[9px] font-bold">Alquiler</span>' : ''}
            ${p.permitir_credito ? '<span class="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">Crédito</span>' : ''}
          </div>
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
 * Filtro de búsqueda en tiempo real
 */
window.filtrarProductosWeb = function() {
  const query = (document.getElementById('buscador-productos-web')?.value || '').toLowerCase().trim();
  if (!query) {
    window.renderizarTablaProductosWeb(window.productosCache);
    return;
  }

  const filtrados = (window.productosCache || []).filter(p =>
    (p.nombre || '').toLowerCase().includes(query) ||
    (p.mundo || '').toLowerCase().includes(query) ||
    (p.categoria || '').toLowerCase().includes(query) ||
    (p.subcategoria || '').toLowerCase().includes(query) ||
    (p.temporada || '').toLowerCase().includes(query) ||
    (p.referencia || '').toLowerCase().includes(query)
  );

  window.renderizarTablaProductosWeb(filtrados);
};

/**
 * Alterna el estado oculto_web de un producto
 */
window.toggleVisibilidadProductoWeb = async function(id, estadoActualOculto) {
  try {
    const client = window.supabaseClient || window.supabase;
    const { error } = await client
      .from('productos')
      .update({ oculto_web: !estadoActualOculto })
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
 * Muestra/Oculta los campos de alquiler en el formulario según el checkbox
 */
window.toggleSeccionAlquilerAdmin = function(isRent) {
  const box = document.getElementById('seccion-alquiler-admin-box');
  if (box) {
    if (isRent) box.classList.remove('hidden');
    else box.classList.add('hidden');
  }
};

/**
 * Gestión dinámica de Tallas (Agregar / Eliminar)
 */
window.agregarTallaAlProductoAdmin = function() {
  const inpNombre = document.getElementById('input-nueva-talla-nombre');
  const inpPrecio = document.getElementById('input-nueva-talla-precio');
  if (!inpNombre) return;

  const name = inpNombre.value.trim().toUpperCase();
  const price = safeParseMontoWeb(inpPrecio?.value);

  if (!name) {
    safeShowToastWeb("Ingresa el nombre o código de la talla.", "error");
    return;
  }

  window.currentAdminTallas.push({ name, price });
  inpNombre.value = '';
  if (inpPrecio) inpPrecio.value = '';

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
      <span>${t.name}</span>
      ${t.price > 0 ? `<span class="text-emerald-700 text-[10px]">(+$${safeFormatMonedaWeb(t.price)})</span>` : ''}
      <button type="button" onclick="eliminarTallaAdmin(${idx})" class="text-rose-500 hover:text-rose-700 ml-1">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </span>
  `).join('');
};

/**
 * Gestión dinámica de Colores (Agregar / Eliminar)
 */
window.agregarColorAlProductoAdmin = function() {
  const inpNombre = document.getElementById('input-nuevo-color-nombre');
  const inpPrecio = document.getElementById('input-nuevo-color-precio');
  if (!inpNombre) return;

  const name = inpNombre.value.trim();
  const price = safeParseMontoWeb(inpPrecio?.value);

  if (!name) {
    safeShowToastWeb("Ingresa el nombre del color.", "error");
    return;
  }

  window.currentAdminColores.push({ name, price });
  inpNombre.value = '';
  if (inpPrecio) inpPrecio.value = '';

  window.renderListaColoresAdmin();
};

window.eliminarColorAdmin = function(index) {
  window.currentAdminColores.splice(index, 1);
  window.renderListaColoresAdmin();
};

window.renderListaColoresAdmin = function() {
  const container = document.getElementById('contenedor-lista-colores-admin');
  if (!container) return;

  if (window.currentAdminColores.length === 0) {
    container.innerHTML = `<span class="text-[11px] text-slate-400 italic">No hay colores agregados aún.</span>`;
    return;
  }

  container.innerHTML = window.currentAdminColores.map((c, idx) => `
    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-pink-50 border border-pink-200 text-pink-900 font-bold text-xs">
      <span>${c.name}</span>
      ${c.price > 0 ? `<span class="text-emerald-700 text-[10px]">(+$${safeFormatMonedaWeb(c.price)})</span>` : ''}
      <button type="button" onclick="eliminarColorAdmin(${idx})" class="text-rose-500 hover:text-rose-700 ml-1">
        <i class="fa-solid fa-xmark"></i>
      </button>
    </span>
  `).join('');
};

/**
 * Abre el modal para crear o editar producto
 */
window.abrirModalProductoWeb = function(prod = null) {
  const modal = document.getElementById('modal-producto-web');
  const form = document.getElementById('form-producto-web');
  if (!modal || !form) return;

  form.reset();
  window.currentProductWebImgBase64 = null;
  window.currentAdminTallas = [];
  window.currentAdminColores = [];

  if (prod) {
    document.getElementById('prod-web-id').value = prod.id || '';
    document.getElementById('prod-web-nombre').value = prod.nombre || '';
    document.getElementById('prod-web-mundo').value = prod.mundo || '';
    document.getElementById('prod-web-categoria').value = prod.categoria || '';
    document.getElementById('prod-web-subcategoria').value = prod.subcategoria || '';
    document.getElementById('prod-web-temporada').value = prod.temporada || '';

    document.getElementById('prod-web-precio-detal').value = prod.precio_detal || prod.price || 0;
    document.getElementById('prod-web-precio-mayor').value = prod.precio_mayorista || 0;
    document.getElementById('prod-web-cant-mayor').value = prod.cant_minima_mayorista || 6;
    document.getElementById('prod-web-porcentaje-anticipo').value = prod.porcentaje_anticipo || 50;

    document.getElementById('prod-web-precio-alquiler').value = prod.precio_alquiler || 0;
    document.getElementById('prod-web-valor-deposito').value = prod.valor_deposito || 0;

    document.getElementById('prod-web-check-personalizable').checked = prod.es_personalizable || false;
    document.getElementById('prod-web-check-mayorista').checked = prod.es_mayorista || false;
    document.getElementById('prod-web-check-venta').checked = prod.permitir_venta !== false;
    
    const esAlquiler = Boolean(prod.permitir_alquiler);
    document.getElementById('prod-web-check-alquiler').checked = esAlquiler;
    window.toggleSeccionAlquilerAdmin(esAlquiler);

    document.getElementById('prod-web-check-credito').checked = prod.permitir_credito || false;

    // Cargar tallas existentes
    try {
      window.currentAdminTallas = typeof prod.tallas === 'string' ? JSON.parse(prod.tallas) : (prod.tallas || []);
    } catch (e) { window.currentAdminTallas = []; }

    // Cargar colores existentes
    try {
      window.currentAdminColores = typeof prod.colores === 'string' ? JSON.parse(prod.colores) : (prod.colores || []);
    } catch (e) { window.currentAdminColores = []; }

    const imgPreview = document.getElementById('prod-web-img-preview');
    const foto = prod.image_url || prod.imagen || 'images/logo.png';
    if (imgPreview) imgPreview.src = foto;
    window.currentProductWebImgBase64 = foto;

  } else {
    document.getElementById('prod-web-id').value = '';
    document.getElementById('prod-web-porcentaje-anticipo').value = 50;
    window.toggleSeccionAlquilerAdmin(false);

    const imgPreview = document.getElementById('prod-web-img-preview');
    if (imgPreview) imgPreview.src = 'images/logo.png';
  }

  window.renderListaTallasAdmin();
  window.renderListaColoresAdmin();

  modal.classList.remove('hidden');
};

/**
 * Eventos para Drag & Drop, Clic en Dropzone y Pegar desde el portapapeles
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
 * Lee la imagen y activa el recortador Cropper.js
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
 * Confirma el recorte y comprime la imagen
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

    const cropModal = document.getElementById('modal-cropper-web');
    if (cropModal) cropModal.classList.add('hidden');

    window.webCropperInstance.destroy();
    window.webCropperInstance = null;

    safeShowToastWeb("Imagen recortada y lista para subir.");
  }
};

/**
 * Inserción / Actualización segura en Supabase con subida a Supabase Storage
 */
window.guardarProductoWeb = async function(e) {
  if (e) e.preventDefault();

  const btnSubmit = e?.target?.querySelector('button[type="submit"]');
  if (btnSubmit) {
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Subiendo imagen y guardando...`;
  }

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) {
      throw new Error("El cliente de Supabase no se encuentra inicializado.");
    }

    const id = document.getElementById('prod-web-id')?.value;
    const nombre = (document.getElementById('prod-web-nombre')?.value || '').trim();
    const mundo = (document.getElementById('prod-web-mundo')?.value || '').trim().toUpperCase();
    const categoria = (document.getElementById('prod-web-categoria')?.value || '').trim();
    const subcategoria = (document.getElementById('prod-web-subcategoria')?.value || '').trim();
    const temporada = (document.getElementById('prod-web-temporada')?.value || '').trim().toUpperCase();

    const precio_detal = safeParseMontoWeb(document.getElementById('prod-web-precio-detal')?.value);
    const precio_mayorista = safeParseMontoWeb(document.getElementById('prod-web-precio-mayor')?.value);
    const cant_minima_mayorista = parseInt(document.getElementById('prod-web-cant-mayor')?.value || 6, 10) || 6;
    const porcentaje_anticipo = parseInt(document.getElementById('prod-web-porcentaje-anticipo')?.value || 50, 10) || 50;

    const precio_alquiler = safeParseMontoWeb(document.getElementById('prod-web-precio-alquiler')?.value);
    const valor_deposito = safeParseMontoWeb(document.getElementById('prod-web-valor-deposito')?.value);

    const es_personalizable = document.getElementById('prod-web-check-personalizable')?.checked || false;
    const es_mayorista = document.getElementById('prod-web-check-mayorista')?.checked || false;
    const permitir_venta = document.getElementById('prod-web-check-venta')?.checked || false;
    const permitir_alquiler = document.getElementById('prod-web-check-alquiler')?.checked || false;
    const permitir_credito = document.getElementById('prod-web-check-credito')?.checked || false;

    if (!nombre || !mundo) {
      throw new Error("El nombre y el mundo del producto son obligatorios.");
    }

    let finalImageUrl = null;

    // Subir imagen a Supabase Storage si es una data URL en base64
    if (window.currentProductWebImgBase64) {
      if (window.currentProductWebImgBase64.startsWith('data:')) {
        try {
          const fetchRes = await fetch(window.currentProductWebImgBase64);
          const blob = await fetchRes.blob();
          const ext = blob.type.split('/')[1] || 'jpg';
          const fileName = `catalog/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

          const { data: uploadData, error: uploadError } = await client
            .storage
            .from('productos')
            .upload(fileName, blob, {
              contentType: blob.type || 'image/jpeg',
              cacheControl: '3600',
              upsert: true
            });

          if (uploadError) {
            console.warn('No se pudo subir la imagen a Supabase Storage. Usando Base64 fallback:', uploadError.message);
            finalImageUrl = window.currentProductWebImgBase64;
          } else {
            const { data: publicUrlData } = client
              .storage
              .from('productos')
              .getPublicUrl(fileName);

            finalImageUrl = publicUrlData?.publicUrl || window.currentProductWebImgBase64;
          }
        } catch (storageErr) {
          console.warn('Error al procesar la imagen para Storage:', storageErr);
          finalImageUrl = window.currentProductWebImgBase64;
        }
      } else {
        finalImageUrl = window.currentProductWebImgBase64;
      }
    }

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
      porcentaje_anticipo,
      precio_alquiler,
      valor_deposito,
      tallas: window.currentAdminTallas,
      colores: window.currentAdminColores,
      es_personalizable,
      es_mayorista,
      permitir_venta,
      permitir_alquiler,
      permitir_credito,
      is_active: true,
      oculto_web: false
    };

    if (finalImageUrl) {
      payload.image_url = finalImageUrl;
      payload.imagen = finalImageUrl;
    }

    if (id) {
      const { error } = await client.from('productos').update(payload).eq('id', id);
      if (error) throw error;
      safeShowToastWeb("Producto actualizado correctamente.");
    } else {
      payload.referencia = 'CUP-' + Math.floor(1000 + Math.random() * 9000);
      const { error } = await client.from('productos').insert([payload]);
      if (error) throw error;
      safeShowToastWeb("¡Producto creado y publicado en la tienda!");
    }

    const modal = document.getElementById('modal-producto-web');
    if (modal) modal.classList.add('hidden');
    window.cargarProductosWeb();
  } catch (err) {
    console.error("Error al guardar producto en Supabase:", err);
    safeShowToastWeb(err.message || "Error de conexión al guardar el producto en Supabase.", "error");
  } finally {
    if (btnSubmit) {
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = `💾 Guardar Producto Web`;
    }
  }
};

// Inicialización automática de eventos
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.initDragDropAndPasteImageWeb();
  });
} else {
  window.initDragDropAndPasteImageWeb();
}