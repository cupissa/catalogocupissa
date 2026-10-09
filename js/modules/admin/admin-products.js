/**
 * js/modules/admin/admin-products.js
 * Módulo de Gestión de Inventario Interno y Catálogo Directo en Supabase (Sin datos piloto)
 */

window.adminProductsCache = [];

/**
 * Carga exclusivamente los productos reales registrados en la tabla 'productos' de Supabase
 */
window.cargarInventarioAdmin = async function() {
  const tbody = document.getElementById('tabla-inventario-admin');
  const countSpan = document.getElementById('count-productos-inv');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="5" class="py-8 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-lg mb-2"></i>
        <p>Cargando catálogo real desde Supabase...</p>
      </td>
    </tr>
  `;

  try {
    const { data: productos, error } = await supabaseClient
      .from('productos')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) throw error;

    window.adminProductsCache = productos || [];
    window.productosCache = window.adminProductsCache; // Mantener sincro global

    if (countSpan) countSpan.textContent = window.adminProductsCache.length;

    window.renderizarTablaInventarioAdmin(window.adminProductsCache);
  } catch (err) {
    console.error("Error al cargar inventario admin desde Supabase:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="py-6 text-center text-red-500 font-bold">
          Error al obtener los productos desde Supabase. Revisa la conexión o las políticas RLS.
        </td>
      </tr>
    `;
  }
};

/**
 * Renderiza los registros en la tabla de inventario del panel administrativo
 */
window.renderizarTablaInventarioAdmin = function(lista) {
  const tbody = document.getElementById('tabla-inventario-admin');
  if (!tbody) return;

  // Filtrado secundario por buscador y origen
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
          No hay productos registrados en la base de datos.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtrados.map(p => {
    const stock = p.sin_stock ? '<span class="text-amber-600 font-bold">Sin Stock (Bajo Pedido)</span>' : `<span class="font-black ${p.stock <= 3 ? 'text-red-600' : 'text-slate-800'}">${p.stock || 0} unid.</span>`;
    const precioDetal = parseMonto(p.precio_detal || p.price);
    const precioMayor = parseMonto(p.precio_mayorista);

    return `
      <tr class="border-b hover:bg-slate-50 transition-colors">
        <td class="p-3">
          <div class="font-bold text-slate-900">${p.referencia || 'REF-' + p.id.slice(0, 4)}</div>
          <div class="text-[10px] text-slate-400">${p.origen || 'Colombia'}</div>
        </td>
        <td class="p-3">
          <div class="font-extrabold text-indigo-900">${p.nombre}</div>
          <div class="text-[10px] font-bold text-pink-600">${p.mundo || 'General'}</div>
        </td>
        <td class="p-3">
          <div class="flex items-center gap-2">
            ${stock}
            <button onclick="sumarStockLote('${p.id}')" class="px-2 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-lg text-[10px] font-extrabold transition" title="Sumar lote al stock">
              + Sumar Lote
            </button>
          </div>
        </td>
        <td class="p-3 text-xs">
          <div class="font-bold text-indigo-700">Detal: $${formatMoneda(precioDetal)}</div>
          ${precioMayor > 0 ? `<div class="text-[10px] font-bold text-amber-700">Mayor: $${formatMoneda(precioMayor)}</div>` : ''}
        </td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button onclick='editarProductoAdmin(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition" title="Editar Producto">
              ✏️
            </button>
            <button onclick="eliminarProductoAdmin('${p.id}')" class="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition" title="Eliminar de Supabase">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

/**
 * Inicializa el formulario de inventario para guardar o editar productos en Supabase
 */
window.initAdminProductsForm = function() {
  const form = document.getElementById('form-producto-admin');
  if (!form) return;

  form.addEventListener('submit', window.guardarProductoAdmin);
};

/**
 * Procesa la creación o edición de un producto directamente en Supabase
 */
window.guardarProductoAdmin = async function(e) {
  if (e) e.preventDefault();

  const id = document.getElementById('prod-id-edit')?.value || null;
  const nombre = document.getElementById('prod-nombre')?.value.trim();
  const mundo = document.getElementById('prod-mundo')?.value.trim();
  const origen = document.getElementById('prod-origen')?.value || 'Colombia';
  const sin_stock = document.getElementById('prod-sin-stock')?.checked || false;
  const stock = parseInt(document.getElementById('prod-stock')?.value, 10) || 0;
  const precio_detal = parseMonto(document.getElementById('prod-detal')?.value);
  const precio_mayorista = parseMonto(document.getElementById('prod-mayor')?.value);

  if (!nombre || !mundo) {
    if (typeof showToast === 'function') showToast("Ingresa el nombre y el mundo del producto.", "error");
    return;
  }

  const payload = {
    nombre,
    mundo,
    origen,
    sin_stock,
    stock,
    precio_detal,
    price: precio_detal, // Compatibilidad con catálogo
    precio_mayorista,
    is_active: true
  };

  try {
    if (id) {
      const { error } = await supabaseClient
        .from('productos')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      if (typeof showToast === 'function') showToast("Producto actualizado en Supabase.");
    } else {
      payload.referencia = 'CUP-' + Math.floor(1000 + Math.random() * 9000);
      const { error } = await supabaseClient
        .from('productos')
        .insert([payload]);

      if (error) throw error;
      if (typeof showToast === 'function') showToast("Nuevo producto registrado en Supabase.");
    }

    window.cancelarEdicionProd();
    window.cargarInventarioAdmin();
  } catch (err) {
    console.error("Error al guardar producto en Supabase:", err);
    if (typeof showToast === 'function') showToast("Error al guardar en Supabase. Verifica la tabla de productos.", "error");
  }
};

/**
 * Carga los datos de un producto existente en el formulario para modificarlo
 */
window.editarProductoAdmin = function(prod) {
  if (!prod) return;

  document.getElementById('prod-id-edit').value = prod.id;
  document.getElementById('prod-nombre').value = prod.nombre || '';
  document.getElementById('prod-mundo').value = prod.mundo || '';
  document.getElementById('prod-origen').value = prod.origen || 'Colombia';
  document.getElementById('prod-sin-stock').checked = prod.sin_stock || false;
  document.getElementById('prod-stock').value = prod.stock || 0;
  document.getElementById('prod-detal').value = prod.precio_detal || prod.price || 0;
  document.getElementById('prod-mayor').value = prod.precio_mayorista || 0;

  const btnGuardar = document.getElementById('btn-guardar-prod');
  const btnCancelar = document.getElementById('btn-cancelar-edit-prod');

  if (btnGuardar) btnGuardar.textContent = '💾 Actualizar Producto';
  if (btnCancelar) btnCancelar.classList.remove('hidden');
};

/**
 * Restablece el formulario de productos
 */
window.cancelarEdicionProd = function() {
  const form = document.getElementById('form-producto-admin');
  if (form) form.reset();

  document.getElementById('prod-id-edit').value = '';

  const btnGuardar = document.getElementById('btn-guardar-prod');
  const btnCancelar = document.getElementById('btn-cancelar-edit-prod');

  if (btnGuardar) btnGuardar.textContent = '💾 Guardar Catálogo';
  if (btnCancelar) btnCancelar.classList.add('hidden');
};

/**
 * Elimina un producto de la tabla 'productos'
 */
window.eliminarProductoAdmin = async function(id) {
  if (!confirm("¿Deseas eliminar este producto de Supabase?")) return;

  try {
    const { error } = await supabaseClient.from('productos').delete().eq('id', id);
    if (error) throw error;

    if (typeof showToast === 'function') showToast("Producto eliminado de Supabase.");
    window.cargarInventarioAdmin();
  } catch (err) {
    console.error("Error al eliminar producto:", err);
    if (typeof showToast === 'function') showToast("Error al eliminar de Supabase.", "error");
  }
};

/**
 * Abre el modal para incrementar el stock por lote
 */
window.sumarStockLote = function(id) {
  const prod = window.adminProductsCache.find(p => p.id === id);
  if (!prod) return;

  document.getElementById('lote-prod-id').value = prod.id;
  document.getElementById('lbl-lote-prod-nombre').textContent = prod.nombre;
  document.getElementById('modal-sumar-lote').classList.remove('hidden');
};

window.cerrarModalLote = function() {
  document.getElementById('modal-sumar-lote').classList.add('hidden');
};

/**
 * Suma la cantidad de lote al stock en Supabase
 */
window.confirmarSumarLote = async function() {
  const id = document.getElementById('lote-prod-id').value;
  const cantSumar = parseInt(document.getElementById('lote-cantidad').value, 10) || 0;

  const prod = window.adminProductsCache.find(p => p.id === id);
  if (!prod) return;

  const nuevoStock = (prod.stock || 0) + cantSumar;

  try {
    const { error } = await supabaseClient
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