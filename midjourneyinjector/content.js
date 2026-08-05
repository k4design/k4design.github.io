// Queue engine. Runs on midjourney.com and types each prompt into the input bar,
// submitting them back to back without waiting for any job to finish.
//
// This file holds no UI — it exposes `MJ` for panel.js to drive. Both are content
// scripts in the same isolated world, so they share scope directly and the queue keeps
// running whether the panel is on screen or not.
//
// Uses `SEL` and `pick` from selectors.js.

const LOG = '[mj-injector]';

const state = {
  running: false,
  paused: false,
  queue: [],
  index: 0,
  delayMs: 2000,
  results: [],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

// ---------------------------------------------------------------- progress

const listeners = new Set();

function snapshot(extra) {
  return {
    running: state.running,
    paused: state.paused,
    index: state.index,
    total: state.queue.length,
    current: state.queue[state.index] || null,
    results: state.results,
    ...extra,
  };
}

/** Push progress to the panel (if it's open) and to storage (so it survives a close). */
function report(extra) {
  const s = snapshot(extra);
  chrome.storage.local.set({
    run: {
      running: state.running,
      paused: state.paused,
      queue: state.queue,
      index: state.index,
      results: state.results,
    },
  });
  for (const fn of listeners) {
    try {
      fn(s);
    } catch (err) {
      console.warn(LOG, 'progress listener threw', err);
    }
  }
}

// ---------------------------------------------------------------- injection

/**
 * Write `text` into a React-controlled field. Assigning `.value` directly is swallowed by
 * React's synthetic event system, so go through the native setter and dispatch the input
 * event React actually listens for.
 */
function setPromptText(el, text) {
  if (el.isContentEditable) {
    el.focus();
    const sel = document.getSelection();
    sel.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(el);
    sel.addRange(range);
    document.execCommand('insertText', false, text);
    return;
  }

  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;

  el.focus();
  setter.call(el, '');
  el.dispatchEvent(new Event('input', { bubbles: true }));
  setter.call(el, text);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

function readPromptText(el) {
  return el.isContentEditable ? el.innerText : el.value;
}

function pressEnter(el) {
  for (const type of ['keydown', 'keypress', 'keyup']) {
    el.dispatchEvent(
      new KeyboardEvent(type, {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
      })
    );
  }
}

/**
 * Type one prompt and hit Enter. Does not wait for Midjourney to acknowledge the submit
 * or for the job to render — the queue moves straight on to the next prompt.
 *
 * The only thing checked is that the text physically landed in the field, since firing
 * Enter at an empty bar would silently lose a prompt. Note that Midjourney reformats what
 * you type (it lifts `--ar` / `--v` params out into its own controls), so a read-back that
 * differs from what we wrote is normal and not treated as a failure.
 */
async function submitPrompt(prompt) {
  const el = pick(SEL.inputBar);
  if (!el) {
    return { ok: false, error: 'Input bar not found — check SEL.inputBar in selectors.js' };
  }

  setPromptText(el, prompt);
  await sleep(150);

  const landed = norm(readPromptText(el));
  if (!landed) {
    return { ok: false, error: 'Text did not land in the input bar' };
  }
  if (landed !== norm(prompt)) {
    console.log(LOG, 'input bar reformatted the prompt', { wrote: norm(prompt), reads: landed });
  }

  pressEnter(el);

  // Enter is occasionally a no-op on this field; if the text is still sitting there a
  // moment later, nudge the send button instead. This is a fast local check, not a wait
  // on Midjourney.
  await sleep(250);
  if (norm(readPromptText(el)) === landed) {
    const btn = pick(SEL.sendButton);
    if (btn) {
      console.log(LOG, 'Enter had no effect, clicking the send button');
      btn.click();
    }
  }

  return { ok: true };
}

// ---------------------------------------------------------------- main loop

async function waitWhilePaused() {
  while (state.paused && state.running) {
    await sleep(300);
  }
}

async function runQueue() {
  report({ event: 'started' });

  for (; state.index < state.queue.length; state.index++) {
    if (!state.running) break;
    await waitWhilePaused();
    if (!state.running) break;

    const prompt = state.queue[state.index];
    report({ event: 'submitting', current: prompt });

    const sent = await submitPrompt(prompt);

    if (sent.ok) {
      state.results.push({ prompt, status: 'submitted' });
      report({ event: 'submitted' });
    } else {
      console.warn(LOG, 'submit failed:', sent.error, prompt);
      state.results.push({ prompt, status: 'failed', error: sent.error });
      report({ event: 'failed', error: sent.error });
      // A missing input bar will not fix itself; stop rather than spin through the queue.
      if (/not found/.test(sent.error)) {
        state.running = false;
        break;
      }
    }

    if (state.index + 1 < state.queue.length) {
      await sleep(state.delayMs);
    }
  }

  const finishedAll = state.index >= state.queue.length;
  state.running = false;
  state.paused = false;
  report({ event: finishedAll ? 'finished' : 'stopped' });
}

// ---------------------------------------------------------------- public API

/** Split the raw text on `$`. Leading, trailing and doubled separators are harmless. */
function parseQueue(raw) {
  return (raw || '')
    .split('$')
    .map((s) => s.trim())
    .filter(Boolean);
}

var MJ = {
  parseQueue,

  /** Subscribe to progress. Returns an unsubscribe function. */
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  status: () => snapshot(),

  start(queue, delayMs) {
    if (state.running) return { ok: false, error: 'Already running' };
    if (!queue.length) return { ok: false, error: 'Nothing queued' };
    state.queue = queue;
    state.index = 0;
    state.results = [];
    state.delayMs = delayMs ?? 2000;
    state.paused = false;
    state.running = true;
    runQueue();
    return { ok: true, total: queue.length };
  },

  pause() {
    state.paused = true;
    report({ event: 'paused' });
  },

  resume() {
    state.paused = false;
    report({ event: 'resumed' });
  },

  stop() {
    state.running = false;
    state.paused = false;
  },

  /**
   * What the selectors currently match. Run this if prompts aren't being injected — in
   * DevTools, switch the console context to the extension's isolated world and call
   * `mjDiagnose()`.
   */
  diagnose() {
    const bar = pick(SEL.inputBar);
    const info = {
      inputBar: bar
        ? `${bar.tagName.toLowerCase()} (${bar.isContentEditable ? 'contenteditable' : 'value'})`
        : 'NOT FOUND',
      sendButton: pick(SEL.sendButton) ? 'found' : 'not found (Enter only)',
    };
    console.log(LOG, 'diagnostics:', info);
    return info;
  },
};

window.mjDiagnose = MJ.diagnose;

// A reload wipes the in-page queue. Clear the stored run flag so a reopened panel does
// not show a stale "running" state, and mark it so it can offer to resume.
chrome.storage.local.get('run', ({ run }) => {
  if (run && run.running) {
    chrome.storage.local.set({
      run: { ...run, running: false, paused: false, interrupted: true },
    });
  }
});

console.log(LOG, 'engine ready');
MJ.diagnose();
