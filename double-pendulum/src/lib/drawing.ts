import type {
  PendulumParams,
  PendulumState,
  TrailPoint,
} from '../types/pendulum';

export interface CanvasSize {
  width: number;
  height: number;
}

function getPivotPosition(size: CanvasSize) {
  return {
    pivotX: size.width / 2,
    pivotY: size.height / 2,
  };
}

export function getBobPositions(
  state: PendulumState,
  params: PendulumParams,
  size: CanvasSize,
) {
  const { theta1, theta2 } = state;
  const { length1, length2 } = params;
  const { pivotX, pivotY } = getPivotPosition(size);

  const totalLength = length1 + length2;
  const horizontalScale = (size.width * 0.68) / (2 * totalLength);
  const verticalScale = (size.height * 0.42) / totalLength;
  const scale = Math.min(horizontalScale, verticalScale);

  const x1 = pivotX + length1 * scale * Math.sin(theta1);
  const y1 = pivotY + length1 * scale * Math.cos(theta1);
  const x2 = x1 + length2 * scale * Math.sin(theta2);
  const y2 = y1 + length2 * scale * Math.cos(theta2);

  return {
    pivotX,
    pivotY,
    x1,
    y1,
    x2,
    y2,
  };
}

export function drawBackground(
  context: CanvasRenderingContext2D,
  size: CanvasSize,
) {
  const gradient = context.createLinearGradient(0, 0, 0, size.height);
  gradient.addColorStop(0, '#0b141d');
  gradient.addColorStop(1, '#121d27');

  context.fillStyle = gradient;
  context.fillRect(0, 0, size.width, size.height);
}

function drawTrail(
  context: CanvasRenderingContext2D,
  trail: TrailPoint[],
  color: string,
) {
  if (trail.length < 2) {
    return;
  }

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  const layerCount = 8;

  for (let layerIndex = 0; layerIndex < layerCount; layerIndex += 1) {
    const startRatio = layerIndex / layerCount;
    const endRatio = (layerIndex + 1) / layerCount;
    const startIndex = Math.floor(startRatio * (trail.length - 1));
    const endIndex = Math.max(
      startIndex + 1,
      Math.floor(endRatio * (trail.length - 1)),
    );
    const segment = trail.slice(startIndex, endIndex + 1);

    if (segment.length < 2) {
      continue;
    }

    const layerProgress = (layerIndex + 1) / layerCount;
    const alpha = 0.05 + Math.pow(layerProgress, 1.24) * 0.56;
    const lineWidth = 0.6 + Math.pow(layerProgress, 1.08) * 2.35;

    context.strokeStyle = color.replace('ALPHA', alpha.toFixed(3));
    context.lineWidth = lineWidth;
    context.shadowBlur = layerIndex >= layerCount - 3 ? 10 + layerIndex * 2 : 0;
    context.shadowColor =
      layerIndex >= layerCount - 3
        ? color.replace('ALPHA', (alpha * 0.58).toFixed(3))
        : 'transparent';
    context.beginPath();
    context.moveTo(segment[0].x, segment[0].y);

    let previousPoint = segment[0];

    for (let index = 1; index < segment.length; index += 1) {
      const currentPoint = segment[index];
      const midpointX = (previousPoint.x + currentPoint.x) / 2;
      const midpointY = (previousPoint.y + currentPoint.y) / 2;

      context.quadraticCurveTo(
        previousPoint.x,
        previousPoint.y,
        midpointX,
        midpointY,
      );

      previousPoint = currentPoint;
    }

    const lastPoint = segment[segment.length - 1];
    context.quadraticCurveTo(
      previousPoint.x,
      previousPoint.y,
      lastPoint.x,
      lastPoint.y,
    );
    context.stroke();
  }

  const tipPoint = trail[trail.length - 1];
  context.fillStyle = color.replace('ALPHA', '0.82');
  context.shadowBlur = 14;
  context.shadowColor = color.replace('ALPHA', '0.44');
  context.beginPath();
  context.arc(tipPoint.x, tipPoint.y, 2.8, 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function getPendulumPalette(index: number, total: number) {
  const normalizedIndex = total <= 1 ? 0 : index / (total - 1);
  const hue = 200 + normalizedIndex * 140;

  return {
    trail: `hsla(${hue}, 82%, 70%, ALPHA)`,
    rod: `hsla(206, 17%, 34%, 0.78)`,
    bob: `hsla(${hue}, 88%, 78%, 0.98)`,
  };
}

export function drawPendulum(
  context: CanvasRenderingContext2D,
  states: PendulumState[],
  params: PendulumParams,
  size: CanvasSize,
  trails: TrailPoint[][],
  backgroundCanvas?: HTMLCanvasElement,
) {
  if (states.length === 0) {
    return;
  }
  context.clearRect(0, 0, size.width, size.height);
  if (backgroundCanvas) {
    context.drawImage(backgroundCanvas, 0, 0);
  } else {
    drawBackground(context, size);
  }

  trails.forEach((trail, index) => {
    const palette = getPendulumPalette(index, trails.length);
    drawTrail(context, trail, palette.trail);
  });

  states.forEach((state, index) => {
    const positions = getBobPositions(state, params, size);
    const palette = getPendulumPalette(index, states.length);

    context.strokeStyle = palette.rod;
    context.lineWidth = 2.2;
    context.beginPath();
    context.moveTo(positions.pivotX, positions.pivotY);
    context.lineTo(positions.x1, positions.y1);
    context.lineTo(positions.x2, positions.y2);
    context.stroke();

    context.fillStyle = 'rgba(236, 235, 228, 0.08)';
    context.beginPath();
    context.arc(positions.x1, positions.y1, 4, 0, Math.PI * 2);
    context.fill();

    context.fillStyle = palette.bob;
    context.shadowBlur = 16;
    context.shadowColor = palette.trail.replace('ALPHA', '0.34');
    context.beginPath();
    context.arc(positions.x2, positions.y2, 5.5, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
  });

  context.fillStyle = 'rgba(61, 76, 91, 0.96)';
  context.shadowBlur = 0;
  const { pivotX, pivotY } = getPivotPosition(size);
  context.beginPath();
  context.arc(pivotX, pivotY, 4.2, 0, Math.PI * 2);
  context.fill();
}
