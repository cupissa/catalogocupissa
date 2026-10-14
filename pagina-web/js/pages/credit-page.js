(function () {
  const $ = id => document.getElementById(id);
  const db = () => window.supabaseClient || window.supabase;
  const form = $('creditPageForm'), msg = $('creditPageMessage');
  if (!form || !msg) return;
  $('theme-toggle')?.addEventListener('click', () => window.toggleTheme?.());
  function say(text, ok = false) { msg.textContent = text; msg.className = 'text-sm font-bold ' + (ok ? 'text-emerald-700' : 'text-red-600'); }
  async function upload(client, file, folder, uid) {
    if (!file) throw Error('Adjunta ' + folder + '.');
    if (file.size > 6 * 1024 * 1024) throw Error('Cada imagen debe pesar máximo 6 MB.');
    const path = `${uid}/${Date.now()}-${folder}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error } = await client.storage.from('cupissa-documentos').upload(path, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
    if (error) throw Error('No se pudo subir ' + folder + '.');
    return path;
  }
  async function getSessionAndProfile() {
    const client = db(); if (!client) throw Error('No se pudo conectar con tu cuenta.');
    const { data: { session } } = await client.auth.getSession();
    if (!session?.user) { say('Inicia sesión antes de solicitar crédito.'); return; }
    const user = session.user;
    let p = null;
    const result = await client.from('profile').select('*').eq('id', user.id).maybeSingle();
    if (!result.error) p = result.data;
    if (!p) {
      const crm = await client.from('clientes').select('*').eq('user_id', user.id).maybeSingle();
      if (!crm.error && crm.data) {
        const parts = String(crm.data.nombre || '').trim().split(/\s+/);
        p = { ...crm.data, first_name: parts.shift() || '', last_name: parts.join(' '), email: crm.data.email || user.email };
      }
    }
    const f = form;
    for (const [k, v] of Object.entries({ nombre: p?.first_name, apellido: p?.last_name, cedula: p?.cedula, telefono: p?.telefono, correo: p?.email || user.email, direccion: p?.direccion, ciudad: p?.ciudad, barrio: p?.barrio })) {
      if (f.elements[k] && v) f.elements[k].value = v;
    }
  }
  getSessionAndProfile().catch(e => say(e.message || 'No se pudo cargar el formulario.'));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const button = $('submitCredit'); if (button) button.disabled = true;
    try {
      const client = db(); if (!client) throw Error('No se pudo conectar con Supabase.');
      const { data: { session } } = await client.auth.getSession();
      const user = session?.user; if (!user) throw Error('Inicia sesión antes de enviar la solicitud.');
      const v = Object.fromEntries(new FormData(form).entries()), uid = user.id, now = new Date().toISOString();
      const docs = {
        foto_carnet_path: await upload(client, form.elements.foto_carnet.files[0], 'foto-carnet', uid),
        cedula_frente_path: await upload(client, form.elements.cedula_frente.files[0], 'cedula-frente', uid),
        cedula_reverso_path: await upload(client, form.elements.cedula_reverso.files[0], 'cedula-reverso', uid)
      };
      const { data: prof, error: profError } = await client.from('profile').select('cupo_credito').eq('id', uid).maybeSingle();
      let crm = null;
      if (profError || !prof) {
        const q = await client.from('clientes').select('cupo_credito').eq('user_id', uid).maybeSingle();
        if (!q.error) crm = q.data;
      }
      const currentLimit = Number(prof?.cupo_credito ?? crm?.cupo_credito ?? 0);
      const requested = Number(v.cupo_solicitado || 0);
      if (!Number.isFinite(requested) || requested <= 0) throw Error('Ingresa un cupo solicitado válido.');
      const { error } = await client.from('solicitudes_credito_cupissa').insert({
        user_id: uid, email: v.correo || user.email, first_name: v.nombre, last_name: v.apellido,
        cedula: v.cedula, telefono: v.telefono, direccion: v.direccion || null, ciudad: v.ciudad || null,
        barrio: v.barrio || null, referencia1_nombre: v.ref1_nombre, referencia1_telefono: v.ref1_telefono,
        referencia2_nombre: v.ref2_nombre, referencia2_telefono: v.ref2_telefono, cupo_actual: currentLimit,
        cupo_solicitado: requested, monto_solicitado: requested, estado: 'pendiente', ...docs, created_at: now, updated_at: now
      });
      if (error) throw error;
      const profileUpdate = await client.from('profile').update({ first_name: v.nombre, last_name: v.apellido, cedula: v.cedula, telefono: v.telefono, email: v.correo || user.email, direccion: v.direccion, ciudad: v.ciudad, barrio: v.barrio, estado_credito: 'pendiente', updated_at: now }).eq('id', uid);
      const crmSync = window.SupabaseSync?.syncClienteWeb ? await window.SupabaseSync.syncClienteWeb({
        user_id: uid, nombre: `${v.nombre} ${v.apellido}`.trim(), telefono: v.telefono, email: v.correo || user.email,
        direccion: v.direccion, barrio: v.barrio, ciudad: v.ciudad, cedula: v.cedula, estado_credito: 'pendiente'
      }) : { success: false };
      if (profileUpdate.error && !crmSync.success) console.warn('Solicitud guardada, perfil CRM pendiente de sincronización:', profileUpdate.error.message);
      form.reset();
      say('Solicitud enviada. Queda pendiente de revisión.', true);
    } catch (err) { say(err.message || 'No fue posible enviar la solicitud.'); }
    finally { if (button) button.disabled = false; }
  });
})();
