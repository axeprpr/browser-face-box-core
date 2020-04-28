export function drawCornerBox(det, canvas, drawOptions = {}) {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!det) {
    return;
  }

  const mirrorX = Boolean(drawOptions.mirrorX);
  const xOffset = Number(drawOptions.xOffset || 0);
  const rawX = det[1];
  const x = (mirrorX ? canvas.width - rawX : rawX) + xOffset;
  const y = det[0];
  const faceSize = det[2];
  const r = faceSize / 2 + 2;
  const capLen = Math.max(12, Math.round(faceSize * 0.18));

  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = drawOptions.color || "DeepSkyBlue";

  ctx.moveTo(x - r, y - r);
  ctx.lineTo(x - r + capLen, y - r);
  ctx.moveTo(x - r, y - r);
  ctx.lineTo(x - r, y - r + capLen);

  ctx.moveTo(x + r, y - r);
  ctx.lineTo(x + r - capLen, y - r);
  ctx.moveTo(x + r, y - r);
  ctx.lineTo(x + r, y - r + capLen);

  ctx.moveTo(x - r, y + r);
  ctx.lineTo(x - r + capLen, y + r);
  ctx.moveTo(x - r, y + r);
  ctx.lineTo(x - r, y + r - capLen);

  ctx.moveTo(x + r, y + r);
  ctx.lineTo(x + r - capLen, y + r);
  ctx.moveTo(x + r, y + r);
  ctx.lineTo(x + r, y + r - capLen);

  ctx.stroke();
}
