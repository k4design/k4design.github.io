/* LPT Lofty shared JS – scroll animations + form (run once per page) */
(function() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    document.querySelectorAll('.fade-up, .stagger-container').forEach(function(el) { el.classList.add('animate-in'); });
    return;
  }
  const observer = new IntersectionObserver(function(entries) {
    entries.forEach(function(entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '0px 0px -80px 0px', threshold: 0.1 });
  document.querySelectorAll('.fade-up, .stagger-container').forEach(function(el) { observer.observe(el); });
})();
function lptBindForm(formId) {
  var form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    if (!form.checkValidity()) return;
    form.reset();
  });
}
