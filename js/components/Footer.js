class CupissaFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer class="bg-[#0b1329] text-gray-300 mt-12 border-t border-gray-800 text-xs">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            <div class="space-y-3">
              <img src="images/logo.png" alt="CUPISSA S.A.S." class="h-8 w-auto object-contain">
              <p class="text-gray-400 text-xs leading-relaxed">
                Ecosistema integral de comercio, alquiler, fabricación a medida y crédito directo en Barranquilla, Colombia.
              </p>
            </div>
            <div class="space-y-2">
              <h4 class="text-white font-bold mb-3">Atención al Cliente</h4>
              <p class="text-gray-400"><i class="fa-solid fa-envelope text-blue-400 mr-2"></i>contacto@cupissa.com</p>
              <p class="text-gray-400"><i class="fa-solid fa-phone text-pink-500 mr-2"></i>WhatsApp: 3147671380</p>
              <p class="text-gray-400"><i class="fa-solid fa-clock text-amber-400 mr-2"></i>Recepción 24 Horas</p>
            </div>
            <div class="space-y-2">
              <h4 class="text-white font-bold mb-3">Términos y Políticas</h4>
              <ul class="space-y-1.5 text-gray-400">
                <li><a href="#" class="hover:text-white">Políticas de Anticipos</a></li>
                <li><a href="#" class="hover:text-white">Términos Crédito Cupissa</a></li>
                <li><a href="#" class="hover:text-white">Tratamiento de Datos</a></li>
              </ul>
            </div>
            <div class="space-y-2">
              <h4 class="text-white font-bold mb-3">Medios de Pago</h4>
              <ul class="space-y-2 text-gray-400">
                <li><i class="fa-solid fa-mobile-screen-button text-purple-400 mr-2"></i>NEQUI / DAVIPLATA</li>
                <li><i class="fa-solid fa-credit-card text-emerald-400 mr-2"></i>WOMPI</li>
                <li><i class="fa-solid fa-bolt text-amber-400 mr-2"></i>ADDI</li>
                <li><i class="fa-solid fa-shield-halved text-pink-500 mr-2"></i>CRÉDITOS CUPISSA</li>
              </ul>
            </div>
          </div>
          <div class="border-t border-gray-800/80 mt-10 pt-6 flex flex-col md:flex-row justify-between items-center text-gray-500 gap-4">
            <p>&copy; 2026 CUPISSA S.A.S. Todos los derechos reservados.</p>
            <p>Barranquilla, Atlántico, Colombia</p>
          </div>
        </div>
      </footer>
    `;
  }
}
customElements.define('cupissa-footer', CupissaFooter);