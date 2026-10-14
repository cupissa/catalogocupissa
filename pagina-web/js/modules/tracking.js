(function () {
  const $ = id => document.getElementById(id);
  const db = () => window.supabaseClient || window.supabase;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let currentCode = '', channel = null;
  function normalizeStatus(value) {
    const s = String(value || '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
    if (['CANCELADO','CANCELADA','ANULADO','ANULADA'].includes(s)) return 'CANCELADO';
    if (['ENTREGADO','ENTREGADA','COMPLETADO','COMPLETADA'].includes(s)) return 'ENTREGADO';
    if (['EN CAMINO','EN RUTA','ENVIADO','DESPACHADO'].includes(s)) return 'EN CAMINO';
    if (['EN FABRICACION','EN PRODUCCION','EN PREPARACION','LISTO PARA ENVIAR','PREPARACION'].includes(s)) return 'EN FABRICACION';
    if (['AGENDADO','PROGRAMADO'].includes(s)) return 'AGENDADO';
    if (['PENDIENTE','PENDIENTE DE PAGO','PEDIDO REALIZADO','RECIBIDO',''].includes(s)) return 'PENDIENTE';
    return s;
  }
  function statusLabel(status) {
    return ({'PENDIENTE':'Pendiente','AGENDADO':'Agendado','EN FABRICACION':'En fabricación','EN CAMINO':'En camino','ENTREGADO':'Entregado','CANCELADO':'Cancelado'})[status] || status;
  }
  function renderBadge(status) {
    const badge = $('resStatusBadge'); if (!badge) return;
    const styles = {
      'PENDIENTE': 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 flex items-center gap-2',
      'AGENDADO': 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700 flex items-center gap-2',
      'EN FABRICACION': 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-2',
      'EN CAMINO': 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-2',
      'ENTREGADO': 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-2',
      'CANCELADO': 'px-3.5 py-1.5 rounded-full text-xs font-bold bg-red-100 text-red-700 flex items-center gap-2'
    };
    badge.className = styles[status] || styles.PENDIENTE;
    badge.textContent = statusLabel(status);
  }
  function updateStepper(status) {
    const map = { PENDIENTE: 0, AGENDADO: 0, 'EN FABRICACION': 1, 'EN CAMINO': 2, ENTREGADO: 3 };
    const steps = ['recibido', 'preparacion', 'camino', 'entregado'];
    const active = map[status] ?? (status === 'CANCELADO' ? -1 : 0);
    steps.forEach((key, idx) => {
      const el = $(`step-${key}`); if (!el) return;
      const circle = el.querySelector('div');
      if (!circle) return;
      if (idx <= active) {
        circle.className = 'w-8 h-8 rounded-full border-2 border-brand-600 bg-brand-600 text-white flex items-center justify-center mx-auto text-xs font-bold shadow-md shadow-brand-200';
        el.className = 'space-y-2 text-brand-600 font-bold';
      } else {
        circle.className = 'w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center mx-auto text-xs bg-white text-gray-400';
        el.className = 'space-y-2 text-gray-400 font-normal';
      }
    });
  }
  async function findOrder(client, code) {
    const key = String(code || '').trim();
    if (!key) return null;
    try {
      const { data, error } = await client.rpc('cupissa_rastrear_pedido', { p_codigo: key });
      if (!error && data) return data;
    } catch (_) { /* RPC opcional hasta ejecutar la migración */ }
    // Código público: la búsqueda no depende de que el ID sea un UUID.
    for (const column of ['order_code', 'referencia_pedido', 'codigo_pedido']) {
      try {
        const { data, error } = await client.from('pedidos_web').select('*').ilike(column, key).limit(1).maybeSingle();
        if (!error && data) return data;
      } catch (_) { /* columna opcional en instalaciones antiguas */ }
    }
    // También admite pegar el UUID interno del pedido.
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)) {
      const { data, error } = await client.from('pedidos_web').select('*').eq('id', key).maybeSingle();
      if (!error && data) return data;
    }
    return null;
  }
  async function searchOrder(event) {
    event?.preventDefault?.();
    const input = $('orderCodeInput'), container = $('orderResultContainer'), notFound = $('orderNotFound');
    if (!input || !container || !notFound) return;
    const code = input.value.trim().toUpperCase(); currentCode = code;
    container.classList.add('hidden'); notFound.classList.add('hidden');
    if (!code) { notFound.classList.remove('hidden'); return; }
    try {
      const client = db(); if (!client) throw new Error('No hay conexión.');
      const data = await findOrder(client, code);
      if (!data) { notFound.classList.remove('hidden'); return; }
      $('resOrderCode').textContent = data.order_code || data.id || code;
      $('resClientName').textContent = data.customer_name || data.client_name || data.cliente_nombre || 'Cliente Cupissa';
      $('resOrderDate').textContent = data.created_at ? new Date(data.created_at).toLocaleDateString('es-CO') : '—';
      const status = normalizeStatus(data.status || data.estado);
      renderBadge(status);
      const itemsList = $('resItemsList');
      const items = Array.isArray(data.items) ? data.items : Array.isArray(data.details?.items) ? data.details.items : [];
      if (itemsList) {
        itemsList.innerHTML = items.length ? items.map(item => `<div class="flex justify-between gap-3 border-b border-gray-100 py-2"><span class="font-bold text-gray-700">${esc(item.title || item.nombre || item.nombre_producto || item.name || 'Producto')} × ${esc(item.quantity || item.cantidad || 1)}</span><span class="text-gray-500">$${Number(item.price || item.precio || item.precioUnitario || 0).toLocaleString('es-CO')} COP</span></div>`).join('') : '<p class="text-gray-400 italic">No hay productos detallados para mostrar.</p>';
      }
      updateStepper(status);
      let extra = $('resOrderDetails');
      if (!extra && itemsList?.parentElement) { extra = document.createElement('div'); extra.id = 'resOrderDetails'; extra.className = 'mt-4 rounded-xl bg-gray-50 p-3 text-sm'; itemsList.parentElement.appendChild(extra); }
      if (extra) extra.innerHTML = `<p><b>Entrega:</b> ${esc(data.delivery_date || 'Por confirmar')}</p><p><b>Total:</b> $${Number(data.total_amount || 0).toLocaleString('es-CO')} COP · <b>Anticipo:</b> $${Number(data.advance_payment || 0).toLocaleString('es-CO')} COP</p>${status === 'CANCELADO' ? '<p class="mt-2 font-bold text-red-600">Este pedido fue cancelado.</p>' : ''}`;
      container.classList.remove('hidden');
      subscribeLive(client, data.order_code || code);
    } catch (err) { console.error('Rastreo de pedido:', err); notFound.classList.remove('hidden'); }
  }
  function subscribeLive(client, code) {
    if (channel) { try { client.removeChannel(channel); } catch (_) {} channel = null; }
    if (!code) return;
    channel = client.channel('cupissa-tracking-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_web' }, payload => {
        const row = payload.new || payload.old || {};
        if (String(row.order_code || '').toUpperCase() === String(code).toUpperCase() || String(row.id || '') === String(code) || String(row.referencia_pedido || '').toUpperCase() === String(code).toUpperCase()) searchOrder({ preventDefault() {} });
      }).subscribe();
  }
  window.searchOrder = searchOrder;
  const initializeTrackingPage = () => {
    const params = new URLSearchParams(location.search);
    const code = params.get('codigo') || params.get('order') || params.get('pedido');
    const input = $('orderCodeInput');
    if (code && input) { input.value = code; searchOrder({ preventDefault() {} }); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeTrackingPage, { once: true });
  else initializeTrackingPage();
})();
