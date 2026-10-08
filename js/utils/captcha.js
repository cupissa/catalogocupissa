function generateMathCaptcha() {
  const num1 = Math.floor(Math.random() * 10) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;
  
  mathCaptchaAnswer = num1 + num2;
  
  const questionEl = document.getElementById('mathCaptchaQuestion');
  const inputEl = document.getElementById('mathCaptchaInput');
  
  if (questionEl) {
    questionEl.textContent = `${num1} + ${num2} = ?`;
  }
  
  if (inputEl) {
    inputEl.value = '';
  }
} 