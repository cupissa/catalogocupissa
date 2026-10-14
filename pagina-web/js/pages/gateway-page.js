(function(){
 const p=new URLSearchParams(location.search);
 const money=n=>'$'+Number(n||0).toLocaleString('es-CO',{maximumFractionDigits:0})+' COP';
 const code=p.get('codigo')||'No disponible';
 const orderId=p.get('pedido');
 const value=Number(p.get('valor')||0);
 const mode=p.get('modo');
 document.getElementById('gatewayCode').textContent=mode?(mode==='total'?'Pago total de deuda':'Pago de cuota mínima'):code;
 document.getElementById('gatewayAmount').textContent=money(value||p.get('valor'));
 const status=document.getElementById('gatewayStatus');
 if(mode){const label=document.getElementById('gatewayAmountLabel');if(label)label.textContent='Valor seleccionado';status.textContent='Tu pago está preparado y quedará pendiente de confirmación.';}
 else status.textContent=orderId?'Pedido registrado. El pago quedará pendiente de confirmación.':'Para pagar una compra, inicia el proceso desde el carrito.';
})();
