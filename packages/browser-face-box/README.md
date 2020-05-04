# @axeprpr/browser-face-box

Lightweight browser face box toolkit built on pico.js.

It provides:
- camera start/stop and frame capture
- face detection from camera/image source
- corner-box drawing overlay
- screenshot/upload face compare (`compareFaceSources`)

> This package is for detection + lightweight compare, not biometric-grade identity verification.

## Install

```bash
npm i @axeprpr/browser-face-box@beta
```

## Quick Start

```js
import { createFaceTracker } from "@axeprpr/browser-face-box";
import facefinderUrl from "@axeprpr/browser-face-box/facefinder.bin";

const tracker = createFaceTracker({
  cascadeUrl: facefinderUrl,
  drawOptions: { mirrorX: false, xOffset: 0 },
  onDetect: (det) => {
    // det = [row, col, size, score] or null
  },
  onError: (err) => console.error(err),
});

await tracker.start({
  containerId: "camera",
  overlayCanvas: document.getElementById("overlay"),
  width: 640,
  height: 480,
});
```

Expected HTML structure:

```html
<div id="camera"></div>
<canvas id="overlay" width="640" height="480"></canvas>
```

## Compare Uploaded Images

```js
import { initFaceDetector, compareFaceSources } from "@axeprpr/browser-face-box";
import facefinderUrl from "@axeprpr/browser-face-box/facefinder.bin";

await initFaceDetector({ cascadeUrl: facefinderUrl });
const result = await compareFaceSources(fileA, fileB, { threshold: 0.72 });

console.log(result);
// {
//   matched: boolean,
//   score: number,
//   threshold: number,
//   reason: "face_not_found" | null,
//   detA,
//   detB
// }
```

## API

### `createFaceTracker(options)`

Returns tracker with methods:
- `init()`
- `start({ containerId, width, height, overlayCanvas })`
- `stop()`
- `captureFrame(type?, quality?)`
- `detect(source, options?)`
- `compare(sourceA, sourceB, options?)`
- `compareCurrentFrameWith(source, options?)`

### `compareFaceSources(sourceA, sourceB, options)`

Compares two image sources (`File`, `Blob`, `data URL`, `URL`, `HTMLImageElement`, `HTMLCanvasElement`).

### `compareUploadedFaces(sourceA, sourceB, options)`

Convenience wrapper that initializes detector then compares.

## Notes

- Camera access requires secure context (`https://` or `http://localhost`).
- For production identity systems, use a dedicated recognition model + liveness checks + compliance controls.
