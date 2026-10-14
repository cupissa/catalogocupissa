/**
 * ==========================================================================
 * MÓDULO DE PERFIL DEL CLIENTE - SUPABASE INTEGRATION
 * Gestiona datos del cliente, historial y cupo utilizando el perfil y la tabla clientes como respaldo.
 * ==========================================================================
 */

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', ensureProfileContainerExists, { once: true });
} else {
  ensureProfileContainerExists();
}

/**
 * Crea el contenedor HTML modal del perfil en el DOM si no existe.
 */
function ensureProfileContainerExists() {
  if (document.getElementById("clientProfileModal")) return;

  const modalHtml = `
    <div id="clientProfileModal" class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 hidden overflow-y-auto">
      <div class="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 relative my-8 max-h-[90vh] flex flex-col">
        
        <!-- Cabecera del Perfil -->
        <div class="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 flex items-center justify-center font-black text-base">
              <i class="fa-solid fa-user-gear"></i>
            </div>
            <div>
              <h3 id="profileModalUserName" class="font-black text-base text-gray-900 dark:text-white">Mi Cuenta Cupissa</h3>
              <p id="profileModalUserEmail" class="text-[11px] text-gray-500 dark:text-gray-400">Gestiona tus datos, pedidos y cupo de crédito</p>
            </div>
          </div>
          <button type="button" onclick="toggleClientProfileModal(false)" class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- Pestañas de Navegación -->
        <div class="flex border-b border-gray-100 dark:border-gray-700 shrink-0 mt-4 overflow-x-auto scrollbar-none">
          <button type="button" onclick="switchProfileTab('data')" id="tabProfileData" class="profile-tab flex-1 py-2.5 px-4 text-xs font-bold text-brand-600 border-b-2 border-brand-600 whitespace-nowrap flex items-center justify-center gap-1.5">
            <i class="fa-regular fa-id-card"></i> Datos Personales
          </button>
          <button type="button" onclick="switchProfileTab('orders')" id="tabProfileOrders" class="profile-tab flex-1 py-2.5 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 border-b-2 border-transparent whitespace-nowrap flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-box-archive"></i> Historial de Pedidos
          </button>
          <button type="button" onclick="switchProfileTab('credit')" id="tabProfileCredit" class="profile-tab flex-1 py-2.5 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 border-b-2 border-transparent whitespace-nowrap flex items-center justify-center gap-1.5">
            <i class="fa-solid fa-shield-halved"></i> Cupo de Crédito
          </button>
        </div>

        <!-- Contenido de las Pestañas -->
        <div class="flex-1 overflow-y-auto py-4 pr-1 space-y-4">
          
          <!-- SECCIÓN 1: DATOS EDITABLES -->
          <div id="sectionProfileData" class="space-y-4">
            <form id="clientProfileForm" onsubmit="handleSaveClientProfile(event)" class="space-y-3">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Nombre *</label>
                  <input type="text" id="profFirstName" required class="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-brand-500">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Apellido *</label>
                  <input type="text" id="profLastName" required class="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-brand-500">
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Correo Electrónico (No editable)</label>
                  <input type="email" id="profEmail" disabled class="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Cédula / Documento *</label>
                  <input type="text" id="profCedula" required class="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-brand-500" placeholder="Número de cédula">
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Teléfono / WhatsApp *</label>
                  <input type="tel" id="profPhone" required class="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-brand-500">
                </div>
                <div>
                  <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Ciudad *</label>
                  <input type="text" id="profCity" required class="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-brand-500" value="Barranquilla">
                </div>
              </div>

              <div>
                <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Barrio *</label>
                <input type="text" id="profNeighborhood" required class="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-brand-500" placeholder="Tu barrio">
              </div>

              <div>
                <label class="block text-[11px] font-bold text-gray-600 dark:text-gray-300 mb-1">Dirección Exacta *</label>
                <input type="text" id="profAddress" required class="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-brand-500" placeholder="Calle, Carrera, Número, Apartamento">
              </div>

              <div class="pt-2">
                <button type="submit" id="btnSaveProfile" class="w-full bg-brand-600 hover:bg-brand-700 text-white font-extrabold py-3 rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2">
                  <i class="fa-solid fa-floppy-disk"></i> Guardar cambios
                </button>
              </div>
            </form>
          </div>

          <!-- SECCIÓN 2: HISTORIAL DE PEDIDOS -->
          <div id="sectionProfileOrders" class="space-y-3 hidden">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-bold text-gray-600 dark:text-gray-300">Tus pedidos recientes y en proceso:</span>
              <button type="button" onclick="loadClientOrdersHistory()" class="text-[11px] text-brand-600 hover:underline font-bold">
                <i class="fa-solid fa-rotate-right mr-1"></i> Actualizar
              </button>
            </div>
            <div id="clientOrdersListContainer" class="space-y-3">
              <div class="text-center py-8 text-xs text-gray-400">
                <i class="fa-solid fa-circle-notch fa-spin text-lg text-brand-600 mb-2"></i>
                <p>Cargando historial...</p>
              </div>
            </div>
          </div>

          <!-- SECCIÓN 3: CUPO DE CRÉDITO CUPISSA -->
          <div id="sectionProfileCredit" class="space-y-4 hidden">
            <div class="p-5 bg-gradient-to-br from-brand-500/10 via-brand-600/5 to-transparent rounded-2xl border border-brand-200 dark:border-brand-900/50 space-y-4">
              <div class="flex items-center justify-between">
                <div>
                  <span class="text-[10px] font-black uppercase text-brand-600 dark:text-brand-400 tracking-wider">Cupo Aprobado Cupissa</span>
                  <h4 id="creditTotalLimit" class="text-2xl font-black text-gray-900 dark:text-white">$0 COP</h4>
                </div>
                <div class="w-12 h-12 rounded-2xl bg-brand-600 text-white flex items-center justify-center text-xl shadow-md">
                  <i class="fa-solid fa-wallet"></i>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3 pt-2 border-t border-brand-100 dark:border-brand-900/30">
                <div>
                  <span class="text-[10px] font-bold text-gray-500 block">Cupo Utilizado</span>
                  <span id="creditUsedAmount" class="text-sm font-black text-gray-800 dark:text-gray-200">$0 COP</span>
                </div>
                <div>
                  <span class="text-[10px] font-bold text-emerald-600 block">Cupo Disponible</span>
                  <span id="creditAvailableAmount" class="text-sm font-black text-emerald-600">$0 COP</span>
                </div>
              </div>
            </div>

            <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2 text-xs">
              <h5 class="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                <i class="fa-solid fa-circle-info text-brand-600"></i> ¿Cómo funciona tu Crédito Cupissa?
              </h5>
              <p class="text-gray-500 dark:text-gray-400 leading-relaxed">
                Todos los clientes nuevos reciben un cupo base inicial de <strong>$200,000 COP</strong> en su cuenta de Supabase. Al mantener tus pagos al día, tu cupo aumenta de forma automática.
              </p>
            </div>
          </div>

        </div>

        <!-- Pie del Modal -->
        <div class="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0 mt-4">
          <button type="button" onclick="window.confirmLogout()" class="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center gap-2">
            <i class="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
          </button>
          <button type="button" onclick="toggleClientProfileModal(false)" class="px-5 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-all">
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  `;

  const div = document.createElement("div");
  div.innerHTML = modalHtml;
  document.body.appendChild(div.firstElementChild);
}

/**
 * Abre o cierra el modal y sincroniza los datos desde la tabla 'profile' de Supabase.
 */
async function toggleClientProfileModal(open) {
  const modal = document.getElementById("clientProfileModal");
  if (!modal) return;

  if (open) {
    await populateClientProfileFromSupabase();
    modal.classList.remove("hidden");
    switchProfileTab('data');
  } else {
    modal.classList.add("hidden");
  }
}

/**
 * Cambia de pestaña en el perfil.
 */
function switchProfileTab(tabName) {
  const tabs = ['data', 'orders', 'credit'];
  
  tabs.forEach(t => {
    const btn = document.getElementById(`tabProfile${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const section = document.getElementById(`sectionProfile${t.charAt(0).toUpperCase() + t.slice(1)}`);
    
    if (btn && section) {
      if (t === tabName) {
        btn.className = "profile-tab flex-1 py-2.5 px-4 text-xs font-bold text-brand-600 border-b-2 border-brand-600 whitespace-nowrap flex items-center justify-center gap-1.5";
        section.classList.remove("hidden");
      } else {
        btn.className = "profile-tab flex-1 py-2.5 px-4 text-xs font-bold text-gray-500 dark:text-gray-400 border-b-2 border-transparent whitespace-nowrap flex items-center justify-center gap-1.5";
        section.classList.add("hidden");
      }
    }
  });

  if (tabName === 'orders') {
    loadClientOrdersHistory();
  } else if (tabName === 'credit') {
    loadClientCreditInfoFromSupabase();
  }
}

/**
 * Carga la información del usuario directamente desde la tabla 'profile' en Supabase.
 */
async function populateClientProfileFromSupabase() {
  const client = window.supabaseClient || window.supabase;
  if (!client) return;

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session || !session.user) return;

    const userId = session.user.id;
    const userEmail = session.user.email;

    // Consultar tabla 'profile'
    const { data: profileData, error } = await client
      .from('profile')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    let profile = profileData || null;
    if (!profile) {
      const { data: crm, error: crmError } = await client.from('clientes').select('*').eq('user_id', userId).maybeSingle();
      if (!crmError && crm) {
        const parts = String(crm.nombre || '').trim().split(/\s+/);
        profile = { ...crm, first_name: parts.shift() || '', last_name: parts.join(' '), email: crm.email || userEmail };
      }
    }
    if (error) console.warn('El perfil extendido no está disponible; se utilizará el registro del cliente si existe.');

    const firstName = profile?.first_name || session.user.user_metadata?.first_name || '';
    const lastName = profile?.last_name || session.user.user_metadata?.last_name || '';

    document.getElementById("profileModalUserName").textContent = `${firstName} ${lastName}`.trim() || 'Cliente Cupissa';
    document.getElementById("profileModalUserEmail").textContent = userEmail;

    document.getElementById("profFirstName").value = firstName;
    document.getElementById("profLastName").value = lastName;
    document.getElementById("profEmail").value = userEmail;
    document.getElementById("profCedula").value = profile?.cedula || profile?.documento || '';
    document.getElementById("profPhone").value = profile?.telefono || profile?.phone || '';
    document.getElementById("profCity").value = profile?.ciudad || profile?.city || 'Barranquilla';
    document.getElementById("profNeighborhood").value = profile?.barrio || profile?.neighborhood || '';
    document.getElementById("profAddress").value = profile?.direccion || profile?.address || '';

  } catch (err) {
    console.error("Excepción al cargar perfil de Supabase:", err);
  }
}

/**
 * Guarda los cambios del perfil directamente en la tabla 'profile' de Supabase.
 */
async function handleSaveClientProfile(event) {
  event.preventDefault();

  const client = window.supabaseClient || window.supabase;
  if (!client) return;

  const btn = document.getElementById("btnSaveProfile");
  if (btn) btn.disabled = true;

  try {
    const { data: { session } } = await client.auth.getSession();
    if (!session || !session.user) throw new Error("No hay sesión activa.");

    const userId = session.user.id;

    const payload = {
      id: userId,
      first_name: document.getElementById("profFirstName").value.trim(),
      last_name: document.getElementById("profLastName").value.trim(),
      cedula: document.getElementById("profCedula").value.trim(),
      telefono: document.getElementById("profPhone").value.trim(),
      ciudad: document.getElementById("profCity").value.trim(),
      barrio: document.getElementById("profNeighborhood").value.trim(),
      direccion: document.getElementById("profAddress").value.trim(),
      updated_at: new Date().toISOString()
    };

    const { error: profileError } = await client
      .from('profile')
      .upsert([payload]);
    const crmResult = window.SupabaseSync?.syncClienteWeb ? await window.SupabaseSync.syncClienteWeb({
      user_id: userId,
      nombre: `${payload.first_name} ${payload.last_name}`.trim(),
      telefono: payload.telefono,
      email: session.user.email,
      cedula: payload.cedula,
      direccion: payload.direccion,
      ciudad: payload.ciudad,
      barrio: payload.barrio,
    }) : { success: false };
    if (profileError && !crmResult.success) throw profileError;

    if (typeof showToast === 'function') {
      showToast("Perfil actualizado en Supabase con éxito", "success");
    } else {
      alert("Perfil actualizado correctamente");
    }

    if (typeof window.updateUserAuthUI === 'function') {
      await window.updateUserAuthUI();
    }

    toggleClientProfileModal(false);
  } catch (err) {
    console.error("Error al guardar perfil:", err);
    if (typeof showToast === 'function') {
      showToast(err.message || "Error al guardar los cambios", "error");
    } else {
      alert("Error al guardar los cambios");
    }
  } finally {
    if (btn) btn.disabled = false;
  }
}

/**
 * Carga el historial de pedidos desde Supabase (o respaldo local).
 */
async function loadClientOrdersHistory() {
  const container = document.getElementById("clientOrdersListContainer");
  if (!container) return;

  const client = window.supabaseClient || window.supabase;
  let userOrders = [];
  let ordersUnavailable = false;

  try {
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user) {
        // Pedidos creados por la tienda web (tabla real usada por el checkout).
        const { data: dbOrders, error: ordersError } = await client
          .from('pedidos_web').select('*').eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (ordersError) throw ordersError;
        userOrders = dbOrders || [];
      }
    }
  } catch (e) {
    ordersUnavailable = true;
    console.warn("No se pudo consultar el historial de pedidos en Supabase.", e.message || e);
  }

  if (ordersUnavailable) {
    container.innerHTML = '<p class="p-4 text-center text-sm text-red-600">No se pudo cargar tu historial desde el servidor. Recarga la página para intentarlo nuevamente.</p>';
    return;
  }

  if (userOrders.length === 0) {
    container.innerHTML = `
      <div class="text-center py-10 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
        <i class="fa-solid fa-box-open text-2xl text-gray-300 dark:text-gray-600 mb-2"></i>
        <p class="text-xs text-gray-500 font-semibold">No tienes pedidos registrados todavía.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = userOrders.map(order => `
    <div class="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="font-black text-gray-900 dark:text-white">Orden #${order.order_code || order.referencia_pedido || order.id || order.orderId || '000'}</span>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${getOrderStatusBadgeClass(order.status)}">${order.status || 'En Proceso'}</span>
        </div>
        <p class="text-gray-500 dark:text-gray-400">Fecha: ${order.created_at ? new Date(order.created_at).toLocaleDateString('es-CO') : (order.date || '—')}</p>
        ${order.details?.imagen ? `<a class="text-brand-600 underline" href="${order.details.imagen}" target="_blank" rel="noopener">Ver imagen adjunta</a>` : ''}
        <p class="text-brand-600 font-bold">Total: $${Number(order.total || order.total_amount || 0).toLocaleString()} COP</p>
      </div>
      <div>
        <a href="rastreo.html?order=${encodeURIComponent(order.order_code || order.referencia_pedido || order.id || '')}" class="px-3 py-2 bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 font-bold rounded-xl hover:bg-brand-100 transition-colors inline-flex items-center gap-1.5">
          <i class="fa-solid fa-truck-fast"></i> Rastrear
        </a>
      </div>
    </div>
  `).join('');
}

function getOrderStatusBadgeClass(status) {
  switch ((status || '').toLowerCase()) {
    case 'completado':
    case 'entregado':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300';
    case 'cancelado':
      return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300';
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300';
  }
}

/**
 * Carga la información de cupo de crédito desde la tabla 'profile' en Supabase.
 */
async function loadClientCreditInfoFromSupabase() {
  const client = window.supabaseClient || window.supabase;
  let creditLimit = 0; // El cupo siempre se lee de Supabase; cero si no existe registro
  let creditUsed = 0;

  try {
    if (client) {
      const { data: { session } } = await client.auth.getSession();
      if (session && session.user) {
        const { data: profile } = await client
          .from('profile')
          .select('cupo_credito, credito_utilizado')
          .eq('id', session.user.id)
          .maybeSingle();
        if (profile) {
          creditLimit = Number(profile.cupo_credito ?? 0);
          creditUsed = Number(profile.credito_utilizado || 0);
        } else {
          const { data: crm } = await client.from('clientes').select('cupo_credito,cupo_disponible,deuda_actual').eq('user_id', session.user.id).maybeSingle();
          if (crm) { creditLimit = Number(crm.cupo_credito || 0); creditUsed = Math.max(0, creditLimit - Number(crm.cupo_disponible ?? creditLimit)); }
        }
      }
    }
  } catch (e) {
    console.warn("No se pudo obtener el crédito de Supabase.");
  }

  const creditAvailable = creditLimit - creditUsed;

  const limitEl = document.getElementById("creditTotalLimit");
  const usedEl = document.getElementById("creditUsedAmount");
  const availableEl = document.getElementById("creditAvailableAmount");

  if (limitEl) limitEl.textContent = `$${Number(creditLimit).toLocaleString()} COP`;
  if (usedEl) usedEl.textContent = `$${Number(creditUsed).toLocaleString()} COP`;
  if (availableEl) availableEl.textContent = `$${Number(creditAvailable).toLocaleString()} COP`;
}
// Mantiene el perfil actualizado cuando el administrador modifica cupo o estado del pedido.
(function subscribeClientProfileRealtime(){
  const client = window.supabaseClient || window.supabase;
  if (!client || window.__cupissaProfileRealtime) return;
  window.__cupissaProfileRealtime = true;
  client.auth.onAuthStateChange((_event, session) => {
    if (!session?.user) return;
    if (window.__cupissaProfileChannel) client.removeChannel(window.__cupissaProfileChannel);
    window.__cupissaProfileChannel = client.channel('cupissa-profile-' + session.user.id)
      .on('postgres_changes', {event:'*', schema:'public', table:'profile', filter:'id=eq.'+session.user.id}, () => {
        loadClientCreditInfoFromSupabase();
        if (!document.getElementById('sectionProfileOrders')?.classList.contains('hidden')) loadClientOrdersHistory();
      })
      .on('postgres_changes', {event:'*', schema:'public', table:'clientes', filter:'user_id=eq.'+session.user.id}, () => {
        populateClientProfileFromSupabase(); loadClientCreditInfoFromSupabase();
      })
      .on('postgres_changes', {event:'*', schema:'public', table:'creditos_cupissa_cuentas', filter:'user_id=eq.'+session.user.id}, () => {
        loadClientCreditInfoFromSupabase();
      })
      .on('postgres_changes', {event:'*', schema:'public', table:'pedidos_web', filter:'user_id=eq.'+session.user.id}, () => {
        if (!document.getElementById('sectionProfileOrders')?.classList.contains('hidden')) loadClientOrdersHistory();
      }).subscribe();
  });
})();
