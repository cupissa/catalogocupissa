window.openModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
};

window.showToast = function(message, type = 'success') {
  const toast = document.createElement('div');
  
  toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-xl shadow-lg text-white text-xs font-bold z-50 transition-all duration-300 ${
    type === 'success' ? 'bg-emerald-600' : 'bg-red-600'
  }`;
  
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, 3000);
};