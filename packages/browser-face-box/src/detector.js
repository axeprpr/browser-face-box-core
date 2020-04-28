import { pico } from "./pico.js";

let facefinderClassifyRegion = function fallbackClassifier() {
  return -1.0;
};

let cascadeLoadPromise = null;
let cascadeLoaded = false;

function toUrl(input) {
  if (!input) {
    return "./facefinder.bin";
  }
  return input;
}

export async function initFaceDetector(options = {}) {
  if (cascadeLoaded) {
    return true;
  }
  if (cascadeLoadPromise) {
    return cascadeLoadPromise;
  }

  const cascadeUrl = toUrl(options.cascadeUrl);
  cascadeLoadPromise = fetch(cascadeUrl)
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

function rgbaToGrayscale(rgba, nrows, ncols) {
  const gray = new Uint8Array(nrows * ncols);
  for (let r = 0; r < nrows; ++r) {
    for (let c = 0; c < ncols; ++c) {
      gray[r * ncols + c] =
        (2 * rgba[r * 4 * ncols + 4 * c + 0] +
          7 * rgba[r * 4 * ncols + 4 * c + 1] +
          rgba[r * 4 * ncols + 4 * c + 2]) /
        10;
    }
  }
  return gray;
}

function getDefaultParams(width, height) {
  return {
    shiftfactor: 0.1,
    scalefactor: 1.1,
    minsize: Math.max(24, (Math.min(width, height) * 0.07) >> 0),
    maxsize: (Math.max(width, height) * 3) >> 0,
  };
}

function pickBestDetection(detections, qThreshold) {
  const matched = detections.filter((item) => item[3] > qThreshold);
  if (!matched.length) {
    return null;
  }
  return matched.reduce((best, current) => (current[3] > best[3] ? current : best), matched[0]);
}

export function imageDataToDetection(imageData, options = {}) {
  const { qThreshold = 5.0, iouThreshold = 0.2, detectOptions = {} } = options;
  const width = imageData.width;
  const height = imageData.height;

  const imageParams = {
    pixels: rgbaToGrayscale(imageData.data, height, width),
    nrows: height,
    ncols: width,
    ldim: width,
  };

  const params = { ...getDefaultParams(width, height), ...detectOptions };
  let detections = pico.run_cascade(imageParams, facefinderClassifyRegion, params);
  detections = pico.cluster_detections(detections, iouThreshold);
  return pickBestDetection(detections, qThreshold);
}

export async function detectFaceFromSource(source, options = {}) {
  const image = await loadImageSource(source);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("failed to acquire canvas context");
  }
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return imageDataToDetection(imageData, options);
}

export async function loadImageSource(source) {
  if (source instanceof ImageBitmap) {
    const canvas = document.createElement("canvas");
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("failed to acquire canvas context");
    }
    ctx.drawImage(source, 0, 0);
    return canvas;
  }

  if (source instanceof HTMLCanvasElement || source instanceof HTMLImageElement) {
    return source;
  }

  if (source instanceof Blob || source instanceof File) {
    const objectUrl = URL.createObjectURL(source);
    try {
      return await loadImageSource(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  if (typeof source === "string") {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("failed to decode image source"));
      image.src = source;
    });
  }

  throw new Error("unsupported image source type");
}
