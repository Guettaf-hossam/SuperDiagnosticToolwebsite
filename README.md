# SuperDiagnosticTool — website

Marketing site for [SuperDiagnosticTool](https://github.com/Guettaf-hossam/SuperDiagnosticTool), a free, open-source Windows diagnostic and remediation tool with AI-assisted analysis and reviewable PowerShell repairs.

This version fuses two designs:

- **Cinematic shell** — floating glass nav, full-viewport ferrofluid hero, iridescent type, glossy pill buttons, bento cards and ambient video sections.
- **Original single-page site** — the interactive canvas wordmark (drag or tap a letter), the telemetry signal map, the CPU-core grid, the Quick / Deep / Complete mode switcher, the pixel-icon "What it scans" row and the pixel logo mark.

## Stack

React 19, TypeScript, Vite and Tailwind CSS v4. All copy and links live in `src/data/site.ts`.

## Develop

```sh
npm install
npm run dev
```

## Build

```sh
npm run build   # outputs to dist/
```

## Deploy

`.github/workflows/deploy.yml` builds and publishes `dist/` to GitHub Pages on every push to `main`.
In **Settings → Pages**, set **Source** to **GitHub Actions**.

## Media

Binary assets live in `public/`:

```text
public/brand/favicon.png
public/brand/icon-160.webp
public/brand/screenshot-main.webp
public/media/ferrofluid-hero.mp4   + .webp poster
public/media/fluid-safety.mp4      + .webp poster
public/media/ocean-closing.mp4     + .webp poster
```

The previous single-file site is preserved in this repository's history.
