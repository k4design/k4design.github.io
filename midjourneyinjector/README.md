# Midjourney Prompt Injector

A Chrome extension that takes a single `$`-separated string of prompts, queues them, and
types them into Midjourney's prompt bar one after another. It does not wait for jobs to
finish — Midjourney queues them itself.

```
a red fox in snow $ a blue whale, cinematic $ neon city street --ar 16:9
```

→ three separate generations, submitted in order.

## Install

1. Go to `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this folder.
4. Open `https://www.midjourney.com/imagine` and **reload the tab** (content scripts only
   attach to pages loaded after the extension was installed).
The panel appears on the page by itself. There's no popup to click.

## Use

The UI is a rail docked to the side of the Midjourney page, not a Chrome popup — Chrome
tears popups down the moment focus leaves them, so a popup can't stay open while you work.
The rail runs the full height of the window and stays there until you click **✕**.

- Paste your prompts into the box, separated by `$`. Leading, trailing and doubled `$` are
  ignored, so `a $ b $` gives you two prompts. Whitespace around each prompt is trimmed;
  everything else — including `--ar 16:9` and other params — is passed through verbatim.
- **Delay between submissions** — pause between one prompt and the next. 2 seconds is
  usually plenty; raise it if Midjourney starts dropping submissions.
- **Start / Pause / Stop.** The queue runs in the page, so collapsing or closing the rail
  never interrupts it.
- **⇄** docks it to the other side of the window. **–** collapses it to just the title bar.
  **✕** exits. Mid-run, ✕ asks whether to keep the queue running or stop it.
- **Click the toolbar icon** to bring it back after exiting. It toggles.

The rail reappears on every page load. Exit hides it for the rest of that page's life only
— deliberately not persisted, because a remembered "stay hidden" leaves no obvious way back.
Which side it's docked to, whether it's collapsed, your draft and the delay all *are*
remembered.

Reloading the Midjourney tab stops the run. The panel then loads the prompts that never got
sent back into the box so you can pick up where it left off.

## When it stops working

Midjourney's markup changes and its class names are build-hashed. Every DOM assumption is
isolated in [`selectors.js`](selectors.js), which is the only file you should need to edit.
Each entry is a list tried in order, so a single change usually degrades to a fallback.

To re-derive a selector: open `/imagine`, DevTools → Inspect the element, and find the
nearest ancestor with a stable `id` or `data-*` attribute. Verify in the console that
`document.querySelectorAll(SEL.inputBar)` returns exactly one element. Prefer ids,
`data-*`, `role`, and substring class matches (`[class*="..."]`) over exact class names.

Only two selectors matter: `inputBar` and `sendButton`.

Errors show up in the page console, prefixed `[mj-injector]`. On load the extension also
prints a diagnostics dump showing what each selector matched — that's the first thing to
look at. You can re-run it any time: in DevTools, switch the console's context dropdown
(next to the filter box) from `top` to the extension's isolated world, then call
`mjDiagnose()`.

## Files

| File | Role |
| --- | --- |
| `selectors.js` | Every DOM assumption. The only file that should need editing when Midjourney changes. |
| `content.js` | The queue engine. No UI — exposes `MJ` for the panel to drive. |
| `panel.js` | The on-page panel, built in a shadow root so page styles can't reach it. |
| `background.js` | Toolbar-icon click → toggles the panel. |

`content.js` and `panel.js` are both content scripts in the same isolated world, so the
panel calls the engine directly rather than message-passing. That's why the queue survives
the panel being closed.

## How a submit works

1. Write the prompt into the field via React's native value setter (assigning `.value`
   directly is swallowed by React's synthetic event system), or `execCommand('insertText')`
   if the field is `contenteditable`.
2. Check the text physically landed — firing Enter at an empty bar would silently lose a
   prompt. A read-back that *differs* from what was written is fine and expected:
   Midjourney lifts `--ar` / `--v` params out of the text into its own controls.
3. Dispatch Enter. If the text is still sitting there 250ms later, click the send button
   instead.
4. Wait the configured delay, then move to the next prompt. Nothing waits on Midjourney.

## Note

Automated submission may run against Midjourney's terms of use and will consume your GPU
minutes quickly. Use the delay setting and keep queues to a reasonable length.
