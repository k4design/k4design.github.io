// The persistent on-page panel: a rail docked to the side of the window.
//
// Not a Chrome popup — the browser tears those down the instant focus leaves them, which
// is why this is a real element in the page instead. It stays on screen until the user
// clicks Exit, and re-appears on every page load; only the toolbar icon or Exit hides it.
//
// Drives the queue engine in content.js via the shared `MJ` object (same isolated world).
// Markup lives in a shadow root so Midjourney's stylesheets can't reach in and ours can't
// leak out.

(() => {
  const HOST_ID = 'mj-injector-panel-host';
  const WIDTH = 336;

  let host = null;
  let root = null;
  let el = {}; // shadow-root element refs
  let unsubscribe = null;
  let collapsed = false;
  let side = 'right';

  // ------------------------------------------------------------------ styles

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; margin: 0; font-family: -apple-system, BlinkMacSystemFont,
        "Segoe UI", Inter, sans-serif; }

    /* Docked full-height rail, flush to the window edge. */
    .panel {
      position: fixed; z-index: 2147483647;
      top: 0; bottom: 0; width: ${WIDTH}px;
      display: flex; flex-direction: column;
      background: #16161a; color: #e8e8ea;
      font-size: 13px; line-height: 1.45;
      box-shadow: 0 0 40px rgba(0,0,0,.6);
    }
    .panel.right { right: 0; border-left: 1px solid #2e2e36; }
    .panel.left  { left: 0;  border-right: 1px solid #2e2e36; }

    /* Collapsed: just the title bar, parked at the top of the same edge. */
    .panel.collapsed { bottom: auto; }

    .head {
      display: flex; align-items: center; gap: 8px; flex: none;
      padding: 11px 12px;
      background: #1c1c22; border-bottom: 1px solid #2e2e36;
      user-select: none;
    }
    .title { font-size: 12.5px; font-weight: 600; letter-spacing: .2px; }
    .dot { width: 7px; height: 7px; border-radius: 50%; background: #5c6373; flex: none; }
    .dot.run { background: #6c8cff; animation: pulse 1.4s ease-in-out infinite; }
    .dot.done { background: #4caf7d; }
    .dot.err { background: #e05c5c; }
    @keyframes pulse { 0%,100% { opacity: 1 } 50% { opacity: .35 } }

    .head-btns { margin-left: auto; display: flex; gap: 2px; }
    .icon {
      width: 24px; height: 24px; border: 0; border-radius: 5px;
      background: transparent; color: #8b8b96;
      font-size: 14px; line-height: 1; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .icon:hover { background: #2a2a33; color: #e8e8ea; }
    .icon.x:hover { background: #4a1f22; color: #ff8f8f; }

    /* Scrolls independently of the page, so a long result list never grows the rail. */
    .body { flex: 1; min-height: 0; overflow-y: auto; padding: 12px; }
    .body.hidden { display: none; }

    label { display: block; font-size: 11px; color: #8b8b96; margin-bottom: 5px; }
    textarea {
      width: 100%; min-height: 132px; padding: 8px; resize: vertical;
      background: #101014; color: #e8e8ea;
      border: 1px solid #2e2e36; border-radius: 6px;
      font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    textarea:focus, input:focus { outline: none; border-color: #6c8cff; }
    textarea:disabled { opacity: .55; }
    .count { margin: 5px 0 10px; font-size: 11.5px; color: #8b8b96; }
    .delay { display: flex; align-items: center; gap: 6px; margin-bottom: 12px; }
    .delay input {
      width: 62px; padding: 5px 6px;
      background: #101014; color: #e8e8ea;
      border: 1px solid #2e2e36; border-radius: 5px; font: inherit;
    }
    .delay span { font-size: 11.5px; color: #8b8b96; }

    .btns { display: flex; gap: 6px; }
    button.act {
      flex: 1; padding: 7px 0; border-radius: 6px; cursor: pointer;
      border: 1px solid #2e2e36; background: #22222a; color: #e8e8ea;
      font: 600 12.5px inherit;
    }
    button.act:hover:not(:disabled) { border-color: #6c8cff; }
    button.act.primary { background: #6c8cff; border-color: #6c8cff; color: #0d0d12; }
    button.act:disabled { opacity: .4; cursor: default; }

    .status { min-height: 30px; margin-top: 10px; font-size: 12px; overflow-wrap: anywhere; }
    .status.err { color: #e05c5c; }
    .status .cur { color: #8b8b96; font-style: italic; }
    .bar { height: 4px; border-radius: 2px; background: #2e2e36; overflow: hidden; }
    .bar i { display: block; height: 100%; width: 0; background: #6c8cff; transition: width .25s; }
    ol.res {
      margin: 9px 0 0; padding-left: 20px;
      font-size: 11.5px; color: #8b8b96;
    }
    ol.res li { margin-bottom: 3px; overflow-wrap: anywhere; }
    ol.res li.ok::marker { color: #4caf7d; }
    ol.res li.bad::marker { color: #e0a33c; }
    .tag { color: #e0a33c; }

    /* Exit confirmation, shown only mid-run. */
    .confirm { margin-top: 12px; padding: 10px; border-radius: 6px;
      background: #241d1f; border: 1px solid #4a2f33; }
    .confirm p { font-size: 12px; margin-bottom: 8px; }
    .confirm button.act { font-size: 11.5px; }
  `;

  const HTML = `
    <div class="panel right">
      <div class="head">
        <span class="dot"></span>
        <span class="title">Prompt Injector</span>
        <div class="head-btns">
          <button class="icon dock" title="Move to the other side">⇄</button>
          <button class="icon min" title="Collapse">–</button>
          <button class="icon x" title="Exit">✕</button>
        </div>
      </div>
      <div class="body">
        <label>Prompts, separated by $</label>
        <textarea spellcheck="false"
          placeholder="a red fox in snow $ a blue whale, cinematic $ neon city street --ar 16:9"></textarea>
        <div class="count">0 prompts detected</div>
        <label>Delay between submissions</label>
        <div class="delay">
          <input type="number" min="0" max="600" step="0.5" value="2"><span>seconds</span>
        </div>
        <div class="btns">
          <button class="act primary start">Start</button>
          <button class="act pause" disabled>Pause</button>
          <button class="act stop" disabled>Stop</button>
        </div>
        <div class="status"></div>
        <div class="bar"><i></i></div>
        <ol class="res"></ol>
        <div class="confirm" hidden>
          <p>A run is in progress. Exit and…</p>
          <div class="btns">
            <button class="act keep">Keep running</button>
            <button class="act stopexit">Stop it</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // ------------------------------------------------------------------ render

  const esc = (s) => s.replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

  const MESSAGES = {
    started: 'Starting',
    submitting: 'Submitting',
    submitted: 'Submitted',
    paused: 'Paused',
    resumed: 'Resumed',
    finished: 'All prompts submitted',
    stopped: 'Stopped',
  };

  function render(p) {
    if (!root) return;

    const total = p.total || 0;
    const done = (p.results || []).length;

    el.bar.style.width = total ? `${(done / total) * 100}%` : '0';

    const head = total ? `${Math.min(done + (p.running ? 1 : 0), total)}/${total} — ` : '';
    const label =
      p.event === 'failed'
        ? `Failed: ${p.error || 'unknown error'}`
        : MESSAGES[p.event] || (p.running ? 'Running' : 'Idle');
    const cur = p.current && p.running ? `<div class="cur">${esc(p.current.slice(0, 90))}</div>` : '';
    el.status.className = `status${p.event === 'failed' ? ' err' : ''}`;
    el.status.innerHTML = head + label + cur;

    el.dot.className =
      'dot ' +
      (p.event === 'failed' ? 'err' : p.running ? 'run' : p.event === 'finished' ? 'done' : '');

    el.res.innerHTML = (p.results || [])
      .map((r) => {
        const ok = r.status === 'submitted';
        const tag = ok ? '' : ` <span class="tag">— ${esc(r.error || r.status)}</span>`;
        return `<li class="${ok ? 'ok' : 'bad'}">${esc(r.prompt.slice(0, 64))}${tag}</li>`;
      })
      .join('');

    el.start.disabled = p.running || MJ.parseQueue(el.ta.value).length === 0;
    el.pause.disabled = !p.running;
    el.stop.disabled = !p.running;
    el.pause.textContent = p.paused ? 'Resume' : 'Pause';
    el.ta.disabled = p.running;
  }

  function updateCount() {
    const n = MJ.parseQueue(el.ta.value).length;
    el.count.textContent = `${n} prompt${n === 1 ? '' : 's'} detected`;
    el.start.disabled = MJ.status().running || n === 0;
  }

  function setSide(next) {
    side = next;
    el.panel.classList.toggle('right', side === 'right');
    el.panel.classList.toggle('left', side === 'left');
    chrome.storage.local.set({ panelSide: side });
  }

  function setCollapsed(next) {
    collapsed = next;
    el.panel.classList.toggle('collapsed', collapsed);
    el.body.classList.toggle('hidden', collapsed);
    el.min.textContent = collapsed ? '+' : '–';
    el.min.title = collapsed ? 'Expand' : 'Collapse';
    chrome.storage.local.set({ panelCollapsed: collapsed });
  }

  // ------------------------------------------------------------------ open / close

  async function open() {
    if (host || document.getElementById(HOST_ID)) return; // already on screen

    host = document.createElement('div');
    host.id = HOST_ID;
    root = host.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = CSS;
    root.append(style);

    const frag = document.createElement('div');
    frag.innerHTML = HTML;
    root.append(frag.firstElementChild);

    // Attach to documentElement rather than body: Midjourney re-renders its React tree
    // under body, and anything in there risks being swept away.
    document.documentElement.append(host);

    const q = (sel) => root.querySelector(sel);
    el = {
      panel: q('.panel'), head: q('.head'), dot: q('.dot'), body: q('.body'),
      ta: q('textarea'), count: q('.count'), delay: q('.delay input'),
      start: q('.start'), pause: q('.pause'), stop: q('.stop'),
      status: q('.status'), bar: q('.bar i'), res: q('.res'),
      dock: q('.dock'), min: q('.min'), x: q('.x'),
      confirm: q('.confirm'), keep: q('.keep'), stopexit: q('.stopexit'),
    };

    const { panelSide, panelCollapsed, draft, settings } = await chrome.storage.local.get([
      'panelSide', 'panelCollapsed', 'draft', 'settings',
    ]);
    setSide(panelSide === 'left' ? 'left' : 'right');
    setCollapsed(!!panelCollapsed);
    if (draft) el.ta.value = draft;
    if (settings && settings.delay != null) el.delay.value = settings.delay;

    // Midjourney binds global keyboard shortcuts; without this, typing a prompt in the
    // panel would also trigger them.
    for (const type of ['keydown', 'keypress', 'keyup']) {
      el.panel.addEventListener(type, (e) => e.stopPropagation());
    }

    el.ta.addEventListener('input', () => {
      updateCount();
      chrome.storage.local.set({ draft: el.ta.value });
    });
    el.delay.addEventListener('change', () => {
      chrome.storage.local.set({ settings: { delay: Number(el.delay.value) } });
    });

    el.start.addEventListener('click', () => {
      const res = MJ.start(
        MJ.parseQueue(el.ta.value),
        Math.max(0, Number(el.delay.value)) * 1000
      );
      if (!res.ok) {
        el.status.className = 'status err';
        el.status.textContent = res.error;
      }
    });
    el.pause.addEventListener('click', () => {
      if (MJ.status().paused) MJ.resume();
      else MJ.pause();
    });
    el.stop.addEventListener('click', () => MJ.stop());

    el.dock.addEventListener('click', () => setSide(side === 'right' ? 'left' : 'right'));
    el.min.addEventListener('click', () => setCollapsed(!collapsed));

    // Exit. Mid-run this asks what to do with the queue rather than guessing.
    el.x.addEventListener('click', () => {
      if (MJ.status().running) {
        el.confirm.hidden = false;
        if (collapsed) setCollapsed(false);
        return;
      }
      close();
    });
    el.keep.addEventListener('click', () => close());
    el.stopexit.addEventListener('click', () => {
      MJ.stop();
      close();
    });

    unsubscribe = MJ.subscribe(render);

    updateCount();
    render(MJ.status());
    await restoreInterrupted();
  }

  /** If a previous run was cut short by a page reload, offer the leftovers. */
  async function restoreInterrupted() {
    const { run } = await chrome.storage.local.get('run');
    if (!run || !run.interrupted) return;
    const remaining = (run.queue || []).slice(run.index);
    if (!remaining.length || MJ.status().running) return;
    el.ta.value = remaining.join(' $ ');
    updateCount();
    el.status.className = 'status';
    el.status.textContent =
      `Previous run stopped at ${run.index}/${run.queue.length} when the page reloaded. ` +
      `The ${remaining.length} unsent prompts are loaded above.`;
    chrome.storage.local.set({ run: { ...run, interrupted: false } });
  }

  function close() {
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
    if (host) host.remove();
    host = null;
    root = null;
    el = {};
    collapsed = false;
  }

  function toggle() {
    if (host) close();
    else open();
  }

  // ------------------------------------------------------------------ wiring

  // The toolbar icon toggles the panel — that's the way back in after an Exit.
  chrome.runtime.onMessage.addListener((msg, _sender, respond) => {
    if (msg.type === 'TOGGLE_PANEL') {
      toggle();
      respond({ ok: true, open: !!host });
    }
    return true;
  });

  // Show on every page load. Exit hides it for the rest of that page's life, but a fresh
  // load brings it back — a persisted "stay hidden" flag is a trap, because the only way
  // out of it is a toolbar click nobody remembers they need.
  open();

  window.mjPanel = { open, close, toggle };
})();
