'use strict';
/* ═══════════════════════════════════════════════════════════════════
   ChordCraft Audio Engine
   Web Audio API — no dependencies, no external files.
   Synthesises piano-style chord playback with strum effect.
═══════════════════════════════════════════════════════════════════ */

const AUDIO = (() => {

  // ── Audio context (lazy — requires user gesture) ─────────────────
  let _ctx = null;
  let _compressor = null;

  function ctx() {
    if (!_ctx) {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Master limiter so stacked oscillators don't clip
      _compressor = _ctx.createDynamicsCompressor();
      _compressor.threshold.value = -12;
      _compressor.knee.value      = 6;
      _compressor.ratio.value     = 4;
      _compressor.attack.value    = 0.003;
      _compressor.release.value   = 0.25;
      _compressor.connect(_ctx.destination);
    }
    if (_ctx.state === 'suspended') _ctx.resume();
    return _ctx;
  }

  // ── Note → frequency ─────────────────────────────────────────────
  const NOTE_IDX = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 };
  const ENHARMONICS = { Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#' };

  function noteFreq(semitoneFromC4) {
    // C4 = MIDI 60 = 261.63 Hz; A4 = MIDI 69 = 440 Hz
    return 261.6255653 * Math.pow(2, semitoneFromC4 / 12);
  }

  // ── Chord quality → interval sets (semitones from root) ──────────
  const INTERVALS = {
    '':      [0, 4, 7],
    'm':     [0, 3, 7],
    '7':     [0, 4, 7, 10],
    'maj7':  [0, 4, 7, 11],
    'm7':    [0, 3, 7, 10],
    'dim':   [0, 3, 6],
    'dim7':  [0, 3, 6, 9],
    'm7b5':  [0, 3, 6, 10],
    'aug':   [0, 4, 8],
    'sus2':  [0, 2, 7],
    'sus4':  [0, 5, 7],
    'add9':  [0, 4, 7, 14],
    'maj9':  [0, 4, 7, 11, 14],
    'm9':    [0, 3, 7, 10, 14],
    '9':     [0, 4, 7, 10, 14],
    '6':     [0, 4, 7, 9],
    'm6':    [0, 3, 7, 9],
  };

  function parseChord(name) {
    let root, quality;
    if (name.length >= 2 && (name[1] === '#' || name[1] === 'b')) {
      root = name.slice(0, 2);
      quality = name.slice(2);
    } else {
      root = name.slice(0, 1);
      quality = name.slice(1);
    }
    root = ENHARMONICS[root] ?? root;
    return { root, quality: quality || '' };
  }

  function chordFrequencies(chordName) {
    const { root, quality } = parseChord(chordName);
    const rootIdx = NOTE_IDX[root];
    if (rootIdx === undefined) return [];

    const ivls = INTERVALS[quality] ?? INTERVALS[''];

    // Voice the chord: bass note one octave below, upper notes in octave 4
    return ivls.map((interval, i) => {
      const octaveOffset = i === 0 ? -12 : 0; // bass an octave lower
      return noteFreq(rootIdx + interval + octaveOffset);
    });
  }

  // ── Single-note synthesiser (piano-like pluck) ────────────────────
  function synthNote(frequency, startTime, duration, gain = 0.18) {
    const c = ctx();

    // Triangle oscillator — warm, piano-body tone
    const osc = c.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = frequency;

    // Sine harmonic one octave up — adds brightness / attack click
    const osc2 = c.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = frequency * 2;

    const gainNode  = c.createGain();
    const gainNode2 = c.createGain();

    // ADSR for primary oscillator
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(gain,        startTime + 0.008); // fast attack
    gainNode.gain.exponentialRampToValueAtTime(gain * 0.55, startTime + 0.12); // decay
    gainNode.gain.setValueAtTime(gain * 0.55,          startTime + 0.12);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    // ADSR for harmonic (shorter, brighter)
    gainNode2.gain.setValueAtTime(0,           startTime);
    gainNode2.gain.linearRampToValueAtTime(gain * 0.28, startTime + 0.005);
    gainNode2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.35);

    osc.connect(gainNode);
    gainNode.connect(_compressor);
    osc2.connect(gainNode2);
    gainNode2.connect(_compressor);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
    osc2.start(startTime);
    osc2.stop(startTime + duration * 0.4 + 0.05);
  }

  // ── Play a single chord (with strum) ─────────────────────────────
  function playChord(chordName) {
    const freqs = chordFrequencies(chordName);
    if (!freqs.length) return;
    ctx(); // ensure context created

    const now = _ctx.currentTime;
    const STRUM_DELAY = 0.022; // 22ms between each note = natural strum

    freqs.forEach((freq, i) => {
      synthNote(freq, now + i * STRUM_DELAY, 1.6);
    });
  }

  // ── Play a full progression ───────────────────────────────────────
  let _playbackCallbacks = [];
  let _isPlaying = false;
  let _stopRequested = false;

  function playProgression(chords, onChordStart, onComplete) {
    stopPlayback();

    _isPlaying    = true;
    _stopRequested = false;
    ctx();

    const CHORD_DURATION = 1.6;   // seconds each chord rings
    const STRUM_DELAY    = 0.022;
    const now = _ctx.currentTime;

    chords.forEach((chord, ci) => {
      const chordStart = now + ci * CHORD_DURATION;
      const freqs = chordFrequencies(chord);
      freqs.forEach((freq, ni) => {
        synthNote(freq, chordStart + ni * STRUM_DELAY, CHORD_DURATION * 0.9, 0.14);
      });
    });

    // Visual callbacks via setTimeout (not Web Audio time, so approximate but fine)
    _playbackCallbacks = [];
    chords.forEach((_, ci) => {
      const tid = setTimeout(() => {
        if (!_stopRequested) onChordStart(ci);
      }, ci * CHORD_DURATION * 1000);
      _playbackCallbacks.push(tid);
    });

    // Completion
    const doneTid = setTimeout(() => {
      if (!_stopRequested) {
        _isPlaying = false;
        onComplete();
      }
    }, chords.length * CHORD_DURATION * 1000);
    _playbackCallbacks.push(doneTid);
  }

  function stopPlayback() {
    _stopRequested = true;
    _isPlaying = false;
    _playbackCallbacks.forEach(clearTimeout);
    _playbackCallbacks = [];
  }

  function isPlaying() { return _isPlaying; }

  return { playChord, playProgression, stopPlayback, isPlaying };

})();
