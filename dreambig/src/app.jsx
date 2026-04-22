const { useState: useStateA, useEffect: useEffectA } = React;

function smoothScroll(id, duration = 1000) {
  const el = document.getElementById(id);
  if (!el) return;
  const startY = window.scrollY;
  const targetY = el.getBoundingClientRect().top + startY;
  const diff = targetY - startY;
  let start = null;
  const ease = t => t < 0.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1;
  function step(ts) {
    if (!start) start = ts;
    const p = Math.min((ts - start) / duration, 1);
    window.scrollTo(0, startY + diff * ease(p));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}
window.smoothScroll = smoothScroll;

function App() {
  const [scrolled, setScrolled] = useStateA(false);
  const [showCta, setShowCta] = useStateA(false);
  const [tweaksOpen, setTweaksOpen] = useStateA(false);

  useEffectA(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      setShowCta(y > window.innerHeight * 0.6 && y < (document.body.scrollHeight - window.innerHeight - 600));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffectA(() => {
    const els = document.querySelectorAll('.anim');
    if (!els.length) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in-view'); obs.unobserve(e.target); }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  useEffectA(() => {
    const onMsg = (ev) => {
      const d = ev.data || {};
      if (d.type === '__activate_edit_mode') setTweaksOpen(true);
      if (d.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', onMsg);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    window.applyInitialTweaks && window.applyInitialTweaks();
    return () => window.removeEventListener('message', onMsg);
  }, []);

  const goApply = () => smoothScroll('apply');
  const goRecap = () => smoothScroll('recap');

  return (
    <div>
      <window.Nav scrolled={scrolled} onApply={goApply} />
      <window.Hero onApply={goApply} onWatch={goRecap} />
      <window.Marquee />
      <window.Recap />
      <window.Intro />
      <window.Pillars />
      <window.Gallery />
      <window.Itinerary />
      <window.Lineup />
      <window.Testimonial />
      <window.ApplySection />
      <window.Footer />

      <div className={`sticky-cta ${showCta ? 'on' : ''}`}>
        <a href="#apply" onClick={(e) => { e.preventDefault(); goApply(); }}>Reserve Your Seat · July 2026 →</a>
      </div>

      <window.TweaksPanel open={tweaksOpen} onClose={() => setTweaksOpen(false)} />
    </div>
  );
}

// Wait for all Babel scripts to hoist their components onto window
function mount() {
  if (!window.Nav || !window.Hero || !window.ApplySection || !window.TweaksPanel) {
    return setTimeout(mount, 40);
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
}
mount();
