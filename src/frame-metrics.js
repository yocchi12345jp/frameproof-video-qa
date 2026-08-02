const FINGERPRINT_SIZE = 16;

export const analyzeGrayFrame = (frame, width, height, safeMarginRatio, index, fps) => {
  if (frame.length !== width * height) {
    throw new Error(`Expected ${width * height} bytes, received ${frame.length}`);
  }

  let sum = 0;
  for (const value of frame) sum += value;
  const mean = sum / frame.length;

  let varianceSum = 0;
  for (const value of frame) {
    const delta = value - mean;
    varianceSum += delta * delta;
  }
  const stdDev = Math.sqrt(varianceSum / frame.length);

  const marginX = Math.max(1, Math.floor(width * safeMarginRatio));
  const marginY = Math.max(1, Math.floor(height * safeMarginRatio));
  const gradientThreshold = 24;
  let edgePixels = 0;
  let activeEdgePixels = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const inMargin = x < marginX || x >= width - marginX || y < marginY || y >= height - marginY;
      if (!inMargin) continue;
      const center = frame[y * width + x] ?? 0;
      const right = frame[y * width + x + 1] ?? center;
      const down = frame[(y + 1) * width + x] ?? center;
      const gradient = Math.abs(right - center) + Math.abs(down - center);
      edgePixels += 1;
      if (gradient >= gradientThreshold) activeEdgePixels += 1;
    }
  }

  const fingerprint = [];
  const cellWidth = width / FINGERPRINT_SIZE;
  const cellHeight = height / FINGERPRINT_SIZE;
  for (let cellY = 0; cellY < FINGERPRINT_SIZE; cellY += 1) {
    for (let cellX = 0; cellX < FINGERPRINT_SIZE; cellX += 1) {
      const startX = Math.floor(cellX * cellWidth);
      const endX = Math.max(startX + 1, Math.floor((cellX + 1) * cellWidth));
      const startY = Math.floor(cellY * cellHeight);
      const endY = Math.max(startY + 1, Math.floor((cellY + 1) * cellHeight));
      let cellSum = 0;
      let count = 0;
      for (let y = startY; y < Math.min(endY, height); y += 1) {
        for (let x = startX; x < Math.min(endX, width); x += 1) {
          cellSum += frame[y * width + x] ?? 0;
          count += 1;
        }
      }
      fingerprint.push(count === 0 ? 0 : Math.round(cellSum / count));
    }
  }

  return {
    index,
    timestampSeconds: Number((index / fps).toFixed(6)),
    meanLuminance: Number(mean.toFixed(4)),
    luminanceStdDev: Number(stdDev.toFixed(4)),
    edgeActivityRatio: edgePixels === 0 ? 0 : Number((activeEdgePixels / edgePixels).toFixed(6)),
    fingerprint
  };
};

export const normalizedFingerprintDifference = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length === 0 || a.length !== b.length) {
    throw new Error('Fingerprints must have the same non-zero length');
  }
  let total = 0;
  for (let index = 0; index < a.length; index += 1) total += Math.abs((a[index] ?? 0) - (b[index] ?? 0));
  return total / (a.length * 255);
};
