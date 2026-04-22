const { useState: usePHState, useEffect: usePHEffect, useRef: usePHRef } = React;

// ── Real sample imagery ────────────────────────────────────────────────
// Unsplash source URLs (public hotlink-friendly photo CDN). Each key maps
// label-keywords → a curated photo id + alt text. We pick by matching
// keywords from the slot label so every placeholder gets an on-topic image.

const PHOTO_LIBRARY = [
  // Mountain / landscape
  { keys: ['aerial', 'gallatin', 'range', 'golden hour'], url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=80' }, // alpine golden hour
  { keys: ['river', 'morning', 'fly fish', 'gallatin river'], url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1600&q=80' }, // mountain river
  { keys: ['horseback', 'ride', 'meadow', 'spanish peaks'], url: 'https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?auto=format&fit=crop&w=1600&q=80' }, // horses in meadow
  { keys: ['ridge', 'stars', 'astronomer', 'cassiopeia', 'night'], url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1600&q=80' }, // milky way mountains
  { keys: ['departure', 'strip', 'morning light'], url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1600&q=80' }, // misty mountain valley
  { keys: ['walk out', 'trail', 'capital walk'], url: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=1600&q=80' }, // trail
  { keys: ['cold plunge', 'plunge'], url: 'https://images.unsplash.com/photo-1502014822147-1aedfb0676e0?auto=format&fit=crop&w=1600&q=80' }, // cold river

  // Ranch / dining / interior
  { keys: ['long table', 'ranch dinner', 'ranch supper', 'lone mountain'], url: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1800&q=80' }, // warm restaurant long table
  { keys: ['barn', 'opening dinner', 'dusk'], url: 'https://images.unsplash.com/photo-1464207687429-7505649dae38?auto=format&fit=crop&w=1800&q=80' }, // wood barn warm light
  { keys: ['midnight table', 'candlelight', 'signed napkin', 'midnight'], url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1600&q=80' }, // candle dinner
  { keys: ['fireside', 'keynote', 'barn interior', 'low light'], url: 'https://images.unsplash.com/photo-1485872299712-53dd708e0b85?auto=format&fit=crop&w=1600&q=80' }, // fireside warm
  { keys: ['whiskey', 'leather', 'notebook', 'signed deal'], url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?auto=format&fit=crop&w=1600&q=80' }, // whiskey + notebook
  { keys: ['roundtable', 'north cabin', 'handwritten agenda'], url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1600&q=80' }, // roundtable meeting

  // Portraits — candid, muted
  { keys: ['margaux', 'developer', 'hospitality'], url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=900&q=80' },
  { keys: ['elias', 'allocator', 'private equity'], url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=80' },
  { keys: ['sana', 'founder', 'proptech'], url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80' },
  { keys: ['charlie', 'land & ag', 'cattle'], url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&w=900&q=80' },
  { keys: ['teresa', 'morning walk'], url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=900&q=80' },
  { keys: ['harrison', 'vale', 'day 04'], url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80' },
  { keys: ['noor', 'cresto', 'cresset'], url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=900&q=80' },
  { keys: ['candid', 'portrait', 'operator'], url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=900&q=80' },
];

function pickPhoto(label = '') {
  const l = String(label).toLowerCase();
  for (const entry of PHOTO_LIBRARY) {
    if (entry.keys.some(k => l.includes(k))) return entry.url;
  }
  // Fallback: a generic editorial mountain shot
  return 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80';
}

// Stylized image with real photography behind it
function Photo({ label, variant = 'dark', style = {}, className = '' }) {
  const url = label.startsWith('assets/') ? label : pickPhoto(label);
  const bg = {
    backgroundImage: `linear-gradient(180deg, rgba(10,9,8,0) 40%, rgba(10,9,8,${variant === 'light' ? 0.2 : 0.55}) 100%), url(${url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
  return (
    <div className={`img-ph real ${variant === 'light' ? 'light' : ''} ${className}`} style={{ ...bg, ...style }}>
      {!label.startsWith('assets/') && <div className="lbl">{label}</div>}
    </div>
  );
}

// Hero background — last year's recap film, played ambient (muted, loop)
// behind the hero copy. Clicking "Watch Film" (below) scrolls to the full
// player section where the user can unmute and play with sound.
function HeroMedia({ label }) {
  return (
    <div className="hero-video-wrap">
      <wistia-player
        media-id="ovtazqlroz"
        aspect="1.7777777777777777"
        autoplay="true"
        muted="true"
        silentautoplay="true"
        end-video-behavior="loop"
        playbar="false"
        playbutton="false"
        smallplaybutton="false"
        volumecontrol="false"
        fullscreenbutton="false"
        settingscontrol="false"
        controlsvisibleonload="false"
        class="hero-wistia"
      ></wistia-player>
    </div>
  );
}

window.Photo = Photo;
window.HeroMedia = HeroMedia;
