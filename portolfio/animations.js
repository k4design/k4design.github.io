/* ============================================================
   Kyle Foreman — scroll animation entry point
   GSAP 3 + ScrollTrigger + SplitText, smooth scroll via Lenis.

   This is the ONLY file that registers plugins or creates
   ScrollTriggers. Every trigger below is grouped and commented by
   the page section it belongs to.

   Structure:
     - TUNING          knobs you can safely edit
     - Guards          bail out cleanly if a CDN failed
     - buildAll()      runs once fonts are measured
         Context A     prefers-reduced-motion: reduce
         Context B     motion allowed, every viewport
         Context C     motion allowed, >= 1024px only (pins, x-scroll)
   ============================================================ */

(function () {
  'use strict';

  /* ============================================================
     TUNING — the knobs
     ============================================================ */
  const T = {
    ease: 'power2.out',
    easeLinear: 'none',

    // Entrance reveals
    revealDur: 0.9,        // fade + rise duration
    revealY: 24,           // px rise distance
    stagger: 0.06,         // gap between staggered items
    revealStart: 'top 88%', // when a batch begins

    // Masked heading lines
    lineDur: 1.0,
    lineStagger: 0.06,
    lineStart: 'top 85%',

    // Hero
    heroDelay: 0.1,        // pause before the hero entrance
    heroPinEnd: '+=80%',   // how long the hero stays pinned
    heroDrift1: -8,        // yPercent for headline line 1
    heroDrift2: -14,       // yPercent for headline line 2
    heroFadeTo: 0.12,      // headline opacity at end of pin

    // Nav
    navDur: 0.45,
    navShowAfter: 100,     // px scrolled before hide-on-down engages

    // Marquee
    marqueeDur: 28,        // seconds for one full loop
    marqueeMaxBoost: 4,    // top timeScale multiplier from scroll velocity
    marqueeSensitivity: 700,
    marqueeLerp: 0.08,     // how fast speed settles back

    // Parallax
    capParallax: 5,        // yPercent travel on spotlight cards
    shotParallax: -6,      // xPercent counter-drift inside shot tiles

    // Scrub smoothing (seconds of catch-up)
    scrub: 1
  };

  /* ============================================================
     Guards
     ============================================================ */
  const root = document.documentElement;

  if (!window.gsap || !window.ScrollTrigger) {
    // Nothing can animate — make sure nothing stays hidden.
    root.classList.remove('js');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  const hasSplitText = !!window.SplitText;
  if (hasSplitText) gsap.registerPlugin(SplitText);

  gsap.defaults({ ease: T.ease, duration: T.revealDur });

  /* will-change helpers — applied for the life of a tween only */
  const wcOn = (els) => gsap.utils.toArray(els).forEach((el) => (el.style.willChange = 'transform, opacity'));
  const wcOff = (els) => gsap.utils.toArray(els).forEach((el) => (el.style.willChange = ''));

  /* A standard entrance: fade + rise, once, with will-change hygiene */
  function reveal(targets, vars) {
    return gsap.to(targets, Object.assign({
      opacity: 1,
      y: 0,
      duration: T.revealDur,
      stagger: T.stagger,
      onStart: () => wcOn(targets),
      onComplete: () => wcOff(targets)
    }, vars));
  }

  let mm = null;

  /* ============================================================
     buildAll — deferred until font metrics are known so SplitText
     measures real line boxes, not fallback-font ones.
     ============================================================ */
  function buildAll() {
    root.classList.add('anim-ready');

    mm = gsap.matchMedia();

    /* ==========================================================
       CONTEXT A — prefers-reduced-motion: reduce
       Final state, instantly. No Lenis, no triggers, no tweens.
       (scroll.css already handles this; this is the belt to its
       braces, and covers a live OS-level toggle.)
       ========================================================== */
    mm.add('(prefers-reduced-motion: reduce)', () => {
      gsap.set('[data-anim]', { opacity: 1, y: 0 });
      gsap.set('.line-in', { yPercent: 0, y: 0 });
    });

    /* ==========================================================
       CONTEXT B — motion allowed, all viewports
       ========================================================== */
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const cleanups = [];

      /* ---- Smooth scroll: Lenis driven by the GSAP ticker ---- */
      let lenis = null;
      if (window.Lenis) {
        lenis = new Lenis({
          duration: 1.1,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
        });
        lenis.on('scroll', ScrollTrigger.update);
        const raf = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);
        window.KF = window.KF || {};
        window.KF.lenis = lenis;

        cleanups.push(() => {
          gsap.ticker.remove(raf);
          lenis.destroy();
          window.KF.lenis = null;
          gsap.ticker.lagSmoothing(500, 33);
        });
      }

      /* ---- Anchor links route through Lenis ---- */
      const onAnchor = (e) => {
        const a = e.target.closest('a[href^="#"]');
        if (!a) return;
        const id = a.getAttribute('href');
        if (id.length < 2 || id.startsWith('#p=')) return; // #p= is the case-study deep link
        const target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        if (lenis) lenis.scrollTo(target, { offset: -72 });
        else target.scrollIntoView();
      };
      document.addEventListener('click', onAnchor);
      cleanups.push(() => document.removeEventListener('click', onAnchor));

      /* ---- Pause page scroll while the case study overlay is open.
              case-study.js emits these; it knows nothing about Lenis. ---- */
      const stop = () => lenis && lenis.stop();
      const startScroll = () => lenis && lenis.start();
      document.addEventListener('casestudy:open', stop);
      document.addEventListener('casestudy:close', startScroll);
      cleanups.push(() => {
        document.removeEventListener('casestudy:open', stop);
        document.removeEventListener('casestudy:close', startScroll);
      });

      /* ---- Shared initial state for every entrance reveal ----
         The CSS pre-state uses translateY(105%) on .line-in, which GSAP
         parses into `y` pixels, not `yPercent`. Re-declare it explicitly
         so the yPercent tweens below have a real starting value. */
      gsap.set('[data-anim]', { y: T.revealY });
      gsap.set('.line-in', { yPercent: 105, y: 0 });

      /* ==========================================================
         SECTION 1 — Nav
         Hides on scroll down, returns on scroll up. Gains an opaque
         background once past the hero's first screen.
         ========================================================== */
      const nav = document.getElementById('nav');
      let lastDir = 0;

      ScrollTrigger.create({
        start: T.navShowAfter,
        end: 'max',
        onEnter: () => nav.classList.add('nav-solid'),
        onLeaveBack: () => {
          nav.classList.remove('nav-solid');
          lastDir = 0;
          gsap.to(nav, { yPercent: 0, duration: T.navDur, overwrite: true });
        },
        onUpdate: (self) => {
          if (self.direction === lastDir) return; // only tween on a direction change
          lastDir = self.direction;
          gsap.to(nav, {
            yPercent: self.direction === 1 ? -100 : 0,
            duration: T.navDur,
            overwrite: true
          });
        }
      });

      /* ==========================================================
         SECTION 2 — Hero entrance (on load, not scroll-linked)
         Headline lines rise out of their masks; supporting copy
         staggers in behind them.
         ========================================================== */
      const heroSub = document.querySelector('.hero-sub');
      let subTargets = [heroSub];
      let split = null;

      if (hasSplitText && heroSub) {
        try {
          split = new SplitText(heroSub, { type: 'lines', linesClass: 'hs-line' });
          if (split.lines && split.lines.length) {
            subTargets = split.lines;
            gsap.set(heroSub, { opacity: 1, y: 0 });
            gsap.set(subTargets, { opacity: 0, y: T.revealY });
          }
        } catch (err) {
          split = null; // fall back to animating the paragraph as one block
        }
      }
      if (split) cleanups.push(() => split.revert());

      const heroLines = gsap.utils.toArray('.hero-h1 .line-in');
      const heroTl = gsap.timeline({ delay: T.heroDelay });

      heroTl
        .to('.hero .eyebrow', { opacity: 1, y: 0, duration: 0.8 }, 0)
        .to(heroLines, {
          yPercent: 0,
          duration: 1.1,
          stagger: T.lineStagger,
          onComplete: () => wcOff(heroLines)
        }, 0.08)
        .to(subTargets, { opacity: 1, y: 0, duration: 0.8, stagger: T.stagger }, 0.4)
        .to('.hero-cta [data-anim]', {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: T.stagger,
          clearProps: 'transform' // hand the buttons back to their CSS hover
        }, 0.55);

      /* ==========================================================
         SECTION 3 — Client marquee
         GSAP owns the loop so scroll velocity can push it faster.
         Speed eases back to 1x when scrolling stops.
         ========================================================== */
      const track = document.querySelector('.marquee-track');
      if (track) {
        const loop = gsap.to(track, {
          xPercent: -50,
          duration: T.marqueeDur,
          ease: T.easeLinear,
          repeat: -1
        });

        const clampTS = gsap.utils.clamp(1, 1 + T.marqueeMaxBoost);
        let targetTS = 1;

        ScrollTrigger.create({
          start: 0,
          end: 'max',
          onUpdate: (self) => {
            targetTS = clampTS(1 + Math.abs(self.getVelocity()) / T.marqueeSensitivity);
          }
        });

        const settle = () => { targetTS = 1; };
        ScrollTrigger.addEventListener('scrollEnd', settle);

        // One shared ticker lerp — cheaper than spawning a tween per frame.
        const tick = () => {
          const cur = loop.timeScale();
          loop.timeScale(cur + (targetTS - cur) * T.marqueeLerp);
        };
        gsap.ticker.add(tick);

        cleanups.push(() => {
          gsap.ticker.remove(tick);
          ScrollTrigger.removeEventListener('scrollEnd', settle);
          loop.kill();
          gsap.set(track, { clearProps: 'transform' });
        });
      }

      /* ==========================================================
         SECTION 3b — Marquee label
         ========================================================== */
      ScrollTrigger.batch('.clients [data-anim]', {
        start: T.revealStart,
        once: true,
        onEnter: (batch) => reveal(batch, { clearProps: 'transform' })
      });

      /* ==========================================================
         SECTION 4 — Section headings
         Line-by-line mask reveal, once per heading.
         ========================================================== */
      gsap.utils.toArray('[data-line-reveal]').forEach((heading) => {
        const lines = heading.querySelectorAll('.line-in');
        gsap.to(lines, {
          yPercent: 0,
          duration: T.lineDur,
          stagger: T.lineStagger,
          onStart: () => wcOn(lines),
          onComplete: () => wcOff(lines),
          scrollTrigger: {
            trigger: heading,
            start: T.lineStart,
            once: true
          }
        });
      });

      /* Subheads / buttons that sit beside a heading */
      ScrollTrigger.batch('.section-head [data-anim]', {
        start: T.revealStart,
        once: true,
        onEnter: (batch) => reveal(batch, { clearProps: 'transform' })
      });

      /* ==========================================================
         SECTION 5 — Work rows
         Batched entrance. The scrubbed active-row emphasis lives in
         Context C (desktop only).
         ========================================================== */
      ScrollTrigger.batch('.work-list li', {
        start: T.revealStart,
        once: true,
        onEnter: (batch) => reveal(batch, { clearProps: 'transform' })
      });

      /* ==========================================================
         SECTION 6 — Capability cards
         Split into two batches: plain cards release their transform
         on completion so the CSS hover lift works again, while the
         two gradient spotlight cards keep theirs for parallax.
         ========================================================== */
      const spotSel = '.cap-card.spotlight-violet, .cap-card.spotlight-orange';
      const plainCards = gsap.utils.toArray('.cap-card').filter((c) => !c.matches(spotSel));
      const spotCards = gsap.utils.toArray(spotSel);

      if (plainCards.length) {
        ScrollTrigger.batch(plainCards, {
          start: T.revealStart,
          once: true,
          onEnter: (batch) => reveal(batch, { clearProps: 'transform' })
        });
      }
      if (spotCards.length) {
        ScrollTrigger.batch(spotCards, {
          start: T.revealStart,
          once: true,
          onEnter: (batch) => reveal(batch)
        });
      }

      /* ==========================================================
         SECTION 7 — Shot tiles (entrance only)
         All twelve share a vertical position, so one staggered
         reveal reads better than a per-tile batch.
         ========================================================== */
      const shots = gsap.utils.toArray('.shots-track .shot');
      if (shots.length) {
        gsap.to(shots, {
          opacity: 1,
          y: 0,
          duration: T.revealDur,
          stagger: 0.05,
          clearProps: 'transform',
          onStart: () => wcOn(shots),
          onComplete: () => wcOff(shots),
          scrollTrigger: {
            trigger: '.shots',
            start: 'top 70%',
            once: true
          }
        });
      }

      /* ==========================================================
         SECTION 8 — CTA
         Heading handled by [data-line-reveal] above; this covers the
         button and the social row.
         ========================================================== */
      ScrollTrigger.batch('.cta [data-anim]', {
        start: 'top 90%',
        once: true,
        onEnter: (batch) => reveal(batch, { clearProps: 'transform' })
      });

      /* ==========================================================
         SECTION 9 — Footer reveal
         The footer is fixed behind .page (see scroll.css); the page
         scrolling off uncovers it. This just lifts the footer's own
         content over the final stretch so it doesn't sit inert.
         ========================================================== */
      const footer = document.getElementById('footer');
      const page = document.getElementById('page');

      if (footer && page) {
        const footerH = () => footer.offsetHeight;

        // Reserve exactly the footer's height beneath the page.
        const syncFooterVar = () => root.style.setProperty('--footer-h', footerH() + 'px');
        syncFooterVar();
        ScrollTrigger.addEventListener('refreshInit', syncFooterVar);
        cleanups.push(() => ScrollTrigger.removeEventListener('refreshInit', syncFooterVar));

        gsap.fromTo(footer.children,
          { y: 28, opacity: 0.35 },
          {
            y: 0,
            opacity: 1,
            ease: T.easeLinear,
            stagger: 0.04,
            scrollTrigger: {
              trigger: page,
              start: 'bottom bottom',
              end: () => '+=' + footerH(),
              scrub: true,
              invalidateOnRefresh: true
            }
          }
        );
      }

      return () => cleanups.forEach((fn) => fn());
    });

    /* ==========================================================
       CONTEXT C — motion allowed, >= 1024px
       Everything that pins or scrolls horizontally. Reverted
       automatically below 1024px, leaving Context B's fades intact.
       ========================================================== */
    mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {

      /* ---- SECTION 2b — Hero pin + scrubbed drift ---- */
      const heroTl = gsap.timeline({
        scrollTrigger: {
          trigger: '.hero',
          start: 'top top',
          end: T.heroPinEnd,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: T.scrub
        }
      });

      heroTl
        .to('.hero-h1 .line:nth-child(1)', { yPercent: T.heroDrift1, opacity: T.heroFadeTo, ease: T.easeLinear }, 0)
        .to('.hero-h1 .line:nth-child(2)', { yPercent: T.heroDrift2, opacity: T.heroFadeTo, ease: T.easeLinear }, 0)
        .to('.hero .eyebrow', { opacity: 0, y: -20, ease: T.easeLinear }, 0)
        .to('.hero-sub', { opacity: 0, y: -20, ease: T.easeLinear }, 0)
        .to('.hero-cta', { opacity: 0, y: -20, ease: T.easeLinear }, 0);

      /* ---- SECTION 5b — Work row emphasis ----
         The row crossing the viewport centre holds full ink; the
         rest drop to muted. Class-only, so it costs no layout. */
      const list = document.getElementById('workList');
      if (list) {
        list.classList.add('has-focus');
        gsap.utils.toArray('.work-list li').forEach((li) => {
          ScrollTrigger.create({
            trigger: li,
            start: 'top center',
            end: 'bottom center',
            onToggle: (self) => li.classList.toggle('is-active', self.isActive)
          });
        });
      }

      /* ---- SECTION 6b — Spotlight card parallax ---- */
      gsap.utils.toArray('.cap-card.spotlight-violet, .cap-card.spotlight-orange').forEach((card) => {
        gsap.fromTo(card,
          { yPercent: T.capParallax },
          {
            yPercent: -T.capParallax,
            ease: T.easeLinear,
            scrollTrigger: {
              trigger: '.cap-grid',
              start: 'top bottom',
              end: 'bottom top',
              scrub: true
            }
          }
        );
      });

      /* ---- SECTION 7b — Shots horizontal scroll ----
         The viewport pins; the track translates by exactly its
         overflow. invalidateOnRefresh keeps the distance correct
         after image load and on resize. */
      const viewport = document.getElementById('shotsViewport');
      const shotsTrack = document.getElementById('shotsTrack');

      if (viewport && shotsTrack) {
        const distance = () => Math.max(0, shotsTrack.scrollWidth - window.innerWidth);

        const hTl = gsap.timeline({
          scrollTrigger: {
            trigger: viewport,
            start: 'top top',
            end: () => '+=' + distance(),
            pin: true,
            scrub: T.scrub,
            anticipatePin: 1,
            invalidateOnRefresh: true
          }
        });

        hTl
          .to(shotsTrack, { x: () => -distance(), ease: T.easeLinear }, 0)
          .to('.shots-track .shot img', { xPercent: T.shotParallax, ease: T.easeLinear }, 0);
      }

      return () => {
        const l = document.getElementById('workList');
        if (l) {
          l.classList.remove('has-focus');
          l.querySelectorAll('li').forEach((li) => li.classList.remove('is-active'));
        }
      };
    });

    /* ---- Recalculate once late-loading media has real dimensions ---- */
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ============================================================
     Kick off once fonts are measured (SplitText needs real metrics).
     The <head> watchdog un-hides everything if this never runs.
     ============================================================ */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(buildAll).catch(buildAll);
  } else {
    window.addEventListener('load', buildAll);
  }

  /* ============================================================
     Teardown hook — for a future router / SPA mount.
     Kills every ScrollTrigger, reverts all matchMedia contexts and
     their tweens, and restores the ticker.
     ============================================================ */
  window.KF = window.KF || {};
  window.KF.animations = {
    refresh: () => ScrollTrigger.refresh(),
    destroy: () => {
      if (mm) mm.revert();
      ScrollTrigger.getAll().forEach((st) => st.kill());
      root.classList.remove('anim-ready');
    }
  };
})();
