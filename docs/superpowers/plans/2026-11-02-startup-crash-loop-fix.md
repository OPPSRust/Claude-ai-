# Startup Crash-Loop Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop Cart & Cook from crash-reloading and ending on a GitHub "Site not found" page when it opens, keep the app usable when Gemma can't load, and record what happened so the next fix is based on facts from the phone.

**Architecture:** A small storage-backed guard (`startup-guard.js`) marks "Gemma load in progress" before the launch screen loads Gemma and clears it when loading finishes. If the app starts and finds the mark still set, the last load crashed, so it skips the automatic load and offers a button instead. A capped event log (`diagnostics.js`) records each launch's URL, how the page was opened (fresh or reload), and each loading stage, with a button to copy that report. The manifest gets an absolute start address, a `404.html` sends wrong addresses inside the site back to the app, and Gemma's context size is reduced to lower memory use.

**Tech Stack:** Plain ES modules served as static files (no build step), `@litert-lm/core@0.19.0` from jsDelivr, Node 22 `node:test` for unit tests, Playwright (preinstalled, `require('playwright')`) for browser tests.

**Spec:** No separate spec document. The spec is the user's bug report, quoted under Global Constraints, plus the findings below.

**Findings that drive this plan (checked 2026-11-02):**
- `https://oppsrust.github.io/Claude-ai-/` returns 200 (the app). `https://oppsrust.github.io/` and `https://oppsrust.github.io/claude-ai-/` return 404 with the title "Site not found · GitHub Pages" and the text "There isn't a GitHub Pages site here". That matches the page the user ends on.
- The launch screen goes past halfway only during the "Loading Gemma 4 onto your iPhone's chip…" stage (bar 42% → 88%), which is when the 2 GB model is moved onto the GPU.
- WebKit has an open report of iOS/iPadOS 26 killing `com.apple.WebKit.GPU` for running out of memory during LLM loading. After a web content crash, WebKit reloads the page. The app then auto-loads Gemma again, which is the loop the user sees.
- Not yet known, and Task 1's log is there to find out: whether the crash is in the GPU process or the page process, and which address the phone reloads after the second crash.

## Global Constraints

- User report, verbatim: "when I open the app it loads have way then the screen flashes then lead again and then a gut hub websites open says we could. It find this"
- Hosting: GitHub Pages, repo `OPPSRust/Claude-ai-`, branch `main`, folder `/`, live at `https://oppsrust.github.io/Claude-ai-/` (the case of `Claude-ai-` matters).
- Device: iPhone 17 Pro, Safari on iOS 26, opened as a Home Screen web app.
- AI: Gemma 4 E2B on the device through `@litert-lm/core@0.19.0`. No cloud AI.
- Keep loading Gemma automatically at launch (the user asked for it), except after a crash.
- No new dependencies and no build step. New modules are plain ES modules next to `app.js`.
- Storage keys start with `cartcook.`. Every storage read and write is wrapped in try/catch and works when storage throws.
- UI copy is plain, says what happened and what to do, and doesn't apologize.
- Every commit ends with the two attribution lines this session uses:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and `Claude-Session: https://claude.ai/code/session_01SYeAMKuTTXPsqZMcQtUezJ`

## Review Focus

1. **Crash during the download, not the load.** The guard must only be set around `gemma.load()`, so a crash while downloading doesn't switch off auto-load. Test in Task 1: `beginLoad` is never called by the download path, so `onBoot` after a download-only session returns `autoLoad: true`.
2. **Storage that throws (private browsing, full storage).** Guard and log functions must not throw. With a throwing storage, `onBoot` returns `{ autoLoad: true, crashedLastTime: false, crashes: 0 }`. Test in Task 1.
3. **The user force-quits during loading.** The app can't tell this apart from a crash, so it counts as one crash, and the next successful manual load must turn auto-load back on and reset the count. Test in Task 1.
4. **Log growth.** The log keeps at most 40 entries, dropping the oldest. Test in Task 1.
5. **Copying the report where the clipboard is blocked.** If `navigator.clipboard.writeText` rejects, the report text is shown in a selectable text box. Test in Task 2's browser test.

---

## File Structure

| File | Responsibility |
| --- | --- |
| `startup-guard.js` (new) | Decide whether to auto-load Gemma at launch, and record load start and end |
| `diagnostics.js` (new) | Capped launch and load event log, and the plain-text report |
| `app.js` (modify) | Call the guard and log from `boot()`, `ensureLoaded()` and `startDownload()`; show the crash notice and the "Copy details" button |
| `gemma.js` (modify), `limits.js` (new) | Smaller context size and a cap on answer length |
| `manifest.webmanifest`, `404.html` (new), `sw.js` (modify) | Absolute start address, redirect for wrong addresses inside the site, cache version bump |
| `tests/unit/*.test.mjs` (new) | `node:test` unit tests |
| `tests/browser/*.mjs` (new), `tests/serve.mjs` (new) | Playwright checks against a local static server |

---

### Task 1: Startup guard and diagnostics log (pure modules)

**Files:**
- Create: `startup-guard.js`, `diagnostics.js`
- Test: `tests/unit/startup-guard.test.mjs`, `tests/unit/diagnostics.test.mjs`

**Interfaces:**
- Produces, in `startup-guard.js`:
  - `GUARD_KEY = 'cartcook.gemmaLoad'`. It stores JSON `{ inProgress: boolean, startedAt: number, autoLoad: boolean, crashes: number }`.
  - `onBoot(storage) -> { autoLoad: boolean, crashedLastTime: boolean, crashes: number }`. If `inProgress` is true, it sets `crashes += 1`, `autoLoad = false` and `inProgress = false`, saves, and returns `crashedLastTime: true`.
  - `beginLoad(storage, now = Date.now()) -> void`. Sets `inProgress = true` and `startedAt = now`.
  - `endLoad(storage, ok: boolean) -> void`. Always clears `inProgress`. When `ok`, it also sets `autoLoad = true` and `crashes = 0`.
  - `storage` is any object with `getItem`, `setItem` and `removeItem` (for example `localStorage`).
- Produces, in `diagnostics.js`:
  - `LOG_KEY = 'cartcook.log'`, `MAX_ENTRIES = 40`
  - `logEvent(storage, stage: string, detail = '', now = Date.now()) -> void`
  - `readLog(storage) -> Array<{ t: number, stage: string, detail: string }>`
  - `report(log, env: { userAgent: string, url: string, standalone: boolean, gpu: string }) -> string`. One line per entry, formatted `HH:MM:SS stage detail`, after a header that holds `env`.

- [ ] **Step 1: Write the failing tests**

`tests/unit/startup-guard.test.mjs` (use a `Map`-backed fake storage, plus one whose methods all throw):
- `first boot auto-loads`: `onBoot(empty)` deep-equals `{ autoLoad: true, crashedLastTime: false, crashes: 0 }`
- `a load that never ended counts as a crash`: `beginLoad(s, 1000)`, then `onBoot(s)` deep-equals `{ autoLoad: false, crashedLastTime: true, crashes: 1 }`
- `the boot after a crash stays off but is not a new crash`: after the previous case, `onBoot(s)` deep-equals `{ autoLoad: false, crashedLastTime: false, crashes: 1 }`
- `a successful manual load turns auto-load back on`: after the crash, `beginLoad(s)`, `endLoad(s, true)`, then `onBoot(s)` deep-equals `{ autoLoad: true, crashedLastTime: false, crashes: 0 }`
- `a load that failed with an error is not a crash`: `beginLoad(s)`, `endLoad(s, false)`, then `onBoot(s).crashedLastTime === false` and `autoLoad === true`
- `download-only sessions never trip the guard`: `onBoot(s)` on a fresh storage, with no `beginLoad`, returns `autoLoad: true` (Review Focus 1)
- `throwing storage never throws`: `onBoot(throwing)` deep-equals `{ autoLoad: true, crashedLastTime: false, crashes: 0 }`, and `beginLoad(throwing)` and `endLoad(throwing, true)` do not throw (Review Focus 2)

`tests/unit/diagnostics.test.mjs`:
- `keeps the newest 40 entries`: after 45 `logEvent` calls with stages `s0`…`s44`, `readLog` has length 40, the first stage is `s5` and the last is `s44` (Review Focus 4)
- `report includes env and entries`: `report([{ t: Date.UTC(2026,10,2,5,6,7), stage: 'boot', detail: 'navigate' }], { userAgent: 'UA', url: 'https://oppsrust.github.io/Claude-ai-/', standalone: true, gpu: 'apple' })` contains `UA`, `standalone: yes`, `boot navigate`
- `throwing storage`: `logEvent(throwing, 'x')` doesn't throw, and `readLog(throwing)` deep-equals `[]`

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test tests/unit/`
Expected: FAIL. Module not found for `startup-guard.js` and `diagnostics.js`.

- [ ] **Step 3: Implement both modules**

Each module reads and writes one JSON value under its key, inside try/catch. `report` formats times with `toISOString().slice(11, 19)` (UTC, so the test is deterministic).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test tests/unit/`
Expected: PASS, 10 tests.

- [ ] **Step 5: Commit**

```bash
git add startup-guard.js diagnostics.js tests/unit
git commit -m "Add startup guard and diagnostics log for Gemma loading"
```

---

### Task 2: Use the guard and log in the app, show a crash notice, and add "Copy details"

**Files:**
- Modify: `app.js`. Change `boot()` (it sits just above the closing `serviceWorker` message listener), `ensureLoaded()`, `startDownload()` and `renderModelCard()`.
- Modify: `styles.css` (one rule for `.diag-text`)
- Create: `tests/serve.mjs`, `tests/browser/crash-guard.mjs`

**Interfaces:**
- Consumes: `onBoot`, `beginLoad`, `endLoad` from `startup-guard.js`, and `logEvent`, `readLog`, `report` from `diagnostics.js`.
- Produces:
  - `state.model.crashedLastTime: boolean` and `state.model.crashes: number`, read by `renderModelCard()`.
  - `tests/serve.mjs`: `startServer(port = 8790) -> Promise<{ url: string, close(): Promise<void> }>`. It serves the repo root with correct content types.

- [ ] **Step 1: Write the failing browser test** in `tests/browser/crash-guard.mjs`. It starts `startServer()`, launches Chromium with the WebGPU flags `--enable-unsafe-webgpu --enable-features=Vulkan --use-vulkan=swiftshader --use-webgpu-adapter=swiftshader --disable-vulkan-surface`, and asserts:
  - Setup, so the app sees Gemma as downloaded without a real 2 GB download: open the app once. In the page, create `models/gemma-4-E2B-it-gpu.litertlm` in the private file storage (`navigator.storage.getDirectory()`) and resize it to exactly `2008432640` bytes with `createWritable({ keepExistingData: false })`, then `truncate(2008432640)`, then `close()`. That makes a sparse, zero-filled file. Set `localStorage['cartcook.gemmaLoad'] = JSON.stringify({ inProgress: true, startedAt: Date.now(), autoLoad: true, crashes: 0 })`, then reload.
  - `crash notice after an unfinished load`: after the reload, `#splash` is hidden within 3000 ms, `#modelCard` contains the text `closed while loading`, and `window.__cartcook.state.model.phase === 'downloaded'` (Gemma was not auto-loaded).
  - `launch is logged`: `JSON.parse(localStorage['cartcook.log'])` has an entry whose `stage === 'boot'` and whose `detail` contains `/Claude-ai-/` or `localhost`.
  - `copy details falls back to a text box`: after overriding `navigator.clipboard.writeText` to reject, clicking `Copy details` shows a `textarea.diag-text` whose value contains `boot` (Review Focus 5).
  - The script prints `PASS` or `FAIL <reason>`, and exits 0 or 1 accordingly.

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/browser/crash-guard.mjs`
Expected: `FAIL`. The model card doesn't contain "closed while loading".

- [ ] **Step 3: Wire the guard and log into `app.js`**
  - At the start of `boot()`, call `logEvent(localStorage, 'boot', `${performance.getEntriesByType('navigation')[0]?.type || '?'} ${location.href}`)` and `const g = onBoot(localStorage)`. Copy `g.crashedLastTime` and `g.crashes` into `state.model`.
  - In `boot()`, auto-load only when `state.model.phase === 'downloaded' && g.autoLoad`. Otherwise close the splash after at most 650 ms, as the not-downloaded path already does.
  - In `ensureLoaded(onStage)`, call `beginLoad(localStorage)` right before `gemma.load(...)`, and `endLoad(localStorage, true)` after it succeeds or `endLoad(localStorage, false)` in its catch. Also log the stages `gemma:runtime`, `gemma:model`, `gemma:loaded` and `gemma:error <message>`.
  - In `startDownload()`, log `download:start <bytes>` and `download:end <phase>`. It must not call `beginLoad` (Review Focus 1).
  - In `renderModelCard()`, when `phase === 'downloaded' && state.model.crashedLastTime`, show this exact copy: "Gemma closed while loading last time. That usually means your iPhone needed the memory for something else. Close other apps, then tap Load Gemma." Add a primary button **Load Gemma**, which calls `ensureLoaded()` and then `warmUp()`.
  - Add a small plain button **Copy details** to the model card in every phase. It builds `report(readLog(localStorage), { userAgent: navigator.userAgent, url: location.href, standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true, gpu: (await navigator.gpu?.requestAdapter())?.info?.vendor || 'none' })`, tries `navigator.clipboard.writeText`, then shows the toast "Details copied". If that rejects, it shows a read-only `textarea.diag-text` holding the report, selected.
  - Add a `pagehide` listener that logs `pagehide`.

- [ ] **Step 4: Run the browser test and the earlier unit tests**

Run: `node tests/browser/crash-guard.mjs && node --test tests/unit/`
Expected: `PASS`, then the unit tests pass.

- [ ] **Step 5: Commit**

```bash
git add app.js styles.css tests/serve.mjs tests/browser/crash-guard.mjs
git commit -m "Stop auto-loading Gemma after a crash and add a copyable diagnostics report"
```

---

### Task 3: Keep wrong addresses pointed at the app

**Files:**
- Modify: `manifest.webmanifest`. Set `"id": "/Claude-ai-/"`, `"start_url": "/Claude-ai-/"` and `"scope": "/Claude-ai-/"`.
- Create: `404.html`. It sends any wrong address inside the site back to the app: `<meta http-equiv="refresh" content="0; url=/Claude-ai-/">`, plus a `location.replace('/Claude-ai-/' + location.hash)` script and a visible link labelled "Open Cart & Cook".
- Modify: `sw.js`. Bump `SHELL_CACHE` to `'cc-shell-v4'`.
- Test: `tests/browser/addresses.mjs`

**Interfaces:**
- Consumes: `startServer` from Task 2. The test serves the repo under the path prefix `/Claude-ai-/`, so add an optional `prefix` argument: `startServer(port, prefix = '')`.

- [ ] **Step 1: Write the failing test** `tests/browser/addresses.mjs`:
  - `manifest start is absolute`: fetching `/Claude-ai-/manifest.webmanifest` and parsing it gives `start_url === '/Claude-ai-/'` and `id === '/Claude-ai-/'`.
  - `404 page returns to the app`: the test server serves `404.html` for unknown paths under the prefix. Opening `/Claude-ai-/does-not-exist` ends at a URL ending in `/Claude-ai-/`, and `document.title === 'Cart & Cook'` within 3000 ms.

- [ ] **Step 2: Run it to verify it fails**

Run: `node tests/browser/addresses.mjs`
Expected: `FAIL`, because `start_url` is `./`.

- [ ] **Step 3: Make the manifest, `404.html` and `sw.js` changes listed under Files**

- [ ] **Step 4: Run it to verify it passes**

Run: `node tests/browser/addresses.mjs`
Expected: `PASS`

- [ ] **Step 5: Commit**

```bash
git add manifest.webmanifest 404.html sw.js tests/serve.mjs tests/browser/addresses.mjs
git commit -m "Use an absolute start address and send wrong site addresses back to the app"
```

Note for the user, outside the code: a crash that lands on the bare `https://oppsrust.github.io/` can only be redirected by a separate repository named `OPPSRust.github.io`. This session can't create repositories, so leave that as an optional step for the user. Decide whether it's needed after reading the Task 2 report.

---

### Task 4: Lower Gemma's memory use

**Files:**
- Create: `limits.js`. It has no DOM, so Node can import it.
- Modify: `gemma.js`. Change `mainExecutorSettings.maxNumTokens` from `4096` to `CONTEXT_TOKENS`, imported from `limits.js`.
- Modify: `app.js`. The three `gemma.generate` callers (`runMeals`, `runList`, `fillRecipe`) pass `maxOutputTokens: fitOutput(prompt, <their current value>)`.
- Test: `tests/unit/fit-output.test.mjs`

**Interfaces:**
- Produces: `limits.js` exporting `CONTEXT_TOKENS = 3072` and `fitOutput(prompt: string, wanted: number, context = CONTEXT_TOKENS) -> number`, which returns `max(256, min(wanted, context - ceil(prompt.length / 3) - 64))`.

- [ ] **Step 1: Write the failing test** `tests/unit/fit-output.test.mjs`:
  - `fitOutput('x'.repeat(300), 2200)` returns `2200` (that is, `min(2200, 3072 - 100 - 64)`)
  - `fitOutput('x'.repeat(6000), 2200)` returns `1008` (`3072 - 2000 - 64`)
  - `fitOutput('x'.repeat(9000), 2200)` returns `256` (the floor)

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/unit/fit-output.test.mjs`
Expected: FAIL. Module not found.

- [ ] **Step 3: Implement `limits.js`, then make the `gemma.js` change and update the callers `runMeals`, `runList` and `fillRecipe` in `app.js` as listed under Files**

- [ ] **Step 4: Run all tests**

Run: `node --test tests/unit/ && node tests/browser/crash-guard.mjs && node tests/browser/addresses.mjs`
Expected: all PASS

- [ ] **Step 5: Commit and publish**

```bash
git add gemma.js app.js limits.js tests/unit/fit-output.test.mjs docs/superpowers/plans
git commit -m "Reduce Gemma context to 3072 tokens and fit answers within it"
git push origin claude/cart-and-cook-gemma && git push origin HEAD:main
```

Then confirm that `https://oppsrust.github.io/Claude-ai-/sw.js` contains `cc-shell-v4`.

---

## After shipping (user steps)

1. Open the app from the Home Screen, close it, and open it again so it picks up the update.
2. If it crashes once, the next launch shows the "Gemma closed while loading" notice instead of looping. Tap **Copy details** and paste the report into the chat. It shows the address the phone reopened and the last loading stage reached. That tells us whether Gemma 4 E2B fits in Safari's memory on this phone, and whether the optional `OPPSRust.github.io` redirect is needed.
