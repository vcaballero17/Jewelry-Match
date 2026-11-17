# Jewelry Match

An experimental jewelry archive that starts with the body: choose where a piece should live, then form, material and mood, and get four explainable matches from a collection of twelve.

**Live site:** https://YOUR-USERNAME.github.io/jewelry-match/  *(replace after deploying)*

## What it does

- **Find your match:** a four-step quiz (Body Map, Form, Material, Mood). Each result shows a percentage and a score breakdown bar for every choice.
- **The Edit:** all twelve pieces, with filters and a compare mode (tick up to three pieces and see them side by side).
- **Object pages:** one story page per piece, with styling notes and related pieces.
- **Your Edit:** saved pieces, your latest match, and *Build your look* (one saved piece per body place).
- **Share:** your answers travel in the link (`match.html#edit-ear-liquid-silver-quiet`) so a friend sees your edit.

## How it is built

Plain HTML, CSS and JavaScript. No frameworks, no server, no build step. Saved data lives only in the visitor's browser (localStorage).

```
*.html     one file per page
css/       tokens.css (colors, spacing), base.css, components.css, pages.css
js/        data.js (the 12 pieces) · match.js (scoring) · storage.js · ui.js · one script per page
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
```

## Images

Every image is AI-generated (OpenAI image generation, November 2026). Prompts and process: `docs/image-prompts.md`, `docs/image-generation-record.md`.

## Accessibility

Built for keyboard and screen-reader use, 44 px touch targets, visible focus, reduced-motion support, text alternatives for every image. Target: WCAG 2.1 AA.
