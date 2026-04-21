const { useState: useStateT, useEffect: useEffectT } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "gold",
  "heroLine": "italic",
  "density": "airy"
}/*EDITMODE-END*/;

const ACCENTS = {
  gold:    { g1: '#B08D3F', g2: '#C9A75A' },
  ember:   { g1: '#B85A2E', g2: '#D07744' },
  sage:    { g1: '#7A8A5B', g2: '#9AAA78' },
  bone:    { g1: '#C5B79A', g2: '#DCD0B6' },
};

function applyTweaks(t) {
  const root = document.documentElement;
  const a = ACCENTS[t.accent] || ACCENTS.gold;
  root.style.setProperty('--gold', a.g1);
  root.style.setProperty('--gold-2', a.g2);

  if (t.density === 'dense') {
    root.style.setProperty('--pad-section', '84px');
  } else {
    root.style.setProperty('--pad-section', '140px');
  }

  // hero italic/upright
  document.querySelectorAll('.hero-title .line-1').forEach(el => {
    el.style.fontStyle = t.heroLine === 'italic' ? 'italic' : 'normal';
  });
}

function TweaksPanel({ open, onClose }) {
  const [t, setT] = useStateT(() => {
    try { return { ...TWEAK_DEFAULTS, ...(JSON.parse(localStorage.getItem('dbbs-tweaks') || '{}')) }; }
    catch { return { ...TWEAK_DEFAULTS }; }
  });

  useEffectT(() => {
    applyTweaks(t);
    localStorage.setItem('dbbs-tweaks', JSON.stringify(t));
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: t }, '*');
  }, [t]);

  if (!open) return null;

  return (
    <div className="tweaks">
      <h6>
        <span>Tweaks · Design</span>
        <span className="close" onClick={onClose}>✕</span>
      </h6>

      <div className="tweak-row">
        <div className="label">Accent</div>
        <div className="opts">
          {Object.keys(ACCENTS).map(k => (
            <button key={k} className={`opt ${t.accent === k ? 'on' : ''}`} onClick={() => setT(s => ({ ...s, accent: k }))}>{k}</button>
          ))}
        </div>
      </div>

      <div className="tweak-row">
        <div className="label">Hero line 1</div>
        <div className="opts">
          {['italic', 'upright'].map(k => (
            <button key={k} className={`opt ${t.heroLine === k ? 'on' : ''}`} onClick={() => setT(s => ({ ...s, heroLine: k }))}>{k}</button>
          ))}
        </div>
      </div>

      <div className="tweak-row">
        <div className="label">Density</div>
        <div className="opts">
          {['airy', 'dense'].map(k => (
            <button key={k} className={`opt ${t.density === k ? 'on' : ''}`} onClick={() => setT(s => ({ ...s, density: k }))}>{k}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

window.TweaksPanel = TweaksPanel;
window.applyInitialTweaks = () => applyTweaks({ ...TWEAK_DEFAULTS, ...(JSON.parse(localStorage.getItem('dbbs-tweaks') || '{}') || {}) });
