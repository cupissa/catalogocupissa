/**
 * Renderiza e inyecta el footer global unificado para todas las páginas
 */
export function initFooter() {
  const footerContainer = document.getElementById('app-footer') || document.querySelector('footer');
  if (!footerContainer) return;

  const currentYear = new Date().getFullYear();

  footerContainer.innerHTML = `
    <div class="footer-container">
      <div class="footer-brand">
        <img src="images/logo.png" alt="CUPISSA Logo" class="footer-logo">
        <p>Estudio Creativo CUPISSA — Diseños personalizados y productos exclusivos.</p>
      </div>

      <div class="footer-section">
        <h4>Navegación</h4>
        <ul>
          <li><a href="index.html">Inicio</a></li>
          <li><a href="catalogo.html">Catálogo de Productos</a></li>
          <li><a href="rastreo.html">Rastrea tu Envío</a></li>
        </ul>
      </div>

      <div class="footer-section">
        <h4>Atención al Cliente</h4>
        <p>¿Tienes dudas con tu pedido personalizado?</p>
        <a href="https://wa.me/" target="_blank" rel="noopener" class="footer-contact-link">Contactar por WhatsApp</a>
      </div>
    </div>
    
    <div class="footer-bottom">
      <p>&copy; ${currentYear} CUPISSA. Todos los derechos reservados.</p>
    </div>
  `;
}