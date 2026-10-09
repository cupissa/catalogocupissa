import { supabase } from '../config/supabase.js';

/**
 * Renderiza el header unificado e inicializa la gestión del usuario y el tema
 */
export async function initHeader() {
  const headerContainer = document.getElementById('app-header') || document.querySelector('header');
  if (!headerContainer) return;

  headerContainer.innerHTML = `
    <div class="header-container">
      <a href="index.html" class="logo-link">
        <img src="images/logo.png" alt="CUPISSA Logo" class="brand-logo">
      </a>
      <nav class="main-nav">
        <ul>
          <li><a href="index.html">Inicio</a></li>
          <li><a href="catalogo.html">Catálogo</a></li>
          <li><a href="rastreo.html">Rastrear Pedido</a></li>
        </ul>
      </nav>
      <div class="header-actions">
        <button id="theme-toggle" class="theme-toggle-btn" aria-label="Cambiar modo de color">
          <span class="theme-icon">🌙</span>
        </button>
        <div id="user-auth-slot" class="auth-slot">
          <!-- Se actualiza dinámicamente según la sesión -->
        </div>
      </div>
    </div>
  `;

  await syncHeaderAuthState();
}

/**
 * Verifica la sesión en Supabase y reemplaza el botón "Ingresar" por el nombre del usuario si está autenticado
 */
export async function syncHeaderAuthState() {
  const authSlot = document.getElementById('user-auth-slot');
  if (!authSlot) return;

  const { data: { session } } = await supabase.auth.getSession();

  if (session && session.user) {
    const displayName = session.user.user_metadata?.full_name 
      || session.user.user_metadata?.nombre 
      || session.user.email.split('@')[0];

    authSlot.innerHTML = `
      <div class="user-profile-menu">
        <span class="user-greeting">Hola, <strong>${displayName}</strong></span>
        <button id="logout-btn" class="btn-logout">Cerrar Sesión</button>
      </div>
    `;

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await supabase.auth.signOut();
      window.location.reload();
    });
  } else {
    authSlot.innerHTML = `
      <button id="open-login-modal" class="btn-login">Ingresar</button>
    `;

    document.getElementById('open-login-modal')?.addEventListener('click', () => {
      const authModal = document.getElementById('auth-modal');
      if (authModal) {
        authModal.classList.add('active');
      }
    });
  }
}