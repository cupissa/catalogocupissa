(function(){
 const $=id=>document.getElementById(id),db=()=>window.supabaseClient||window.supabase,fmt=n=>'$'+Number(n||0).toLocaleString('es-CO',{maximumFractionDigits:0})+' COP';
 let c,user,credits=[],single=false;
 const mode=()=>new URLSearchParams(location.search).get('modo')||'minimo';
 const active=()=>credits.filter(x=>Number(x.saldo_pendiente||0)>0&&!['pagado','cerrado','cancelado','rechazado'].includes(String(x.estado||'').toLowerCase()));
 const balance=()=>active().reduce((s,x)=>s+Number(x.saldo_pendiente||0),0);
 const minimum=()=>active().reduce((s,x)=>s+Math.min(Number(x.valor_cuota||0),Number(x.saldo_pendiente||0)),0);
 function amount(){return mode()==='total'?balance():minimum();}
 function message(t,bad=false){$('payMessage').textContent=t;$('payMessage').className='text-sm '+(bad?'text-red-600':'text-gray-600 dark:text-gray-300');}
 function render(){const total=balance(),min=minimum();$('payBalance').textContent=fmt(total);$('payDue').textContent=credits.map(x=>x.proxima_cuota||x.fecha_primera_cuota).filter(Boolean).sort()[0]||'Por confirmar';$('payMinimum').textContent=fmt(min);$('payTotal').textContent=fmt(total);$('selectedAmount').textContent=fmt(amount());document.querySelectorAll('[name="payType"]').forEach(r=>r.checked=r.value===mode());$('payHeading').textContent=mode()==='total'?'Pago completo de tu deuda':'Pago de cuota mínima';$('paySummaryLabel').textContent=mode()==='total'?'Total a liquidar':'Total de cuotas mínimas';}
 async function init(){c=db();if(!c)throw Error('No se pudo conectar con la cuenta.');const {data:{session}}=await c.auth.getSession();user=session?.user;if(!user){message('Inicia sesión para consultar y pagar tus cuotas.',true);$('payForm').querySelector('button').disabled=true;return;}
 const id=new URLSearchParams(location.search).get('credito');if(id){single=true;const {data,error}=await c.from('creditos_cupissa_cuentas').select('*').eq('id',id).eq('user_id',user.id).maybeSingle();if(error)throw error;if(!data)throw Error('No se encontró el crédito para esta cuenta.');credits=[data];}else{const {data,error}=await c.from('creditos_cupissa_cuentas').select('*').eq('user_id',user.id).order('created_at',{ascending:false});if(error)throw error;credits=data||[];}
 if(!active().length)throw Error('No hay deuda pendiente para pagar.');render();message('Revisa el valor antes de continuar.');}
 document.querySelectorAll('[name="payType"]').forEach(r=>r.addEventListener('change',()=>{const u=new URL(location.href);u.searchParams.set('modo',r.value);history.replaceState({},'',u);render();}));
 $('payForm').addEventListener('submit',e=>{e.preventDefault();if(!user||!active().length)return;const value=amount();if(value<=0){message('No hay un saldo pendiente para pagar.',true);return;}const next=new URL('pasarela-pago.html',location.href);next.searchParams.set('tipo','deuda');next.searchParams.set('modo',mode());next.searchParams.set('valor',String(Math.round(value)));location.href=next.href;});
 init().catch(e=>message(e.message,true));
})();
