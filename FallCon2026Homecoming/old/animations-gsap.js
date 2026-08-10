/* ============================================================================
   FallCon 2026 — Homecoming · GSAP scroll-driven build
   Single animation entry file. GSAP 3 + ScrollTrigger + Lenis.
   Plugins are registered ONCE here. No other file touches GSAP.
   ============================================================================ */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Boot guard — wait for full load (fonts/images affect trigger positions),
  // then two rAFs so the DCLogic runtime has finished its initial mount.
  // --------------------------------------------------------------------------
  if (document.readyState !== 'loading') boot();
  else document.addEventListener('DOMContentLoaded', boot, { once: true });

  function boot() {
    // The DCLogic runtime replaces <x-dc> with #dc-root asynchronously. If we
    // grab elements before that swap, every trigger points at detached nodes.
    // Poll briefly for the mounted tree; fall back after 4s so a runtime
    // failure still leaves a working (static) page.
    const t0 = performance.now();
    (function waitForMount() {
      if (document.querySelector('#dc-root section') || performance.now() - t0 > 4000) {
        requestAnimationFrame(() => requestAnimationFrame(init));
      } else {
        requestAnimationFrame(waitForMount);
      }
    })();
  }

  function init() {
    if (!window.gsap || !window.ScrollTrigger) return; // CDN failed → static page, everything already visible

    // ------------------------------------------------------------------------
    // Reduced motion: render final state instantly. Template styles ARE the
    // final state (we only gsap.set initial states below), so we simply bail.
    // ------------------------------------------------------------------------
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.registerPlugin(ScrollTrigger); // registered once, here only
    gsap.defaults({ ease: 'power2.out', duration: 0.9 }); // house style: power2.out, 0.6–1.2s

    // ------------------------------------------------------------------------
    // Lenis smooth scroll, synced to ScrollTrigger via the gsap.ticker pattern
    // ------------------------------------------------------------------------
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Anchor links → Lenis (native jump would fight the smoother)
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const target = document.querySelector(a.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -70 });
      });
    });

    // Helper: mark will-change during a tween, clear it after (used sparingly)
    const wc = (els) => ({
      onStart() { gsap.set(els, { willChange: 'transform, opacity' }); },
      onComplete() { gsap.set(els, { willChange: 'auto' }); }
    });

    const mm = gsap.matchMedia();

    // ==========================================================================
    // DESKTOP ≥ 768px — full motion system
    // ==========================================================================
    mm.add('(min-width: 768px)', () => {

      // ----------------------------------------------------------------------
      // 0 · NAV — one-time load fade (no scroll animation)
      // ----------------------------------------------------------------------
      gsap.from('.fc-nav', { autoAlpha: 0, y: -16, duration: 0.6, delay: 0.1 });

      // ----------------------------------------------------------------------
      // 1 · HERO (#top) — load: headline mask reveal · scroll: pinned scrub
      //     (video scales up + content parallaxes away while pinned)
      // ----------------------------------------------------------------------
      const heroLines = gsap.utils.toArray('#top h1 > span');
      gsap.set(heroLines, { clipPath: 'inset(0% 0% 100% 0%)', yPercent: 30 });
      gsap.timeline({ delay: 0.15 })
        .to(heroLines, {
          clipPath: 'inset(0% 0% -10% 0%)', yPercent: 0,
          duration: 1.1, stagger: 0.12, ...wc(heroLines)
        })
        .from('#top p, .fc-hero-cta, .fc-hero-logo, #top [data-reveal]', {
          autoAlpha: 0, y: 28, duration: 0.8, stagger: 0.06
        }, '-=0.6')
        .from('.fc-hero-bar', { yPercent: 100, autoAlpha: 0, duration: 0.8 }, '-=0.5');

      gsap.timeline({
        scrollTrigger: {
          trigger: '#top',
          start: 'top top',
          end: '+=60%',
          pin: true,
          scrub: true,
          anticipatePin: 1
        }
      })
        .to('#fc-hero-bg', { scale: 1.12, transformOrigin: '50% 30%' }, 0)
        .to('.fc-hero-grid', { yPercent: -12, autoAlpha: 0.25 }, 0)
        .to('.fc-hero-bar', { autoAlpha: 0 }, 0.4);

      // ----------------------------------------------------------------------
      // 2 · ORIGIN (#story) — pinned horizontal scroll through the 4 story cards
      //     Arrows are hidden ≥768px (CSS); native carousel remains on mobile.
      // ----------------------------------------------------------------------
      const track = document.querySelector('#story [role="group"]');
      if (track) {
        gsap.set(track, { overflow: 'visible' });           // transform drives it now
        gsap.set('#story', { overflow: 'hidden' });
        const dist = () => track.scrollWidth - window.innerWidth + 48;
        gsap.to(track, {
          x: () => -dist(),
          ease: 'none',
          scrollTrigger: {
            trigger: '#story',
            start: 'top top',
            end: () => '+=' + dist(),                        // 1px of scroll per 1px of travel
            pin: true,
            scrub: true,
            invalidateOnRefresh: true,
            anticipatePin: 1
          }
        });
      }

      // ----------------------------------------------------------------------
      // 3 · MARQUEE — scroll-linked drift layered over the CSS loop
      // ----------------------------------------------------------------------
      const marquee = document.querySelector('#story + div[aria-hidden]');
      if (marquee) {
        gsap.to(marquee.firstElementChild, {
          xPercent: -6, ease: 'none',
          scrollTrigger: { trigger: marquee, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }

      // ----------------------------------------------------------------------
      // 4 · TEASER VIDEO (#video) — heading reveal once · frame scale + parallax
      // ----------------------------------------------------------------------
      revealHeading('#video h2');
      const teaserFrame = document.querySelector('#video wistia-player')?.parentElement;
      if (teaserFrame) {
        gsap.from(teaserFrame, {
          scale: 0.92, autoAlpha: 0, duration: 1.1,
          scrollTrigger: { trigger: teaserFrame, start: 'top 80%', once: true }, ...wc(teaserFrame)
        });
        gsap.to(teaserFrame, {
          yPercent: -6, ease: 'none',
          scrollTrigger: { trigger: '#video', start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }

      // ----------------------------------------------------------------------
      // 5 · CERTIFICATIONS (#certs) — heading once · cards batched
      // ----------------------------------------------------------------------
      revealHeading('#certs h2');
      batchRise('#certs article', 0.1);

      // ----------------------------------------------------------------------
      // 6 · IDOS (#idos) — sticky left column, letter rows highlight as they pass
      // ----------------------------------------------------------------------
      const idosGrid = document.querySelector('#idos > div');
      if (idosGrid && idosGrid.children.length >= 2) {
        const leftCol = idosGrid.children[0];
        const rows = gsap.utils.toArray(idosGrid.children[1].children);
        ScrollTrigger.create({
          trigger: '#idos', start: 'top 15%', end: 'bottom 85%',
          pin: leftCol, pinSpacing: false
        });
        rows.forEach((row) => {
          gsap.fromTo(row, { opacity: 0.3, x: 24 }, {
            opacity: 1, x: 0, ease: 'none',
            scrollTrigger: { trigger: row, start: 'top 80%', end: 'top 45%', scrub: true }
          });
        });
      }

      // ----------------------------------------------------------------------
      // 7 · BADGE BUILDER (#builder) — minimal: header once, shell scale once
      //     (interactive app inside — no pins or scrubs that fight re-renders)
      // ----------------------------------------------------------------------
      revealHeading('#builder h2');
      const shell = document.querySelector('#builder h2')?.closest('div')?.nextElementSibling;
      if (shell) {
        gsap.from(shell, {
          scale: 0.96, autoAlpha: 0, duration: 1,
          scrollTrigger: { trigger: shell, start: 'top 78%', once: true }, ...wc(shell)
        });
      }

      // ----------------------------------------------------------------------
      // 8 · SPEAKERS (#speakers) — keynote image parallax · TBA ghost drift
      // ----------------------------------------------------------------------
      revealHeading('#speakers h2');
      batchRise('#speakers article', 0.08);
      gsap.to('#fc-spk-keynote', {
        yPercent: 8, ease: 'none',
        scrollTrigger: { trigger: '#speakers article', start: 'top bottom', end: 'bottom top', scrub: true }
      });
      const tbaGhost = document.querySelector('#speakers [aria-hidden] span');
      if (tbaGhost) {
        gsap.to(tbaGhost, {
          xPercent: -8, ease: 'none',
          scrollTrigger: { trigger: tbaGhost, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }

      // ----------------------------------------------------------------------
      // 9 · SCHEDULE (#schedule) — bg layer parallax · rows batched per day
      // ----------------------------------------------------------------------
      revealHeading('#schedule h2');
      gsap.to('#fc-sched-bg', {
        yPercent: -10, ease: 'none',
        scrollTrigger: { trigger: '#schedule', start: 'top bottom', end: 'bottom top', scrub: true }
      });
      batchRise('#schedule .fc-day > div > div', 0.04, 24);

      // ----------------------------------------------------------------------
      // 10 · RECAP (#recap) — heading mask once · frame parallax + settle
      // ----------------------------------------------------------------------
      revealHeading('#recap h2');
      const recapFrame = document.querySelector('#recap wistia-player')?.parentElement;
      if (recapFrame) {
        gsap.from(recapFrame, {
          scale: 0.94, autoAlpha: 0, duration: 1.1,
          scrollTrigger: { trigger: recapFrame, start: 'top 80%', once: true }, ...wc(recapFrame)
        });
        gsap.to(recapFrame, {
          yPercent: -8, ease: 'none',
          scrollTrigger: { trigger: '#recap', start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }

      // ----------------------------------------------------------------------
      // 11 · PRICING (#pricing) — price counters animate ONCE on enter · cards batch
      // ----------------------------------------------------------------------
      revealHeading('#pricing h2');
      batchRise('#pricing article', 0.08);
      gsap.utils.toArray('#pricing article').forEach((card) => {
        const priceEl = [...card.children].find((c) => /^\$/.test(c.textContent.trim()));
        if (!priceEl) return;
        const finalText = priceEl.textContent.trim();
        const finalNum = parseInt(finalText.replace(/[^0-9]/g, ''), 10);
        const counter = { v: 0 };
        ScrollTrigger.create({
          trigger: card, start: 'top 75%', once: true,   // once — never on re-pass
          onEnter() {
            gsap.to(counter, {
              v: finalNum, duration: 1.2, ease: 'power2.out',
              onUpdate() { priceEl.textContent = '$' + Math.round(counter.v).toLocaleString(); },
              onComplete() { priceEl.textContent = finalText; }
            });
          }
        });
      });

      // ----------------------------------------------------------------------
      // 12 · LOCATION (#location) — split reveal, photo parallax
      // ----------------------------------------------------------------------
      const locGrid = document.querySelector('#location > div');
      if (locGrid && locGrid.children.length >= 2) {
        const [left, right] = locGrid.children;
        gsap.from(left, { x: -40, autoAlpha: 0, duration: 1, scrollTrigger: { trigger: '#location', start: 'top 75%', once: true } });
        gsap.from(right, { x: 40, autoAlpha: 0, duration: 1, scrollTrigger: { trigger: '#location', start: 'top 75%', once: true } });
        gsap.to('#fc-venue', {
          yPercent: 6, ease: 'none',
          scrollTrigger: { trigger: '#location', start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }

      // ----------------------------------------------------------------------
      // 13 · EXPO (#expo) — heading once · big word drift
      // ----------------------------------------------------------------------
      revealHeading('#expo h2');
      gsap.to('#expo h2', {
        xPercent: 2, ease: 'none',
        scrollTrigger: { trigger: '#expo', start: 'top bottom', end: 'bottom top', scrub: true }
      });

      // ----------------------------------------------------------------------
      // 14 · SPONSORS (#sponsors) — ghost TBA scale scrub · panel content once
      // ----------------------------------------------------------------------
      const wallGhost = document.querySelector('#sponsors [aria-hidden] span');
      if (wallGhost) {
        gsap.fromTo(wallGhost, { scale: 1.15 }, {
          scale: 1, ease: 'none',
          scrollTrigger: { trigger: '#sponsors', start: 'top bottom', end: 'bottom top', scrub: true }
        });
      }
      batchRise('#sponsors h3, #sponsors p, #sponsors a[data-magnetic]', 0.08, 28);

      // ----------------------------------------------------------------------
      // 15 · CLOSER — giant headline settles from 1.06 · crowd bg parallax · CTA pop
      // ----------------------------------------------------------------------
      const closer = document.querySelector('#fc-closer-bg')?.closest('section');
      if (closer) {
        const closerH = closer.querySelector('h2');
        gsap.fromTo(closerH, { scale: 1.06, autoAlpha: 0.4 }, {
          scale: 1, autoAlpha: 1, ease: 'none',
          scrollTrigger: { trigger: closer, start: 'top bottom', end: 'center center', scrub: true }
        });
        gsap.to('#fc-closer-bg', {
          yPercent: 8, ease: 'none',
          scrollTrigger: { trigger: closer, start: 'top bottom', end: 'bottom top', scrub: true }
        });
        gsap.from(closer.querySelector('a[data-magnetic]'), {
          scale: 0.9, autoAlpha: 0, duration: 0.7,
          scrollTrigger: { trigger: closer, start: 'center 70%', once: true }
        });
      }

      // ----------------------------------------------------------------------
      // 16 · FOOTER — curtain uncover is pure CSS (sticky bottom, z-index 0).
      //     GSAP adds a gentle content settle as it appears.
      // ----------------------------------------------------------------------
      gsap.from('footer > div', {
        yPercent: 6, autoAlpha: 0.6, ease: 'none',
        scrollTrigger: { trigger: 'footer', start: 'top 95%', end: 'top 55%', scrub: true }
      });

      // matchMedia cleanup — kill everything this context created
      return () => ScrollTrigger.getAll().forEach((st) => st.kill());
    });

    // ==========================================================================
    // MOBILE < 768px — no pinning, no horizontal scroll, simple fades only
    // ==========================================================================
    mm.add('(max-width: 767px)', () => {
      gsap.from('.fc-nav', { autoAlpha: 0, y: -12, duration: 0.6 });
      const items = gsap.utils.toArray('[data-reveal], #pricing article, #certs article');
      gsap.set(items, { autoAlpha: 0, y: 24 });
      ScrollTrigger.batch(items, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) => gsap.to(batch, {
          autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.06,
          onComplete() { gsap.set(batch, { clearProps: 'transform,willChange' }); }
        })
      });
      return () => ScrollTrigger.getAll().forEach((st) => st.kill());
    });

    // --------------------------------------------------------------------------
    // Shared helpers
    // --------------------------------------------------------------------------

    // Section heading reveal: y-offset line rise, stagger 0.06, once
    function revealHeading(sel) {
      const els = gsap.utils.toArray(sel);
      if (!els.length) return;
      els.forEach((h) => {
        const eyebrow = h.previousElementSibling;
        const targets = [eyebrow, h, h.nextElementSibling].filter(Boolean);
        gsap.set(targets, { autoAlpha: 0, y: 36 });
        ScrollTrigger.create({
          trigger: h, start: 'top 80%', once: true,
          onEnter: () => gsap.to(targets, {
            autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.06,
            onComplete() { gsap.set(targets, { clearProps: 'transform,willChange' }); }
          })
        });
      });
    }

    // Batched card/row rises — one batch call instead of per-element triggers
    function batchRise(sel, stagger, dist) {
      const els = gsap.utils.toArray(sel);
      if (!els.length) return;
      gsap.set(els, { autoAlpha: 0, y: dist || 48 });
      ScrollTrigger.batch(els, {
        start: 'top 85%',
        once: true,
        onEnter: (batch) => gsap.to(batch, {
          autoAlpha: 1, y: 0, duration: 0.8, stagger: stagger || 0.08,
          onComplete() { gsap.set(batch, { clearProps: 'transform,willChange' }); }
        })
      });
    }

    // --------------------------------------------------------------------------
    // Runtime resilience: the DCLogic app re-renders on builder interaction,
    // which recomputes inline styles from the template. Completed once-tweens
    // end at template values so nothing visibly breaks; scrubbed tweens re-
    // apply on the next scroll tick. We still refresh trigger positions after
    // interaction bursts, and on unload we kill cleanly.
    // --------------------------------------------------------------------------
    // Trigger positions shift as videos/images finish loading — re-measure once.
    window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

    let refreshT;
    document.getElementById('builder')?.addEventListener('click', () => {
      clearTimeout(refreshT);
      refreshT = setTimeout(() => ScrollTrigger.refresh(), 350);
    });
    window.addEventListener('pagehide', () => {
      ScrollTrigger.getAll().forEach((st) => st.kill());
      gsap.ticker.remove(lenis.raf);
      lenis.destroy();
    }, { once: true });
  }
})();
