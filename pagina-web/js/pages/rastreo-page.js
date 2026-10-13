document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  generateMathCaptcha();
  if (typeof window.updateUserAuthUI === 'function') window.updateUserAuthUI();
});