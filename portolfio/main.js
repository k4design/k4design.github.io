/* ============================================================
   Kyle Foreman — classic page (index.html) only

   Scroll reveal via IntersectionObserver. The GSAP page
   (scroll.html) does NOT load this file — animations.js owns
   reveals there, and running both would double-animate.

   Project data, the case study viewer, the curtain and the
   hover preview all live in case-study.js, shared by both pages.
   ============================================================ */

(function () {
  'use strict';

  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  );

  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.transitionDelay = `${Math.min(i % 6, 4) * 60}ms`;
    io.observe(el);
  });
})();
