/* Flujo de caja: lectura y escritura de la tabla existente flujo_caja. */
(function(){
 const $=id=>document.getElementById(id);
 const money=n=>'$'+Number(n||0).toLocaleString('es-CO',{maximumFractionDigits:2})+' COP';
 const parse=v=>{if(typeof v==='number')return v;const n=Number(String(v??'0').replace(/[^0-9,.-]/g,'').replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.'));return Number.isFinite(n)?n:0;};
 const db=()=>{const c=window.supabaseClient||window.supabase;if(!c)throw new Error('No se ha podido conectar. Intenta nuevamente.');return c;};
 window.cargarContabilidad=async function(){
  const body=$('tabla-caja-historial');if(!body)return;body.innerHTML='<tr><td colspan="6" class="p-4 text-center">Cargando movimientos…</td></tr>';
  try{const {data,error}=await db().from('flujo_caja').select('*').order('fecha',{ascending:false,nullsFirst:false});if(error)throw error;const allRows=data||[];let rows=[...allRows];const metodo=$('filtro-metodo-caja')?.value||'todos',q=($('buscador-caja')?.value||'').toLowerCase().trim();if(metodo!=='todos')rows=rows.filter(r=>(r.metodo_pago||r.metodo||'').toLowerCase()===metodo.toLowerCase());if(q){const getText=r=>`${r.concepto||''} ${r.tercero||''} ${r.descripcion||''} ${r.tipo||''} ${r.metodo_pago||r.metodo||''}`;if(window.CupissaSearch){const ranked=window.CupissaSearch.rank(rows,q,getText,.25);rows=ranked.length?ranked:window.CupissaSearch.rank(rows,q,getText,0).slice(0,10);}else rows=rows.filter(r=>getText(r).toLowerCase().includes(q));}
   body.innerHTML=rows.length?rows.map(r=>{const m=String(r.metodo_pago||r.metodo||'Efectivo'),tipo=String(r.tipo||'INGRESO').toUpperCase(),valor=parse(r.valor??r.monto),tax=(tipo==='EGRESO'&&m.toLowerCase()==='nequi')?Number((valor*.004).toFixed(2)):0;return `<tr><td>${r.fecha||'—'}</td><td>${tipo}</td><td>${escapeHtml(r.concepto||'')}<br><span class="text-slate-400">${escapeHtml(r.tercero||r.descripcion||'')}</span></td><td>${escapeHtml(m)}</td><td>${money(valor)}</td><td>${money(tax)}</td></tr>`}).join(''):'<tr><td colspan="6" class="p-5 text-center text-slate-400">No hay movimientos que coincidan.</td></tr>';
   const efectivo=allRows.reduce((a,r)=>{const v=parse(r.valor??r.monto);return (r.metodo_pago||r.metodo||'').toLowerCase()==='efectivo'?a+((String(r.tipo).toUpperCase()==='INGRESO')?v:-v):a},0);
   const bancos=allRows.reduce((a,r)=>{const v=parse(r.valor??r.monto),m=(r.metodo_pago||r.metodo||'').toLowerCase(),ing=String(r.tipo).toUpperCase()==='INGRESO';if(m==='efectivo'||!m)return a;return a+(ing?v:-(v+((m==='nequi')?v*.004:0)))},0);
   if($('bal-efectivo'))$('bal-efectivo').textContent=money(efectivo);if($('bal-bancos'))$('bal-bancos').textContent=money(bancos);if($('bal-4x1000'))$('bal-4x1000').textContent=money(allRows.reduce((a,r)=>a+(String(r.tipo).toUpperCase()==='EGRESO'&&(r.metodo_pago||r.metodo||'').toLowerCase()==='nequi'?parse(r.valor??r.monto)*.004:0),0));
  }catch(e){console.error('Flujo de caja:',e);body.innerHTML=`<tr><td colspan="6" class="p-4 text-center text-red-600">No se pudieron cargar los movimientos: ${escapeHtml(e.message)}</td></tr>`;}
 };
 function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
 window.initFormularioCajaManual=function(){const form=$('form-caja-manual');if(!form||form.dataset.ready)return;form.dataset.ready='1';const date=$('caja-fecha');if(date&&!date.value)date.value=new Date().toISOString().slice(0,10);form.addEventListener('submit',async e=>{e.preventDefault();try{const tipo=String($('caja-tipo')?.value||'INGRESO').toUpperCase(),metodo=$('caja-metodo')?.value||'Efectivo',valor=parse($('caja-valor')?.value);if(valor<=0)throw new Error('Ingresa un valor mayor que cero.');const impuesto=(tipo==='EGRESO'&&metodo.toLowerCase()==='nequi')?Number((valor*.004).toFixed(2)):0;const row={fecha:$('caja-fecha')?.value||new Date().toISOString().slice(0,10),tipo,concepto:$('caja-concepto')?.value||'',tercero:$('caja-tercero')?.value||'',metodo_pago:metodo,valor,descripcion:$('caja-desc')?.value||'',impuesto_4x1000:impuesto};const {error}=await db().from('flujo_caja').insert(row);if(error)throw error;form.reset();if(date)date.value=new Date().toISOString().slice(0,10);window.showToast?.('Movimiento guardado.');await window.cargarContabilidad();}catch(err){console.error(err);window.showToast?.('No se pudo guardar el movimiento: '+err.message,'error');}});};
})();

// Actualización en vivo de caja: evita recargar la página para ver cambios de otros usuarios.
(function subscribeCashRealtime(){
 const c=window.supabaseClient||window.supabase;
 if(!c||window.__cupissaCashRealtime)return;window.__cupissaCashRealtime=true;
 c.channel('cupissa-flujo-caja-live').on('postgres_changes',{event:'*',schema:'public',table:'flujo_caja'},()=>{
   if(!document.getElementById('tab-contabilidad')?.classList.contains('hidden')) window.cargarContabilidad?.();
 }).subscribe();
})();
