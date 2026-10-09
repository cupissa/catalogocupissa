/**
 * catalogocupissa/js/modules/admin/admin-products.js
 * Módulo de Gestión de Inventario Físico (Bodega / Tienda)
 */

window.adminProductsCache = [];

/**
 * Carga el inventario físico directamente desde Supabase
 */
window.cargarInventarioAdmin = async function() {
  const tbody = document.getElementById('tabla-inventario-admin');
  const countSpan = document.getElementById('count-productos-inv');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-8 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-lg mb-2"></i>
        <p>Cargando inventario físico desde Supabase...</p>
      </td>
    </tr>
  `;

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) {
      throw new Error('El cliente de Supabase no se encuentra disponible.');
    }

    const { data: productos, error } = await client
      .from('productos')
      .select(`
        *,
        producto_variantes (*)
      `)
      .order('nombre', { ascending: true });

    if (error) throw error;

    window.adminProductsCache = productos || [];
    window.productosCache = window.adminProductsCache;

    if (countSpan) countSpan.textContent = window.adminProductsCache.length;

    window.renderizarTablaInventarioAdmin(window.adminProductsCache);
  } catch (err) {
    console.error("Error al cargar inventario físico desde Supabase:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-rose-500 font-bold">
          Error al consultar el inventario en Supabase. Revisa la conexión o políticas RLS.
        </td>
      </tr>
    `;
  }
};

/**
 * Renderizado de la tabla de inventario administrativo
 */
window.renderizarTablaInventarioAdmin = function(lista) {
  const tbody = document.getElementById('tabla-inventario-admin');
  if (!tbody) return;

  const query = (document.getElementById('buscador-inventario')?.value || '').toLowerCase().trim();
  const origenSel = document.getElementById('filtro-origen-inv')?.value || 'todos';

  const filtrados = (lista || []).filter(p => {
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
        <td colspan="6" class="py-8 text-center text-slate-400 font-bold">
          No hay productos registrados en el inventario o coincidentes con los filtros.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtrados.map(p => {
    const refCode = p.referencia || 'REF-' + (p.id ? String(p.id).slice(0, 6) : '000');
    const precioDetal = typeof window.parseMonto === 'function' ? window.parseMonto(p.precio_detal || p.price) : Number(p.precio_detal || p.price || 0);
    const precioMayor = typeof window.parseMonto === 'function' ? window.parseMonto(p.precio_mayorista) : Number(p.precio_mayorista || 0);

    const variantes = p.producto_variantes || [];
    const stockVariantesTotal = variantes.reduce((acc, v) => acc + (v.stock_variante || 0), 0);
    const totalStock = variantes.length > 0 ? stockVariantesTotal : (p.stock || 0);

    const esOcultoWeb = Boolean(p.oculto_web);
    const esSobrePedido = p.origen === 'sobre_pedido' || (p.dias_fabricacion && p.dias_fabricacion > 0);

    return `
      <tr class="border-b hover:bg-slate-50 transition-colors text-xs">
        <td class="p-3">
          <div class="font-extrabold text-indigo-900">${refCode}</div>
          <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold ${esSobrePedido ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
            ${esSobrePedido ? `🛠️ Fabricación (${p.dias_fabricacion || 3}d)` : '📦 Stock Físico'}
          </span>
        </td>
        <td class="p-3">
          <div class="font-black text-slate-900 uppercase">${p.nombre || 'Sin nombre'}</div>
          <div class="text-[10px] font-bold text-pink-600">${p.mundo || 'General'}</div>
        </td>
        <td class="p-3">
          <div class="flex items-center gap-2">
            <span class="font-black text-slate-900">${totalStock} unid.</span>
            ${variantes.length > 0 ? `<small class="text-slate-500">(${variantes.length} var.)</small>` : ''}
            <button type="button" onclick="sumarStockLote('${p.id}')" class="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-extrabold transition">
              + Stock
            </button>
          </div>
        </td>
        <td class="p-3">
          <div class="font-bold text-slate-800">Detal: $${typeof window.formatMoneda === 'function' ? window.formatMoneda(precioDetal) : precioDetal.toLocaleString('es-CO')}</div>
          <div class="text-[10px] font-extrabold text-amber-700">Mayor: $${typeof window.formatMoneda === 'function' ? window.formatMoneda(precioMayor) : precioMayor.toLocaleString('es-CO')}</div>
        </td>
        <td class="p-3 text-center">
          <button type="button" onclick="toggleVisibilidadWeb('${p.id}', ${!esOcultoWeb})" class="px-2.5 py-1 rounded-full text-[10px] font-bold transition ${!esOcultoWeb ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}">
            ${!esOcultoWeb ? '🌐 Visible Web' : '🙈 Oculto Web'}
          </button>
        </td>
        <td class="p-3 text-right">
          <div class="flex items-center justify-end gap-1.5">
            <button type="button" onclick='editarProductoAdmin(${JSON.stringify(p).replace(/'/g, "&apos;")})' class="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl transition" title="Editar">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button type="button" onclick="eliminarProductoAdmin('${p.id}')" class="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition" title="Eliminar">
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
};

/**
 * Alterna el estado de visibilidad web de un producto
 */
window.toggleVisibilidadWeb = async function(id, estadoActualVisible) {
  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) return;

    const { error } = await client
      .from('productos')
      .update({
        visible_web: !estadoActualVisible,
        oculto_web: estadoActualVisible
      })
      .eq('id', id);

    if (error) throw error;

    if (typeof window.showToast === 'function') {
      window.showToast(!estadoActualVisible ? "Producto visible en la tienda web." : "Producto ocultado de la web.");
    }
    window.cargarInventarioAdmin();
  } catch (err) {
    console.error("Error al actualizar visibilidad web:", err);
    if (typeof window.showToast === 'function') {
      window.showToast("Error al cambiar visibilidad.", "error");
    }
  }
};

/**
 * Abre el modal para sumar stock a un producto
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

/**
 * Cierra el modal de agregar stock
 */
window.cerrarModalLote = function() {
  const modal = document.getElementById('modal-sumar-lote');
  if (modal) modal.classList.add('hidden');
};

/**
 * Confirma la adición de stock en la base de datos
 */
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
    if (!client) return;

    const { error } = await client
      .from('productos')
      .update({ stock: nuevoStock })
      .eq('id', id);

    if (error) throw error;

    if (typeof window.showToast === 'function') {
      window.showToast(`Stock actualizado: +${cantSumar} unidades.`);
    }
    window.cerrarModalLote();
    window.cargarInventarioAdmin();
  } catch (err) {
    console.error("Error al sumar lote:", err);
    if (typeof window.showToast === 'function') {
      window.showToast("Error al actualizar stock.", "error");
    }
  }
};

/**
 * Elimina un producto del inventario
 */
window.eliminarProductoAdmin = async function(id) {
  if (!confirm("¿Estás seguro de eliminar este producto del inventario físico?")) return;

  try {
    const client = window.supabaseClient || window.supabase;
    if (!client) return;

    const { error } = await client.from('productos').delete().eq('id', id);
    if (error) throw error;

    if (typeof window.showToast === 'function') {
      window.showToast("Producto eliminado del inventario.");
    }
    window.cargarInventarioAdmin();
  } catch (err) {
    console.error("Error al eliminar producto del inventario:", err);
    if (typeof window.showToast === 'function') {
      window.showToast("Error al eliminar el producto.", "error");
    }
  }
};

/**
 * Abre el modal para editar un producto desde el inventario
 */
window.editarProductoAdmin = function(prod) {
  if (typeof window.abrirModalProductoWeb === 'function') {
    window.abrirModalProductoWeb(prod);
  } else {
    console.warn("abrirModalProductoWeb no está disponible para editar este producto.");
  }
};