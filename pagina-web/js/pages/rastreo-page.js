const initializeTrackingView = () => {
  if (typeof window.initTheme === 'function') window.initTheme();
  if (typeof window.generateMathCaptcha === 'function') window.generateMathCaptcha();
  if (typeof window.updateUserAuthUI === 'function') window.updateUserAuthUI();
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeTrackingView, { once: true });
else initializeTrackingView();
