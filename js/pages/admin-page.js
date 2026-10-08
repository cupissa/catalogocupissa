// js/pages/admin-page.js

import { supabase } from '../config/supabase.js';

document.addEventListener('DOMContentLoaded', async () => {
  await verifyAdminSession();
  loadProducts();
  loadCredits();
});

async function verifyAdminSession() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin, full_name')
    .eq('id', session.user.id)
    .single();

  if (error || !profile || !profile.is_admin) {
    alert('Acceso no autorizado. Este panel es exclusivo para administración.');
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('adminUserEmail').textContent = profile.full_name || session.user.email;
}

async function loadProducts() {
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  const tbody = document.getElementById('adminProductsTableBody');
  if (!tbody) return;

  tbody.innerHTML = (products || []).map(p => `
    <tr class="border-b border-gray-100 dark:border-gray-700/50">
      <td class="py-3 font-bold">${p.title}</td>
      <td class="py-3">$${Number(p.base_price).toLocaleString('es-CO')}</td>
      <td class="py-3">${p.advance_percentage || 30}%</td>
      <td class="py-3">${p.production_days || 3} días</td>
      <td class="py-3">${p.interest_percentage || 20}%</td>
      <td class="py-3 space-x-2">
        <button onclick="editProduct('${p.id}')" class="text-blue-600 font-bold hover:underline">Editar</button>
      </td>
    </tr>
  `).join('');
}

async function loadCredits() {
  const { data: credits } = await supabase
    .from('cupissa_credits')
    .select('*, profiles(full_name, phone)')
    .order('created_at', { ascending: false });

  const tbody = document.getElementById('adminCreditsTableBody');
  if (!tbody) return;

  tbody.innerHTML = (credits || []).map(c => `
    <tr class="border-b border-gray-100 dark:border-gray-700/50">
      <td class="py-3 font-bold">${c.profiles?.full_name || 'Cliente'} <br><span class="text-gray-400 font-normal">${c.profiles?.phone || ''}</span></td>
      <td class="py-3 font-bold">$${Number(c.financed_amount).toLocaleString('es-CO')}</td>
      <td class="py-3 uppercase">${c.periodicity}</td>
      <td class="py-3">${c.number_of_installments} de $${Number(c.installment_amount).toLocaleString('es-CO')}</td>
      <td class="py-3">
        <a href="${c.id_card_front_url}" target="_blank" class="text-pink-600 hover:underline block">Cédula Frente</a>
        <a href="${c.id_card_back_url}" target="_blank" class="text-pink-600 hover:underline block">Cédula Reverso</a>
      </td>
      <td class="py-3 font-extrabold ${c.status === 'APROBADO' ? 'text-green-600' : c.status === 'RECHAZADO' ? 'text-red-600' : 'text-amber-500'}">
        ${c.status || 'PENDIENTE'}
      </td>
      <td class="py-3 space-x-1">
        ${c.status === 'PENDIENTE' ? `
          <button onclick="updateCreditStatus('${c.id}', 'APROBADO')" class="bg-green-600 text-white font-bold px-2.5 py-1 rounded-lg text-[10px]">Aprobar</button>
          <button onclick="updateCreditStatus('${c.id}', 'RECHAZADO')" class="bg-red-600 text-white font-bold px-2.5 py-1 rounded-lg text-[10px]">Rechazar</button>
        ` : '---'}
      </td>
    </tr>
  `).join('');
}

window.updateCreditStatus = async function(creditId, status) {
  const { error } = await supabase
    .from('cupissa_credits')
    .update({ status })
    .eq('id', creditId);

  if (error) {
    alert('Error actualizando el crédito: ' + error.message);
  } else {
    alert(`Crédito marcado como ${status}.`);
    loadCredits();
  }
};

window.switchAdminTab = function(tab) {
  document.getElementById('adminSecProducts').classList.add('hidden');
  document.getElementById('adminSecCredits').classList.add('hidden');

  if (tab === 'products') document.getElementById('adminSecProducts').classList.remove('hidden');
  if (tab === 'credits') document.getElementById('adminSecCredits').classList.remove('hidden');
};

window.handleAdminLogout = async function() {
  await supabase.auth.signOut();
  window.location.href = 'index.html';
};