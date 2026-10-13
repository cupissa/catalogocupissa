window.searchOrder = async function(e) {
  e.preventDefault();
  const code = document.getElementById('orderCodeInput').value.trim().toUpperCase();
  const container = document.getElementById('orderResultContainer');
  const notFound = document.getElementById('orderNotFound');

  container.classList.add('hidden');
  notFound.classList.add('hidden');

  try {
    const { data, error } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('order_code', code)
      .single();

    if (error || !data) {
      notFound.classList.remove('hidden');
      return;
    }

    document.getElementById('resOrderCode').textContent = data.order_code;
    document.getElementById('resClientName').textContent = data.client_name || 'Cliente Cupissa';
    document.getElementById('resOrderDate').textContent = new Date(data.created_at).toLocaleDateString('es-CO');

    const badge = document.getElementById('resStatusBadge');
    const status = (data.status || 'recibido').toLowerCase();

    if (status === 'entregado') {
      badge.className = "px-3.5 py-1.5 rounded-full text-xs font-bold bg-green-100 text-green-700 flex items-center gap-2";
      badge.innerHTML = `<i class="fa-solid fa-circle-check"></i> Entregado`;
    } else if (status === 'en camino') {
      badge.className = "px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 flex items-center gap-2";
      badge.innerHTML = `<i class="fa-solid fa-truck text-blue-600"></i> En Camino`;
    } else if (status === 'preparacion') {
      badge.className = "px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 flex items-center gap-2";
      badge.innerHTML = `<i class="fa-solid fa-box text-amber-600"></i> En Preparación`;
    } else {
      badge.className = "px-3.5 py-1.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700 flex items-center gap-2";
      badge.innerHTML = `<i class="fa-solid fa-clock"></i> Recibido`;
    }

    const itemsList = document.getElementById('resItemsList');
    const items = data.items || [];
    if (items.length > 0) {
      itemsList.innerHTML = items.map(item => `
        <div class="flex justify-between py-1.5 border-b border-gray-50">
          <span class="font-bold text-gray-700">${item.title || item.nombre || 'Producto'}</span>
          <span class="text-gray-500">$${Number(item.price || item.precio || 0).toLocaleString()} COP</span>
        </div>
      `).join('');
    } else {
      itemsList.innerHTML = `<p class="text-gray-400 italic">No hay información detallada de los ítems.</p>`;
    }

    updateStepper(status);
    container.classList.remove('hidden');

  } catch (err) {
    notFound.classList.remove('hidden');
  }
};

function updateStepper(status) {
  const steps = ['recibido', 'preparacion', 'camino', 'entregado'];
  const statusMap = {
    'recibido': 0,
    'preparacion': 1,
    'en camino': 2,
    'entregado': 3
  };

  const activeIndex = statusMap[status] !== undefined ? statusMap[status] : 0;

  steps.forEach((stepKey, idx) => {
    const el = document.getElementById(`step-${stepKey}`);
    if (!el) return;
    
    const circle = el.querySelector('div');

    if (idx <= activeIndex) {
      circle.className = "w-8 h-8 rounded-full border-2 border-brand-600 bg-brand-600 text-white flex items-center justify-center mx-auto text-xs font-bold shadow-md shadow-brand-200";
      el.className = "space-y-2 text-brand-600 font-bold";
    } else {
      circle.className = "w-8 h-8 rounded-full border-2 border-gray-200 flex items-center justify-center mx-auto text-xs bg-white text-gray-400";
      el.className = "space-y-2 text-gray-400 font-normal";
    }
  });
}