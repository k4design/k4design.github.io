import { MODELS, DEFAULT_MODEL, modelById } from './lib/mj.js';

const $ = (id) => document.getElementById(id);
const CFG_KEYS = ['subject', 'model', 'target', 'maxCards', 'maxMinutes'];

for (const m of MODELS) {
  $('model').append(Object.assign(document.createElement('option'), {
    value: m.id,
    textContent: m.label,
  }));
}

function showRate() {
  const m = modelById($('model').value);
  $('rate').textContent = `$${m.priceIn}/$${m.priceOut} per Mtok in/out`;
}
$('model').addEventListener('change', showRate);

// Restore last-used config + key.
chrome.storage.local.get([...CFG_KEYS, 'apiKey']).then((s) => {
  for (const k of CFG_KEYS) if (s[k] !== undefined) $(k).value = s[k];
  // A stored id that no longer exists (retired model) would leave the select
  // blank, so fall back rather than submitting an empty model.
  if (!$('model').value) $('model').value = DEFAULT_MODEL;
  if (s.apiKey) $('apiKey').value = s.apiKey;
  showRate();
});

$('apiKey').addEventListener('change', (e) => {
  chrome.storage.local.set({ apiKey: e.target.value.trim() });
});

$('go').addEventListener('click', async () => {
  $('err').textContent = '';
  const cfg = {
    subject: $('subject').value.trim(),
    model: $('model').value || DEFAULT_MODEL,
    target: Number($('target').value),
    maxCards: Number($('maxCards').value),
    maxMinutes: Number($('maxMinutes').value),
  };
  if (!cfg.subject) { $('err').textContent = 'Enter a subject to match.'; return; }
  if (!(cfg.target > 0 && cfg.maxCards > 0 && cfg.maxMinutes > 0)) {
    $('err').textContent = 'Target and caps must all be greater than zero.';
    return;
  }

  await chrome.storage.local.set({ apiKey: $('apiKey').value.trim(), ...cfg });
  const res = await chrome.runtime.sendMessage({ cmd: 'start', cfg });
  if (!res?.ok) $('err').textContent = res?.error ?? 'Could not start.';
  render();
});

$('stop').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ cmd: 'stop' });
  render();
});

function render(s) {
  if (!s) return;
  $('go').disabled = s.active;
  $('stop').disabled = !s.active;

  if (s.startedAt) {
    const secs = Math.round(s.elapsedMs / 1000);
    $('stats').innerHTML =
      `<b>${s.matches}</b>/${s.target} matched &nbsp;·&nbsp; ` +
      `<b>${s.downloaded}</b> saved<br>` +
      `${s.scanned} scanned &nbsp;·&nbsp; ${s.judged} judged &nbsp;·&nbsp; ${s.queued} queued<br>` +
      `${Math.floor(secs / 60)}m ${secs % 60}s &nbsp;·&nbsp; ~$${s.cost.toFixed(3)} ` +
      `&nbsp;·&nbsp; ${modelById(s.model).label.split(' — ')[0]}` +
      (s.errors || s.refusals
        ? `<br>${s.errors} errors &nbsp;·&nbsp; ${s.refusals} refused`
        : '') +
      (s.active ? '' : `<br><b>${s.stopReason ?? 'idle'}</b>`);
  }
  $('log').textContent = (s.log || []).join('\n');
}

async function poll() {
  try {
    render(await chrome.runtime.sendMessage({ cmd: 'state' }));
  } catch {}
}
poll();
setInterval(poll, 700);
