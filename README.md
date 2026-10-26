# Panther

A Chromium extension that exports Studocu documents into a print-ready PDF.

## What it does

Panther renders a Studocu document (and its regional variants) into a single
window, fits it to a chosen paper size, and opens the browser's print dialog so
you can save it as a PDF.

Supported sites:

- https://www.studocu.com/*
- https://www.studeersnel.nl/*
- https://www.studocu.id/*
- https://www.studocu.vn/*

## Installation

1. Build the bundles:

   ```bash
   npm install
   npm run build
   ```

2. Load the extension unpacked in Chrome / Edge / Brave:

   - Open `chrome://extensions`
   - Enable **Developer mode** (top-right toggle)
   - Click **Load unpacked** and select this folder

3. Navigate to a Studocu document and click the extension toolbar icon,
   then **Download**.

## How it works

- The extension clears the `sd_docs` cookie on the supported Studocu domains
  (see `src/background/services/`), which is the cookie that gates document
  access.
- Clicking **Download** (or Studocu's native Download button, which Panther
  hooks) opens a paper-size modal, scans each page so all images load, clones
  the document into a viewer window with print CSS, and triggers
  `window.print()` so you can save a PDF.
- `src/bundle/` contains the three minified entry points built from
  `src/core/` by `npm run build` (esbuild).

## Disclaimer

This extension is provided for personal archival use only. By using it you
agree that the authors are not responsible for any terms-of-service violations
that may result from its use. Use at your own risk.