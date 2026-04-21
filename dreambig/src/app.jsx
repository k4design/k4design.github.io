const { useState: useStateA, useEffect: useEffectA } = React;

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

  const goApply = () => {
    const el = document.getElementById('apply');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const goRecap = () => {
    const el = document.getElementById('recap');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
