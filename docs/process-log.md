# Jewelry Match: process log and study guide

Use this to explain the project to your teacher and class. Each stage says **what** was built, **which files**, **how it works**, and **what to say**. I will add a new stage every time we finish something.

---

## The big picture (say this first)

Jewelry Match is a **static website**: only HTML, CSS and JavaScript files, with no server and no database. The browser downloads the files and runs everything itself. That is why it can be hosted free on GitHub Pages.

The three languages each have one job:

| Language | Job | Analogy |
|---|---|---|
| **HTML** | Structure and content: headings, paragraphs, buttons, images | The skeleton |
| **CSS** | Looks: colors, fonts, spacing, layout | The clothes |
| **JavaScript** | Behavior: the quiz, scoring, saving favorites | The muscles |

The project folder:

```
index.html  match.html  archive.html  object.html  saved.html  about.html
css/   tokens.css  base.css  components.css  pages.css
js/    data.js  match.js  storage.js  ui.js  quiz.js  archive.js  object.js  saved.js  home.js
assets/images/   (14 AI-generated photos)
tests/  tools/  docs/
```

**Why many small files?** Each file has one job, so a bug is easy to find. CSS and JS files are loaded by `<link>` and `<script>` tags in each HTML page.

---

## Stage 1: The data and the scoring brain (no visuals yet)

- **Files:** `js/data.js`, `js/match.js`, `tests/match.test.js`
- **What:** The 12 jewelry pieces are stored as a JavaScript list of *objects*. Each has an id, name, and four tags: placement, form, material, mood. The scoring function compares your four answers to each piece.
- **Scoring:** placement 40, form 25, material 20, mood 15. They total 100, so the score is already a percentage. Ties are broken by collection order, so the same answers always give the same order.
- **Key idea, "pure function":** `scoreObject(item, answers)` only reads its inputs and returns a number. It touches no page and saves nothing, so it is easy to test.
- **Tests:** 30 automated checks run with `node tests/match.test.js`, for example "all four match gives 100%".
- **Say:** "I built and tested the logic before any design, so I knew the matching was correct."

## Stage 2: Design tokens and the page foundation

- **Files:** `css/tokens.css`, `css/base.css`
- **What:** `tokens.css` defines **CSS custom properties** (variables) like `--paper`, `--black`, `--oxblood`. Every other CSS file uses `var(--paper)` instead of repeating a color code.
- **Why:** Changing one token restyles the whole site, and the palette stays consistent.
- **Accessibility basics in `base.css`:** a visible focus outline, a "skip to content" link, and reduced-motion support.
- **Say:** "Colors and spacing live in one place, so the design is consistent and easy to change."

## Stage 3: The quiz

- **Files:** `match.html`, `js/quiz.js`, `js/ui.js`, `css/components.css`, `css/pages.css`
- **HTML:** `match.html` is only a skeleton with an empty `<div id="quiz-root">`. JavaScript fills it in.
- **How the quiz works:** a `state` object remembers the step and the answers. Each step is drawn, you pick an option, Continue moves on, and at the end `JM.rank()` returns the top 4.
- **Radio buttons dressed as cards:** each option is a real `<input type="radio">`, made invisible and stretched over a styled card. Keyboard and screen readers still work natively.
- **Body Map (step 1):** a photo with clickable buttons (hotspots) placed using percentage coordinates, plus an SVG fallback if the photo fails.
- **Accessibility details:** Continue uses `aria-disabled` so it stays focusable and can explain why it's off. Focus moves to the heading on each step. A hidden live region (`#live`) announces changes to screen readers.
- **Say:** "The quiz is built from real form controls, so it works with a keyboard and screen reader, not just a mouse."

## Stage 4: Archive, object page, saved page

- **Files:** `archive.html`, `object.html`, `saved.html`, `js/archive.js`, `js/object.js`, `js/saved.js`, `js/storage.js`
- **Archive:** four filter groups (one value each). `JM.filterItems()` returns the pieces that match. A count and a "Clear all" button update live.
- **Object page:** one page serves all 12 pieces. The id is read from the address (`object.html?id=drop-study`), and the page is filled from `data.js`.
- **Saving favorites:** `storage.js` uses **localStorage**, a small store in your browser. It is wrapped in `try/catch`, because browsers can block it, and the site must still work.
- **Say:** "No account or server: favorites live in your own browser."

## Stage 5: Images

- **Files:** `assets/images/*.jpg`, `docs/image-prompts.md`, `docs/image-generation-record.md`
- **What:** All images are AI-generated (OpenAI image generation) and the process is recorded. Each has real `alt` text describing what it shows, and a credit line.
- **Fallback:** if an image fails to load, `ui.media()` shows a colored placeholder instead.
- **Open question:** confirm with your teacher that AI images are allowed.

## Stage 6: Sharing your result with friends

- **Files:** `js/match.js` (`encodeShare`, `decodeShare`), `js/quiz.js`
- **How:** your four answers are written into the link after the `#`, for example `match.html#edit-ear-liquid-silver-quiet`. A friend who opens it sees your four matches straight away.
- **Safety:** `decodeShare` accepts only valid option names and returns `null` for anything else, so a made-up link can't break the page.
- **Privacy:** nothing is uploaded. The answers are in the link itself.
- **Say:** "It's shareable without a backend, because the link carries the answers."

## Stage 7: Home and About pages (latest)

- **Files:** `index.html`, `about.html`, `js/home.js`, plus footers on every page, and new CSS in `components.css` and `pages.css`
- **Home:**
  - The masthead size is `clamp(3rem, 15.5vw, 13rem)`: *minimum, preferred (a share of screen width), maximum*. That is why it's huge but never causes sideways scrolling.
  - The quick picks are normal links to `match.html`. When clicked, `home.js` first saves the chosen place with `JM.storage.saveProgress(...)`, and the quiz then opens at step 2 with it preselected.
  - "A first look" is filled by `home.js` from the same data the archive uses.
- **About:** plain HTML only, with two tables (`<caption>`, `<th scope>`) explaining the scoring and a worked example.
- **Footer:** the AI-image disclosure is visible on every page.
- **Testing added:** `tools/check-links.js` (130 internal links verified) and a browser test at 320, 375, 768, 1024 and 1440 px.

- **Revision after your feedback:** you didn't like the first Home image, so I replaced `lip-kite.jpg` with `lip-chain.jpg` (red lips and a gold hand chain). Two edits in `index.html`: the `<img src>` and its `alt` text. I also changed the caption, because the new image is not one of the 12 catalog pieces and so shouldn't show a "JM-" number. **Lesson:** swapping an image means updating `src`, `alt` and the caption together, then re-running the link checker.

## Stage 8: Score bars (Feature 1)

- **Files:** `js/quiz.js` (`resultCard`), `css/pages.css`
- **What:** the "Why this?" list used to be plain text. Each row is now a sentence plus a bar. The bar's width is *points earned / points possible*: full when the choice matched, empty when not.
- **How:** `fill.style.width = Math.round(points / max * 100) + '%'`. The width is set from JavaScript because that's the safe way to apply a calculated style.
- **Accessibility:** the bar is decoration (`aria-hidden`); the sentence says the same thing in words, so nobody depends on seeing it. The top result opens its explanation by default (`<details open>`).
- **Say:** "The score isn't a black box: every percentage is explained choice by choice."

## Stage 9: Compare mode (Feature 2)

- **Files:** `archive.html`, `js/archive.js`, `css/pages.css`, `css/base.css`
- **What:** every card on The Edit has a Compare checkbox. A bar at the bottom shows what's selected. With two or three ticked, Compare opens a table: one column per piece, one row per feature. Rows where every piece is identical say "All the same".
- **How it works in code:** `compare` is an array of ids (a *variable that remembers state*). `toggleCompare` adds or removes an id and blocks a fourth. `renderBar` redraws the bar. `openCompare` builds the table (`<table>`, `<caption>`, `<th scope>`), and a loop over the four dimensions decides "all same" with `items.every(...)`.
- **Details to mention:** focus moves to the Compare heading when the table opens, and returns to the bar on close. Ticks survive changing a filter. The `hidden` attribute needed a rule in `base.css` (`[hidden]{display:none!important}`) so it always wins.
- **Say:** "Compare shows I can keep state in JavaScript and turn it into a real accessible table."

## Stage 10: Build your look (Feature 3)

- **Files:** `js/storage.js` (`getLook`, `setLook`), `js/saved.js` (`renderLook`), `css/pages.css`
- **What:** on Your Edit, five slots in body order (ear, neckline, hand, little finger, ankle). Each shows a saved piece for that place. If you saved more than one for a place, radio buttons let you choose, and the choice is remembered. Empty slots link to The Edit pre-filtered for that place (`archive.html?placement=ankle`).
- **Never trust stored data:** `getLook` checks every id against the real collection and that the piece really belongs to that place. Bad or broken data is dropped, not shown, and can't crash the page.
- **Fallback logic:** if the chosen piece is later un-saved, the slot automatically falls back to another saved piece for that place.
- **Say:** "It reuses the Saved data and the placement idea from the quiz, so the whole site hangs together."

## Stage 11: README and tests shipped

- `README.md` explains the project; `tests/browser/` now holds all six browser test files (they find the site folder by themselves).
- **Test totals now:** 30 unit tests, seven browser suites, 150 links checked.

## Stage 12: Fixing empty filters (feedback from testing the live site)

- **The problem you found:** Ankle + Organic showed "0 objects". It isn't a bug. There are 12 pieces and each place has only 2 or 3, so most filter combinations are empty. (Ankle has only Delicate and Angular pieces.)
- **Fix 1: counts and switched-off options** (`js/archive.js`, `updateChips`, `countIf`). Each chip shows how many pieces would be left if you chose it. A chip with 0 is disabled (dashed border, struck through). `countIf` re-runs the same `JM.filterItems` used for the results, with that one chip tried out. A chip that is currently chosen is never disabled, so you can always undo it.
- **Fix 2: "Closest pieces"** (`closestItems`). If a link still leads to an empty result, the page shows the nearest pieces, scored with the same weights as the quiz (placement 40, form 25, material 20, mood 15), each labelled "Matches: placement" and so on.
- **CSS bug I made and fixed:** `.chip span` also hit the count inside the chip and drew it as a box. The fix is the *child selector* `.chip > span`, which means "only direct children".
- **Say:** "I tested the live site, found dead ends, and fixed them by preventing impossible choices, not by hiding the problem."

## Stage 13: Guided "Build your look" (feedback: too much back and forth)

- **Files:** `look.html`, `js/look.js`, `js/quiz.js` (Continue button), `js/saved.js`, `js/storage.js`, `css/pages.css`
- **What:** after the quiz, **Continue: build your look** opens one screen per place: ear, neckline, hand, little finger, ankle. Each screen has Continue, Back and Skip this place. The last screen shows your whole look.
- **The address is the state:** `look.html#ear`, `#neckline`, ... `#done`. JavaScript reads `window.location.hash` and redraws on the `hashchange` event. So the browser's Back button and reloading both work with no extra code.
- **Smart defaults:** if you took the quiz, pieces are ordered best match first (using `JM.scoreObject`) and the best one is preselected, so Continue is often one click.
- **Choosing also saves:** a chosen piece is added to Your Edit, so you never have to save it separately. "Skip" is stored as `'none'`, so Your Edit knows it was skipped on purpose.
- **Accessibility:** Continue uses `aria-disabled` and explains itself if pressed with nothing chosen. Focus moves to the heading on each new screen. The progress is words plus segments.
- **Say:** "I replaced scattered pages with one guided path. The URL stores where you are, so there is no hidden state."

---

## How I test (say this too)

1. **Unit tests** (`node tests/match.test.js`): the scoring and sharing logic.
2. **Browser tests (Playwright):** a robot Chrome clicks through the site, checks results, checks for sideways scrolling at five screen widths, and fails on any console error.
3. **Link checker:** every link and image must point to something that exists.
4. **Looking at screenshots** myself, because passing tests don't prove it looks right.

## Glossary (short answers for questions)

- **Semantic HTML:** tags that describe meaning (`<header>`, `<nav>`, `<main>`, `<footer>`), which helps screen readers.
- **DOM:** the live tree of page elements that JavaScript can change.
- **Namespace (`JM`):** one global object holding all my functions, so they don't clash with others.
- **localStorage:** small browser-only storage that survives closing the tab.
- **Mobile-first:** base CSS is for phones, and `@media (min-width: 768px)` adds wider layouts.
- **`minmax(0, 1fr)`:** a grid column that can shrink, so wide content can't stretch the page.
- **WCAG 2.1 AA:** the accessibility standard I'm aiming for: contrast, keyboard use, 44px touch targets, text alternatives.

## Still to do

- [ ] Ask the teacher about AI-generated images
- [x] Kite Pinky / Orbit Signet photos: decided to keep them. The ring is on an outer finger and reads as the little finger; both pieces stay tagged "little finger" as the spec requires. (Option considered and declined: regenerate the Kite Pinky photo with the ring clearly on the pinky.)
- [x] README written
- [ ] GitHub Pages deployment (due **20 Nov 2026**)
- [ ] Accessibility check (200% zoom, contrast)
- [ ] Try it with three friends and note what they say
