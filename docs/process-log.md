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
js/    data.js  match.js  storage.js  ui.js  quiz.js  archive.js  object.js  saved.js  motion.js  (home.js was removed in Stage 21)
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
- **Test totals now:** 35 unit tests, nine browser suites, 150 links checked.

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

## Stage 14: One continuous journey that ends in sharing (feedback: "it makes me go back")

- **The problem:** the journey had two endings (a share box on the quiz results, and the look screen), and the look screen's buttons sent people back to the start. It felt like going round in circles.
- **The fix, one path:** quiz -> results -> **Continue** -> ear -> neckline -> hand -> little finger -> ankle -> **Your look**. The share link appears only on that last screen, with the message "This is your decision". The results page no longer shows a share box. It only offers Continue. "Find another match" was removed from the end; "Start a new look" is a small secondary button.
- **The share link for a look** (`JM.encodeLook` / `JM.decodeLook` in `js/match.js`): `look.html#look-006-009-000-001-010`. Five 3-digit catalog numbers in body order, `000` = skipped. No server: the choices travel inside the link.
- **Never trust the link:** `decodeLook` checks that every number is a real piece AND belongs to its place (Kite Pinky in the "ear" slot is rejected). Anything wrong returns `null`, and the page shows "This link does not work" with a button to build your own look. Unit tests try all 431 possible looks plus 14 broken links.
- **What a friend sees:** "A friend's look": only the pieces chosen, **side by side in one line**, with a way to build their own look. Nothing is saved on the friend's device. On phones the line scrolls sideways inside its own box (CSS `grid-auto-flow: column` + `overflow-x: auto`), while the page itself never scrolls sideways.
- **Code tidy-up:** the share box (field + Copy + phone share sheet) is now one reusable function, `JM.ui.shareBlock`, used by both the quiz (old-style links keep working) and the look.
- **Bug found by testing it myself, then fixed:** "Build my own look" in a friend's view opened the screens with *your own earlier choices* already filled in, so it felt like an unfinished page. Both "Build my own look" and "Start a new look" now call one function, `startFresh()` in `js/look.js`: it clears the earlier look choices (saved pieces stay saved) and opens the ear screen empty. One shared function means the two buttons can never behave differently.
- **Say:** "I made the journey linear and put the one action that matters, sharing, at the end, and I validated the link on the receiving side."

## Stage 15: Sharing just one part of the body (feedback: "I only want to send the necklace")

- **The question:** can someone choose one place only, without building a full look? **Yes.** The link format from Stage 14 already allowed it (the other places are `000`). What was missing was a *fast way to get there*. These are optional shortcuts that leave the normal path unchanged.
- **Shortcut 1: "Send this piece"** (`js/object.js`). Every piece page has a share block. For Melt Collar the link is `look.html#look-000-009-000-000-000`. It reuses `JM.encodeLook` and `JM.ui.shareBlock`, so there is no new link format and no new code to trust.
- **Shortcut 2: "Finish now"** (`js/look.js`, `onFinishNow`). On every place screen (except the last, where "Finish" does the same thing). It keeps the piece selected on this screen, then jumps to the send screen. If nothing is chosen at all it explains why and stays put.
- **Shortcut 3: start where you are interested.** The quiz's Continue button now points to `look.html#<the place you chose>` (for example `#neckline`). Someone who picked a necklace in the quiz begins at the necklace, not the ear.
- **A friend's view adapts:** one piece reads "A friend's pick" / "A friend sent you a piece they like" / "Send this piece on". Several pieces read "A friend's look".
- **Why this isn't confusing:** the default journey is identical. Every shortcut is an extra button, and each one ends on the same send screen.
- **Say:** "I let people share one piece or a whole look with the same link format, so there is only one thing to validate and one thing to explain."

---

## Stage 16: Accessibility review (WCAG 2.1 AA / European Accessibility Act)

- **Why:** the site must be usable by people with screen readers, keyboards, zoom and low vision. A university project should show this was checked with a tool, not only assumed.
- **Tool:** `tests/browser/a11y.js` runs **axe-core** (an open-source checker) on 16 pages and states, then adds my own checks that axe cannot do: zoom 200% and 400% (640 px and 320 px wide, so the page must reflow with no sideways scroll), the WCAG text-spacing override, button size, keyboard focus rings and the skip link, the sticky bar not hiding focus, reduced motion, and the colour contrast of the palette.
- **What it found and how I fixed it:**
  1. **Two regions had the same name** ("Compare"): the bottom bar is now "Pieces to compare" (`archive.html`). Screen-reader users list landmarks, so every name must be unique.
  2. **Heading jumped from h1 to h3** on the look screens. The place names (Ear, Neckline...) are now `h2` in `js/look.js`. Headings are an outline: you cannot skip a level.
  3. **Page scrolled sideways on the final look screen.** Cause: visually-hidden text (`.vh`) is `position:absolute`, and an absolute element escapes a scroll box unless the box is `position:relative`. Fix: `position:relative` on `.look--row` (`css/pages.css`).
  4. **Small tap targets:** the Home/About links were 39 px wide and the piece names in Compare were 19 px tall. Now at least 44 px (`min-width`, `padding-block`).
  5. **Test bug, not site bug:** loading `look.html#neckline` fired a hash change that moved focus. The test now loads the address once.
- **Passed first time:** contrast of the palette, visible focus ring on every Tab stop, skip link, no keyboard trap, reduced motion.
- **Say:** "I did not trust my eyes. I ran an accessibility checker and fixed everything it reported, and I keep it as a test so it cannot regress."

---

## Stage 17: Bug fix, "Finish now" showed pieces from an old visit

- **Bug (found by my user):** choosing one ear piece and pressing "Finish now" showed all five places filled.
- **Cause:** every chosen piece is saved on the device (localStorage), and the last screen read *everything saved*, including pieces from an earlier visit.
- **Fix** (`js/look.js`): the page now remembers which places were handled in *this* walk-through (`sessionStorage`, key `jm:walk:v1`). The last screen and the link use only those. A new walk starts when you arrive through a link; a reload or Back keeps it. Saved pieces stay in Your Edit.
- **Test:** `tests/browser/e2e12.js` saves a full old look, starts again, finishes with one piece and checks "1 of 5" and a one-piece link.
- **Say:** "A bug taught me the difference between what is saved and what belongs to this session."

---

## Stage 18: Teacher feedback, phone polish and identity (19 Nov)

- **Feedback from my teacher:** polish the mobile experience, keep everything readable and smooth, push the visual identity, and (nice-to-have) show the complete outfit. The deadline also moved to 23 November.
- **Phone polish** (`css/pages.css`, `js/look.js`): on the look screens the pieces were one per row, so you scrolled a long way to reach Continue. Now two per row, and the button bar is `position: sticky` at the bottom. `scroll-padding-bottom` stops the bar from covering the item that has keyboard focus.
- **Identity pass, three small moves, same aesthetic:**
  1. *Bolder type:* bigger section titles, bold catalogue numbers, larger card names.
  2. *A little colour, only from my palette:* oxblood for progress and place labels, emerald for the top border of look slots and the match score.
  3. *Motion:* cards fade up one after another and the home title slides in. All of it sits inside `@media (prefers-reduced-motion: no-preference)`, so people who ask for less motion get none.
- **Test lesson:** one browser test measured card positions while they were still animating and failed. The site was fine, so I made the test wait for the animation to end.
- **Inspiration saved** in `docs/inspiration/` with notes and credits (references only, nothing copied).
- **Say:** "Motion is a nice extra, so I made it optional for people who prefer less movement."

---

## Stage 19: The full outfit view (teacher's nice-to-have)

- **Idea from my teacher:** once the look is ready, show the complete outfit, not only separate cards, so people can picture the result.
- **What I built** (`buildOutfit` in `js/look.js`, styles at the end of `css/pages.css`): the model photo from the quiz with every chosen piece pulled out on the empty wall beside her. A thin line and a dot show where each one is worn. It appears on the final "Your look" screen and on a friend's link.
- **How it works, in plain words:**
  - A box with the photo's exact proportions (`aspect-ratio: 1122 / 1402`) holds everything, so percentages always land on the same spot of the body, on any screen.
  - Each place has a point on the body (`px`, `py`, the same ones the quiz hotspots use) and a height on the wall (`cy`), spread out so the pieces never overlap.
  - The lines are an SVG over the photo, with `vector-effect: non-scaling-stroke` so they stay thin when the box stretches.
  - The pieces are a real list of links, so keyboard and screen-reader users can use them. The photo and lines are decorative (`alt=""`, `aria-hidden`).
- **Problem and fix:** on a phone the callouts first overlapped by a few pixels. I measured it with a test, then made the thumbnails and text a bit smaller and moved the heights.
- **Test:** `tests/browser/e2e13.js` checks five pieces and five lines, links, no overlap, nothing outside the photo and no sideways scroll, at 390 px and 1280 px.
- **Say:** "I reused the body map from the quiz, so the outfit view needed no new image."

---

## Stage 20: Stronger identity: photo mosaic and a named match profile

- **Why:** my teacher asked me to push the visual identity. I picked two ideas from a list of options and used my saved inspiration (the tight-crop moodboard) as reference.
- **"Up close" mosaic on Home** (`index.html`, styles at the end of `css/pages.css`): five tight crops of my own photos in a grid, the first one twice as big. Each crop is the same photo zoomed in on the jewelry: `object-fit: cover` plus `transform: scale(1.6)`, with two custom properties (`--fx`, `--fy`) saying where the piece sits in the photo. A paper-coloured tag with the catalogue number and name keeps the text readable on any photo. Each tile is a link to the piece page. The slow zoom on hover only runs if the person has not asked for reduced motion.
- **Named match profile** (`JM.profile` in `js/match.js`, shown by `profileBlock` in `js/quiz.js`): the quiz result now has a big title built from the answers, for example "The Quiet Silver" (mood + material), plus a line from the form ("Poured, never made.") and the place ("Worn at the ear."). It also shows on a friend's link. It is a pure function: same answers, same profile, nothing stored, so I could unit-test it: 16 mood and material pairs give 16 different names, and incomplete answers give no profile.
- **Small bug found by my own tests:** "After dark" printed as "The After dark Gold". I now capitalise every word.
- **Two test adjustments, not site bugs:** the link checker flagged links with a `#fragment` to an id that JavaScript builds later, so I removed the fragment. The accessibility test treated the deliberately cropped mosaic tiles as "clipped text", so it now skips them (their text tags are not clipped).
- **Say:** "A good name makes a result feel personal, and I made it from a pure function so I could test it."

---

## Stage 21: Less overwhelm, clearer path, more life (20 Nov)

- **Why:** I asked for a check of the user experience: does a visitor know exactly what to do, and does anything feel like too much? I looked at the Home page (3,138 px tall) and counted the choices it offered.
- **What I found:** the Home page gave about five ways to start (three quick picks, two buttons, a mosaic, a "first look" grid) and repeated the same photos twice. On a phone, the Edit page opened with four rows of filter chips before the first piece.
- **Home page, now one job** (`index.html`): one big "Find your match" button, a small note ("4 questions, about a minute, nothing to sign up for"), and a quiet link to browse. Then three numbered steps in plain words, the "Up close" mosaic, and one closing button. I removed the quick picks and the duplicate "A first look" grid, and replaced the jargon "Four choices, weighted" with "Answer three quick questions". The page is 2,746 px tall now (about 390 px shorter on desktop). `home.js` is gone because nothing needed it.
- **The Edit page on a phone** (`archive.html`, `js/archive.js`): the filters fold into one "Filters" row that says "none chosen" or "2 chosen", so the pieces come first. On a wide screen they stay open. If a filter is already on (from a link), the panel opens by itself. It uses the built-in `<details>` element, so the keyboard and screen readers work for free. The intro now says what each path is for: browse here, or take the quiz for a suggestion.
- **Motion with rules** (`js/motion.js`, end of `css/pages.css`): sections slide up as they scroll into view (position only, never opacity, so nothing can be invisible); the numbered dots on the body map pulse until you choose a place; chosen cards and chips pop; the save heart pops; score bars grow. Everything sits inside `prefers-reduced-motion: no-preference`, and `motion.js` does nothing for people who asked for less motion.
- **Test changes, not bugs:** the old Home test looked for the removed quick picks and cards, so it now checks for one start button. A compare test now opens the folded filters first, like a real phone user.
- **New test:** `tests/browser/e2e15.js` covers one start button, three steps, no duplicate sections, reveal behaviour, reduced motion, folded filters, the filter count, and the body-map invitation.
- **Say:** "I removed things to make the site easier to use. Every page now has one main action, and motion is optional for people who prefer less."

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
