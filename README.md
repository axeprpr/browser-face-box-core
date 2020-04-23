# vue-picojs

Vue 3 + Vite + pico.js browser face detection demo with webcam capture.

## Requirements

- Node.js `>=16` (project currently validated on Node `24.7.0`)
- npm `>=8`
- Browser with camera permission support

## Install

```bash
npm install
```

## Run in development

```bash
npm run dev
```

Open `http://localhost:5173` and allow camera access.

## Quality gate

```bash
npm run lint
```

## E2E smoke test

```bash
npx playwright install chromium
npm run test:e2e
```

## Production build

```bash
npm run build
npm run preview
```

Build output is generated in `dist/`.

## Troubleshooting

- If you see cascade loading errors, verify `public/facefinder.bin` exists in deployment assets.
- If no face box is shown, check browser camera permission and HTTPS policy on your target host.
- If using a non-root deployment path, keep Vue `BASE_URL` aligned with actual public path so `facefinder.bin` can be fetched correctly.

## Migration plan

- See `VUE3_MIGRATION_PLAN.md` for phased Vue 3 + Vite migration execution details.
