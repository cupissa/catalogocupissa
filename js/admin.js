/* ==========================================
   CUPISSA STUDIO - LÓGICA DE ADMINISTRACIÓN
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadAdminProducts();
  loadAdminOrders();
  loadAdminCredits();
});

// 1. NAVEGACIÓN ENTRE PESTAÑAS DEL ADMIN
function showAdminTab(tabName) {
  document.getElementById("adminView-products").classList.add("hidden");
  document.getElementById("adminView-orders").classList.add("hidden");
  document.getElementById("adminView-credits").classList.add("hidden");

  document.querySelectorAll(".admin-nav-btn").forEach((btn) => {
    btn.className = "admin-nav-btn w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 text-gray-400 hover:bg-gray-800 hover:text-white transition-all";
  });

  document.getElementById(`adminView-${tabName}`).classList.remove("hidden");
  const activeBtn = document.getElementById(`adminTab-${tabName}`);
  if (activeBtn) {
    activeBtn.className = "admin-nav-btn w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 bg-pink-600 text-white transition-all";
  }

  // Recargar datos al cambiar de pestaña
  if (tabName === 'products') loadAdminProducts();
  if (tabName === 'orders') loadAdminOrders();
  if (tabName === 'credits') loadAdminCredits();
}

// 2. CARGAR TABLA DE PRODUCTOS DESDE SUPABASE
async function loadAdminProducts() {
  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const tbody = document.getElementById("adminProductsTable");
    if (!tbody) return;

    if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400 text-xs">No hay productos registrados en la base de datos.</td></tr>`;
      return;
    }

    tbody.innerHTML = data
      .map(
        (prod) => `
      <tr class="hover:bg-gray-50 border-b border-gray-100 text-xs">
        <td class="p-4 font-bold flex items-center gap-2">
          <img src="${prod.image_url || 'https://via.placeholder.com/50'}" class="w-10 h-10 object-cover rounded-lg border" />
          <span>${prod.title}</span>
        </td>
        <td class="p-4 capitalize text-gray-600">${prod.world}</td>
        <td class="p-4 text-gray-600">${prod.category}</td>
        <td class="p-4 font-extrabold text-gray-900">$${Number(prod.price).toLocaleString()} COP</td>
        <td class="p-4 text-pink-700 font-bold">${prod.advance_pct || 50}%</td>
        <td class="p-4">
          <span class="px-2 py-1 rounded-full text-[10px] font-bold ${prod.allow_rental ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}">
            ${prod.allow_rental ? 'Venta/Alquiler' : 'Solo Venta'}
          </span>
        </td>
        <td class="p-4 text-center space-x-2">
          <button onclick="editProduct('${prod.id}')" class="text-blue-600 hover:text-blue-800 font-bold text-xs">Editar</button>
          <button onclick="deleteProduct('${prod.id}')" class="text-red-600 hover:text-red-800 font-bold text-xs">Eliminar</button>
        </td>
      </tr>
    `
      )
      .join("");
  } catch (err) {
    console.error("Error al cargar productos en Admin:", err);
  }
}

// 3. CARGAR PEDIDOS REALES DESDE LA TABLA 'ORDERS'
async function loadAdminOrders() {
  const tbody = document.getElementById("adminOrdersTable");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 text-xs">Cargando pedidos...</td></tr>`;

  try {
    const { data: orders, error } = await supabaseClient
      .from("orders")
      .select("*, profiles(full_name, contact)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!orders || orders.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 text-xs">No hay pedidos registrados aún.</td></tr>`;
      return;
    }

    const statusBadge = (status) => {
      const map = {
        pending_payment: `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Pendiente Anticipo</span>`,
        paid: `<span class="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Anticipo Pagado</span>`,
        in_production: `<span class="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded-full">En Fabricación</span>`,
        delivered: `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Entregado</span>`
      };
      return map[status] || `<span class="bg-gray-100 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full">${status}</span>`;
    };

    tbody.innerHTML = orders
      .map((ord) => {
        const clientName = ord.profiles?.full_name || "Cliente General";
        const clientContact = ord.profiles?.contact || "Sin contacto";

        return `
        <tr class="hover:bg-gray-50 border-b border-gray-100 text-xs">
          <td class="p-4 font-mono font-bold text-pink-700">${ord.order_code}</td>
          <td class="p-4 font-semibold text-gray-800">${clientName}<br><span class="text-[10px] font-normal text-gray-400">${clientContact}</span></td>
          <td class="p-4 font-bold text-gray-900">$${Number(ord.total_price).toLocaleString()} COP</td>
          <td class="p-4 font-bold text-emerald-600">$${Number(ord.advance_amount).toLocaleString()} COP</td>
          <td class="p-4 font-bold text-gray-600">$${Number(ord.remaining_amount).toLocaleString()} COP</td>
          <td class="p-4">
            <span class="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
              ${ord.payment_method === 'credit' ? 'Crédito Cupissa' : 'Directo / Wompi'}
            </span>
          </td>
          <td class="p-4">${statusBadge(ord.status)}</td>
          <td class="p-4 text-center">
            <select onchange="updateOrderStatus('${ord.id}', this.value)" class="text-xs bg-gray-50 border border-gray-200 rounded-lg p-1 font-semibold text-gray-700">
              <option value="pending_payment" ${ord.status === 'pending_payment' ? 'selected' : ''}>Pendiente Anticipo</option>
              <option value="paid" ${ord.status === 'paid' ? 'selected' : ''}>Anticipo Verificado</option>
              <option value="in_production" ${ord.status === 'in_production' ? 'selected' : ''}>En Fabricación</option>
              <option value="delivered" ${ord.status === 'delivered' ? 'selected' : ''}>Entregado</option>
            </select>
          </td>
        </tr>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Error al cargar pedidos en Admin:", err);
  }
}

// CAMBIAR ESTADO DE PEDIDO EN SUPABASE
async function updateOrderStatus(orderId, newStatus) {
  try {
    const { error } = await supabaseClient
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) throw error;
    alert("Estado del pedido actualizado correctamente.");
    loadAdminOrders();
  } catch (err) {
    console.error("Error al actualizar estado del pedido:", err);
    alert("Error al actualizar el estado.");
  }
}

// 4. CARGAR SOLICITUDES DE CRÉDITO REALES DESDE 'CUPISSA_CREDITS'
async function loadAdminCredits() {
  const tbody = document.getElementById("adminCreditsTable");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400 text-xs">Cargando solicitudes de crédito...</td></tr>`;

  try {
    const { data: credits, error } = await supabaseClient
      .from("cupissa_credits")
      .select("*, profiles(full_name, cedula, contact), orders(order_code)")
      .order("created_at", { ascending: false });

    if (error) throw error;

    if (!credits || credits.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-gray-400 text-xs">No hay solicitudes de crédito pendientes.</td></tr>`;
      return;
    }

    tbody.innerHTML = credits
      .map((cred) => {
        const clientName = cred.profiles?.full_name || "Cliente";
        const cedula = cred.profiles?.cedula || "No registrada";
        const orderCode = cred.orders?.order_code || "Sin código";

        const docsLinks = `
          <div class="flex flex-col gap-0.5 text-[10px]">
            ${cred.id_front_url ? `<a href="${cred.id_front_url}" target="_blank" class="text-blue-600 underline font-bold">Cédula Frente</a>` : ''}
            ${cred.id_back_url ? `<a href="${cred.id_back_url}" target="_blank" class="text-blue-600 underline font-bold">Cédula Reverso</a>` : ''}
            ${cred.selfie_url ? `<a href="${cred.selfie_url}" target="_blank" class="text-pink-600 underline font-bold">Selfie Validada</a>` : ''}
          </div>
        `;

        const creditStatusBadge = {
          pending: `<span class="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Pendiente Revisión</span>`,
          approved: `<span class="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Aprobado</span>`,
          rejected: `<span class="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full">Rechazado</span>`
        };

        return `
        <tr class="hover:bg-gray-50 border-b border-gray-100 text-xs">
          <td class="p-4 font-bold">
            ${clientName}<br>
            <span class="text-[10px] font-normal text-gray-400">CC: ${cedula}</span><br>
            <span class="text-[10px] font-mono text-pink-600 font-bold">Ped: ${orderCode}</span>
          </td>
          <td class="p-4 font-extrabold text-gray-900">$${Number(cred.requested_amount).toLocaleString()} COP</td>
          <td class="p-4 text-xs font-semibold text-gray-700 capitalize">${cred.periodicity} (${cred.installments} cuotas)</td>
          <td class="p-4 text-[11px] text-gray-600">
            1. ${cred.ref1_name || 'N/A'} (${cred.ref1_phone || 'N/A'})<br>
            2. ${cred.ref2_name || 'N/A'} (${cred.ref2_phone || 'N/A'})
          </td>
          <td class="p-4">${docsLinks}</td>
          <td class="p-4">${creditStatusBadge[cred.status] || cred.status}</td>
          <td class="p-4 text-center space-x-1">
            ${
              cred.status === 'pending'
                ? `
              <button onclick="changeCreditStatus('${cred.id}', 'approved')" class="bg-emerald-600 text-white text-[11px] px-2.5 py-1 rounded-lg font-bold hover:bg-emerald-700 transition-all">Aprobar</button>
              <button onclick="changeCreditStatus('${cred.id}', 'rejected')" class="bg-red-600 text-white text-[11px] px-2.5 py-1 rounded-lg font-bold hover:bg-red-700 transition-all">Rechazar</button>
            `
                : `<span class="text-[10px] text-gray-400 font-semibold">Procesado</span>`
            }
          </td>
        </tr>
      `;
      })
      .join("");
  } catch (err) {
    console.error("Error al cargar créditos en Admin:", err);
  }
}

// CAMBIAR ESTADO DE CRÉDITO (APROBAR / RECHAZAR)
async function changeCreditStatus(creditId, status) {
  try {
    const { error } = await supabaseClient
      .from("cupissa_credits")
      .update({ status: status })
      .eq("id", creditId);

    if (error) throw error;
    alert(`Solicitud de crédito ${status === 'approved' ? 'APROBADA' : 'RECHAZADA'} con éxito.`);
    loadAdminCredits();
  } catch (err) {
    console.error("Error al actualizar crédito:", err);
    alert("Ocurrió un error al procesar el crédito.");
  }
}

// 5. MODAL CREAR/EDITAR PRODUCTO Y GUARDADO EN SUPABASE
function openProductModal() {
  document.getElementById("productForm").reset();
  document.getElementById("prodId").value = "";
  document.getElementById("productModalTitle").textContent = "Agregar Producto";
  document.getElementById("productModal").classList.remove("hidden");
}

function closeProductModal() {
  document.getElementById("productModal").classList.add("hidden");
}

function toggleRentalFieldsAdmin() {
  const allow = document.getElementById("prodAllowRental").value === "true";
  const fields = document.getElementById("adminRentalFields");
  if (allow) {
    fields.classList.remove("hidden");
  } else {
    fields.classList.add("hidden");
  }
}

async function editProduct(id) {
  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    document.getElementById("prodId").value = data.id;
    document.getElementById("prodTitle").value = data.title;
    document.getElementById("prodWorld").value = data.world;
    document.getElementById("prodCategory").value = data.category;
    document.getElementById("prodImageUrl").value = data.image_url || "";
    document.getElementById("prodDescription").value = data.description || "";
    document.getElementById("prodPrice").value = data.price;
    document.getElementById("prodAdvancePct").value = data.advance_pct || 50;
    document.getElementById("prodAllowRental").value = data.allow_rental ? "true" : "false";

    toggleRentalFieldsAdmin();

    document.getElementById("prodRentalDeposit").value = data.rental_deposit || 0;
    document.getElementById("prodExtraHourFee").value = data.extra_hour_fee || 0;

    document.getElementById("productModalTitle").textContent = "Editar Producto";
    document.getElementById("productModal").classList.remove("hidden");
  } catch (err) {
    console.error("Error al obtener datos del producto:", err);
  }
}

async function saveProduct(e) {
  e.preventDefault();

  const id = document.getElementById("prodId").value;
  const payload = {
    title: document.getElementById("prodTitle").value,
    world: document.getElementById("prodWorld").value,
    category: document.getElementById("prodCategory").value,
    image_url: document.getElementById("prodImageUrl").value,
    description: document.getElementById("prodDescription").value,
    price: Number(document.getElementById("prodPrice").value),
    advance_pct: Number(document.getElementById("prodAdvancePct").value),
    allow_rental: document.getElementById("prodAllowRental").value === "true",
    rental_deposit: Number(document.getElementById("prodRentalDeposit").value || 0),
    extra_hour_fee: Number(document.getElementById("prodExtraHourFee").value || 0),
  };

  try {
    let error;
    if (id) {
      const res = await supabaseClient.from("products").update(payload).eq("id", id);
      error = res.error;
    } else {
      const res = await supabaseClient.from("products").insert([payload]);
      error = res.error;
    }

    if (error) throw error;

    alert("Producto guardado exitosamente");
    closeProductModal();
    loadAdminProducts();
  } catch (err) {
    console.error("Error al guardar producto:", err);
    alert("Ocurrió un error al guardar el producto.");
  }
}

async function deleteProduct(id) {
  if (!confirm("¿Estás seguro de que deseas eliminar este producto?")) return;

  try {
    const { error } = await supabaseClient.from("products").delete().eq("id", id);
    if (error) throw error;

    loadAdminProducts();
  } catch (err) {
    console.error("Error al eliminar producto:", err);
    alert("Error al eliminar el producto.");
  }
}