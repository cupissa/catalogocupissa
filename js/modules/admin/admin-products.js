/**
 * js/modules/admin/admin-products.js
 * Módulo de Gestión de Inventario y Productos en Supabase para Admin
 */

window.productoSeleccionadoCache = null;

/**
 * Carga y renderiza los productos en la tabla del panel administrativo
 */
window.cargarInventarioAdmin = async function() {
  const tbody = document.getElementById('tabla-inventario-admin');
  if (!tbody) return;
  tbody.innerHTML = '';

  let filtroOrigen = document.getElementById('filtro-origen-inv')?.value || 'todos';
  let busq = (document.getElementById('buscador-inventario')?.value || '').toLowerCase();

  const productos = window.productosCache || [];

  let filtrados = productos.filter(p => {
    let okO = filtroOrigen === 'todos' || (p.origen_compra || '').toLowerCase().includes(filtroOrigen.toLowerCase());
    let okB = !busq || (p.nombre || '').toLowerCase().includes(busq) || (p.mundo || '').toLowerCase().includes(busq);
    return okO && okB;
  });

  const countEl = document.getElementById('count-productos-inv');
  if (countEl) countEl.innerText = filtrados.length;

  filtrados.forEach(p => {
    let stockStr = p.sin_stock ? '<span class="text-amber-600 font-bold">Bajo Pedido</span>' : `
      <div class="flex items-center gap-1">
        <span class="font-bold text-slate-800">${p.stock || 0}</span>
        <button onclick="abrirModalLote('${p.id}', '${p.nombre.replace(/'/g, "\\'")}')" class="bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">+</button>
      </div>
    `;

    tbody.innerHTML += `
      <tr class="border-b">
        <td class="p-2.5 font-bold text-indigo-900">${p.referencia || 'REF'} <br><span class="text-[10px] font-normal text-slate-400">${p.origen_compra || 'Colombia'}</span></td>
        <td class="p-2.5"><strong>${p.nombre}</strong><br><span class="text-[10px] text-indigo-600">${p.mundo || ''}</span></td>
        <td class="p-2.5">${stockStr}</td>
        <td class="p-2.5">Detal: $${formatMoneda(parseMonto(p.precio_detal || 0))}<br>Mayor: $${formatMoneda(parseMonto(p.precio_mayorista || 0))}</td>
        <td class="p-2.5 flex gap-2">
          <button onclick='prepararEdicionProd(${JSON.stringify(p)})' class="bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded text-slate-700 font-bold">✏️</button>
          <button onclick="eliminarProducto('${p.id}')" class="bg-red-50 hover:bg-red-100 px-2 py-1 rounded text-red-600 font-bold">🗑️</button>
        </td>
      </tr>
    `;
  });
};

/**
 * Carga los datos de un producto en el formulario para su edición
 */
window.prepararEdicionProd = function(p) {
  document.getElementById('prod-id-edit').value = p.id;
  document.getElementById('prod-nombre').value = p.nombre;
  document.getElementById('prod-mundo').value = p.mundo || '';
  document.getElementById('prod-origen').value = p.origen_compra || 'Colombia';
  document.getElementById('prod-sin-stock').checked = p.sin_stock;
  document.getElementById('prod-stock').value = p.stock || 0;
  document.getElementById('prod-detal').value = p.precio_detal || 0;
  document.getElementById('prod-mayor').value = p.precio_mayorista || 0;
  
  const btnCancel = document.getElementById('btn-cancelar-edit-prod');
  if (btnCancel) btnCancel.classList.remove('hidden');
};

/**
 * Resetea y cancela el modo de edición de productos
 */
window.cancelarEdicionProd = function() {
  const form = document.getElementById('form-producto-admin');
  if (form) form.reset();
  document.getElementById('prod-id-edit').value = '';
  const btnCancel = document.getElementById('btn-cancelar-edit-prod');
  if (btnCancel) btnCancel.classList.add('hidden');
};

/**
 * Elimina un producto de Supabase
 */
window.eliminarProducto = async function(id) {
  if (!confirm('¿Eliminar este producto permanentemente?')) return;
  try {
    const { error } = await supabaseClient.from('productos').delete().eq('id', id);
    if (error) throw error;
    if (typeof showToast === 'function') showToast("Producto eliminado");
    if (typeof cargarDatosGlobales === 'function') cargarDatosGlobales();
  } catch (err) {
    console.error("Error eliminando producto:", err);
    if (typeof showToast === 'function') showToast("Error al eliminar producto", "error");
  }
};

/**
 * Abre el modal para sumar lotes de stock a un producto
 */
window.abrirModalLote = function(id, nombre) {
  document.getElementById('lote-prod-id').value = id;
  document.getElementById('lbl-lote-prod-nombre').innerText = nombre;
  const modal = document.getElementById('modal-sumar-lote');
  if (modal) modal.classList.remove('hidden');
};

/**
 * Cierra el modal de sumar lote
 */
window.cerrarModalLote = function() {
  const modal = document.getElementById('modal-sumar-lote');
  if (modal) modal.classList.add('hidden');
};

/**
 * Confirma y guarda el incremento de stock en Supabase
 */
window.confirmarSumarLote = async function() {
  const id = document.getElementById('lote-prod-id').value;
  const cant = parseInt(document.getElementById('lote-cantidad').value, 10) || 0;
  if (cant <= 0) return;

  let prod = (window.productosCache || []).find(p => p.id === id);
  if (!prod) return;

  let nuevoStock = (prod.stock || 0) + cant;
  try {
    const { error } = await supabaseClient.from('productos').update({ stock: nuevoStock }).eq('id', id);
    if (error) throw error;
    if (typeof showToast === 'function') showToast("Stock sumado correctamente");
    cerrarModalLote();
    if (typeof cargarDatosGlobales === 'function') cargarDatosGlobales();
  } catch (err) {
    console.error("Error al actualizar stock:", err);
    if (typeof showToast === 'function') showToast("Error al sumar stock", "error");
  }
};

/**
 * Inicializador de escuchadores del formulario de productos
 */
window.initAdminProductsForm = function() {
  const form = document.getElementById('form-producto-admin');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const idEdit = document.getElementById('prod-id-edit').value;
    const nombre = document.getElementById('prod-nombre').value;
    const mundo = document.getElementById('prod-mundo').value;
    const origen_compra = document.getElementById('prod-origen').value;
    const sin_stock = document.getElementById('prod-sin-stock').checked;
    const stock = parseInt(document.getElementById('prod-stock').value, 10) || 0;
    const precio_detal = parseMonto(document.getElementById('prod-detal').value);
    const precio_mayorista = parseMonto(document.getElementById('prod-mayor').value);

    const payload = { nombre, mundo, origen_compra, sin_stock, stock, precio_detal, precio_mayorista };

    try {
      if (idEdit) {
        await supabaseClient.from('productos').update(payload).eq('id', idEdit);
        if (typeof showToast === 'function') showToast("Producto actualizado en Supabase");
      } else {
        payload.referencia = 'CUP-' + Math.floor(1000 + Math.random() * 9000);
        await supabaseClient.from('productos').insert([payload]);
        if (typeof showToast === 'function') showToast("Producto registrado en Supabase");
      }
      form.reset();
      cancelarEdicionProd();
      if (typeof cargarDatosGlobales === 'function') cargarDatosGlobales();
    } catch (err) {
      console.error("Error al guardar producto:", err);
      if (typeof showToast === 'function') showToast("Error al guardar producto", "error");
    }
  });
};