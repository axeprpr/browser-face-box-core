import { detectFaceFromSource, loadImageSource } from "./detector.js";

function cropFacePatch(image, det, size = 64) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("failed to acquire canvas context");
  }

  const centerY = det[0];
  const centerX = det[1];
  const faceSize = det[2] * 1.2;
  const sx = centerX - faceSize / 2;
  const sy = centerY - faceSize / 2;

  ctx.drawImage(image, sx, sy, faceSize, faceSize, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);

  const gray = new Float32Array(size * size);
  for (let i = 0; i < gray.length; i += 1) {
    const p = i * 4;
    gray[i] =
      (2 * imageData.data[p + 0] + 7 * imageData.data[p + 1] + imageData.data[p + 2]) /
      10;
  }

  normalize(gray);
  return gray;
}

function normalize(vector) {
  let mean = 0;
  for (let i = 0; i < vector.length; i += 1) {
    mean += vector[i];
  }
  mean /= vector.length;

  let sq = 0;
  for (let i = 0; i < vector.length; i += 1) {
    vector[i] -= mean;
    sq += vector[i] * vector[i];
  }

  const std = Math.sqrt(sq / vector.length) || 1;
  for (let i = 0; i < vector.length; i += 1) {
    vector[i] /= std;
  }
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  if (!aa || !bb) {
    return 0;
  }
  return dot / (Math.sqrt(aa) * Math.sqrt(bb));
}

export async function compareFaceSources(sourceA, sourceB, options = {}) {
  const { threshold = 0.72, detectorOptions = {} } = options;

  const [imgA, imgB] = await Promise.all([loadImageSource(sourceA), loadImageSource(sourceB)]);
  const [detA, detB] = await Promise.all([
    detectFaceFromSource(imgA, detectorOptions),
    detectFaceFromSource(imgB, detectorOptions),
  ]);

  if (!detA || !detB) {
    return {
      matched: false,
      score: 0,
      threshold,
      reason: "face_not_found",
      detA,
      detB,
    };
  }

  const embA = cropFacePatch(imgA, detA, 64);
  const embB = cropFacePatch(imgB, detB, 64);
  const score = cosineSimilarity(embA, embB);

  return {
    matched: score >= threshold,
    score,
    threshold,
    reason: null,
    detA,
    detB,
  };
}
