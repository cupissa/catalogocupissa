/* Loads HTML partials before app scripts, preserving the legacy global API. */
(async function bootstrapPage() {
  const page = document.body.dataset.page;
  const partials = [...document.querySelectorAll('[data-partial]')];
  const showFailure = (message) => {
    console.error('[Cupissa] ' + message);
    const box = document.createElement('div');
    box.setAttribute('role', 'alert');
    box.className = 'fixed inset-x-4 bottom-4 z-[9999] rounded-xl bg-red-700 p-4 text-sm font-bold text-white shadow-xl';
    box.textContent = 'No fue posible cargar todos los módulos. Usa el proyecto desde un servidor web y revisa la conexión.';
    document.body.appendChild(box);
  };
  try {
    await Promise.all(partials.map(async (slot) => {
      const path = slot.dataset.partial;
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status} al cargar ${path}`);
      slot.outerHTML = await response.text();
    }));
    const customer = {
      home: [
        '../shared/js/config/constants.js', '../shared/js/config/supabase.js', '../shared/js/services/settings.js',
        '../shared/js/utils/supabase-sync.js', 'js/utils/theme.js', '../shared/js/utils/ui.js', 'js/utils/captcha-helper.js',
        'js/modules/auth.js', 'js/clientProfile.js', 'js/modules/cart.js', 'js/modules/favorites.js',
        'js/modules/products.js', 'js/modules/product-detail-modal.js', 'js/modules/tracking.js', 'js/pages/index-page.js'
      ]
    };
    const admin = {
      admin: [
        '../shared/js/config/constants.js', '../shared/js/config/supabase.js', 'js/services/storage.js',
        '../shared/js/services/settings.js', '../shared/js/utils/supabase-sync.js', '../shared/js/utils/ui.js',
        'js/modules/admin/admin-dashboard.js', 'js/modules/admin/admin-products.js', 'js/modules/admin/admin-orders.js',
        'js/modules/admin/web/web-products.js', 'js/modules/admin/web/web-clients.js', 'js/pages/admin-page.js'
      ]
    };
    const scripts = customer[page] || admin[page];
    if (!scripts) throw new Error(`No existe configuración para la página "${page}"`);
    for (const src of scripts) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`No se pudo cargar el script ${src}`));
        document.body.appendChild(script);
      });
    }
  } catch (error) {
    showFailure(error.message || String(error));
  }
})();
