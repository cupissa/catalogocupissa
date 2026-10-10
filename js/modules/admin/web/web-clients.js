/**
 * js/modules/admin/web/web-clients.js
 * Directorio Exclusivo de Usuarios Registrados en la Web (Tabla 'profile')
 */

window.webClientsCache = [];

window.cargarClientesWeb = async function() {
  const tbody = document.getElementById('tabla-clientes-web');
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="6" class="py-8 text-center text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-lg mb-2"></i>
        <p>Cargando perfiles registrados en la web desde Supabase ('profile')...</p>
      </td>
    </tr>
  `;

  try {
    const [perfiles, pedidos] = await Promise.all([
      SupabaseSync.getProfilesWeb(),
      SupabaseSync.getPedidos()
    ]);

    window.webClientsCache = (perfiles || []).map(cli => {
      const pedsCliente = (pedidos || []).filter(p =>
        p.cliente_id === cli.id ||
        p.user_id === cli.id ||
        (p.cliente_email && cli.email && p.cliente_email.toLowerCase() === cli.email.toLowerCase())
      );

      const totalComprado = pedsCliente.reduce((acc, p) => acc + window.parseMonto(p.total || 0), 0);
      const saldoDeuda = pedsCliente.reduce((acc, p) => {
        const tot = window.parseMonto(p.total || 0);
        const pag = window.parseMonto(p.pagado !== undefined ? p.pagado : p.anticipo || 0);
        return acc + Math.max(0, tot - pag);
      }, 0);

      return {
        ...cli,
        pedidosCount: pedsCliente.length,
        totalComprado,
        saldoDeuda,
        pedidos: pedsCliente
      };
    });

    window.renderizarTablaClientesWeb(window.webClientsCache);
  } catch (err) {
    console.error("Error al cargar perfiles web:", err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-6 text-center text-rose-500 font-bold">
          Error al consultar la tabla profile.
        </td>
      </tr>
    `;
  }
};

window.renderizarTablaClientesWeb = function(lista) {
  const tbody = document.getElementById('tabla-clientes-web');
  if (!tbody) return;

  if (!lista || lista.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="py-8 text-center text-slate-400 font-bold">
          No hay perfiles de usuario web registrados.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map(c => {
    const nombreComp = `${c.first_name || c.nombre || 'Cliente Web'} ${c.last_name || ''}`.trim();
    const cupoAprobado = window.parseMonto(c.cupo_credito || 0);
    const estadoCredito = c.estado_credito || 'sin_solicitud';

    let badgeCredito = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">Sin Crédito</span>`;
    if (estadoCredito === 'aprobado') {
      badgeCredito = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800">Aprobado ($${window.formatMoneda(cupoAprobado)})</span>`;
    } else if (estadoCredito === 'pendiente') {
      badgeCredito = `<span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800 animate-pulse">Por Aprobar</span>`;
    }

    return `
      <tr class="border-b hover:bg-slate-50/80 transition-colors text-xs">
        <td class="p-3">
          <div class="font-bold text-slate-900">${nombreComp}</div>
          <div class="text-[10px] text-slate-400">${c.email || 'Sin correo'}</div>
        </td>
        <td class="p-3 text-xs">
          <div><i class="fa-solid fa-phone text-indigo-500 mr-1"></i> ${c.telefono || c.phone || 'N/A'}</div>
          <div class="text-[10px] text-slate-500"><i class="fa-solid fa-location-dot text-slate-400 mr-1"></i> ${c.direccion || c.city || 'Barranquilla'}</div>
        </td>
        <td class="p-3 text-center font-bold text-indigo-700">
          ${c.pedidosCount}
        </td>
        <td class="p-3">
          <div class="font-black text-emerald-600">$${window.formatMoneda(c.totalComprado)}</div>
          ${c.saldoDeuda > 0 ? `<div class="text-[10px] font-bold text-red-600">Debe: $${window.formatMoneda(c.saldoDeuda)}</div>` : ''}
        </td>
        <td class="p-3">
          ${badgeCredito}
        </td>
        <td class="p-3 text-right">
          <button onclick="verDetalleClienteWeb('${c.id}')" class="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 ml-auto">
            <i class="fa-solid fa-user-gear"></i> Ficha 360°
          </button>
        </td>
      </tr>
    `;
  }).join('');
};