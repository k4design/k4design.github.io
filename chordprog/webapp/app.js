/* ═══════════════════════════════════════════════════════════════════
   ChordCraft Web App — app.js
   Vanilla JS, no dependencies. All API calls via fetch().
═══════════════════════════════════════════════════════════════════ */

'use strict';

// ── Constants ────────────────────────────────────────────────────
const API_URL   = 'https://api.anthropic.com/v1/messages';
const MODEL     = 'claude-sonnet-4-20250514';
const STORAGE   = { KEY: 'cc_api_key', SAVED: 'cc_saved', HISTORY: 'cc_history', ONBOARDED: 'cc_onboarded' };

const ALL_NOTES     = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const ENHARMONICS   = { Db:'C#', Eb:'D#', Gb:'F#', Ab:'G#', Bb:'A#' };
const MAJOR_IVLS    = [0,2,4,5,7,9,11];
const MINOR_IVLS    = [0,2,3,5,7,8,10];
const DORIAN_IVLS   = [0,2,3,5,7,9,10];
const MIXO_IVLS     = [0,2,4,5,7,9,10];
const LYDIAN_IVLS   = [0,2,4,6,7,9,11];
const PHRYG_IVLS    = [0,1,3,5,7,8,10];

const SCALE_MAP = {
  'Major': MAJOR_IVLS, 'Natural Minor': MINOR_IVLS, 'Dorian': DORIAN_IVLS,
  'Mixolydian': MIXO_IVLS, 'Lydian': LYDIAN_IVLS, 'Phrygian': PHRYG_IVLS
};

const SECTION_COLORS = {
  intro: '#6C7BFF', verse: '#4ECDC4', 'pre-chorus': '#A78BFA',
  chorus: '#F5A623', bridge: '#F87171', outro: '#6EE7B7'
};

// ── State ────────────────────────────────────────────────────────
const state = {
  screen: 'home',
  // mode: 'theory' (engine) or 'ai' (Anthropic API)
  sectionMode: 'theory',
  fullMode: 'theory',
  // section generator
  verseChords: [],
  detectedKey: 'C Major',
  selectedSections: new Set(['Chorus']),
  variations: 2,
  sectionGenre: 'Pop',
  sectionResults: [],
  // full song
  key: 'C', scale: 'Major', genre: 'Pop', mood: '',
  songStructure: null,
  // shared
  saved: [],
  history: [],
};

// ── Helpers ──────────────────────────────────────────────────────
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function noteIdx(note) {
  const n = ENHARMONICS[note] ?? note;
  return ALL_NOTES.indexOf(n);
}

function parseRoot(chord) {
  if (chord.length >= 2 && (chord[1] === '#' || chord[1] === 'b')) {
    return ENHARMONICS[chord.slice(0,2)] ? chord.slice(0,2) : chord.slice(0,2);
  }
  return chord[0].toUpperCase() === chord[0] ? chord[0] : null;
}

function parseQuality(chord) {
  const root = parseRoot(chord);
  return root ? chord.slice(root.length) : '';
}

function chordColorCategory(chord) {
  const q = parseQuality(chord).toLowerCase();
  if (!q || q === 'maj' || q === 'maj7' || q === 'add9') return 'major';
  if (q.startsWith('m') && !q.includes('maj'))           return 'minor';
  if (q === '7' || q.includes('dom'))                    return 'dominant';
  if (q === 'dim' || q === 'm7b5')                       return 'diminished';
  if (q === 'aug')                                       return 'augmented';
  if (q.includes('sus'))                                 return 'suspended';
  return 'other';
}

function chordColor(chord) {
  const map = { major:'--q-major', minor:'--q-minor', dominant:'--q-dom',
                diminished:'--q-dim', augmented:'--q-aug', suspended:'--q-sus', other:'--teal' };
  return `var(${map[chordColorCategory(chord)]})`;
}

function sectionColor(section) {
  return SECTION_COLORS[section.toLowerCase().replace(' ','-')] ?? 'var(--accent)';
}

function detectKey(chords) {
  const roots = chords.map(parseRoot).filter(Boolean);
  if (!roots.length) return 'C Major';
  let best = 'C Major', bestScore = -1;
  for (const note of ALL_NOTES) {
    for (const [name, ivls] of Object.entries(SCALE_MAP)) {
      const idx = noteIdx(note);
      if (idx === -1) continue;
      const scale = ivls.map(i => (idx + i) % 12);
      const score = roots.filter(r => scale.includes(noteIdx(r))).length;
      if (score > bestScore) { bestScore = score; best = `${note} ${name}`; }
    }
  }
  return best;
}

function getApiKey() {
  return localStorage.getItem(STORAGE.KEY) ?? '';
}

function saveToStorage() {
  localStorage.setItem(STORAGE.SAVED, JSON.stringify(state.saved));
  localStorage.setItem(STORAGE.HISTORY, JSON.stringify(state.history.slice(0, 10)));
}

function loadFromStorage() {
  try { state.saved   = JSON.parse(localStorage.getItem(STORAGE.SAVED)   || '[]'); } catch {}
  try { state.history = JSON.parse(localStorage.getItem(STORAGE.HISTORY) || '[]'); } catch {}
}

// ── Toast ────────────────────────────────────────────────────────
let toastTimer;
function showToast(msg, type = '') {
  const t = $('#toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// ── Screen navigation ────────────────────────────────────────────
function navigate(screenId) {
  $$('.screen').forEach(s => {
    s.classList.remove('active');
    s.style.display = 'none';
  });
  const target = $(`#${screenId}`);
  target.classList.add('active');
  target.style.display = 'flex';
  state.screen = screenId;
  // update nav active state
  $$('.nav-btn[data-screen]').forEach(b => {
    b.classList.toggle('active', b.dataset.screen === screenId);
  });
}

// ── Chord Picker Modal ───────────────────────────────────────────
const ROOTS = ['C','C#','Db','D','D#','Eb','E','F','F#','Gb','G','G#','Ab','A','A#','Bb','B'];
const QUALITIES = [
  ['', 'Major'], ['m', 'Minor'], ['7', 'Dom 7'], ['maj7', 'Maj 7'],
  ['m7', 'Min 7'], ['sus2', 'Sus2'], ['sus4', 'Sus4'], ['dim', 'Dim'],
  ['aug', 'Aug'], ['m7b5', 'm7♭5'], ['add9', 'Add9'],
];

let pickerRoot = 'C';
let pickerQuality = '';

function openChordPicker() {
  const overlay = $('#chord-picker-overlay');
  buildPicker();
  overlay.classList.add('open');
}

function closePicker() {
  $('#chord-picker-overlay').classList.remove('open');
}

function buildPicker() {
  const rootsEl = $('#picker-roots');
  const qualEl  = $('#picker-qualities');

  rootsEl.innerHTML = '';
  ROOTS.forEach(r => {
    const b = document.createElement('button');
    b.className = `picker-btn${r === pickerRoot ? ' sel' : ''}`;
    b.textContent = r;
    b.onclick = () => {
      pickerRoot = r;
      $$('.picker-btn', rootsEl).forEach(x => x.classList.toggle('sel', x.textContent === r));
      updatePickerPreview();
    };
    rootsEl.appendChild(b);
  });

  qualEl.innerHTML = '';
  QUALITIES.forEach(([val, label]) => {
    const b = document.createElement('button');
    b.className = `picker-btn${val === pickerQuality ? ' sel' : ''}`;
    b.textContent = label;
    b.onclick = () => {
      pickerQuality = val;
      $$('.picker-btn', qualEl).forEach(x => x.classList.toggle('sel', x.textContent === label));
      updatePickerPreview();
    };
    qualEl.appendChild(b);
  });

  updatePickerPreview();
}

function updatePickerPreview() {
  $('#picker-preview').textContent = pickerRoot + pickerQuality;
}

function confirmChord() {
  const chord = pickerRoot + pickerQuality;
  state.verseChords.push(chord);
  state.detectedKey = detectKey(state.verseChords);
  renderVerseChords();
  updateKeyDisplay();
  closePicker();
}

// ── Section Generator ────────────────────────────────────────────
function renderVerseChords() {
  const row = $('#verse-chord-row');
  row.innerHTML = '';

  state.verseChords.forEach((chord, i) => {
    const pill = document.createElement('span');
    pill.className = 'chord-pill';
    const col = chordColor(chord);
    pill.style.cssText = `background:${col}22;border-color:${col}55;color:${col}`;
    pill.innerHTML = `${chord}<button class="rm" title="Remove">✕</button>`;
    pill.querySelector('.rm').onclick = () => {
      state.verseChords.splice(i, 1);
      state.detectedKey = detectKey(state.verseChords);
      renderVerseChords();
      updateKeyDisplay();
    };
    row.appendChild(pill);
  });

  const addBtn = document.createElement('button');
  addBtn.className = 'add-chord-btn';
  addBtn.innerHTML = '＋ Add chord';
  addBtn.onclick = openChordPicker;
  row.appendChild(addBtn);
}

function updateKeyDisplay() {
  const el = $('#key-detected');
  if (el) el.textContent = state.detectedKey;
}

function renderSectionChips() {
  const sections = ['Pre-Chorus', 'Chorus', 'Bridge', 'Outro'];
  const group = $('#section-chips');
  group.innerHTML = '';
  sections.forEach(s => {
    const chip = document.createElement('button');
    chip.className = `chip${state.selectedSections.has(s) ? ' selected' : ''}`;
    chip.textContent = s;
    if (state.selectedSections.has(s)) {
      chip.style.background = sectionColor(s);
    }
    chip.onclick = () => {
      if (state.selectedSections.has(s)) {
        state.selectedSections.delete(s);
        chip.classList.remove('selected');
        chip.style.background = '';
      } else {
        state.selectedSections.add(s);
        chip.classList.add('selected');
        chip.style.background = sectionColor(s);
      }
    };
    group.appendChild(chip);
  });
}

function renderSectionResults(progressions) {
  const area = $('#section-results');
  area.innerHTML = '';

  if (!progressions.length) {
    area.innerHTML = `<div class="results-empty"><div class="empty-icon">🎵</div><p>Add verse chords and hit Generate to see AI progressions here.</p></div>`;
    return;
  }

  // Group by section
  const ORDER = ['Pre-Chorus','Chorus','Bridge','Outro'];
  const grouped = {};
  progressions.forEach(p => { (grouped[p.section] ??= []).push(p); });

  const header = document.createElement('div');
  header.className = 'results-header';
  header.innerHTML = `<span class="results-title">♩ Results</span>`;
  area.appendChild(header);

  ORDER.filter(s => grouped[s]).forEach(section => {
    grouped[section].forEach((p, idx) => {
      area.appendChild(buildResultCard(p, idx));
    });
  });
}

function buildResultCard(p, animIdx = 0) {
  const col = sectionColor(p.section);
  const isSaved = state.saved.some(s => s._id === p._id);

  const card = document.createElement('div');
  card.className = 'result-card';
  card.style.animationDelay = `${animIdx * 0.06}s`;

  const label = p.variation > 1 ? `${p.section} ${p.variation}` : p.section;

  card.innerHTML = `
    <div class="card-header">
      <span class="section-badge" style="background:${col}22;color:${col}">${label.toUpperCase()}</span>
      <div class="card-actions">
        <button class="icon-btn copy-btn" title="Copy chords">⎘</button>
        <button class="icon-btn fav-btn${isSaved ? ' fav-active' : ''}" title="${isSaved ? 'Unsave' : 'Save'}">♥</button>
      </div>
    </div>
    <div class="chord-display">
      ${(p.chords || []).map((ch, i) => `
        <div class="chord-cell">
          <span class="chord-name" style="background:${chordColor(ch)}22;border-color:${chordColor(ch)}55;color:${chordColor(ch)}">${ch}</span>
          <span class="chord-roman">${(p.romanNumerals || p.roman_numerals || [])[i] ?? ''}</span>
        </div>
      `).join('')}
    </div>
    <div class="feel-tag" style="color:${col}">
      ≋ ${p.feel || ''}
    </div>
    <div class="card-desc">${p.description || ''}</div>
  `;

  const copyBtn = card.querySelector('.copy-btn');
  copyBtn.onclick = () => {
    navigator.clipboard.writeText((p.chords || []).join(' - '));
    copyBtn.textContent = '✓';
    copyBtn.classList.add('copied');
    setTimeout(() => { copyBtn.textContent = '⎘'; copyBtn.classList.remove('copied'); }, 1500);
    showToast('Chords copied!', 'success');
  };

  const favBtn = card.querySelector('.fav-btn');
  favBtn.onclick = () => {
    if (state.saved.some(s => s._id === p._id)) {
      state.saved = state.saved.filter(s => s._id !== p._id);
      favBtn.classList.remove('fav-active');
      showToast('Removed from saved');
    } else {
      state.saved.push(p);
      favBtn.classList.add('fav-active');
      showToast('Saved! ♥', 'success');
    }
    saveToStorage();
  };

  return card;
}

async function generateSectionProgressions() {
  if (!state.verseChords.length) { showToast('Add at least one verse chord', 'error'); return; }
  if (!state.selectedSections.size) { showToast('Select at least one section', 'error'); return; }

  const btn = $('#section-gen-btn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    let progressions;

    if (state.sectionMode === 'theory') {
      // ── Theory engine (no API key needed) ──
      const [rootNote, ...scaleParts] = state.detectedKey.split(' ');
      const scaleName = scaleParts.join(' ') || 'Major';
      const data = ENGINE.generateSectionProgressions(
        state.verseChords,
        state.detectedKey,
        scaleName,
        [...state.selectedSections],
        state.variations,
        state.sectionGenre
      );
      progressions = data.progressions;

    } else {
      // ── AI mode (Anthropic API) ──
      const apiKey = getApiKey();
      if (!apiKey) { showToast('Add your API key in Settings ⚙ to use AI mode', 'error'); return; }

      const prompt = `You are an expert music theorist and songwriter. Given a verse chord progression, generate musically coherent chord progressions for other song sections.

Verse chords: ${state.verseChords.join(', ')}
Detected key: ${state.detectedKey}
Generate progressions for: ${[...state.selectedSections].join(', ')}
Variations per section: ${state.variations}

Requirements:
- Each progression should be 4 chords unless musically justified
- Progressions must complement the verse harmonically
- Include Roman numeral analysis relative to ${state.detectedKey}
- Provide emotional context in the "feel" field
- Give a brief theory explanation in "description"

Respond ONLY with valid JSON, no markdown:
{
  "key": "${state.detectedKey}",
  "progressions": [
    {
      "section": "Chorus",
      "variation": 1,
      "chords": ["C", "G", "Am", "F"],
      "roman_numerals": ["I", "V", "vi", "IV"],
      "feel": "Anthemic and uplifting",
      "description": "Classic I-V-vi-IV creates a bright emotional lift from the verse"
    }
  ]
}`;
      const data = await callClaude(prompt, apiKey);
      progressions = (data.progressions || []).map(p => ({
        ...p, _id: crypto.randomUUID(), romanNumerals: p.roman_numerals || p.romanNumerals || []
      }));
    }

    state.sectionResults = progressions;
    renderSectionResults(progressions);
    state.history.unshift({ type: 'section', progressions, ts: Date.now() });
    saveToStorage();
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ── Full Song Generator ──────────────────────────────────────────
function renderSongStructure(structure) {
  const area = $('#song-results');
  area.innerHTML = '';

  if (!structure) {
    area.innerHTML = `<div class="results-empty"><div class="empty-icon">🎸</div><p>Set your parameters and generate a complete song structure.</p></div>`;
    return;
  }

  // top bar
  const topbar = document.createElement('div');
  topbar.className = 'song-topbar';
  topbar.innerHTML = `
    <div class="song-meta">
      <h3>${structure.key} ${structure.scale}</h3>
      <p>${structure.genre} · ${structure.overallFeel || structure.overall_feel || ''}</p>
    </div>
    <button class="nav-btn" id="share-song-btn">↑ Export</button>
  `;
  area.appendChild(topbar);

  topbar.querySelector('#share-song-btn').onclick = () => {
    const text = exportSong(structure);
    navigator.clipboard.writeText(text);
    showToast('Song chart copied to clipboard!', 'success');
  };

  // timeline
  const timeline = document.createElement('div');
  timeline.className = 'timeline';

  const sections = structure.sections || [];
  sections.forEach((sec, i) => {
    const col = sectionColor(sec.section);
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.innerHTML = `
      <div class="timeline-spine">
        <div class="spine-dot" style="background:${col}"></div>
        ${i < sections.length - 1 ? '<div class="spine-line"></div>' : ''}
      </div>
    `;

    const card = buildResultCard(sec, i);
    card.classList.add('timeline-card');
    item.appendChild(card);
    timeline.appendChild(item);
  });

  area.appendChild(timeline);
}

function exportSong(structure) {
  const lines = [
    `ChordCraft — ${structure.key} ${structure.scale} (${structure.genre})`,
    `Feel: ${structure.overallFeel || structure.overall_feel || ''}`,
    '',
    ...(structure.sections || []).flatMap(s => [`[${s.section}]`, (s.chords || []).join(' - '), ''])
  ];
  return lines.join('\n');
}

async function generateFullSong() {
  const btn = $('#full-gen-btn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    let structure;

    if (state.fullMode === 'theory') {
      // ── Theory engine ──
      const data = ENGINE.generateFullSong(state.key, state.scale, state.genre, state.mood);
      structure = {
        key: data.key,
        scale: data.scale,
        genre: data.genre,
        overallFeel: data.overall_feel,
        sections: data.progressions,
      };

    } else {
      // ── AI mode ──
      const apiKey = getApiKey();
      if (!apiKey) { showToast('Add your API key in Settings ⚙ to use AI mode', 'error'); return; }

      const prompt = `You are an expert music theorist and songwriter. Generate a complete song structure with chord progressions.

Parameters:
- Key: ${state.key}
- Scale/Mode: ${state.scale}
- Genre: ${state.genre}
- Emotional vibe: ${state.mood || 'not specified'}

Generate progressions for: Intro, Verse, Pre-Chorus, Chorus, Bridge, Outro

Requirements:
- Each section should have a distinct harmonic character but relate to the whole
- Use genre-appropriate chord vocabulary
- Roman numerals should be relative to ${state.key} ${state.scale}
- The intro and outro may reuse motifs from verse/chorus

Respond ONLY with valid JSON, no markdown:
{
  "key": "${state.key}",
  "scale": "${state.scale}",
  "genre": "${state.genre}",
  "overall_feel": "Description of the song's emotional arc",
  "progressions": [
    {
      "section": "Intro",
      "variation": 1,
      "chords": ["Am", "F", "C", "G"],
      "roman_numerals": ["i", "VI", "III", "VII"],
      "feel": "Mysterious and atmospheric",
      "description": "Sets the dark tonal center with natural minor movement"
    }
  ]
}`;
      const data = await callClaude(prompt, apiKey);
      const sections = (data.progressions || []).map(p => ({
        ...p, _id: crypto.randomUUID(), romanNumerals: p.roman_numerals || p.romanNumerals || []
      }));
      structure = {
        key: data.key || state.key,
        scale: data.scale || state.scale,
        genre: data.genre || state.genre,
        overallFeel: data.overall_feel || '',
        sections,
      };
    }

    state.songStructure = structure;
    renderSongStructure(structure);
    state.history.unshift({ type: 'fullSong', structure, ts: Date.now() });
    saveToStorage();
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// ── Anthropic API ────────────────────────────────────────────────
async function callClaude(prompt, apiKey) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message ?? `API error ${res.status}`);
  }

  const envelope = await res.json();
  const text = envelope.content?.[0]?.text ?? '';

  // Strip markdown fences
  const json = text
    .replace(/^```(?:json)?/m, '')
    .replace(/```$/m, '')
    .trim();

  return JSON.parse(json);
}

// ── Saved Screen ─────────────────────────────────────────────────
let savedFilter = 'All';

function renderSaved() {
  const container = $('#saved-list');
  container.innerHTML = '';

  const filtered = savedFilter === 'All'
    ? state.saved
    : state.saved.filter(p => p.section === savedFilter);

  if (!filtered.length) {
    container.innerHTML = `<div class="results-empty"><div class="empty-icon">♡</div><p>${state.saved.length ? 'No ' + savedFilter + ' progressions saved.' : 'Save progressions by tapping ♥ on any result card.'}</p></div>`;
    return;
  }

  // group
  const ORDER = ['Intro','Verse','Pre-Chorus','Chorus','Bridge','Outro'];
  const grouped = {};
  filtered.forEach(p => { (grouped[p.section] ??= []).push(p); });

  ORDER.filter(s => grouped[s]).forEach(section => {
    const label = document.createElement('p');
    label.style.cssText = `font-size:.7rem;font-weight:700;letter-spacing:.06em;color:${sectionColor(section)};margin-bottom:6px;margin-top:8px`;
    label.textContent = section.toUpperCase();
    container.appendChild(label);

    grouped[section].forEach((p, i) => {
      const card = buildResultCard(p, i);
      container.appendChild(card);
    });
  });
}

function buildSavedFilterChips() {
  const sections = ['All','Chorus','Verse','Pre-Chorus','Bridge','Outro','Intro'];
  const group = $('#saved-filter');
  group.innerHTML = '';
  sections.forEach(s => {
    const c = document.createElement('button');
    c.className = `chip${s === savedFilter ? ' selected' : ''}`;
    c.textContent = s;
    if (s === savedFilter && s !== 'All') c.style.background = sectionColor(s);
    else if (s === savedFilter) c.style.background = 'var(--accent)';
    c.onclick = () => {
      savedFilter = s;
      buildSavedFilterChips();
      renderSaved();
    };
    group.appendChild(c);
  });
}

// ── Settings Screen ──────────────────────────────────────────────
function renderSettings() {
  const keyEl  = $('#settings-key-input');
  const status = $('#key-status');
  const stored = getApiKey();

  keyEl.value = stored;
  if (stored) {
    status.className = 'key-status ok';
    status.innerHTML = '✓ API key configured';
  } else {
    status.className = 'key-status missing';
    status.innerHTML = '✗ No API key — needed to generate';
  }
}

// ── Onboarding ───────────────────────────────────────────────────
function checkOnboarding() {
  const seen = localStorage.getItem(STORAGE.ONBOARDED);
  if (!seen) {
    navigate('onboarding');
  } else {
    navigate('home');
  }
}

// ── Genre chips (full song) ──────────────────────────────────────
const GENRES = ['Pop','Rock','Folk','Jazz','R&B','Country','Electronic'];

function renderGenreChips() {
  const group = $('#genre-chips');
  group.innerHTML = '';
  GENRES.forEach(g => {
    const c = document.createElement('button');
    c.className = `chip${state.genre === g ? ' selected' : ''}`;
    c.textContent = g;
    if (state.genre === g) c.style.background = 'var(--teal)';
    c.onclick = () => {
      state.genre = g;
      renderGenreChips();
    };
    group.appendChild(c);
  });
}

// ── Wire up DOM ──────────────────────────────────────────────────
function init() {
  loadFromStorage();

  // Nav
  $$('[data-screen]').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.screen;
      navigate(s);
      if (s === 'saved') { buildSavedFilterChips(); renderSaved(); }
      if (s === 'settings') renderSettings();
    });
  });

  // Mode cards on home
  $('#card-section').addEventListener('click', () => navigate('section'));
  $('#card-full').addEventListener('click', () => navigate('full'));
  $('#home-saved-btn').addEventListener('click', () => { buildSavedFilterChips(); renderSaved(); navigate('saved'); });

  // ── Mode toggles ───────────────────────────
  function wireToggle(toggleId, modeKey) {
    const toggle = $(`#${toggleId}`);
    if (!toggle) return;
    toggle.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state[modeKey] = btn.dataset.mode;
        toggle.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b === btn));
        // Show/hide AI key reminder
        if (btn.dataset.mode === 'ai' && !getApiKey()) {
          showToast('Add an API key in Settings ⚙ to use AI mode');
        }
      });
    });
  }
  wireToggle('section-mode-toggle', 'sectionMode');
  wireToggle('full-mode-toggle', 'fullMode');

  // ── Section genre chips ─────────────────────
  function renderSectionGenreChips() {
    const group = $('#section-genre-chips');
    group.innerHTML = '';
    GENRES.forEach(g => {
      const c = document.createElement('button');
      c.className = `chip${state.sectionGenre === g ? ' selected' : ''}`;
      c.textContent = g;
      if (state.sectionGenre === g) c.style.background = 'var(--accent)';
      c.onclick = () => { state.sectionGenre = g; renderSectionGenreChips(); };
      group.appendChild(c);
    });
  }
  renderSectionGenreChips();

  // ── Section Generator ──────────────────────
  renderVerseChords();
  renderSectionChips();

  // Variation stepper
  const varDisplay = $('#variation-count');
  $('#var-minus').addEventListener('click', () => {
    if (state.variations > 1) { state.variations--; varDisplay.textContent = state.variations; }
    $('#var-minus').disabled = state.variations <= 1;
  });
  $('#var-plus').addEventListener('click', () => {
    if (state.variations < 4) { state.variations++; varDisplay.textContent = state.variations; }
    $('#var-plus').disabled = state.variations >= 4;
  });

  $('#section-gen-btn').addEventListener('click', generateSectionProgressions);

  // Default empty state
  renderSectionResults([]);

  // ── Full Song Generator ────────────────────
  // Key select
  const keySelect = $('#key-select');
  ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].forEach(k => {
    const o = document.createElement('option');
    o.value = o.textContent = k;
    keySelect.appendChild(o);
  });
  keySelect.addEventListener('change', () => { state.key = keySelect.value; });

  // Scale select
  const scaleSelect = $('#scale-select');
  Object.keys(SCALE_MAP).forEach(s => {
    const o = document.createElement('option');
    o.value = o.textContent = s;
    scaleSelect.appendChild(o);
  });
  scaleSelect.addEventListener('change', () => { state.scale = scaleSelect.value; });

  renderGenreChips();

  $('#mood-input').addEventListener('input', e => { state.mood = e.target.value; });
  $('#full-gen-btn').addEventListener('click', generateFullSong);
  renderSongStructure(null);

  // ── Chord Picker ───────────────────────────
  $('#chord-picker-overlay').addEventListener('click', e => {
    if (e.target === $('#chord-picker-overlay')) closePicker();
  });
  $('#picker-cancel').addEventListener('click', closePicker);
  $('#picker-add-btn').addEventListener('click', confirmChord);

  // ── Settings ───────────────────────────────
  $('#save-key-btn').addEventListener('click', () => {
    const val = $('#settings-key-input').value.trim();
    localStorage.setItem(STORAGE.KEY, val);
    renderSettings();
    showToast('API key saved ✓', 'success');
  });
  $('#clear-key-btn').addEventListener('click', () => {
    localStorage.removeItem(STORAGE.KEY);
    $('#settings-key-input').value = '';
    renderSettings();
    showToast('API key cleared');
  });
  $('#toggle-key-vis').addEventListener('click', () => {
    const inp = $('#settings-key-input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
    $('#toggle-key-vis').textContent = inp.type === 'password' ? '👁' : '🙈';
  });

  // ── Onboarding ──────────────────────────────
  $('#ob-save-btn').addEventListener('click', () => {
    const val = $('#ob-key-input').value.trim();
    if (val) localStorage.setItem(STORAGE.KEY, val);
    localStorage.setItem(STORAGE.ONBOARDED, '1');
    navigate('home');
  });
  $('#ob-skip-btn').addEventListener('click', () => {
    localStorage.setItem(STORAGE.ONBOARDED, '1');
    navigate('home');
  });

  // Check onboarding
  checkOnboarding();
}

document.addEventListener('DOMContentLoaded', init);
