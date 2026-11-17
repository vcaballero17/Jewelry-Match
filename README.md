# Jewelry Match

An experimental jewelry archive that starts with the body: choose where a piece should live, then form, material and mood, and get four explainable matches from a collection of twelve.

**Live site:** https://vcaballero17.github.io/Jewelry-Match/

## What it does

- **Find your match:** a four-step quiz (Body Map, Form, Material, Mood). Each result shows a percentage and a score breakdown bar for every choice.
- **The Edit:** all twelve pieces. Filters show how many pieces each option leaves and switch off impossible ones; if nothing matches exactly, the closest pieces are shown. Compare mode puts up to three pieces side by side.
- **Object pages:** one story page per piece, with styling notes, related pieces and a *Send this piece* link, so you can share just one thing.
- **Build your look:** a guided walk-through (ear, neckline, hand, little finger, ankle) with Continue, Back and Skip. You can fill all five places or press *Finish now* after any of them. It ends on one screen with your choice and a link to send to friends.
- **Your Edit:** saved pieces, your latest match and your look.
- **Share:** the pieces you chose travel inside the link (`look.html#look-006-009-000-001-010`). A friend who opens it sees your pieces side by side, and nothing is stored on a server. Old quiz links (`match.html#edit-...`) still work.

## How it is built

Plain HTML, CSS and JavaScript. No frameworks, no server, no build step. Saved data lives only in the visitor's browser (localStorage).

```
*.html     one file per page (look.html is the guided look)
css/       tokens.css (colors, spacing), base.css, components.css, pages.css
js/        data.js (the 12 pieces) · match.js (scoring) · storage.js · ui.js · one script per page (look.js = guided look)
assets/    images
tests/     match.test.js (scoring) · browser/ (Playwright)
tools/     check-links.js, check-images.js
docs/      process-log.md, image-prompts.md, image-generation-record.md
```

## Scoring

Placement 40 + Form 25 + Material 20 + Mood 15 = 100. Ties go to the earlier piece in the collection. See `about.html#scoring`.

## Run it locally

Open `index.html` in a browser. That's all.

## Run the tests (optional, needs Node.js)

```
node tests/match.test.js        # scoring, filters, share links
node tools/check-links.js       # every link and image exists
npm i -g playwright             # once, for the browser tests
node tests/browser/e2e.js       # quiz journey (uses the Google Chrome installed on your computer)
npm i -g axe-core               # once, for the accessibility audit
node tests/browser/a11y.js      # axe-core + zoom, keyboard, target size, contrast
```

## Images

Every image is AI-generated (OpenAI image generation, November 2026). Prompts and process: `docs/image-prompts.md`, `docs/image-generation-record.md`.

## Accessibility

Built for keyboard and screen-reader use, 44 px touch targets, visible focus, reduced-motion support, text alternatives for every image. Target: WCAG 2.1 AA.
