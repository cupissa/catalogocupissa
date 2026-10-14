(function(){
 const $=id=>document.getElementById(id), db=()=>window.supabaseClient||window.supabase;
 const fmt=n=>'$'+Number(n||0).toLocaleString('es-CO',{maximumFractionDigits:0})+' COP';
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let credits=[], user=null;
 const activeCredits=()=>credits.filter(x=>Number(x.saldo_pendiente||0)>0 && !['pagado','cerrado','cancelado','rechazado'].includes(String(x.estado||'').toLowerCase()));
 const debt=()=>activeCredits().reduce((s,x)=>s+Number(x.saldo_pendiente||0),0);
 const minimum=()=>activeCredits().reduce((s,x)=>s+Math.min(Number(x.valor_cuota||0),Number(x.saldo_pendiente||0)),0);
 function updateAmount(){const type=document.querySelector('[name="payChoice"]:checked')?.value; $('selectedAmount').textContent=type?fmt(type==='total'?debt():minimum()):'Selecciona una opción';$('paySubmit').disabled=!type||debt()<=0;}
 async function init(){const c=db();if(!c)throw Error('No se pudo conectar con la cuenta. Intenta recargar la página.');const {data:{session}}=await c.auth.getSession();user=session?.user;if(!user){$('portalMessage').innerHTML='Debes iniciar sesión para acceder al portal de pagos. <a href="index.html" class="font-bold text-brand-600">Ir al inicio e ingresar</a>.';$('portalPanel').classList.add('hidden');return;}
 const {data,error}=await c.from('creditos_cupissa_cuentas').select('*').eq('user_id',user.id).order('created_at',{ascending:false});if(error)throw error;credits=data||[];
 $('debtTotal').textContent=fmt(debt());$('minimumValue').textContent=fmt(minimum());$('fullValue').textContent=fmt(debt());
 $('creditList').innerHTML=credits.length?credits.map(x=>`<div class="flex items-center justify-between gap-4 border-b border-gray-100 py-3 last:border-0 dark:border-gray-700"><div><p class="font-bold">${esc(x.frecuencia||'Crédito Cupissa')}</p><p class="text-xs text-gray-500 dark:text-gray-400">${esc(x.estado||'Estado pendiente')} · Cuota: ${fmt(x.valor_cuota)}</p></div><b>${fmt(x.saldo_pendiente)}</b></div>`).join(''):'<p class="text-sm text-gray-500">No hay créditos registrados en tu cuenta.</p>';
 if(debt()<=0){$('payOptions').classList.add('hidden');$('noDebt').classList.remove('hidden');}else{$('payOptions').classList.remove('hidden');$('noDebt').classList.add('hidden');}
 $('portalPanel').classList.remove('hidden');$('portalMessage').textContent='Selecciona una modalidad de pago para continuar.';updateAmount();
 }
 document.querySelectorAll('[name="payChoice"]').forEach(r=>r.addEventListener('change',updateAmount));
 $('portalPayForm').addEventListener('submit',e=>{e.preventDefault();const type=document.querySelector('[name="payChoice"]:checked')?.value;if(!type){$('portalMessage').textContent='Selecciona cuota mínima o pago completo antes de continuar.';return;}if(!debt())return;location.href='pagar-cuota.html?modo='+encodeURIComponent(type);});
 init().catch(e=>{$('portalMessage').textContent=e.message;$('portalMessage').className='mb-4 text-sm text-red-600';});
})();
