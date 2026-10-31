// Small interactions for the template: smooth anchor navigation and a demo CTA response.
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

document.querySelectorAll('.nav-cta, .button-dark').forEach((button) => {
  button.addEventListener('click', () => {
    const toast = document.querySelector('.toast');
    toast.textContent = 'You’re exploring the AeroVision X4 demo template.';
    toast.classList.add('show');
    window.setTimeout(() => toast.classList.remove('show'), 2200);
  });
});
