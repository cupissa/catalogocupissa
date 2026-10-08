function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  
  toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded shadow-lg text-white font-medium z-50 transition-opacity duration-300 ${
    type === 'success' ? 'bg-green-500' : 'bg-red-600'
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
}