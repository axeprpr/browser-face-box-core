import { pico } from "./pico.js";

let facefinderClassifyRegion = function fallbackClassifier() {
  return -1.0;
};

let cascadeLoadPromise = null;
let cascadeLoaded = false;

const CASCADE_FILE = "facefinder.bin";

function getCascadeUrl() {
  const baseUrl = window.__APP_BASE_URL__ || "/";
  return `${baseUrl}${CASCADE_FILE}`;
}

async function initFaceDetector() {
  if (cascadeLoaded) {
    return true;
  }
  if (cascadeLoadPromise) {
    return cascadeLoadPromise;
  }

  cascadeLoadPromise = fetch(getCascadeUrl())
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load cascade: HTTP ${response.status}`);
      }
      return response.arrayBuffer();
    })
    .then((buffer) => {
      const bytes = new Int8Array(buffer);
      facefinderClassifyRegion = pico.unpack_cascade(bytes);
      cascadeLoaded = true;
      return true;
    })
    .catch((error) => {
      cascadeLoadPromise = null;
      throw error;
    });

  return cascadeLoadPromise;
}

const getImage = async (source) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onerror = () => reject(new Error("Image decode failed"));
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to acquire canvas context"));
        return;
      }
      ctx.drawImage(image, 0, 0);
      resolve({ image, ctx });
    };
    image.src = source;
  });
};

const rgbaToGrayscale = (rgba, nrows, ncols) => {
  const gray = new Uint8Array(nrows * ncols);
  for (let r = 0; r < nrows; ++r) {
    for (let c = 0; c < ncols; ++c) {
      gray[r * ncols + c] =
        (2 * rgba[r * 4 * ncols + 4 * c + 0] +
          7 * rgba[r * 4 * ncols + 4 * c + 1] +
          1 * rgba[r * 4 * ncols + 4 * c + 2]) /
        10;
    }
  }
  return gray;
};

const getDefaultParams = (width, height) => {
  const factor = {
    shiftfactor: 0.1,
    scalefactor: 1.1,
  };
  const size = {
    minsize: Math.max(24, (Math.min(width, height) * 0.07) >> 0),
    maxsize: (Math.max(width, height) * 3) >> 0,
  };
  return Object.assign(factor, size);
};

function pickBestDetection(detections, qThreshold) {
  const matched = detections.filter((item) => item[3] > qThreshold);
  if (matched.length === 0) {
    return null;
  }

  return matched.reduce((best, current) => {
    if (!best) {
      return current;
    }
    return current[3] > best[3] ? current : best;
  }, null);
}

const draw_frame = function drawFrame(det, canvasId, drawOptions = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) {
    return;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx || !ctx.canvas) {
    return;
  }

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (!det) {
    return;
  }

  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "DeepSkyBlue";
  const mirrorX = Boolean(drawOptions.mirrorX);
  const xOffset = Number(drawOptions.xOffset || 0);
  const rawX = det[1];
  const cx = mirrorX ? ctx.canvas.width - rawX : rawX;
  const cy = det[0];
  const faceSize = det[2];
  const r = faceSize / 2 + 2;
  const x = cx + xOffset;
  const y = cy;
  const capLen = Math.max(12, Math.round(faceSize * 0.18));
  const yFix = 1.1;

  ctx.moveTo(x - r, y - r);
  ctx.lineTo(x - r + capLen, y - r);
  ctx.moveTo(x - r, y - r - yFix);
  ctx.lineTo(x - r, y - r + capLen + yFix);

  ctx.moveTo(x + r, y - r);
  ctx.lineTo(x + r - capLen, y - r);
  ctx.moveTo(x + r, y - r - yFix);
  ctx.lineTo(x + r, y - r + capLen + yFix);

  ctx.moveTo(x - r, y + r);
  ctx.lineTo(x - r + capLen, y + r);
  ctx.moveTo(x - r, y + r + yFix);
  ctx.lineTo(x - r, y + r - capLen + yFix);

  ctx.moveTo(x + r, y + r);
  ctx.lineTo(x + r - capLen, y + r);
  ctx.moveTo(x + r, y + r + yFix);
  ctx.lineTo(x + r, y + r - capLen + yFix);
  ctx.stroke();
};

const face_detection = async (
  img,
  option = {},
  qThreshold = 5.0,
  iouThreshold = 0.2
) => {
  await initFaceDetector();

  const { image, ctx } = await getImage(img);
  const { width, height } = image;

  const rgba = ctx.getImageData(0, 0, width, height).data;
  const imageParams = {
    pixels: rgbaToGrayscale(rgba, height, width),
    nrows: height,
    ncols: width,
    ldim: width,
  };

  const params = Object.assign(getDefaultParams(width, height), option);
  let detections = pico.run_cascade(imageParams, facefinderClassifyRegion, params);
  detections = pico.cluster_detections(detections, iouThreshold);

  return pickBestDetection(detections, qThreshold);
};

export {
  initFaceDetector,
  face_detection,
  draw_frame,
};
