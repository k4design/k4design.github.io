/* ============================================================
   IDOS share card — shared behaviour for all three ratios.

   1. Gates the render on the real webfonts (document.fonts.load +
      document.fonts.ready) so an export can never capture a
      fallback typeface. Fails open after 4s.
   2. Auto-fits the three variable fields to the 888px content
      column and the card height, in this order:
        eyebrow / word width -> footer height -> statement height.
   3. Accepts ?word= &statement= &name= &initials= &photo=
      overrides so the builder (and the test harness) can render
      any agent's copy without editing the file.

   DESIGNED-TO LIMITS (typeset with no shrink at all):
        word       <= 10 characters   ("INDEPENDENCE" = 12 -> shrinks)
        statement  <= 120 characters
        name       <= 28 characters
   Past those the type auto-shrinks (word to 42%, statement to 62%
   of its designed size), then the statement clamps to fewer lines.
   Hard caps below stop pathological input dead.
   ============================================================ */
(function () {
  'use strict';

  var HARD = { word: 24, statement: 260, name: 60, initials: 3 };

  function clip(s, n) { return s.length > n ? s.slice(0, n).trim() : s; }

  var card = document.querySelector('.card');
  var el = {
    eyebrow: card.querySelector('.eyebrow'),
    word: card.querySelector('.word'),
    statement: card.querySelector('.statement'),
    body: card.querySelector('.body'),
    foot: card.querySelector('.foot'),
    invite: card.querySelector('.invite'),
    inviteLine: card.querySelector('.invite-line'),
    inviteName: card.querySelector('.invite-name'),
    shot: card.querySelector('.headshot')
  };

  /* ---------- 3. content overrides ---------- */
  var q = new URLSearchParams(location.search);
  if (q.has('word')) el.word.textContent = clip(q.get('word'), HARD.word).toUpperCase();
  if (q.has('statement')) el.statement.textContent = clip(q.get('statement'), HARD.statement);
  if (q.has('name')) el.inviteName.textContent = '— ' + clip(q.get('name'), HARD.name);
  if (q.has('initials')) el.shot.setAttribute('data-initials', clip(q.get('initials'), HARD.initials).toUpperCase());
  if (q.has('photo')) {
    var img = el.shot.querySelector('img');
    if (!img) { img = document.createElement('img'); img.alt = ''; el.shot.appendChild(img); }
    img.src = q.get('photo');
  }
  /* no local photo -> drop the <img> so the designed monogram shows through */
  Array.prototype.forEach.call(card.querySelectorAll('.headshot img'), function (i) {
    i.addEventListener('error', function () { i.remove(); });
    if (i.complete && i.naturalWidth === 0) i.remove();
  });

  /* ---------- helpers ---------- */
  function px(v) { return parseFloat(v) || 0; }
  function cs(node, prop) { return getComputedStyle(node).getPropertyValue(prop); }
  function setVar(name, value) { card.style.setProperty(name, value); }

  var base = {};
  function readBase() {
    ['--eyebrow-size', '--eyebrow-track', '--word-size', '--statement-size', '--statement-lh',
      '--invite-size', '--invite-lh', '--name-size', '--name-gap', '--shot', '--statement-lines'
    ].forEach(function (k) { base[k] = px(cs(card, k)); });
  }

  /* 2a. single-line width fit: shrink type (and tracking in step), then allow a wrap */
  function fitLine(node, sizeVar, trackVar, minRatio) {
    node.style.whiteSpace = 'nowrap';
    var r = 1;
    while (node.scrollWidth > node.clientWidth && r > minRatio) {
      r -= 0.02;
      setVar(sizeVar, (base[sizeVar] * r).toFixed(2) + 'px');
      if (trackVar) setVar(trackVar, (base[trackVar] * r).toFixed(2) + 'px');
    }
    if (node.scrollWidth > node.clientWidth) node.style.whiteSpace = 'normal';
    else node.style.whiteSpace = '';
    return r;
  }

  function contentBottom() {
    return card.getBoundingClientRect().bottom - px(cs(card, 'padding-bottom'));
  }

  function fit() {
    readBase();
    var r = { eyebrow: 1, word: 1, statement: 1, invite: 1, shot: 1, lines: base['--statement-lines'] };

    r.eyebrow = fitLine(el.eyebrow, '--eyebrow-size', '--eyebrow-track', 0.58);
    r.word = fitLine(el.word, '--word-size', null, 0.42);

    /* Anton's .82 leading is set for a single line; when the word has to wrap,
       the ascenders and descenders of adjacent lines touch. Open it up. */
    el.word.style.lineHeight = '';
    var wordSize = px(cs(el.word, '--word-size'));
    if (el.word.getBoundingClientRect().height > wordSize * 0.9) el.word.style.lineHeight = '.95';

    /* 2b. footer must fit above the bottom padding */
    var guard = 0;
    while (el.foot.getBoundingClientRect().bottom > contentBottom() + 0.5 && guard++ < 40) {
      if (r.invite > 0.7) {
        r.invite -= 0.04;
        setVar('--invite-size', (base['--invite-size'] * r.invite).toFixed(2) + 'px');
        setVar('--invite-lh', (base['--invite-lh'] * r.invite).toFixed(2) + 'px');
        setVar('--name-size', (base['--name-size'] * r.invite).toFixed(2) + 'px');
        setVar('--name-gap', (base['--name-gap'] * r.invite).toFixed(2) + 'px');
      } else if (r.shot > 0.7) {
        r.shot -= 0.05;
        setVar('--shot', Math.round(base['--shot'] * r.shot) + 'px');
      } else break;
    }

    /* 2c. statement must fit the slack the body column has left */
    guard = 0;
    /* the statement must clear the invite by at least --slack-min */
    var slack = px(cs(card, '--slack-min'));
    var over = function () {
      return el.statement.getBoundingClientRect().bottom - (el.body.getBoundingClientRect().bottom - slack);
    };
    while (over() > 0.5 && guard++ < 60) {
      if (r.statement > 0.62) {
        r.statement -= 0.04;
        setVar('--statement-size', (base['--statement-size'] * r.statement).toFixed(2) + 'px');
        setVar('--statement-lh', (base['--statement-lh'] * r.statement).toFixed(2) + 'px');
      } else if (r.word > 0.42) {
        r.word -= 0.04;
        setVar('--word-size', (base['--word-size'] * r.word).toFixed(2) + 'px');
      } else if (r.lines > 1) {
        r.lines -= 1;
        setVar('--statement-lines', String(r.lines));
      } else break;
    }
    card.dataset.fit = JSON.stringify({
      eyebrow: +r.eyebrow.toFixed(2), word: +r.word.toFixed(2),
      statement: +r.statement.toFixed(2), invite: +r.invite.toFixed(2),
      shot: +r.shot.toFixed(2), statementLines: r.lines
    });
    return r;
  }

  /* ---------- acceptance reporting ---------- */
  /* Horizontal extent = painted TEXT extent (so an overflowing nowrap line is
     caught, not hidden behind a full-width block box), clipped by the element's
     own overflow box. Vertical extent = the flow box, which is what collides. */
  function ink(node) {
    var box = node.getBoundingClientRect();
    if (node.matches('.dots,.ghost,.rule,.logo,.headshot')) return box;
    try {
      var r = document.createRange(); r.selectNodeContents(node);
      var t = r.getBoundingClientRect();
      if (t.width) {
        var clipped = getComputedStyle(node).overflow !== 'visible';
        return {
          left: clipped ? Math.max(t.left, box.left) : t.left,
          right: clipped ? Math.min(t.right, box.right) : t.right,
          top: box.top, bottom: box.bottom
        };
      }
    } catch (e) {}
    return box;
  }

  function report() {
    var c = card.getBoundingClientRect();
    var out = { ratio: card.dataset.ratio, card: { w: Math.round(c.width), h: Math.round(c.height) }, box: {}, fit: JSON.parse(card.dataset.fit || '{}') };
    ['.dots', '.ghost', '.rule', '.logo', '.eyebrow', '.means', '.word', '.statement', '.invite', '.headshot'].forEach(function (sel) {
      var n = card.querySelector(sel); if (!n) return;
      var b = ink(n);
      out.box[sel.slice(1)] = {
        x1: Math.round(b.left - c.left), x2: Math.round(b.right - c.left),
        y1: Math.round(b.top - c.top), y2: Math.round(b.bottom - c.top)
      };
    });
    var bleed = { dots: 1, ghost: 1 };
    out.violations = [];
    Object.keys(out.box).forEach(function (k) {
      var b = out.box[k];
      if (!bleed[k] && (b.x1 < 96 || b.x2 > 984)) out.violations.push(k + ' crosses the 96/984 margin (' + b.x1 + '→' + b.x2 + ')');
      if (!bleed[k] && b.y2 > out.card.h) out.violations.push(k + ' exceeds card height (' + b.y2 + ')');
    });
    [['statement', 'invite'], ['statement', 'headshot'], ['invite', 'headshot']].forEach(function (p) {
      var a = out.box[p[0]], b = out.box[p[1]];
      if (!a || !b) return;
      var ox = Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1);
      var oy = Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1);
      if (ox > 0 && oy > 0) out.violations.push(p[0] + '/' + p[1] + ' overlap ' + ox + '×' + oy + 'px');
    });
    out.pass = out.violations.length === 0;
    return out;
  }

  /* ---------- 1. font gate ---------- */
  var FACES = ['400 260px Anton', '500 42px Inter', '600 32px Inter', '700 26px Inter', 'italic 500 30px Fraunces'];
  function fontsReady() {
    if (!document.fonts) return Promise.resolve();
    return Promise.all(FACES.map(function (f) { return document.fonts.load(f).catch(function () {}); }))
      .then(function () { return document.fonts.ready; });
  }
  function timeout(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  /* images too: the logo's intrinsic width participates in layout, so a
     half-decoded logo would be captured (or measured) at zero width */
  function imagesReady() {
    return Promise.all(Array.prototype.map.call(card.querySelectorAll('img'), function (i) {
      if (i.complete) return Promise.resolve();
      return new Promise(function (r) { i.addEventListener('load', r); i.addEventListener('error', r); });
    }));
  }

  var ready = Promise.race([Promise.all([fontsReady(), imagesReady()]), timeout(4000)]).then(function () {
    fit();
    document.documentElement.setAttribute('data-card-ready', '');
    return report();
  });

  window.IDOSCard = { fit: fit, report: report, ready: ready };
})();
