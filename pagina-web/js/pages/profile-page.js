(function () {
  const $ = id => document.getElementById(id);
  const db = () => window.supabaseClient || window.supabase;
  const fmt = n => '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 }) + ' COP';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let client, user, profile = {}, crm = {}, liveChannel;
  let loading = false;

  function msg(text, bad = false) {
    const el = $('profileMessage');
    if (!el) return;
    el.textContent = text;
    el.className = 'mb-4 rounded-xl p-3 text-sm ' + (bad ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-800');
  }
  function displayName() {
    return `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || crm.nombre || user?.user_metadata?.full_name || '';
  }
  async function optionalOne(table, column, value) {
    const { data, error } = await client.from(table).select('*').eq(column, value).maybeSingle();
    if (error) { console.warn(`[Cupissa] No se pudo consultar ${table}:`, error.message); return null; }
    return data || null;
  }

  async function load() {
    if (loading) return;
    loading = true;
    try {
      client = db();
      if (!client) throw Error('No se pudo conectar con tu cuenta.');
      const { data: { session } } = await client.auth.getSession();
      user = session?.user;
      if (!user) {
        msg('Inicia sesión para ver tu perfil y tus pedidos.', true);
        if ($('myOrders')) $('myOrders').innerHTML = '<a class="font-bold text-pink-700" href="index.html">Iniciar sesión</a>';
        return;
      }
      profile = await optionalOne('profile', 'id', user.id) || {};
      crm = await optionalOne('clientes', 'user_id', user.id) || {};
      if (!crm.id && user.email) crm = await optionalOne('clientes', 'email', user.email) || {};

      const name = displayName();
      if (!profile.first_name || !profile.last_name) {
        const parts = name.split(/\s+/);
        profile.first_name ||= parts.shift() || '';
        profile.last_name ||= parts.join(' ');
      }
      const f = $('profileForm');
      if (f) {
        const values = {
          first_name: profile.first_name || '', last_name: profile.last_name || '',
          cedula: profile.cedula || crm.cedula || '', telefono: profile.telefono || crm.telefono || '',
          email: profile.email || crm.email || user.email || '',
          direccion: profile.direccion || crm.direccion || '', ciudad: profile.ciudad || '', barrio: profile.barrio || ''
        };
        Object.entries(values).forEach(([k, v]) => { if (f.elements[k]) f.elements[k].value = v; });
      }

      const approved = Number(profile.cupo_credito ?? crm.cupo_credito ?? 0);
      const used = Number(profile.credito_utilizado ?? Math.max(0, approved - Number(crm.cupo_disponible ?? approved)));
      if ($('cupoAprobado')) $('cupoAprobado').textContent = fmt(approved);
      if ($('cupoDisponible')) $('cupoDisponible').textContent = fmt(Math.max(0, Number(crm.cupo_disponible ?? (approved - used))));

      const [creditsResult, ordersResult] = await Promise.all([
        client.from('creditos_cupissa_cuentas').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        client.from('pedidos_web').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      ]);
      const credits = creditsResult.error ? [] : (creditsResult.data || []);
      const active = credits.filter(c => String(c.estado || '').toLowerCase() === 'activo');
      const balance = c => Math.max(0, Number(c.saldo_pendiente ?? (Number(c.total_credito || 0) - Number(c.total_pagado || 0) - Number(c.cuota_inicial || 0))));
      if ($('deudaActual')) $('deudaActual').textContent = fmt(active.reduce((sum, c) => sum + balance(c), 0));
      if ($('myCredits')) $('myCredits').innerHTML = active.length ? active.map(c => `<article class="rounded-xl border p-4"><div class="font-bold">${esc(String(c.frecuencia || 'mensual').toUpperCase())} · ${Math.max(0, Number(c.numero_cuotas || 0) - Number(c.cuotas_pagadas || 0))} cuotas pendientes</div><p class="mt-1 text-sm">Cuota: ${fmt(c.valor_cuota)} · Saldo: ${fmt(balance(c))}</p><p class="text-xs text-gray-500">Próximo vencimiento: ${esc(c.proxima_cuota || c.fecha_primera_cuota || 'Por confirmar')}</p><a class="mt-2 inline-block font-bold text-pink-700" href="portal-pagos.html">Ir al portal de pagos</a></article>`).join('') : '<p class="text-sm text-gray-500">No tienes créditos activos.</p>';

      const orders = ordersResult.error ? [] : (ordersResult.data || []);
      if ($('myOrders')) $('myOrders').innerHTML = orders.length ? orders.map(o => {
        const cr = active.find(x => String(x.pedido_web_id || '') === String(o.id));
        const remaining = cr ? Math.max(0, Number(cr.numero_cuotas || 0) - Number(cr.cuotas_pagadas || 0)) : Math.max(0, Number(o.installment_count || 0));
        return `<article class="rounded-xl border p-4"><div class="flex flex-wrap justify-between gap-2"><b>Pedido ${esc(o.order_code || o.id)}</b><span class="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">${esc(o.status || 'PENDIENTE')}</span></div><p class="mt-2 text-sm">Total: ${fmt(o.total_amount)} · Anticipo: ${fmt(o.advance_payment)}</p><p class="text-sm">${o.credit_mode ? `Cuota: ${fmt(cr?.valor_cuota || o.installment_value)} · Cuotas pendientes: ${remaining} · Próximo vencimiento: ${esc(cr?.proxima_cuota || cr?.fecha_primera_cuota || o.first_due_date || 'Por confirmar')}` : `Saldo pendiente: ${fmt(o.pending_balance)}`}</p><p class="text-xs text-gray-500">Entrega estimada: ${esc(o.delivery_date || 'Por confirmar')}</p><a class="mt-2 inline-block font-bold text-pink-700" href="rastreo.html?codigo=${encodeURIComponent(o.order_code || o.id)}">Rastrear pedido</a></article>`;
      }).join('') : '<p class="text-sm text-gray-500">Todavía no tienes pedidos registrados.</p>';
      if (ordersResult.error) console.warn('No se pudieron cargar los pedidos web:', ordersResult.error.message);
      if (creditsResult.error) console.warn('No se pudieron cargar los créditos:', creditsResult.error.message);
      msg('Perfil actualizado.');
      subscribeRealtime();
    } finally { loading = false; }
  }

  function subscribeRealtime() {
    if (liveChannel || !client || !user) return;
    liveChannel = client.channel('cupissa-profile-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes', filter: 'user_id=eq.' + user.id }, () => load().catch(e => msg(e.message, true)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_web', filter: 'user_id=eq.' + user.id }, () => load().catch(e => msg(e.message, true)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'creditos_cupissa_cuentas', filter: 'user_id=eq.' + user.id }, () => load().catch(e => msg(e.message, true)))
      .subscribe();
  }

  $('profileForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      if (!user) throw Error('Inicia sesión para guardar los datos.');
      const v = Object.fromEntries(new FormData(e.currentTarget).entries());
      const now = new Date().toISOString();
      let savedInProfile = false;
      const profilePayload = { id: user.id, first_name: v.first_name, last_name: v.last_name, email: v.email, cedula: v.cedula, telefono: v.telefono, direccion: v.direccion, ciudad: v.ciudad, barrio: v.barrio, updated_at: now };
      const { error: profileError } = await client.from('profile').upsert(profilePayload, { onConflict: 'id' });
      if (!profileError) savedInProfile = true;
      const crmResult = window.SupabaseSync?.syncClienteWeb ? await window.SupabaseSync.syncClienteWeb({
        user_id: user.id, nombre: `${v.first_name || ''} ${v.last_name || ''}`.trim(), telefono: v.telefono,
        email: v.email || user.email, direccion: v.direccion, barrio: v.barrio, ciudad: v.ciudad, cedula: v.cedula, estado_credito: profile.estado_credito || crm.estado_credito || 'sin_credito',
        cupo_credito: Number(profile.cupo_credito ?? crm.cupo_credito ?? 0),
        cupo_disponible: Number(crm.cupo_disponible ?? profile.cupo_credito ?? 0),
        deuda_actual: Number(crm.deuda_actual || 0), pedidos_count: Number(crm.pedidos_count || 0), total_compras: Number(crm.total_compras || 0)
      }) : { success: false };
      if (!savedInProfile && !crmResult.success) throw new Error(profileError?.message || crmResult.error || 'No se pudieron guardar los datos.');
      await load();
      msg('Tus datos fueron actualizados.');
    } catch (err) { msg(err.message || 'No se pudieron guardar los datos.', true); }
  });
  $('profileLogout')?.addEventListener('click', async () => {
    const b = $('profileLogout');
    if (b) b.disabled = true;
    try { await db().auth.signOut(); location.href = 'index.html'; }
    catch (err) { if (b) b.disabled = false; msg('No se pudo cerrar sesión.', true); }
  });
  $('theme-toggle')?.addEventListener('click', () => window.toggleTheme?.());
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => load().catch(e => msg(e.message, true)), { once: true });
  else load().catch(e => msg(e.message, true));
})();
