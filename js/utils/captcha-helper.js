/**
 * js/utils/captcha-helper.js / captcha.js
 * Generador de CAPTCHA Gráfico en Canvas y CAPTCHA Matemático Fallback
 */

window.currentCaptchaCode = '';
window.currentMathCaptchaAnswer = 0;

/**
 * Genera un código CAPTCHA visual en un elemento <canvas id="captchaCanvas">
 */
window.generateVisualCaptcha = function(canvasId = 'captchaCanvas') {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Limpiar lienzo
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fondo dinámico
  const isDark = document.documentElement.classList.contains('dark');
  ctx.fillStyle = isDark ? '#374151' : '#f3f4f6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Generar código alfanumérico aleatorio (5 caracteres excluyendo ambiguos)
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  window.currentCaptchaCode = code;

  // Dibujar líneas de distorsión
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = isDark ? 'rgba(244, 114, 182, 0.4)' : 'rgba(219, 39, 119, 0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
    ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
    ctx.stroke();
  }

  // Dibujar puntos de ruido
  for (let i = 0; i < 30; i++) {
    ctx.fillStyle = isDark ? '#9ca3af' : '#6b7280';
    ctx.beginPath();
    ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dibujar caracteres con rotación y color
  ctx.font = 'bold 22px sans-serif';
  ctx.textBaseline = 'middle';

  const startX = 15;
  const spacing = 28;

  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const angle = (Math.random() - 0.5) * 0.4; // Rotación aleatoria

    ctx.save();
    ctx.translate(startX + i * spacing, canvas.height / 2);
    ctx.rotate(angle);

    ctx.fillStyle = isDark ? '#f472b6' : '#db2777';
    ctx.fillText(char, 0, 0);

    ctx.restore();
  }
};

/**
 * Valida el código ingresado por el usuario con el CAPTCHA visual generado
 */
window.validateVisualCaptcha = function(inputCode) {
  if (!inputCode || !window.currentCaptchaCode) return false;
  return inputCode.trim().toUpperCase() === window.currentCaptchaCode.toUpperCase();
};

/**
 * Genera un CAPTCHA matemático simple como opción alternativa
 */
window.generateMathCaptcha = function() {
  const num1 = Math.floor(Math.random() * 9) + 1;
  const num2 = Math.floor(Math.random() * 9) + 1;
  
  window.currentMathCaptchaAnswer = num1 + num2;
  
  const questionEl = document.getElementById('mathCaptchaQuestion');
  const inputEl = document.getElementById('mathCaptchaInput');
  
  if (questionEl) {
    questionEl.textContent = `${num1} + ${num2} = ?`;
  }
  
  if (inputEl) {
    inputEl.value = '';
  }
};

// Evento para regenerar el canvas al hacer clic sobre él
document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('captchaCanvas');
  if (canvas) {
    canvas.addEventListener('click', () => window.generateVisualCaptcha());
  }
});