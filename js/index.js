/* ==========================================
   CUPISSA STUDIO - LÓGICA DE TIENDA Y CLIENTE
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
          <span class="text-gray-500">${item.mode === 'rental' ? 'Alquiler (24h)' : 'Compra'}</span>
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

// SUBIR ARCHIVOS A SUPABASE STORAGE
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

// PROCESAR PEDIDO Y ENVIAR A TABLA ORDERS / CUPISSA_CREDITS
async function processOrderFinal() {
  const isCredit = document.querySelector('input[name="paymentOption"]:checked').value === "credit";
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
    // 1. Guardar Orden en 'orders'
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

    // 2. Si es Crédito, Subir Documentos y Guardar en 'cupissa_credits'
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

// 8. AUTENTICACIÓN REAL MEDIANTE SUPABASE AUTH (OTP) Y PROFILES
function toggleAuthModal(show) {
  document.getElementById("authModal").classList.toggle("hidden", !show);
}

function switchRoleTab(role) {
  const tabClient = document.getElementById("tabRoleClient");
  const tabStore = document.getElementById("tabRoleStore");
  const formClient = document.getElementById("formClientContainer");
  const formStore = document.getElementById("formStoreContainer");

  if (role === "client") {
    tabClient.className = "flex-1 pb-2 font-bold text-xs border-b-2 border-pink-600 text-pink-600";
    tabStore.className = "flex-1 pb-2 font-bold text-xs border-b-2 border-transparent text-gray-400";
    formClient.classList.remove("hidden");
    formStore.classList.add("hidden");
  } else {
    tabStore.className = "flex-1 pb-2 font-bold text-xs border-b-2 border-pink-600 text-pink-600";
    tabClient.className = "flex-1 pb-2 font-bold text-xs border-b-2 border-transparent text-gray-400";
    formStore.classList.remove("hidden");
    formClient.classList.add("hidden");
  }
}

// ENVIAR CÓDIGO OTP REAL (EMAIL O TELÉFONO)
let pendingRegisterData = {};

// ENVIAR CÓDIGO OTP (Email o Teléfono)
async function sendVerificationCode(event) {
    if (event) event.preventDefault();
    
    const nameInput = document.getElementById('regClientName');
    const cedulaInput = document.getElementById('regClientCedula');
    const contactInput = document.getElementById('regClientContact');
    const btnSend = document.getElementById('btnSendCode');

    const name = nameInput ? nameInput.value.trim() : '';
    const cedula = cedulaInput ? cedulaInput.value.trim() : '';
    const contact = contactInput ? contactInput.value.trim() : '';

    if (!name || !cedula || !contact) {
        alert('Por favor completa todos los campos obligatorios.');
        return;
    }

    // Guardar datos temporales para cuando verifique el código
    window.tempRegistrationData = { name, cedula, contact };

    if (btnSend) {
        btnSend.disabled = true;
        btnSend.innerText = 'Enviando Código...';
    }

    try {
        const isEmail = contact.includes('@');

        if (isEmail) {
            // Envío por correo electrónico
            const { data, error } = await supabaseClient.auth.signInWithOtp({
                email: contact,
                options: {
                    shouldCreateUser: true
                }
            });

            if (error) throw error;

            alert(`¡Código enviado a ${contact}! Revisa tu bandeja de entrada o spam.`);
        } else {
            // Envío por teléfono (requiere formato internacional E.164, ej: +573001234567)
            let formattedPhone = contact.replace(/\s+/g, '');
            if (!formattedPhone.startsWith('+')) {
                formattedPhone = '+57' + formattedPhone; // Ajusta el prefijo de tu país si es necesario
            }

            const { data, error } = await supabaseClient.auth.signInWithOtp({
                phone: formattedPhone
            });

            if (error) throw error;

            alert(`¡Código enviado por SMS a ${formattedPhone}!`);
        }

        // Mostrar formulario de verificación de código OTP
        const regForm = document.getElementById('clientRegisterForm');
        const verifyForm = document.getElementById('verifyCodeForm');

        if (regForm) regForm.classList.add('hidden');
        if (verifyForm) verifyForm.classList.remove('hidden');

    } catch (err) {
        console.error('Error enviando OTP:', err);
        alert('Error al enviar el código OTP: ' + (err.message || err.error_description || 'Verifica los datos e intenta de nuevo.'));
    } finally {
        if (btnSend) {
            btnSend.disabled = false;
            btnSend.innerText = 'Enviar Código...';
        }
    }
}

// VERIFICAR CÓDIGO OTP Y CREAR PERFIL EN TABLA 'PROFILES'
async function completeClientRegistration(e) {
  e.preventDefault();

  const token = document.getElementById("otpCode").value.trim();
  const { contact, name, cedula } = pendingRegisterData;
  const isEmail = contact.includes("@");
  const btn = document.getElementById("btnCompleteReg");

  btn.disabled = true;
  btn.textContent = "Verificando...";

  try {
    let sessionData, authError;

    if (isEmail) {
      const res = await supabaseClient.auth.verifyOtp({
        email: contact,
        token: token,
        type: 'email'
      });
      sessionData = res.data;
      authError = res.error;
    } else {
      const res = await supabaseClient.auth.verifyOtp({
        phone: contact,
        token: token,
        type: 'sms'
      });
      sessionData = res.data;
      authError = res.error;
    }

    if (authError) throw authError;

    currentUser = sessionData.user;

    // Guardar o Actualizar Perfil en 'profiles'
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

    alert("¡Verificación exitosa! Bienvenido/a a Cupissa.");
    updateAuthUI(true, name || contact);
    toggleAuthModal(false);
  } catch (err) {
    console.error("Error al verificar OTP:", err);
    alert("Código OTP incorrecto o expirado.");
  } finally {
    btn.disabled = false;
    btn.textContent = "Verificar y Finalizar Registro";
  }
}

// VERIFICAR SESIÓN ACTIVA EN SUPABASE
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
      <button onclick="toggleAuthModal(true)" class="bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold px-3 py-2 rounded-full flex items-center gap-1.5 transition-all">
        <i data-lucide="user" class="w-4 h-4 text-pink-600"></i>
        <span class="hidden sm:inline">Registrarse / Ingresar</span>
      </button>
    `;
    if (window.lucide) lucide.createIcons();
  }
}

async function logoutUser() {
  await supabaseClient.auth.signOut();
  currentUser = null;
  updateAuthUI(false);
  alert("Sesión cerrada correctamente.");
}