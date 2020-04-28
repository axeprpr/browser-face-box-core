import { createCameraAdapter } from "./camera.js";
import { compareFaceSources } from "./compare.js";
import { detectFaceFromSource, initFaceDetector, loadImageSource } from "./detector.js";
import { drawCornerBox } from "./draw.js";

export async function captureFromVideo(videoEl, type = "image/png", quality) {
  if (!videoEl) {
    throw new Error("video element is required");
  }
  const canvas = document.createElement("canvas");
  canvas.width = videoEl.videoWidth || videoEl.clientWidth || 640;
  canvas.height = videoEl.videoHeight || videoEl.clientHeight || 480;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("failed to acquire canvas context");
  }
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, quality);
}

export async function compareUploadedFaces(sourceA, sourceB, options = {}) {
  await initFaceDetector(options);
  return compareFaceSources(sourceA, sourceB, options.compare || {});
}

export function createFaceTracker(options = {}) {
  const camera = createCameraAdapter();
  const state = {
    running: false,
    timer: null,
    detectOptions: options.detectOptions || {},
    qThreshold: options.qThreshold ?? 4.5,
    iouThreshold: options.iouThreshold ?? 0.2,
    intervalMs: options.intervalMs ?? 30,
    holdFrames: options.holdFrames ?? 6,
    smoothAlpha: options.smoothAlpha ?? 0.35,
    smoothedDet: null,
    lostFrames: 0,
    canvas: null,
    onDetect: options.onDetect || null,
    onError: options.onError || null,
    drawOptions: options.drawOptions || {},
  };

  function emitError(error) {
    if (state.onError) {
      state.onError(error);
    }
  }

  function smoothDetection(det) {
    if (!det) {
      state.lostFrames += 1;
      if (state.lostFrames <= state.holdFrames && state.smoothedDet) {
        return state.smoothedDet;
      }
      state.smoothedDet = null;
      return null;
    }

    state.lostFrames = 0;
    if (!state.smoothedDet) {
      state.smoothedDet = [...det];
      return state.smoothedDet;
    }

    const a = state.smoothAlpha;
    const prev = state.smoothedDet;
    state.smoothedDet = [
      prev[0] * (1 - a) + det[0] * a,
      prev[1] * (1 - a) + det[1] * a,
      prev[2] * (1 - a) + det[2] * a,
      det[3],
    ];
    return state.smoothedDet;
  }

  async function tick() {
    if (!state.running) {
      return;
    }

    try {
      const frame = camera.captureFrame("image/png");
      const det = await detectFaceFromSource(frame, {
        detectOptions: state.detectOptions,
        qThreshold: state.qThreshold,
        iouThreshold: state.iouThreshold,
      });
      const stableDet = smoothDetection(det);
      if (state.canvas) {
        drawCornerBox(stableDet, state.canvas, state.drawOptions);
      }
      if (state.onDetect) {
        state.onDetect(stableDet);
      }
    } catch (error) {
      emitError(error);
    } finally {
      state.timer = window.setTimeout(tick, state.intervalMs);
    }
  }

  return {
    async init() {
      await initFaceDetector(options);
      return true;
    },

    async start(params) {
      const { containerId, width = 640, height = 480, overlayCanvas = null } = params || {};
      if (!containerId) {
        throw new Error("containerId is required");
      }
      await initFaceDetector(options);
      await camera.start({ containerId, width, height, facingMode: options.facingMode || "user" });
      state.canvas = overlayCanvas;
      state.running = true;
      if (state.timer) {
        window.clearTimeout(state.timer);
      }
      state.timer = window.setTimeout(tick, 0);
      return true;
    },

    async stop() {
      state.running = false;
      if (state.timer) {
        window.clearTimeout(state.timer);
        state.timer = null;
      }
      await camera.stop();
      if (state.canvas) {
        const ctx = state.canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
        }
      }
    },

    captureFrame(type = "image/png", quality) {
      return camera.captureFrame(type, quality);
    },

    async detect(source, detectOptions = {}) {
      await initFaceDetector(options);
      return detectFaceFromSource(source, detectOptions);
    },

    async compare(sourceA, sourceB, compareOptions = {}) {
      await initFaceDetector(options);
      return compareFaceSources(sourceA, sourceB, compareOptions);
    },

    async compareCurrentFrameWith(source, compareOptions = {}) {
      const frame = camera.captureFrame("image/png");
      return this.compare(frame, source, compareOptions);
    },

    async ensureImage(source) {
      return loadImageSource(source);
    },
  };
}

export { createCameraAdapter } from "./camera.js";
export { initFaceDetector, detectFaceFromSource } from "./detector.js";
export { compareFaceSources } from "./compare.js";
export { drawCornerBox } from "./draw.js";
