'use strict';
/* ═══════════════════════════════════════════════════════════════════
   ChordCraft Music Theory Engine
   Pure JS — no dependencies, no API key required.
   Generates harmonically correct chord progressions via music theory.
═══════════════════════════════════════════════════════════════════ */

const ENGINE = (() => {

  // ── Constants ───────────────────────────────────────────────────
  const NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const ENHARMONICS = { Db:'C#', Eb:'D#', Gb:'F#', Ab:'G#', Bb:'A#' };

  const SCALES = {
    'Major':         [0,2,4,5,7,9,11],
    'Natural Minor': [0,2,3,5,7,8,10],
    'Dorian':        [0,2,3,5,7,9,10],
    'Mixolydian':    [0,2,4,5,7,9,10],
    'Lydian':        [0,2,4,6,7,9,11],
    'Phrygian':      [0,1,3,5,7,8,10],
  };

  // ── Progression Pattern Library ─────────────────────────────────
  // Roman numeral notation:
  //   uppercase = major  (I, IV, V, bVII …)
  //   lowercase = minor  (i, ii, vi …)
  //   suffixes  = quality extensions (maj7, m7, 7, sus4, add9 …)
  //   leading b = flat (bVI = flat-six)   # = sharp (#IV)
  const PATTERNS = {

    // ── CHORUS ─────────────────────────────────────────────────────
    chorus: {
      Pop: [
        { r: ['I','V','vi','IV'],        feel: 'Anthemic and euphoric',       desc: 'The "axis progression" — I-V-vi-IV is the most universally uplifting chord loop in modern pop.' },
        { r: ['IV','I','V','vi'],         feel: 'Warm and emotionally driven', desc: 'Starting on IV gives immediate warmth; moving through I and V to vi ends with emotional weight.' },
        { r: ['vi','IV','I','V'],         feel: 'Bittersweet and soaring',     desc: 'The vi opening adds shadows before lifting; resolves through I-V with irresistible forward motion.' },
        { r: ['I','IV','vi','V'],         feel: 'Hopeful and resolved',        desc: 'IV creates lift, vi adds depth, and V drives back — a classic arc from stability to momentum.' },
      ],
      Rock: [
        { r: ['I','bVII','IV','I'],       feel: 'Powerful and earthy',         desc: 'The flat VII is borrowed from the parallel minor — gives rock its raw, gritty momentum.' },
        { r: ['I','IV','V','IV'],         feel: 'Classic and driving',          desc: 'Blues-derived motion. V builds tension before IV resolves back — quintessential rock energy.' },
        { r: ['i','VI','III','VII'],      feel: 'Brooding and anthemic',        desc: 'Natural minor loop. Ubiquitous in rock choruses for its relentless, dark urgency.' },
        { r: ['I','bIII','IV','I'],       feel: 'Heavy and powerful',           desc: 'Borrowed bIII creates a darker, Dorian-flavoured colour — heavier than a straight major chorus.' },
      ],
      Folk: [
        { r: ['I','IV','V','I'],          feel: 'Warm and fully resolved',      desc: 'The three-chord folk cadence. Simple, true, and completely satisfying — timeless for a reason.' },
        { r: ['I','V','IV','I'],          feel: 'Breezy and open',              desc: 'V before IV gives a slightly freer, wandering resolve — less formal than I-IV-V.' },
        { r: ['vi','I','IV','V'],         feel: 'Wistful and rising',           desc: 'Opens on the relative minor, lifting through I and IV to a strong V peak.' },
        { r: ['I','ii','IV','V'],         feel: 'Sophisticated and hopeful',    desc: 'The ii chord adds a modal sophistication to the folk chorus without straying far.' },
      ],
      Jazz: [
        { r: ['IImaj7','V7','Imaj7','VIm7'],  feel: 'Sophisticated and resolved',   desc: 'ii-V-I with a VI turnaround — the jazz standard cadence extended to four chords.' },
        { r: ['Imaj7','VI7','IIm7','V7'],     feel: 'Circular and elegant',         desc: 'I-VI-ii-V rhythm changes. The most foundational jazz progression, lush with extensions.' },
        { r: ['IVmaj7','IIm7','V7','Imaj7'],  feel: 'Warm and resolved',            desc: 'Subdominant opening with a ii-V-I cadence — a satisfying, complete harmonic statement.' },
        { r: ['IIIm7','VI7','IIm7','V7'],     feel: 'Flowing and adventurous',      desc: 'Descending thirds through the circle of fifths — sophisticated motion with smooth voice leading.' },
      ],
      'R&B': [
        { r: ['Im7','VII','VI','VII'],    feel: 'Soulful and hypnotic',         desc: 'Minor tonic with oscillating VII-VI creates the smooth, groove-locked R&B loop.' },
        { r: ['I','iii','IV','V'],        feel: 'Silky and uplifting',          desc: 'The iii chord adds unexpected richness — gives an R&B chorus its sophisticated warmth.' },
        { r: ['vi','IV','I','iii'],       feel: 'Sultry and warm',              desc: 'Minor opening with a warm tonic centre; iii at the end adds a gentle harmonic surprise.' },
        { r: ['IVmaj7','V7','IIIm7','VIm'], feel: 'Lush and neo-soul',         desc: 'Extended harmony with smooth voice leading — this is Stevie Wonder / D\'Angelo territory.' },
      ],
      Country: [
        { r: ['I','IV','I','V'],          feel: 'Classic and heartfelt',        desc: 'The rocking I-IV with a V close — country music\'s most essential and honest motion.' },
        { r: ['I','V','IV','I'],          feel: 'Open and resolved',            desc: 'V before IV gives a slightly looser, more wandering country resolve.' },
        { r: ['IV','I','V','I'],          feel: 'Big and resolved',             desc: 'Opening on IV creates immediate fullness before landing cleanly on the tonic.' },
        { r: ['I','ii','IV','V'],         feel: 'Modern and hopeful',           desc: 'The ii gives a contemporary Nashville polish — sophisticated without losing country soul.' },
      ],
      Electronic: [
        { r: ['i','VI','III','VII'],      feel: 'Dark and hypnotic',            desc: 'The natural minor loop. Drop-ready and relentless — works at any tempo and any BPM.' },
        { r: ['I','V','vi','IV'],         feel: 'Euphoric and driving',         desc: 'Major version of the loop. Instantly euphoric — built for anthemic drop moments.' },
        { r: ['IV','I','vi','V'],         feel: 'Bright and uplifting',         desc: 'Starting on IV gives a lifted, spacious feel — perfect for trance and progressive house.' },
        { r: ['i','VII','VI','VII'],      feel: 'Driving and tense',            desc: 'Oscillating VII creates forward momentum and tension — great for build-up and drop.' },
      ],
    },

    // ── PRE-CHORUS ─────────────────────────────────────────────────
    preChorus: {
      Pop: [
        { r: ['vi','IV','I','V'],         feel: 'Building tension',             desc: 'Opens in shadow of the relative minor, climbing toward the dominant V peak — anticipation perfected.' },
        { r: ['ii','V','iii','VI'],       feel: 'Ascending and expectant',      desc: 'Smooth stepwise ascent through diatonic territory; iii-VI creates unexpected lift before the chorus.' },
        { r: ['IV','V','iii','vi'],       feel: 'Circular and rising',          desc: 'Deceptive cadence to vi sustains tension without full resolution — keeps the listener leaning forward.' },
        { r: ['I','IV','ii','V'],         feel: 'Confident and building',       desc: 'Stable tonic start, warms through IV and ii, then the V creates maximum dominant tension.' },
      ],
      Rock: [
        { r: ['IV','I','V','V'],          feel: 'Building to explosion',        desc: 'Double V at the end maximises dominant tension — the listener is primed for the chorus drop.' },
        { r: ['vi','IV','ii','V'],        feel: 'Dark and urgent',              desc: 'Opens on the relative minor for edge; drives through ii to a dominant V with urgency.' },
        { r: ['bVI','bVII','I','I'],      feel: 'Anthemic lift',                desc: 'Borrowed flat VI and VII create a "truck driver modulation" feel — massive momentum.' },
        { r: ['I','IV','V','V'],          feel: 'Straightforward and powerful', desc: 'Direct build through primary triads to a doubled V — simple, direct, effective.' },
      ],
      Folk: [
        { r: ['ii','IV','V','V'],         feel: 'Gentle build',                 desc: 'Soft ii opening, IV warmth, double V resolve — natural and unforced tension building.' },
        { r: ['I','iii','IV','V'],        feel: 'Warm and ascending',           desc: 'Stepwise ascent through diatonic chords — naturally leads into a big folk chorus.' },
        { r: ['vi','ii','IV','V'],        feel: 'Wistful and building',         desc: 'Opens on vi for emotional depth, gently builds through ii-IV to a satisfying V.' },
        { r: ['IV','IV','V','V'],         feel: 'Simple and effective',         desc: 'Sustained IV warmth before the double V — patient and purposeful tension building.' },
      ],
      Jazz: [
        { r: ['IIm7','V7','IIIm7','VI7'],    feel: 'Complex and expectant',    desc: 'Circle-of-fifths motion through ii-V patterns — harmonically sophisticated tension building.' },
        { r: ['IVmaj7','IIm7','V7','V7'],    feel: 'Lush and extended',        desc: 'Rich extended chords sustain interest while the double V7 creates classic dominant tension.' },
        { r: ['Imaj7','VI7','IIm7','V7'],    feel: 'Turnaround build',         desc: 'Classic I-VI-ii-V turnaround — jazz tension that feels inevitable and satisfying.' },
        { r: ['IIIm7','bIIImaj7','IIm7','V7'], feel: 'Chromatic and suspenseful', desc: 'Chromatic mediant descent adds harmonic intrigue before the ii-V drives to the chorus.' },
      ],
      'R&B': [
        { r: ['vi','IV','V','V'],         feel: 'Smooth build',                 desc: 'Minor start, IV warmth, double V creates silky anticipation before the groove drops.' },
        { r: ['IVmaj7','IIIm7','IIm7','V7'], feel: 'Descending and soulful',  desc: 'Descending diatonic thirds with extended harmony — a neo-soul pre-chorus with real depth.' },
        { r: ['I','iii','IV','V'],        feel: 'Lush and building',            desc: 'iii chord adds colour, subdominant warmth, then V creates clean dominant tension.' },
        { r: ['vi','ii','V','V'],         feel: 'Tense and expectant',          desc: 'Minor start builds through ii to a sustained dominant peak — maximum R&B anticipation.' },
      ],
      Country: [
        { r: ['IV','I','V','V'],          feel: 'Building naturally',           desc: 'Country-traditional with double V — simple and effective tension building.' },
        { r: ['I','IV','ii','V'],         feel: 'Confident build',              desc: 'The ii adds a touch of modernity to the classic country pre-chorus arc.' },
        { r: ['vi','IV','V','V'],         feel: 'Emotional build',              desc: 'Opens on relative minor for pathos before the double V drives into the chorus.' },
        { r: ['I','iii','IV','V'],        feel: 'Warm ascending build',         desc: 'Stepwise diatonic ascent — country pre-chorus that leads naturally into a big hook.' },
      ],
      Electronic: [
        { r: ['vi','VII','I','V'],        feel: 'Rising and tense',             desc: 'Chromatic ascent through VI-VII-I to the dominant — textbook electronic build-up.' },
        { r: ['iv','V','i','V'],          feel: 'Dark build',                   desc: 'Minor iv adds drama; oscillating V sustains maximum tension before the drop.' },
        { r: ['I','IV','vi','V'],         feel: 'Euphoric build',               desc: 'Classic pop motion used here to build drop anticipation — works at peak festival energy.' },
        { r: ['i','VI','VII','V'],        feel: 'Hypnotic ascent',              desc: 'Natural minor ascent with VII as a pivot to the dominant — atmospheric and inevitable.' },
      ],
    },

    // ── BRIDGE ─────────────────────────────────────────────────────
    bridge: {
      Pop: [
        { r: ['vi','iii','IV','I'],       feel: 'Reflective and emotional',     desc: 'Opens on relative minor for introspection; iii adds unexpected colour before a warm resolution.' },
        { r: ['IV','vi','I','V'],         feel: 'Bittersweet contrast',         desc: 'IV-vi creates emotional complexity — the bridge steps away from chorus energy.' },
        { r: ['bVI','bVII','I','IV'],     feel: 'Unexpected and uplifting',     desc: 'Borrowed flat chords create a completely different colour — a classic pop "lift" bridge.' },
        { r: ['ii','V','vi','IV'],        feel: 'Pensive and searching',        desc: 'ii-V suggests a new tonal centre; landing on vi sustains the harmonic surprise.' },
      ],
      Rock: [
        { r: ['bVI','bVII','i','bVII'],   feel: 'Dark and powerful',            desc: 'Parallel minor territory with borrowed chords — brooding contrast to the chorus energy.' },
        { r: ['i','VI','III','VII'],      feel: 'Minor introspection',          desc: 'Shifts to parallel minor for maximum emotional depth — classic rock bridge move.' },
        { r: ['IV','bVII','I','V'],       feel: 'Gritty and resolved',          desc: 'Flat VII creates a raw rock texture before I and V anchor the resolution.' },
        { r: ['IV','V','vi','IV'],        feel: 'Building and emotional',       desc: 'Deceptive cadence to vi creates a surprise landing; sustains energy through the bridge.' },
      ],
      Folk: [
        { r: ['vi','III','IV','V'],       feel: 'Wistful and ascending',        desc: 'Opens on relative minor; III creates an unexpected major lift before the V drives home.' },
        { r: ['I','iii','vi','IV'],       feel: 'Descending and pensive',       desc: 'Descending bass line through diatonic chords — folky introspection in four chords.' },
        { r: ['ii','V','I','IV'],         feel: 'Contemplative and warm',       desc: 'Gentle ii-V resolves peacefully; IV extends the reflective mood.' },
        { r: ['IV','I','ii','V'],         feel: 'Open and forward-moving',      desc: 'Slightly different harmonic order gives the bridge a fresh perspective on familiar chords.' },
      ],
      Jazz: [
        { r: ['bIIImaj7','VI7','bVImaj7','V7'], feel: 'Chromatic and adventurous', desc: 'Chromatic mediants take the harmony far afield — jazz says goodbye to the home key briefly.' },
        { r: ['IVmaj7','bVIImaj7','IIIm7','VI7'], feel: 'Complex and searching', desc: 'Tritone-related chord pairs create harmonic ambiguity — a quintessential jazz bridge move.' },
        { r: ['bIImaj7','V7','Imaj7','VIm7'],  feel: 'Neapolitan surprise',    desc: 'The Neapolitan (flat II) creates maximum harmonic surprise before the resolution.' },
        { r: ['IIm7b5','V7','Im7','IVm7'],     feel: 'Dark and modal',         desc: 'The m7b5 and Im7 suggest a modal minor shift — darkens the harmonic palette dramatically.' },
      ],
      'R&B': [
        { r: ['vi','IV','ii','V'],        feel: 'Soulful and introspective',    desc: 'Relative minor territory with ii-V cadence — smooth, soulful, and emotionally rich.' },
        { r: ['IVmaj7','IIIm7','vi','V'], feel: 'Descending and lush',         desc: 'Descending major-to-minor motion with extensions — neo-soul bridge perfection.' },
        { r: ['Im7','VII','bVI','V'],     feel: 'Parallel minor shift',         desc: 'Shifts to parallel minor for maximum contrast — intense, emotional, and unexpected.' },
        { r: ['ii','iii','IV','V'],       feel: 'Ascending and hopeful',        desc: 'Stepwise ascent through diatonic chords — builds from introspection to a final chorus push.' },
      ],
      Country: [
        { r: ['vi','IV','I','V'],         feel: 'Emotional and heartfelt',      desc: 'Opens on relative minor for honest pathos — country storytelling at its most direct.' },
        { r: ['IV','V','vi','I'],         feel: 'Deceptive and resolved',       desc: 'Deceptive cadence to vi before final tonic — emotionally complex country resolution.' },
        { r: ['ii','V','I','IV'],         feel: 'Warm and reflective',          desc: 'ii-V resolution with IV extension — a sophisticated country bridge.' },
        { r: ['I','IV','ii','V'],         feel: 'Forward and hopeful',          desc: 'Builds momentum toward the final chorus — the bridge that clears the air.' },
      ],
      Electronic: [
        { r: ['vi','IV','I','bVII'],      feel: 'Atmospheric breakdown',        desc: 'Minor start with flat VII gives an ethereal, breakdown quality — the stripped-back moment.' },
        { r: ['i','bVI','bVII','i'],      feel: 'Dark and cyclical',            desc: 'Natural minor loop works as a full breakdown section — the eye of the storm.' },
        { r: ['bVI','bVII','I','I'],      feel: 'Stadium euphoria lift',        desc: 'Flat VI and VII create maximum lift into the final drop — the crowd-raising bridge move.' },
        { r: ['IV','V','vi','bVII'],      feel: 'Building contrast',            desc: 'Shifts harmonic gravity before the final drop; bVII adds that electronic edge.' },
      ],
    },

    // ── OUTRO ──────────────────────────────────────────────────────
    outro: {
      Pop: [
        { r: ['I','V','vi','IV'],         feel: 'Familiar and fading',          desc: 'Repeating the chorus progression as the outro — naturally fades with satisfied warmth.' },
        { r: ['I','IV','I','I'],          feel: 'Settled and warm',             desc: 'Tonic-heavy with one IV colour — an unhurried, peaceful close.' },
        { r: ['vi','IV','I','I'],         feel: 'Wistful and closing',          desc: 'Minor opening fades into sustained tonic resolution — emotionally complete.' },
        { r: ['IV','I','IV','I'],         feel: 'Plagal and warm',              desc: 'Alternating IV and I — the "amen" cadence, deeply satisfying and complete.' },
      ],
      Rock: [
        { r: ['I','bVII','IV','I'],       feel: 'Rocking to the end',           desc: 'Goes out the same way it came in — the classic rock outro with full attitude intact.' },
        { r: ['I','IV','I','I'],          feel: 'Powerful resolution',          desc: 'Tonic-dominated with IV texture — a solid, grounded rock landing.' },
        { r: ['I','V','IV','I'],          feel: 'Blues-influenced close',       desc: 'V before IV gives the outro a blues-rock twang — timeless and completely satisfying.' },
        { r: ['i','VII','VI','VII'],      feel: 'Dark fade',                    desc: 'Minor loop fades — going out on a brooding, unresolved edge.' },
      ],
      Folk: [
        { r: ['I','IV','I','I'],          feel: 'Gentle and resolved',          desc: 'Simple and warm — a folk song saying goodbye with nothing to prove.' },
        { r: ['IV','I','V','I'],          feel: 'Full cadential close',         desc: 'Complete subdominant-tonic-dominant-tonic motion — a fully resolved folk farewell.' },
        { r: ['I','iii','IV','I'],        feel: 'Bittersweet close',            desc: 'The iii adds one last touch of wistfulness before the final tonic.' },
        { r: ['I','V','I','I'],           feel: 'Simple resolution',            desc: 'The most natural close — tonic-dominant-tonic. Complete and true.' },
      ],
      Jazz: [
        { r: ['IIm7','V7','Imaj7','Imaj7'],  feel: 'Resolved and complete',    desc: 'ii-V-I stretched out — jazz stating its resolution clearly and with full conviction.' },
        { r: ['Imaj7','VIm7','IIm7','V7'],   feel: 'Turnaround fade',          desc: 'Classic turnaround that could loop forever — the jazz outro standard.' },
        { r: ['IVmaj7','bIImaj7','Imaj7','Imaj7'], feel: 'Sophisticated close', desc: 'Neapolitan substitution before I — a classy, unexpected harmonic arrival.' },
        { r: ['IIIm7','VI7','IIm7','V7'],    feel: 'Circle fade',              desc: 'Circle of fifths motion fading — harmonically complete and elegantly inevitable.' },
      ],
      'R&B': [
        { r: ['Im7','VII','VI','VII'],    feel: 'Hypnotic groove fade',         desc: 'Minor groove loop fades — the smooth R&B outro that could go forever.' },
        { r: ['I','iii','IV','V'],        feel: 'Soulful fade',                 desc: 'Rich with the iii chord — a warm, soulful fade with genuine harmonic colour.' },
        { r: ['IVmaj7','Imaj7','IVmaj7','Imaj7'], feel: 'Gospel plagal close', desc: 'Alternating IV and I with extensions — lush, gospel-influenced, and complete.' },
        { r: ['I','IV','iii','vi'],       feel: 'Descending and surprising',    desc: 'Deceptive landing on vi — soulful, unexpected, and emotionally open-ended.' },
      ],
      Country: [
        { r: ['I','IV','I','V'],          feel: 'Rocking chair close',          desc: 'Country\'s natural rocking motion — the familiar, honest country farewell.' },
        { r: ['I','V','I','I'],           feel: 'Simple resolution',            desc: 'Clean dominant-tonic — country at its most direct and honest.' },
        { r: ['I','IV','V','I'],          feel: 'Full cadence close',           desc: 'Complete I-IV-V-I sign-off — country music fully resolved.' },
        { r: ['IV','I','IV','I'],         feel: 'Warm and peaceful',            desc: 'Alternating tonic and subdominant — country warmth fading peacefully.' },
      ],
      Electronic: [
        { r: ['i','VI','III','VII'],      feel: 'Hypnotic loop out',            desc: 'The minor loop fades — electronic music returning to the infinite cycle.' },
        { r: ['I','V','vi','IV'],         feel: 'Euphoric fade',                desc: 'Chorus loop continues into the outro — a triumphant, gradually fading close.' },
        { r: ['IV','I','IV','I'],         feel: 'Bright and spacious',          desc: 'Alternating IV-I creates an open, atmospheric fade — perfect for electronic production.' },
        { r: ['i','i','VII','VI'],        feel: 'Dark atmospheric fade',        desc: 'Tonic-heavy with slow descending motion — a moody, cinematic close.' },
      ],
    },

    // ── VERSE ──────────────────────────────────────────────────────
    verse: {
      Pop: [
        { r: ['I','V','vi','IV'],         feel: 'Flowing and natural',          desc: 'The fundamental pop loop — familiar, endlessly listenable, and emotionally open.' },
        { r: ['vi','IV','I','V'],         feel: 'Melancholic and grounded',     desc: 'Minor start gives depth; I and V in the second half provide warmth and stability.' },
        { r: ['I','iii','IV','V'],        feel: 'Ascending and hopeful',        desc: 'Stepwise ascent through diatonic chords — a verse that builds naturally toward the chorus.' },
        { r: ['I','IV','I','V'],          feel: 'Simple and effective',         desc: 'Rocking I-IV with V close — completely natural and unforced.' },
      ],
      Rock: [
        { r: ['I','bVII','IV','I'],       feel: 'Driving and powerful',         desc: 'The flat VII earns its place in rock by borrowing from the parallel minor — gritty and circular.' },
        { r: ['i','VII','VI','VII'],      feel: 'Brooding and relentless',      desc: 'Natural minor with oscillating VII — moody, dark, and impossible to stop.' },
        { r: ['I','IV','I','V'],          feel: 'Classic rock verse',           desc: 'Everything you need and nothing you don\'t — the foundational rock verse.' },
        { r: ['i','iv','V','i'],          feel: 'Minor with tension',           desc: 'Full minor cadence with authentic dominant V — real harmonic tension and release.' },
      ],
      Folk: [
        { r: ['I','IV','V','I'],          feel: 'Natural and storytelling',     desc: 'Three chords that have told a million stories — the folk verse in its purest form.' },
        { r: ['I','V','IV','I'],          feel: 'Breezy and open',              desc: 'V before IV gives a slightly more wandering, pastoral feel.' },
        { r: ['vi','I','IV','V'],         feel: 'Wistful and building',         desc: 'Opens on relative minor — gives the verse a touch of nostalgia and depth.' },
        { r: ['I','iii','IV','I'],        feel: 'Warm and contemplative',       desc: 'The iii chord adds unexpected colour to an otherwise simple folk verse.' },
      ],
      Jazz: [
        { r: ['IIm7','V7','Imaj7','VIm7'],   feel: 'Flowing and sophisticated', desc: 'ii-V-I with VI turnaround — the jazz standard verse foundation.' },
        { r: ['Imaj7','VI7','IIm7','V7'],    feel: 'Circular and elegant',      desc: 'I-VI-ii-V rhythm changes — the most used jazz progression for a reason.' },
        { r: ['IIIm7','VI7','IIm7','V7'],    feel: 'Descending and smooth',     desc: 'Descending thirds through the circle — creates a falling, liquid motion.' },
        { r: ['Imaj7','IVmaj7','IIIm7','VI7'], feel: 'Lush and ascending',     desc: 'Ascending diatonic motion with major seventh colours — rich and sophisticated.' },
      ],
      'R&B': [
        { r: ['Im7','VII','VI','VII'],    feel: 'Smooth and hypnotic',          desc: 'Minor groove with oscillating VII — the classic smooth R&B verse motion.' },
        { r: ['I','iii','IV','V'],        feel: 'Silky and sophisticated',      desc: 'The iii chord adds unexpected richness to what would otherwise be a basic pop verse.' },
        { r: ['vi','IV','I','V'],         feel: 'Soulful and warm',             desc: 'Minor start with soul — resolves warmly through I-V.' },
        { r: ['IVmaj7','IIIm7','IIm7','V7'], feel: 'Descending and lush',      desc: 'Descending diatonic thirds with extended harmony — a neo-soul verse with depth.' },
      ],
      Country: [
        { r: ['I','IV','I','V'],          feel: 'Traditional and warm',         desc: 'The foundation of a thousand country songs — honest, familiar, and deeply comfortable.' },
        { r: ['I','V','IV','I'],          feel: 'Open and wandering',           desc: 'Country verse with a natural, slightly more exploratory feel.' },
        { r: ['I','ii','IV','V'],         feel: 'Modern country verse',         desc: 'The ii gives a contemporary Nashville sheen without losing country soul.' },
        { r: ['vi','IV','I','V'],         feel: 'Emotional storytelling',       desc: 'Opens on vi for heartfelt pathos — country storytelling at its most direct.' },
      ],
      Electronic: [
        { r: ['i','VI','III','VII'],      feel: 'Dark and hypnotic',            desc: 'The natural minor loop — minimal, repeatable, and endlessly effective.' },
        { r: ['I','V','vi','IV'],         feel: 'Bright and driving',           desc: 'Major loop works brilliantly as an electronic verse — energetic and focused.' },
        { r: ['i','VII','VI','V'],        feel: 'Descending and driving',       desc: 'Descending natural minor motion creates a sense of falling forward momentum.' },
        { r: ['I','I','IV','vi'],         feel: 'Minimalist and building',      desc: 'Tonic-heavy with one harmonic surprise at the end — builds tension slowly.' },
      ],
    },

    // ── INTRO ──────────────────────────────────────────────────────
    intro: {
      Pop: [
        { r: ['I','V','vi','IV'],         feel: 'Inviting and familiar',        desc: 'Opens with the full chorus/verse loop — sets the tonal world immediately.' },
        { r: ['vi','IV','I','V'],         feel: 'Mysterious and warm',          desc: 'Minor start creates intrigue; I and V confirm the key and promise resolution.' },
        { r: ['I','IV','V','I'],          feel: 'Bright and declarative',       desc: 'A clear tonal statement that declares the key and welcomes the listener in.' },
        { r: ['I','iii','IV','V'],        feel: 'Ascending and hopeful',        desc: 'Stepwise ascent sets an optimistic mood from the very first bar.' },
      ],
      Rock: [
        { r: ['I','bVII','IV','I'],       feel: 'Powerful opener',              desc: 'The classic rock riff progression — announces the song\'s attitude immediately.' },
        { r: ['i','VII','VI','VII'],      feel: 'Dark and atmospheric',         desc: 'Minor intro creates brooding tension before the song proper kicks in.' },
        { r: ['I','IV','V','I'],          feel: 'Confident and direct',         desc: 'Three-chord rock statement — simple, direct, and completely effective.' },
        { r: ['I','I','IV','V'],          feel: 'Building from stillness',      desc: 'Rests on I before motion begins — creates anticipation and weight.' },
      ],
      Folk: [
        { r: ['I','IV','I','V'],          feel: 'Warm and welcoming',           desc: 'Rocking folk motion — immediately sets a comfortable, inviting mood.' },
        { r: ['I','V','IV','I'],          feel: 'Open and pastoral',            desc: 'Simple diatonic statement that feels like the beginning of a journey.' },
        { r: ['vi','I','IV','V'],         feel: 'Wistful opener',               desc: 'Relative minor start gives the intro a touch of nostalgia and depth.' },
        { r: ['I','iii','IV','I'],        feel: 'Contemplative opening',        desc: 'The iii chord adds unexpected colour to a simple folk introduction.' },
      ],
      Jazz: [
        { r: ['Imaj7','VIm7','IIm7','V7'],    feel: 'Sophisticated opener',     desc: 'I-VI-ii-V turnaround sets the jazz harmonic language from bar one.' },
        { r: ['IIm7','V7','Imaj7','VIm7'],    feel: 'Direct jazz statement',    desc: 'Opens with ii-V resolution — immediately establishes jazz syntax.' },
        { r: ['IIIm7','VI7','IIm7','V7'],     feel: 'Circle of fifths intro',   desc: 'Descending thirds establish a flowing, sophisticated harmonic language.' },
        { r: ['Imaj7','bIIImaj7','IIm7','V7'], feel: 'Chromatic intrigue',      desc: 'Chromatic mediant bIII immediately signals harmonic sophistication.' },
      ],
      'R&B': [
        { r: ['Im7','VII','VI','VII'],    feel: 'Smooth and sultry',            desc: 'Minor groove intro — sets the mood before the vocal enters.' },
        { r: ['I','iii','IV','V'],        feel: 'Lush opening',                 desc: 'Rich with the iii chord — immediately sets a sophisticated R&B palette.' },
        { r: ['vi','IV','I','V'],         feel: 'Soulful opener',               desc: 'Opens with emotional depth — the arc is satisfying from the first bar.' },
        { r: ['IVmaj7','IIIm7','IIm7','V7'], feel: 'Descending lush intro',    desc: 'Descending extended harmony — a neo-soul introduction with immediate depth.' },
      ],
      Country: [
        { r: ['I','IV','I','V'],          feel: 'Traditional and welcoming',    desc: 'Classic country motion from bar one — the listener knows exactly where they are.' },
        { r: ['I','V','IV','I'],          feel: 'Open and inviting',            desc: 'Natural country motion — casual and welcoming, like a front porch.' },
        { r: ['I','IV','V','I'],          feel: 'Declarative country opening',  desc: 'Complete I-IV-V-I statement opens with confidence and country honesty.' },
        { r: ['I','I','IV','V'],          feel: 'Building from calm',           desc: 'Rests on I before motion begins — sets a patient, storytelling pace.' },
      ],
      Electronic: [
        { r: ['i','VI','III','VII'],      feel: 'Dark atmospheric build',       desc: 'Minor loop starts the journey — builds energy before the first drop.' },
        { r: ['I','V','vi','IV'],         feel: 'Euphoric loop intro',          desc: 'Major loop opens with euphoria — sets the dance floor energy immediately.' },
        { r: ['i','i','VII','VI'],        feel: 'Minimal and hypnotic',         desc: 'Tonic-heavy with slow movement — perfect for a gradual electronic build.' },
        { r: ['IV','I','IV','I'],         feel: 'Bright and spacious',          desc: 'Alternating IV-I creates an open, atmospheric quality — room to breathe.' },
      ],
    },
  };

  // ── Roman Numeral → Chord Name ──────────────────────────────────
  function noteIndex(note) {
    return NOTES.indexOf(ENHARMONICS[note] ?? note);
  }

  function romanToChord(roman, rootNote, scaleName) {
    const intervals = SCALES[scaleName] || SCALES['Major'];
    const rootIdx = noteIndex(rootNote);
    if (rootIdx === -1) return roman;

    let r = roman;
    let semiMod = 0;
    while (r.startsWith('b') && r.length > 1) { semiMod--; r = r.slice(1); }
    while (r.startsWith('#') && r.length > 1) { semiMod++; r = r.slice(1); }

    // Match numeral (longest first, case-insensitive for degree)
    const NUMERALS = [['VII',6],['VI',5],['IV',3],['III',2],['II',1],['V',4],['I',0]];
    let degree = -1, numLen = 0;
    const upper = r.toUpperCase();
    for (const [num, deg] of NUMERALS) {
      if (upper.startsWith(num)) { degree = deg; numLen = num.length; break; }
    }
    if (degree === -1) return roman;

    const isMinorNumeral = r[0] >= 'a' && r[0] <= 'z';
    let suffix = r.slice(numLen);

    // If lowercase with no suffix → minor
    if (isMinorNumeral && !suffix) suffix = 'm';
    // If lowercase with suffix that isn't already a quality → prepend m
    else if (isMinorNumeral && suffix && !suffix.startsWith('m') && !suffix.startsWith('dim') && !suffix.startsWith('aug') && !suffix.startsWith('sus')) {
      suffix = 'm' + suffix;
    }

    const semitones = ((intervals[degree] ?? 0) + semiMod + 1200) % 12;
    const noteIdx = (rootIdx + semitones) % 12;
    return NOTES[noteIdx] + suffix;
  }

  // ── Pick patterns with variety (session counter) ────────────────
  let _callCount = 0;

  function pickPatterns(patternList, count) {
    const offset = _callCount++ % patternList.length;
    const result = [];
    for (let i = 0; i < count && i < patternList.length; i++) {
      result.push(patternList[(offset + i) % patternList.length]);
    }
    return result;
  }

  // ── Public API ──────────────────────────────────────────────────
  function generateSectionProgressions(verseChords, key, scaleName, sections, variationCount, genre) {
    const [rootNote] = key.split(' ');
    const progressions = [];

    const SECTION_KEY_MAP = {
      'pre-chorus': 'preChorus', 'prechorus': 'preChorus',
      'chorus': 'chorus', 'bridge': 'bridge', 'outro': 'outro',
    };

    for (const section of sections) {
      const patternKey = SECTION_KEY_MAP[section.toLowerCase().replace(/\s+/g, '-')] || 'chorus';
      const genrePatterns = PATTERNS[patternKey]?.[genre] || PATTERNS[patternKey]?.['Pop'] || [];
      const picked = pickPatterns(genrePatterns, variationCount);

      picked.forEach((pattern, idx) => {
        const chords = pattern.r.map(r => romanToChord(r, rootNote, scaleName));
        progressions.push({
          section,
          variation: idx + 1,
          chords,
          romanNumerals: pattern.r,
          feel: pattern.feel,
          description: pattern.desc,
          _id: `${section}-${idx}-${Date.now()}`,
        });
      });
    }

    return { key: `${rootNote} ${scaleName}`, progressions };
  }

  function generateFullSong(rootNote, scaleName, genre, mood) {
    const ORDER = [
      { key: 'intro',     label: 'Intro' },
      { key: 'verse',     label: 'Verse' },
      { key: 'preChorus', label: 'Pre-Chorus' },
      { key: 'chorus',    label: 'Chorus' },
      { key: 'bridge',    label: 'Bridge' },
      { key: 'outro',     label: 'Outro' },
    ];

    const progressions = ORDER.map(({ key, label }, i) => {
      const genrePatterns = PATTERNS[key]?.[genre] || PATTERNS[key]?.['Pop'] || [];
      const pattern = genrePatterns[(_callCount++ + i) % genrePatterns.length] || genrePatterns[0];
      if (!pattern) return null;

      const chords = pattern.r.map(r => romanToChord(r, rootNote, scaleName));
      return {
        section: label,
        variation: 1,
        chords,
        romanNumerals: pattern.r,
        feel: pattern.feel,
        description: pattern.desc,
        _id: `full-${key}-${Date.now()}`,
      };
    }).filter(Boolean);

    const moodClause = mood ? ` with a ${mood} quality` : '';
    const overallFeel = `A ${genre} song in ${rootNote} ${scaleName}${moodClause}. The structure moves from an establishing intro through verse development, a pre-chorus build, an emotional chorus peak, a contrasting bridge, and resolves in the outro.`;

    return { key: rootNote, scale: scaleName, genre, overall_feel: overallFeel, progressions };
  }

  return { generateSectionProgressions, generateFullSong };
})();
