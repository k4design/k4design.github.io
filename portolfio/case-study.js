/* ============================================================
   Kyle Foreman — shared behaviour
   Project data, case study viewer, curtain transition,
   cursor-following hover preview.

   Used by BOTH index.html (classic) and scroll.html (GSAP).
   Emits `casestudy:open` / `casestudy:close` on document so the
   GSAP page can pause Lenis without this file knowing Lenis exists.
   ============================================================ */

window.KF = window.KF || {};

(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ---------- Project data ---------- */
  const PROJECTS = [
    {
      slug: 'enfluence',
      title: 'Enfluence Marketing',
      tags: ['Logo', 'Identity', 'Motion'],
      desc: 'Logo and identity for a marketing agency — mark construction, wordmark lockups, and an animated logo build.',
      link: 'https://www.behance.net/gallery/126509829/enfluence-marketing-logo',
      linkLabel: 'View on Behance',
      thumb: 'img/thumbs/enfluence.jpg',
      assets: [
        { type: 'image', src: 'img/boards/enfluence.jpg', w: 1200, h: 1733 },
        { type: 'image', src: 'img/boards/enfluence-anim.gif', w: 1200, h: 586 }
      ]
    },
    {
      slug: 'wcg',
      title: 'WCG',
      tags: ['Art Direction', 'Storyboarding', 'Motion'],
      desc: "As Art Director at West Cary Group, I developed the concept, storyboarded, and oversaw production of a piece demonstrating WCG's in-house animation and video capabilities.",
      link: 'https://vimeo.com/595434129',
      linkLabel: 'View on Vimeo',
      thumb: 'img/thumbs/wcg.jpg',
      assets: [{ type: 'vimeo', id: '595434129' }]
    },
    {
      slug: 'mim',
      title: 'Meet in the Middle',
      tags: ['Branding', 'Identity System'],
      desc: 'A full brand identity — logo system, palette, typography, and applications across print and digital.',
      link: 'https://www.behance.net/gallery/80612991/Meet-in-the-Middle-Branding',
      linkLabel: 'View on Behance',
      thumb: 'img/thumbs/mim.jpg',
      assets: [{ type: 'image', src: 'img/boards/mim.jpg', w: 1400, h: 6653 }]
    },
    {
      slug: 'visa',
      title: 'Visa',
      tags: ['Editorial', 'Layout', 'Print'],
      desc: 'Design and layout for a Visa request-for-proposal document — a long-form editorial system built to stay readable at length.',
      link: 'https://www.behance.net/gallery/126508473/RFP',
      linkLabel: 'View on Behance',
      thumb: 'img/thumbs/visa.jpg',
      assets: [{ type: 'image', src: 'img/boards/visa.jpg', w: 1200, h: 14840 }]
    },
    {
      slug: 'bch',
      title: 'Bitcoin Cash Fund',
      tags: ['Brand Guide', 'Identity'],
      desc: 'A brand guide covering logo usage, color, typography, and voice for a cryptocurrency advocacy fund.',
      link: 'https://www.behance.net/gallery/71020781/Bitcoin-Cash-Fund-Brand-Guide',
      linkLabel: 'View on Behance',
      thumb: 'img/thumbs/bch.jpg',
      assets: [{ type: 'image', src: 'img/boards/bch.jpg', w: 1400, h: 7784 }]
    },
    {
      slug: 'homevalue',
      title: 'HomeVALUE.com',
      tags: ['Marketing', 'Print', 'Digital'],
      desc: 'Marketing collateral for a home valuation platform, spanning print and digital touchpoints.',
      link: 'https://www.behance.net/gallery/80811271/HomeVALUEcom-Marketing',
      linkLabel: 'View on Behance',
      thumb: 'img/thumbs/homevalue.jpg',
      assets: [{ type: 'image', src: 'img/boards/homevalue.jpg', w: 1400, h: 3287 }]
    },
    {
      slug: 'rpfunding',
      title: 'RP Funding',
      tags: ['Web Design', 'UI', 'Front-End'],
      desc: 'Website design for a mortgage lender — page system, component library, and responsive layouts.',
      link: 'https://www.behance.net/gallery/76584883/RP-Funding-Website-Design',
      linkLabel: 'View on Behance',
      thumb: 'img/thumbs/rpfunding.jpg',
      assets: [{ type: 'image', src: 'img/boards/rpfunding.jpg', w: 1400, h: 7874 }]
    }
  ];

  const bySlug = Object.fromEntries(PROJECTS.map((p, i) => [p.slug, { ...p, i }]));
  const pad = (n) => String(n).padStart(2, '0');

  KF.PROJECTS = PROJECTS;
  KF.reduceMotion = reduceMotion;
  KF.finePointer = finePointer;

  /* ============================================================
     Cursor-following hover preview on the work list
     ============================================================ */
  (function hoverPreview() {
    if (!finePointer || reduceMotion) return;

    const el = document.getElementById('hoverPreview');
    const list = document.getElementById('workList');
    const rows = document.querySelectorAll('.work-row');
    if (!el || !list || !rows.length) return;

    const img = el.querySelector('img');
    let tx = 0, ty = 0, x = 0, y = 0, prevX = 0, rot = 0, scale = 0.85, targetScale = 0.85;
    let active = false, raf = null;

    function loop() {
      x += (tx - x) * 0.13;
      y += (ty - y) * 0.13;
      scale += (targetScale - scale) * 0.15;

      const vel = x - prevX;
      prevX = x;
      rot += (Math.max(-14, Math.min(14, vel * 0.45)) - rot) * 0.12;

      el.style.transform =
        `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) rotate(${rot.toFixed(2)}deg) scale(${scale.toFixed(3)})`;

      if (active || Math.abs(scale - targetScale) > 0.002 || Math.abs(rot) > 0.05) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = null;
      }
    }

    const start = () => { if (!raf) raf = requestAnimationFrame(loop); };

    rows.forEach((row) => {
      const p = bySlug[row.dataset.project];
      if (!p) return;

      row.addEventListener('mouseenter', () => {
        img.src = p.thumb;
        img.alt = '';
        active = true;
        targetScale = 1;
        el.classList.add('on');
        start();
      });

      row.addEventListener('mouseleave', () => {
        active = false;
        targetScale = 0.85;
        el.classList.remove('on');
        start();
      });
    });

    list.addEventListener('mousemove', (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!raf && active) start();
    });
  })();

  /* ============================================================
     Curtain page transition
     ============================================================ */
  const curtain = document.getElementById('curtain');
  const curtainLabel = document.getElementById('curtainLabel');

  function withCurtain(label, midFn) {
    if (reduceMotion || !curtain) {
      midFn();
      return;
    }
    curtainLabel.textContent = label || '';
    curtain.classList.add('cover');
    setTimeout(() => {
      midFn();
      curtain.classList.add('reveal');
      setTimeout(() => curtain.classList.remove('cover', 'reveal'), 640);
    }, 500);
  }

  /* ============================================================
     Case study viewer
     ============================================================ */
  const cs = document.getElementById('cs');
  if (!cs) return;

  const csScroll = document.getElementById('csScroll');
  const csStage = document.getElementById('csStage');
  const csAsideIn = document.querySelector('.cs-aside-in');
  const csRailFill = document.getElementById('csRailFill');
  const csHint = document.getElementById('csHint');
  const csPct = document.getElementById('csPct');

  let current = null;
  let lastFocus = null;
  let assetIO = null;

  document.getElementById('csTotal').textContent = pad(PROJECTS.length);

  function buildStage(p) {
    csStage.innerHTML = '';
    csStage.classList.toggle('is-video', p.assets[0].type === 'vimeo');

    if (assetIO) assetIO.disconnect();
    assetIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            assetIO.unobserve(e.target);
          }
        }
      },
      { root: csScroll, rootMargin: '0px 0px -8% 0px', threshold: 0 }
    );

    const pending = [];

    p.assets.forEach((a) => {
      if (a.type === 'vimeo') {
        const wrap = document.createElement('div');
        wrap.className = 'cs-video';
        const f = document.createElement('iframe');
        f.src = `https://player.vimeo.com/video/${a.id}?title=0&byline=0&portrait=0&dnt=1`;
        f.title = `${p.title} — video`;
        f.allow = 'autoplay; fullscreen; picture-in-picture';
        f.allowFullscreen = true;
        wrap.appendChild(f);
        csStage.appendChild(wrap);
        return;
      }

      const fig = document.createElement('figure');
      fig.className = 'cs-asset';
      const inner = document.createElement('div');
      inner.className = 'cs-asset-inner';
      const img = document.createElement('img');
      img.src = a.src;
      img.width = a.w;
      img.height = a.h;
      img.alt = `${p.title} — case study`;
      img.decoding = 'async';
      inner.appendChild(img);
      fig.appendChild(inner);
      csStage.appendChild(fig);

      if (reduceMotion) fig.classList.add('in');
      else pending.push(fig);
    });

    // Observe only once the dialog is laid out — observing a `hidden` subtree
    // never reports an intersection, which would leave every asset clipped.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => pending.forEach((f) => assetIO.observe(f)))
    );
  }

  function render(slug) {
    const p = bySlug[slug];
    if (!p) return;
    current = p;

    document.getElementById('csIndex').textContent = pad(p.i + 1);
    document.getElementById('csTitle').textContent = p.title;
    document.getElementById('csDesc').textContent = p.desc;

    const ext = document.getElementById('csExt');
    ext.href = p.link;
    ext.textContent = p.linkLabel;

    const tags = document.getElementById('csTags');
    tags.innerHTML = '';
    p.tags.forEach((t) => {
      const li = document.createElement('li');
      li.textContent = t;
      tags.appendChild(li);
    });

    const prev = PROJECTS[(p.i - 1 + PROJECTS.length) % PROJECTS.length];
    const next = PROJECTS[(p.i + 1) % PROJECTS.length];
    document.getElementById('csPrevName').textContent = prev.title;
    document.getElementById('csNextName').textContent = next.title;

    buildStage(p);

    csScroll.scrollTop = 0;
    csRailFill.style.width = '0%';
    csPct.textContent = '0%';
    csHint.classList.remove('gone');

    // Restart the staggered entrance
    csAsideIn.classList.remove('cs-anim');
    void csAsideIn.offsetWidth;
    if (!reduceMotion) csAsideIn.classList.add('cs-anim');
  }

  function openCase(slug, { push = true } = {}) {
    const p = bySlug[slug];
    if (!p) return;

    lastFocus = document.activeElement;

    withCurtain(p.title, () => {
      cs.hidden = false;
      document.body.classList.add('cs-lock');
      document.dispatchEvent(new CustomEvent('casestudy:open', { detail: { slug } }));
      render(slug);
      void cs.offsetWidth;
      cs.classList.add('open');
      document.getElementById('csClose').focus({ preventScroll: true });
    });

    if (push) history.pushState({ p: slug }, '', `#p=${slug}`);
  }

  function closeCase({ push = true } = {}) {
    if (cs.hidden) return;

    withCurtain('', () => {
      cs.classList.remove('open');
      cs.hidden = true;
      csStage.innerHTML = ''; // destroys the Vimeo iframe → stops playback
      document.body.classList.remove('cs-lock');
      document.dispatchEvent(new CustomEvent('casestudy:close'));
      current = null;
      if (lastFocus) lastFocus.focus({ preventScroll: true });
    });

    if (push) history.pushState({}, '', window.location.pathname + window.location.search);
  }

  function step(dir) {
    if (!current) return;
    const n = PROJECTS[(current.i + dir + PROJECTS.length) % PROJECTS.length];
    withCurtain(n.title, () => render(n.slug));
    history.replaceState({ p: n.slug }, '', `#p=${n.slug}`);
  }

  /* ---------- Wiring ---------- */
  document.querySelectorAll('.work-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      // Let cmd/ctrl/middle-click open the external gallery in a new tab
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      openCase(row.dataset.project);
    });
  });

  document.getElementById('csClose').addEventListener('click', () => closeCase());
  document.getElementById('csPrev').addEventListener('click', () => step(-1));
  document.getElementById('csNext').addEventListener('click', () => step(1));

  csScroll.addEventListener(
    'scroll',
    () => {
      const max = csScroll.scrollHeight - csScroll.clientHeight;
      const pct = max > 0 ? Math.min(1, csScroll.scrollTop / max) : 0;
      csRailFill.style.width = `${(pct * 100).toFixed(2)}%`;
      csPct.textContent = `${Math.round(pct * 100)}%`;
      if (csScroll.scrollTop > 40) csHint.classList.add('gone');
    },
    { passive: true }
  );

  document.addEventListener('keydown', (e) => {
    if (cs.hidden) return;
    if (e.key === 'Escape') closeCase();
    else if (e.key === 'ArrowRight') step(1);
    else if (e.key === 'ArrowLeft') step(-1);
  });

  /* ---------- Deep links ---------- */
  function slugFromHash() {
    const m = window.location.hash.match(/^#p=([\w-]+)$/);
    return m && bySlug[m[1]] ? m[1] : null;
  }

  function syncToHash() {
    const slug = slugFromHash();
    if (slug) {
      if (!current) openCase(slug, { push: false });
      else if (current.slug !== slug) withCurtain(bySlug[slug].title, () => render(slug));
    } else {
      closeCase({ push: false });
    }
  }

  window.addEventListener('popstate', syncToHash);
  window.addEventListener('hashchange', syncToHash);

  const initial = slugFromHash();
  if (initial) openCase(initial, { push: false });

  KF.openCase = openCase;
  KF.closeCase = closeCase;
})();
