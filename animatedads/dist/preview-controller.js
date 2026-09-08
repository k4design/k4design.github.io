(function () {
  var LOOP = 15000, LOOPS = 2;
  function bind(card) {
    var frame = card.querySelector('iframe'), playBtn = card.querySelector('.play'), replayBtn = card.querySelector('.replay'),
        scrub = card.querySelector('.scrub'), timeEl = card.querySelector('.time'), loopEl = card.querySelector('.loop');
    var st = { anims: [], video: null, scrubbing: false, raf: 0, ok: false };
    function doc() { try { return frame.contentDocument || (frame.contentWindow && frame.contentWindow.document); } catch (e) { return null; } }
    function fail(msg) { loopEl.textContent = msg; loopEl.className = 'loop err'; [playBtn, replayBtn, scrub].forEach(function (el) { el.disabled = true; }); }
    function collect() {
      var d = doc(); if (!d || !d.getAnimations) { fail('controls unavailable: this browser blocked access to the embedded ad'); return false; }
      st.anims = d.getAnimations(); st.video = d.querySelector('video');
      if (!st.anims.length) { fail('ad not ready'); return false; }
      st.anims.forEach(function (a) { var t = a.effect.getTiming(); if (a.animationName !== 'kf_cta_bob') a.effect.updateTiming({ iterations: LOOPS, fill: 'forwards' }); else a.effect.updateTiming({ iterations: Math.ceil(LOOPS * LOOP / t.duration), fill: 'forwards' }); });
      st.anims.forEach(function (a) { seen.add(a); });
      st.ok = true; [playBtn, replayBtn, scrub].forEach(function (el) { el.disabled = false; }); return true;
    }
    function main() { return st.anims.find(function (a) { return a.animationName === 'kf_bg_pan'; }) || st.anims[0]; }
    function setTime(ms) { st.anims.forEach(function (a) { a.currentTime = ms; }); if (st.video) { try { st.video.currentTime = (ms % LOOP) / 1000; } catch (e) {} } }
    function pause() { st.anims.forEach(function (a) { a.pause(); }); if (st.video) st.video.pause(); playBtn.textContent = '▶'; }
    function play() { var m = main(); if (m && m.currentTime >= LOOPS * LOOP - 1) return; st.anims.forEach(function (a) { a.play(); }); if (st.video) { var p = st.video.play(); if (p) p.catch(function () {}); } playBtn.textContent = '❚❚'; }
    function replay() { if (!st.ok) return; setTime(0); play(); }
    var seen = new Set(), lastScan = 0;
    function adopt(a) {                                   // an animation created after the first scan (e.g. the video's own pan, once it starts playing)
      var t = a.effect.getTiming();
      if (a.animationName !== 'kf_cta_bob') a.effect.updateTiming({ iterations: LOOPS, fill: 'forwards' });
      else a.effect.updateTiming({ iterations: Math.ceil(LOOPS * LOOP / t.duration), fill: 'forwards' });
      var m = main(); if (m && m !== a) { a.currentTime = m.currentTime; if (m.playState === 'paused' || m.playState === 'finished') a.pause(); }
      st.anims.push(a); seen.add(a);
    }
    function rescan(now) {
      if (now - lastScan < 400) return; lastScan = now;
      var d = doc(); if (!d) return;
      d.getAnimations().forEach(function (a) { if (!seen.has(a)) adopt(a); });
    }
    function tick() {
      rescan(performance.now());
      var m = main();
      if (m && !st.scrubbing) {
        var t = Math.min(m.currentTime || 0, LOOPS * LOOP);
        var inLoop = t % LOOP, loop = Math.min(Math.floor(t / LOOP) + 1, LOOPS);
        var done = t >= LOOPS * LOOP - 1 || m.playState === 'finished';
        if (st.video && loop !== st.lastLoop && st.lastLoop !== undefined && !done) { try { st.video.currentTime = 0; if (st.video.paused && m.playState === 'running') { var pp = st.video.play(); if (pp) pp.catch(function () {}); } } catch (e) {} }
        st.lastLoop = loop;
        if (done) { inLoop = LOOP; if (st.video && !st.video.paused) st.video.pause(); playBtn.textContent = '▶'; }
        scrub.value = inLoop; timeEl.textContent = (inLoop / 1000).toFixed(1) + ' s';
        loopEl.textContent = done ? 'holding final frame (after ' + LOOPS + ' loops)' : 'loop ' + loop + ' / ' + LOOPS; loopEl.className = 'loop' + (done ? ' hold' : '');
      }
      st.raf = requestAnimationFrame(tick);
    }
    function start() { var tries = 0; (function attempt() { if (collect()) { cancelAnimationFrame(st.raf); tick(); } else if (++tries < 40) setTimeout(attempt, 150); })(); }
    frame.addEventListener('load', start);
    playBtn.addEventListener('click', function () { var m = main(); if (!m) return; if (m.playState === 'finished') replay(); else if (m.playState === 'paused') play(); else pause(); });
    replayBtn.addEventListener('click', replay);
    scrub.addEventListener('pointerdown', function () { st.scrubbing = true; pause(); });
    scrub.addEventListener('input', function () { var ms = +scrub.value; st.scrubbing = true; pause(); setTime(ms); timeEl.textContent = (ms / 1000).toFixed(1) + ' s'; loopEl.textContent = 'scrubbing · loop 1 / ' + LOOPS; loopEl.className = 'loop'; });
    scrub.addEventListener('change', function () { st.scrubbing = false; });
    scrub.addEventListener('pointerup', function () { st.scrubbing = false; });
    card._replay = replay;
    var d = doc(); if (d && d.readyState === 'complete' && d.getAnimations && d.getAnimations().length) start();
  }
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card')); cards.forEach(bind);
  document.getElementById('replayAll').addEventListener('click', function () { cards.forEach(function (c) { c._replay && c._replay(); }); });
})();