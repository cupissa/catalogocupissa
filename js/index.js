/* ==========================================
   CUPISSA - LÓGICA DE TIENDA Y CLIENTE
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadProductsFromSupabase();
  checkActiveSession();
});

// 1. CARGAR PRODUCTOS DESDE SUPABASE
async function loadProductsFromSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    currentProducts = data || [];
    renderProducts(currentProducts);
  } catch (err) {
    console.error("Error al cargar productos:", err);
  }
}

// 2. RENDERIZAR GRID DE PRODUCTOS
function renderProducts(products) {
  const container = document.getElementById("productGrid");
  if (!container) return;

  if (products.length === 0) {
    container.innerHTML = `<p class="col-span-full text-center py-10 text-gray-400 text-sm">No hay productos disponibles en este momento.</p>`;
    return;
  }

  container.innerHTML = products
    .map(
      (prod) => `
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between">
      <div>
        <div class="relative h-48 overflow-hidden bg-gray-100">
          <img src="${prod.image_url || 'https://via.placeholder.com/300'}" alt="${prod.title}" class="w-full h-full object-cover" />
          <span class="absolute top-2 left-2 bg-pink-100 text-pink-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider">
            ${prod.world}
          </span>
        </div>
        <div class="p-4">
          <span class="text-[11px] font-bold text-gray-400 block mb-1">${prod.category}</span>
          <h3 class="font-bold text-gray-900 text-base mb-1 line-clamp-1">${prod.title}</h3>
          <p class="text-xs text-gray-500 mb-3 line-clamp-2">${prod.description || ''}</p>
        </div>
      </div>
      <div class="p-4 pt-0 border-t border-gray-50 mt-auto">
        <div class="flex justify-between items-baseline my-2">
          <span class="text-xs text-gray-400 font-medium">Desde</span>
          <span class="text-base font-black text-gray-900">$${Number(prod.price).toLocaleString()} COP</span>
        </div>
        <button onclick="viewProductDetail('${prod.id}')" class="w-full bg-gray-900 hover:bg-black text-white text-xs font-bold py-2.5 rounded-xl transition-all">
          Ver Ficha y Opciones
        </button>
      </div>
    </div>
  `
    )
    .join("");

  if (window.lucide) lucide.createIcons();
}

// 3. FILTROS Y NAVEGACIÓN DE SECCIONES
function filterByWorld(world) {
  document.querySelectorAll(".world-tab").forEach((tab) => tab.classList.remove("active"));
  const activeTab = document.getElementById(`tab-${world}`);
  if (activeTab) activeTab.classList.add("active");

  const titleElem = document.getElementById("currentWorldTitle");

  if (world === "all") {
    if (titleElem) titleElem.textContent = "Catálogo General Cupissa";
    renderProducts(currentProducts);
  } else {
    const titles = {
      familiar: "Mundo Familiar y Regalos",
      eventos: "Mundo Eventos y Fiestas",
      empresas: "Mundo Empresas y B2B",
    };
    if (titleElem) titleElem.textContent = titles[world] || "Catálogo";

    const filtered = currentProducts.filter((p) => p.world === world);
    renderProducts(filtered);
  }
}

function filterProductsBySearch() {
  const query = document.getElementById("searchInput").value.toLowerCase();
  const filtered = currentProducts.filter(
    (p) =>
      p.title.toLowerCase().includes(query) ||
      p.category.toLowerCase().includes(query) ||
      p.world.toLowerCase().includes(query)
  );
  renderProducts(filtered);
}

function showSection(sectionName) {
  document.getElementById("section-catalog").classList.add("hidden");
  document.getElementById("section-product-detail").classList.add("hidden");
  document.getElementById("section-checkout").classList.add("hidden");
  document.getElementById("section-tracking").classList.add("hidden");

  document.getElementById(`section-${sectionName}`).classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 4. DETALLE DE PRODUCTO Y CALCULADORA
function viewProductDetail(productId) {
  selectedProduct = currentProducts.find((p) => p.id === productId);
  if (!selectedProduct) return;

  document.getElementById("detailImage").src = selectedProduct.image_url || 'https://via.placeholder.com/400';
  document.getElementById("detailTitle").textContent = selectedProduct.title;
  document.getElementById("detailDescription").textContent = selectedProduct.description || 'Sin descripción';
  document.getElementById("detailWorldBadge").textContent = selectedProduct.world.toUpperCase();
  document.getElementById("detailCategoryBadge").textContent = selectedProduct.category;

  const allowRental = selectedProduct.allow_rental || false;
  const modalContainer = document.getElementById("modalTypeContainer");

  if (allowRental) {
    modalContainer.classList.remove("hidden");
  } else {
    modalContainer.classList.add("hidden");
  }

  setProductMode("sale");
  showSection("product-detail");
}

function setProductMode(mode) {
  currentMode = mode;
  const btnSale = document.getElementById("btnSelectSale");
  const btnRental = document.getElementById("btnSelectRental");
  const rentalConfig = document.getElementById("rentalConfig");

  if (mode === "sale") {
    btnSale.className = "border-2 border-pink-500 bg-pink-50 text-pink-800 font-bold py-2 rounded-lg text-sm";
    btnRental.className = "border-2 border-gray-200 text-gray-600 hover:border-pink-500 py-2 rounded-lg text-sm";
    rentalConfig.classList.add("hidden");
  } else {
    btnRental.className = "border-2 border-pink-500 bg-pink-50 text-pink-800 font-bold py-2 rounded-lg text-sm";
    btnSale.className = "border-2 border-gray-200 text-gray-600 hover:border-pink-500 py-2 rounded-lg text-sm";
    rentalConfig.classList.remove("hidden");

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 7);
    const dateInput = document.getElementById("rentalDateInput");
    if (dateInput) {
      dateInput.min = minDate.toISOString().split("T")[0];
      dateInput.value = minDate.toISOString().split("T")[0];
    }

    document.getElementById("detailDepositText").textContent = `$${Number(selectedProduct.rental_deposit || 0).toLocaleString()} COP`;
    document.getElementById("detailExtraHourText").textContent = `$${Number(selectedProduct.extra_hour_fee || 0).toLocaleString()} COP`;
  }

  updateDetailPrices();
}

function updateDetailPrices() {
  if (!selectedProduct) return;

  const total = Number(selectedProduct.price);
  const advancePct = Number(selectedProduct.advance_pct || 50);
  const advancePrice = (total * advancePct) / 100;
  const remainingPrice = total - advancePrice;

  document.getElementById("detailTotalPrice").textContent = `$${total.toLocaleString()} COP`;
  document.getElementById("detailAdvancePct").textContent = advancePct;
  document.getElementById("detailAdvancePrice").textContent = `$${advancePrice.toLocaleString()} COP`;
  document.getElementById("detailRemainingPrice").textContent = `$${remainingPrice.toLocaleString()} COP`;
}

// 5. CARRITO DE COMPRAS
function addToCartCurrent() {
  if (!selectedProduct) return;

  const total = Number(selectedProduct.price);
  const advancePct = Number(selectedProduct.advance_pct || 50);
  const advance = (total * advancePct) / 100;

  const item = {
    id: selectedProduct.id,
    title: selectedProduct.title,
    mode: currentMode,
    totalPrice: total,
    advancePrice: advance,
    rentalDate: currentMode === "rental" ? document.getElementById("rentalDateInput").value : null,
  };

  currentCart.push(item);
  updateCartUI();
  toggleCartModal(true);
}

function updateCartUI() {
  document.getElementById("cartCount").textContent = currentCart.length;

  const container = document.getElementById("cartItemsList");
  if (currentCart.length === 0) {
    container.innerHTML = `<p class="text-center text-sm text-gray-400 mt-10">Tu carrito está vacío.</p>`;
    document.getElementById("cartTotalText").textContent = "$0 COP";
    document.getElementById("cartAdvanceText").textContent = "$0 COP";
    return;
  }

  let totalSum = 0;
  let advanceSum = 0;

  container.innerHTML = currentCart
    .map((item, idx) => {
      totalSum += item.totalPrice;
      advanceSum += item.advancePrice;
      return `
      <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100 text-xs">
        <div>
          <h4 class="font-bold text-gray-900">${item.title}</h4>
          <span class="text-gray-500">${item.mode === 'rental' ? 'Alquiler (7 Días)' : 'Compra'}</span>
          ${item.rentalDate ? `<span class="block text-[10px] text-blue-600">Fecha: ${item.rentalDate}</span>` : ''}
          <span class="block font-semibold text-pink-700 mt-1">Anticipo: $${item.advancePrice.toLocaleString()} COP</span>
        </div>
        <button onclick="removeFromCart(${idx})" class="text-red-500 hover:text-red-700 font-bold text-sm p-1">✕</button>
      </div>
    `;
    })
    .join("");

  document.getElementById("cartTotalText").textContent = `$${totalSum.toLocaleString()} COP`;
  document.getElementById("cartAdvanceText").textContent = `$${advanceSum.toLocaleString()} COP`;
}

function removeFromCart(index) {
  currentCart.splice(index, 1);
  updateCartUI();
}

function toggleCartModal(forceOpen = null) {
  const modal = document.getElementById("cartModal");
  if (forceOpen !== null) {
    modal.classList.toggle("hidden", !forceOpen);
  } else {
    modal.classList.toggle("hidden");
  }
}

// 6. CHECKOUT Y CREACIÓN DE PEDIDOS EN SUPABASE
function goToCheckout() {
  if (currentCart.length === 0) {
    alert("Agrega al menos un producto al carrito.");
    return;
  }
  toggleCartModal(false);

  let totalSum = 0;
  let advanceSum = 0;
  currentCart.forEach((item) => {
    totalSum += item.totalPrice;
    advanceSum += item.advancePrice;
  });

  const remainingSum = totalSum - advanceSum;

  document.getElementById("checkoutTotalText").textContent = `$${totalSum.toLocaleString()} COP`;
  document.getElementById("checkoutAdvanceText").textContent = `$${advanceSum.toLocaleString()} COP`;
  document.getElementById("checkoutRemainingText").textContent = `$${remainingSum.toLocaleString()} COP`;

  const hasNonCreditItem = currentCart.some(cartItem => {
    const prod = currentProducts.find(p => p.id === cartItem.id);
    return prod && prod.allow_credit === false;
  });

  const optCreditLabel = document.getElementById("optPayCredit");
  if (hasNonCreditItem) {
    optCreditLabel.style.opacity = "0.5";
    optCreditLabel.style.pointerEvents = "none";
    toggleCheckoutMethod('direct');
  } else {
    optCreditLabel.style.opacity = "1";
    optCreditLabel.style.pointerEvents = "auto";
  }

  showSection("checkout");
}

function toggleCheckoutMethod(method) {
  const creditContainer = document.getElementById("creditFormContainer");
  const optDirect = document.getElementById("optPayDirect");
  const optCredit = document.getElementById("optPayCredit");

  if (method === "credit") {
    creditContainer.classList.remove("hidden");
    optCredit.className = "border-2 p-4 rounded-xl cursor-pointer flex items-start gap-3 border-pink-500 bg-pink-50";
    optDirect.className = "border-2 p-4 rounded-xl cursor-pointer flex items-start gap-3 border-gray-200";
  } else {
    creditContainer.classList.add("hidden");
    optDirect.className = "border-2 p-4 rounded-xl cursor-pointer flex items-start gap-3 border-pink-500 bg-pink-50";
    optCredit.className = "border-2 p-4 rounded-xl cursor-pointer flex items-start gap-3 border-gray-200";
  }
}

async function uploadDocument(file, path) {
  if (!file) return null;
  const fileExt = file.name.split('.').pop();
  const fileName = `${path}_${Date.now()}.${fileExt}`;
  
  const { data, error } = await supabaseClient.storage
    .from('documents')
    .upload(fileName, file);

  if (error) {
    console.error("Error al subir archivo:", error);
    return null;
  }

  const { data: publicUrlData } = supabaseClient.storage
    .from('documents')
    .getPublicUrl(fileName);

  return publicUrlData.publicUrl;
}

async function processOrderFinal() {
  const selectedPaymentOpt = document.querySelector('input[name="paymentOption"]:checked');
  const isCredit = selectedPaymentOpt && selectedPaymentOpt.value === "credit";
  const btnProcess = document.getElementById("btnProcessOrder");

  let totalSum = 0;
  let advanceSum = 0;
  currentCart.forEach((item) => {
    totalSum += item.totalPrice;
    advanceSum += item.advancePrice;
  });

  const remainingSum = totalSum - advanceSum;
  const orderCode = "CUP" + Math.floor(1000 + Math.random() * 9000);

  btnProcess.disabled = true;
  btnProcess.textContent = "Procesando Pedido...";

  try {
    const { data: orderData, error: orderError } = await supabaseClient
      .from("orders")
      .insert([
        {
          order_code: orderCode,
          user_id: currentUser ? currentUser.id : null,
          total_price: totalSum,
          advance_amount: advanceSum,
          remaining_amount: remainingSum,
          payment_method: isCredit ? "credit" : "direct",
          items: currentCart,
          status: "pending_payment"
        }
      ])
      .select()
      .single();

    if (orderError) throw orderError;

    if (isCredit) {
      const consent = document.getElementById("contractConsent").checked;
      if (!consent) {
        alert("Debes aceptar los términos del crédito y la firma digital.");
        btnProcess.disabled = false;
        btnProcess.textContent = "Pagar Anticipo en Línea y Confirmar Pedido";
        return;
      }

      const idFront = document.getElementById("idFrontFile").files[0];
      const idBack = document.getElementById("idBackFile").files[0];
      const selfie = document.getElementById("selfieFile").files[0];

      const urlFront = await uploadDocument(idFront, `id_front_${orderCode}`);
      const urlBack = await uploadDocument(idBack, `id_back_${orderCode}`);
      const urlSelfie = await uploadDocument(selfie, `selfie_${orderCode}`);

      const { error: creditError } = await supabaseClient
        .from("cupissa_credits")
        .insert([
          {
            order_id: orderData.id,
            user_id: currentUser ? currentUser.id : null,
            requested_amount: remainingSum,
            periodicity: document.getElementById("creditPeriodicity").value,
            installments: Number(document.getElementById("creditInstallments").value),
            ref1_name: document.getElementById("ref1Name").value,
            ref1_phone: document.getElementById("ref1Phone").value,
            ref2_name: document.getElementById("ref2Name").value,
            ref2_phone: document.getElementById("ref2Phone").value,
            id_front_url: urlFront,
            id_back_url: urlBack,
            selfie_url: urlSelfie,
            status: "pending"
          }
        ]);

      if (creditError) throw creditError;
    }

    alert(`¡Pedido Registrado Exitosamente!\nCódigo de Pedido: ${orderCode}\nPuedes realizar el seguimiento desde el panel de rastreo.`);

    currentCart = [];
    updateCartUI();
    showSection("catalog");
  } catch (err) {
    console.error("Error al procesar pedido:", err);
    alert("Ocurrió un error al registrar el pedido en la base de datos.");
  } finally {
    btnProcess.disabled = false;
    btnProcess.textContent = "Pagar Anticipo en Línea y Confirmar Pedido";
  }
}

// 7. RASTREO REAL DESDE TABLA ORDERS
async function trackOrder() {
  const code = document.getElementById("trackingOrderInput").value.trim().toUpperCase();
  const resContainer = document.getElementById("trackingResult");

  if (!code) {
    alert("Por favor ingresa un código de pedido.");
    return;
  }

  resContainer.classList.remove("hidden");
  resContainer.innerHTML = `<p class="text-xs text-gray-500">Buscando pedido...</p>`;

  try {
    const { data, error } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("order_code", code)
      .single();

    if (error || !data) {
      resContainer.innerHTML = `<p class="text-xs text-red-500 font-bold">No se encontró ningún pedido con el código ${code}.</p>`;
      return;
    }

    const statusMap = {
      pending_payment: "Pendiente de Anticipo",
      paid: "Anticipo Verificado / En Proceso",
      in_production: "En Fabricación",
      delivered: "Entregado"
    };

    resContainer.innerHTML = `
      <div class="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs space-y-1">
        <p class="font-bold text-emerald-900">Estado: <span class="uppercase">${statusMap[data.status] || data.status}</span></p>
        <p class="text-emerald-700">Código: <strong>${data.order_code}</strong></p>
        <p class="text-gray-600">Total: <strong>$${Number(data.total_price).toLocaleString()} COP</strong></p>
        <p class="text-gray-600">Anticipo: <strong>$${Number(data.advance_amount).toLocaleString()} COP</strong></p>
      </div>
    `;
  } catch (err) {
    console.error("Error al rastrear pedido:", err);
  }
}

// 8. AUTENTICACIÓN Y REDIRECCIÓN ADMIN / CLIENTE
function toggleAuthModal(show) {
  document.getElementById("authModal").classList.toggle("hidden", !show);
}

function switchAuthMode(mode) {
  const tabReg = document.getElementById("tabRoleRegister");
  const tabLog = document.getElementById("tabRoleLogin");
  const formReg = document.getElementById("formRegisterContainer");
  const formLog = document.getElementById("formLoginContainer");

  if (mode === "register") {
    tabReg.className = "flex-1 pb-2 font-bold text-xs border-b-2 border-pink-600 text-pink-600";
    tabLog.className = "flex-1 pb-2 font-bold text-xs border-b-2 border-transparent text-gray-400";
    formReg.classList.remove("hidden");
    formLog.classList.add("hidden");
  } else {
    tabLog.className = "flex-1 pb-2 font-bold text-xs border-b-2 border-pink-600 text-pink-600";
    tabReg.className = "flex-1 pb-2 font-bold text-xs border-b-2 border-transparent text-gray-400";
    formLog.classList.remove("hidden");
    formReg.classList.add("hidden");
  }
}

async function handleClientRegister(e) {
  e.preventDefault();

  const name = document.getElementById("regClientName").value.trim();
  const cedula = document.getElementById("regClientCedula").value.trim();
  const contact = document.getElementById("regClientContact").value.trim();
  const password = document.getElementById("regClientPassword").value;
  const btn = document.getElementById("btnRegister");

  if (!name || !cedula || !contact || !password) {
    alert("Por favor completa todos los campos.");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Registrando...";

  try {
    const isEmail = contact.includes("@");
    let signUpPayload = { password };
    
    if (isEmail) {
      signUpPayload.email = contact;
    } else {
      let phoneFormatted = contact.replace(/\s+/g, '');
      if (!phoneFormatted.startsWith('+')) {
        phoneFormatted = '+57' + phoneFormatted;
      }
      signUpPayload.phone = phoneFormatted;
    }

    const { data, error } = await supabaseClient.auth.signUp(signUpPayload);
    if (error) throw error;

    currentUser = data.user || (data.session ? data.session.user : null);

    if (currentUser) {
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .upsert([
          {
            id: currentUser.id,
            full_name: name,
            cedula: cedula,
            contact: contact
          }
        ]);

      if (profileError) console.error("Error al guardar perfil:", profileError);
    }

    alert("¡Registro exitoso! Bienvenido/a a Cupissa.");
    updateAuthUI(true, name || contact);
    toggleAuthModal(false);
  } catch (err) {
    console.error("Error en registro:", err);
    alert("Error al registrarse: " + (err.message || "Verifica los datos e intenta de nuevo."));
  } finally {
    btn.disabled = false;
    btn.textContent = "Registrarse";
  }
}

async function handleClientLogin(e) {
  e.preventDefault();

  const contact = document.getElementById("loginContact").value.trim();
  const password = document.getElementById("loginPassword").value;
  const btn = document.getElementById("btnLogin");

  if (!contact || !password) {
    alert("Por favor completa los campos.");
    return;
  }

  // VALIDACIÓN DE ADMIN DIRECTO DESDE EL LOGIN DE CLIENTES
  if (contact === "daviddeiner956@gmail.com" && password === "Deiner123") {
    sessionStorage.setItem("cupissa_admin_logged", "true");
    alert("Credenciales de Administrador correctas. Redirigiendo al panel...");
    window.location.href = "admin.html";
    return;
  }

  btn.disabled = true;
  btn.textContent = "Iniciando sesión...";

  try {
    const isEmail = contact.includes("@");
    let loginPayload = { password };

    if (isEmail) {
      loginPayload.email = contact;
    } else {
      let phoneFormatted = contact.replace(/\s+/g, '');
      if (!phoneFormatted.startsWith('+')) {
        phoneFormatted = '+57' + phoneFormatted;
      }
      loginPayload.phone = phoneFormatted;
    }

    const { data, error } = await supabaseClient.auth.signInWithPassword(loginPayload);
    if (error) throw error;

    currentUser = data.user;

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", currentUser.id)
      .single();

    const name = profile ? profile.full_name : contact;

    alert("¡Inicio de sesión exitoso!");
    updateAuthUI(true, name);
    toggleAuthModal(false);
  } catch (err) {
    console.error("Error en login:", err);
    alert("Credenciales incorrectas o usuario no encontrado.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Ingresar";
  }
}

async function checkActiveSession() {
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session && session.user) {
    currentUser = session.user;

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("id", currentUser.id)
      .single();

    const name = profile ? profile.full_name : currentUser.email || currentUser.phone;
    updateAuthUI(true, name);
  }
}

function updateAuthUI(isLoggedIn, userName = "") {
  const section = document.getElementById("userAuthSection");
  if (!section) return;

  if (isLoggedIn) {
    section.innerHTML = `
      <div class="flex items-center gap-2">
        <span class="text-xs font-bold text-gray-800">Hola, ${userName}</span>
        <button onclick="logoutUser()" class="text-xs text-red-600 font-bold hover:underline">Salir</button>
      </div>
    `;
  } else {
    section.innerHTML = `
      <button onclick="toggleAuthModal(true)" class="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-brand-600 transition-colors py-2 px-3 rounded-lg hover:bg-gray-50">
        <i class="fa-regular fa-user text-lg"></i>
        <span class="hidden sm:inline">Iniciar Sesión</span>
      </button>
    `;
  }
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI(false);
  alert("Sesión cerrada correctamente.");
}