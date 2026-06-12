# StyleSpy — CSS & State Inspector

A Chrome side-panel extension for developers and QA to inspect the CSS of
**every** element on a page — static, hidden, and dynamic — including the
hover / focus / active states that vanish the moment you move the mouse.

Unlike WhatFont or ColorZilla (one property at a time, blind to hidden and
dynamic elements), StyleSpy captures the whole page at once and gives you
copy-ready **CSS selectors and XPath** for Selenium / Playwright / Cypress.

---

## Features

| Area | What it does |
|------|--------------|
| **Capture Page** | One click lists every element with its computed CSS (colour, background, font family/size/weight, line-height, letter-spacing, alignment, decoration, box model). |
| **Full table** | Opens the capture in a dedicated tab as a wide, sortable, column-toggleable spreadsheet — exportable to CSV / JSON. |
| **Freeze (⌘/Ctrl+Shift+F)** | Freezes the page's current `:hover`/`:focus`/`:active` state, pauses animations, and force-holds CSS tooltips/menus so you can inspect them. |
| **3-second countdown** | Gives you time to open a menu before the state is frozen automatically. |
| **Force State** | Re-applies the page's own `:hover`/`:focus`/`:active` rules to a selector — no real pointer needed. |
| **Ghost DOM** | Lists elements hidden via `display:none` / `visibility:hidden` / `opacity:0` / zero-size (closed modals, dropdowns, tracking pixels, SR-only text) and force-reveals any of them. |
| **Mutations** | Live feed of DOM additions/removals/attribute changes, with *break-on-mutation* to freeze the instant a popup opens. |
| **Picker + last-hovered memory** | Click-to-inspect overlay, plus automatic capture of the last element you hovered before reaching for the panel. |
| **Locators** | Stable CSS selector + XPath per element (prefers `data-testid`/`id`), one-click copy. |
| **Locator health** | Grades every element's locator strong / class / fragile, shows a "% automatable" bar you can click to filter, and a matching column in the full table — find which UI lacks test hooks. |
| **Contrast** | WCAG contrast ratio with AA pass/fail flag on the Inspect tab. |
| **Scales** | Capture runs in rAF batches with a live progress count; the full table is row-virtualized for thousands of elements. |
| **Quality of life** | Light/dark theme (persisted), last capture restored when the panel reopens, keyboard-driven freeze/pick. |

---

## Install (from source)

```bash
npm install
npm run build:icons   # one-time: render PNG icons from the SVG mark
npm run build         # type-checks, then bundles to dist/
npm run zip           # build + package dist/ into web-store/stylespy-v<ver>.zip
npm run build:store   # render Chrome Web Store screenshots + promo tiles → store-assets/
```

Then in Chrome:

1. Go to `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. **Load unpacked** → select the `dist/` folder.
4. Pin StyleSpy and click its icon on any page to open the side panel.

> Requires Chrome 114+ (Side Panel API).

---

## Development

```bash
npm run dev         # Vite dev build with HMR (re-load unpacked from dist/)
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # ESLint (zero-warning policy)
npm run test        # Vitest unit + integration tests (152)
npm run test:coverage  # same, with a V8 coverage report
npm run test:e2e    # Playwright (9): loads dist/ into Chromium, drives real
                    # capture, freeze, ghost reveal, force-state, mutations,
                    # picker, and the full-table page
npm run format      # Prettier
```

> `test:e2e` builds first and uses `channel: 'chromium'` (new headless) so the
> MV3 service worker runs. Run `npx playwright install chromium` once.

---

## Architecture

```
src/
├── manifest.config.ts        # typed MV3 manifest
├── types.ts                  # shared domain types
├── lib/                      # PURE, unit-tested — no DOM/Chrome calls
│   ├── color.ts              # rgb→hex, transparency, WCAG contrast
│   ├── selector.ts           # stable CSS selector generation
│   ├── xpath.ts              # XPath generation
│   ├── computed-styles.ts    # style extraction, visibility, identity
│   ├── filter.ts             # search + category filtering
│   ├── format.ts             # CSV / JSON / CSS-rule export
│   └── messages.ts           # typed message protocol
├── content/                  # injected inspection engines
│   ├── inspect.ts            # element → snapshot, page scan
│   ├── freeze.ts             # state freezing + countdown
│   ├── force-state.ts        # force :hover/:focus/:active from page CSS
│   ├── ghost-dom.ts          # hidden-element finder + reveal
│   ├── mutation-logger.ts    # live mutation feed + break-on-mutation
│   ├── picker.ts             # overlay picker + last-hovered memory
│   └── index.ts              # message dispatch
├── background/service-worker.ts  # side-panel behaviour + hotkeys
├── ui/                       # shared UI helpers (dom, components, io, messaging)
├── sidepanel/                # the side panel app (state, actions, views)
└── table/                    # the full-page table view
```

**Design principle:** all parsing / formatting / selector logic lives in `lib/`
as pure functions so it is exhaustively unit-tested; the `content/` and UI
layers are thin shells that wire those functions to the DOM and Chrome APIs.
CI (`.github/workflows/ci.yml`) runs type-check, lint, unit/integration tests,
and a Chromium E2E on every push and PR.

---

## How the tricky parts work

- **Freezing hover** — the freeze hotkey fires *while the pointer is still over
  the element* (keyboard doesn't move the mouse), so we snapshot the live
  `:hover` chain at that instant, pause all animations/transitions, and
  re-apply the matched hover rules as `!important` inline styles so CSS-driven
  tooltips stay on screen.
- **Forcing states without a pointer** — the browser exposes no content-script
  API to toggle native pseudo-states, so StyleSpy reads the page's own
  stylesheets, finds rules whose selector targets `:hover`/`:focus`/`:active`
  and matches the element, and re-applies their declarations.
- **Last-hovered memory** — a passive `mousemove` listener always tracks the
  last element under the cursor; when the pointer leaves the document (heading
  for the panel) that element is surfaced automatically.

---

## License

MIT.
