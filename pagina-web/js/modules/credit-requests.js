/* Solicitudes de cupo Crédito Cupissa vinculadas al perfil autenticado. */
(function(){
 const $=id=>document.getElementById(id);
 window.openCreditRequestModal=function(){const m=$('creditRequestModal');if(m){m.classList.remove('hidden');m.classList.add('flex');}};
 window.closeCreditRequestModal=function(){const m=$('creditRequestModal');if(m){m.classList.add('hidden');m.classList.remove('flex');}};
 document.addEventListener('submit',async e=>{
  const form=e.target;if(form?.id!=='creditRequestForm')return;e.preventDefault();
  const button=form.querySelector('button[type="submit"]'),message=$('creditRequestMessage');if(button)button.disabled=true;
  try{
   const db=window.supabaseClient||window.supabase;if(!db)throw new Error('No hay conexión con Supabase.');
   const {data:{session}}=await db.auth.getSession();if(!session?.user)throw new Error('Inicia sesión o regístrate antes de solicitar tu cupo.');
   const v=Object.fromEntries(new FormData(form).entries());
   const payload={user_id:session.user.id,email:v.correo,first_name:v.nombre,last_name:v.apellido,cedula:v.cedula,telefono:v.telefono,referencia1_nombre:v.ref1_nombre,referencia1_telefono:v.ref1_telefono,referencia2_nombre:v.ref2_nombre,referencia2_telefono:v.ref2_telefono,estado:'pendiente'};
   const {error}=await db.from('solicitudes_credito_cupissa').insert(payload);if(error)throw error;
   await db.from('profile').update({first_name:v.nombre,last_name:v.apellido,email:v.correo,cedula:v.cedula,telefono:v.telefono,estado_credito:'pendiente',updated_at:new Date().toISOString()}).eq('id',session.user.id);
   form.reset();message.textContent='Tu cupo ha sido solicitado. Queda pendiente la aprobación de la cantidad por parte de Créditos Cupissa.';message.classList.remove('hidden','text-red-600');message.classList.add('text-emerald-700');
  }catch(err){message.textContent=err.message||'No fue posible enviar la solicitud.';message.classList.remove('hidden','text-emerald-700');message.classList.add('text-red-600');}
  finally{if(button)button.disabled=false;}
 });
})();
