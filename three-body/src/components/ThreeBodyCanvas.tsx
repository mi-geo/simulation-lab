import { useEffect, useRef } from 'react';
import {
  buildSnapshot,
  calculateCenterOfMass,
  integrateBodies,
} from '../lib/physics';
import type {
  BodyState,
  SimulationParams,
  SimulationSnapshot,
  ViewAnchorMode,
} from '../types/simulation';

interface TrailPoint {
  x: number;
  y: number;
}

type DragTarget =
  | { kind: 'body'; index: number }
  | { kind: 'velocity'; index: number }
  | null;

interface ThreeBodyCanvasProps {
  initialBodies: BodyState[];
  params: SimulationParams;
  viewAnchorMode: ViewAnchorMode;
  isRunning: boolean;
  maxTrailPoints: number;
  onDebugSnapshotChange: (snapshot: SimulationSnapshot) => void;
  onBodiesCommit: (bodies: BodyState[]) => void;
  onEscapeThresholdExceeded: () => void;
  width: number;
  height: number;
}

const BODY_COLORS = ['#f4c16d', '#8cc9de', '#ef8aa1'];
const TRAIL_COLORS = [
  'hsla(38, 88%, 72%, ALPHA)',
  'hsla(196, 82%, 70%, ALPHA)',
  'hsla(344, 82%, 74%, ALPHA)',
];
const POSITION_MIN = -400;
const POSITION_MAX = 400;
const TRAIL_LAYER_COUNT = 10;
const TRAIL_RECORD_INTERVAL = 2;
const TRAIL_HEAD_POINTS = 12;
const VIEWPORT_PADDING = 28;
const VISIBLE_WORLD_HALF_WIDTH = 360;
const VISIBLE_WORLD_HALF_HEIGHT = 260;
const ESCAPE_DISTANCE = 1200;
const FIXED_START_REFERENCE = { x: 0, y: 0 };
const VELOCITY_ARROW_SCALE = 26;
const VELOCITY_HANDLE_RADIUS = 12;

interface Viewport {
  centerX: number;
  centerY: number;
  scale: number;
}

function cloneBodies(bodies: BodyState[]) {
  return bodies.map((body) => ({ ...body }));
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const gradient = context.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, '#10202b');
  gradient.addColorStop(1, '#081018');

  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function buildViewport(
  width: number,
  height: number,
  bodies: BodyState[],
  viewAnchorMode: ViewAnchorMode,
  fixedReferencePoint: { x: number; y: number },
) {
  const anchorBody =
    viewAnchorMode === 'followA'
      ? { x: bodies[0].x, y: bodies[0].y }
      : viewAnchorMode === 'centerOfMass'
        ? calculateCenterOfMass(bodies)
        : fixedReferencePoint;
  const scale = Math.min(
    (width - VIEWPORT_PADDING * 2) / (VISIBLE_WORLD_HALF_WIDTH * 2),
    (height - VIEWPORT_PADDING * 2) / (VISIBLE_WORLD_HALF_HEIGHT * 2),
  );

  return {
    centerX: anchorBody.x,
    centerY: anchorBody.y,
    scale,
  };
}

function toCanvasX(worldX: number, width: number, centerX: number, scale: number) {
  return width / 2 + (worldX - centerX) * scale;
}

function toCanvasY(worldY: number, height: number, centerY: number, scale: number) {
  return height / 2 - (worldY - centerY) * scale;
}

function bodyRadius(mass: number, maxMass: number) {
  return 6 + 20 * Math.sqrt(mass / maxMass);
}

function hitRadius(mass: number, maxMass: number) {
  return Math.max(14, bodyRadius(mass, maxMass));
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function hasEscapedThreshold(bodies: BodyState[]) {
  const anchorBody = bodies[0];

  return bodies.slice(1).some((body) => {
    const dx = body.x - anchorBody.x;
    const dy = body.y - anchorBody.y;
    return Math.hypot(dx, dy) > ESCAPE_DISTANCE;
  });
}

function getBodyCanvasPosition(
  body: BodyState,
  viewport: Viewport,
  width: number,
  height: number,
) {
  return {
    x: toCanvasX(body.x, width, viewport.centerX, viewport.scale),
    y: toCanvasY(body.y, height, viewport.centerY, viewport.scale),
  };
}

function getVelocityTipPosition(
  body: BodyState,
  viewport: Viewport,
  width: number,
  height: number,
) {
  const bodyPosition = getBodyCanvasPosition(body, viewport, width, height);

  return {
    x: bodyPosition.x + body.vx * VELOCITY_ARROW_SCALE,
    y: bodyPosition.y - body.vy * VELOCITY_ARROW_SCALE,
  };
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

  for (let layerIndex = 0; layerIndex < TRAIL_LAYER_COUNT; layerIndex += 1) {
    const startRatio = layerIndex / TRAIL_LAYER_COUNT;
    const endRatio = (layerIndex + 1) / TRAIL_LAYER_COUNT;
    const startIndex = Math.floor(startRatio * (trail.length - 1));
    const endIndex = Math.max(
      startIndex + 1,
      Math.floor(endRatio * (trail.length - 1)),
    );
    const segment = trail.slice(startIndex, endIndex + 1);

    if (segment.length < 2) {
      continue;
    }

    const layerProgress = (layerIndex + 1) / TRAIL_LAYER_COUNT;
    const alpha = 0.04 + Math.pow(layerProgress, 1.18) * 0.72;
    const lineWidth = 0.9 + Math.pow(layerProgress, 1.05) * 3.4;

    context.strokeStyle = color.replace('ALPHA', alpha.toFixed(3));
    context.lineWidth = lineWidth;
    context.shadowBlur =
      layerIndex >= TRAIL_LAYER_COUNT - 3 ? 12 + layerIndex * 2 : 0;
    context.shadowColor =
      layerIndex >= TRAIL_LAYER_COUNT - 3
        ? color.replace('ALPHA', (alpha * 0.64).toFixed(3))
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

  const headSegment = trail.slice(-TRAIL_HEAD_POINTS);
  if (headSegment.length >= 2) {
    context.strokeStyle = color.replace('ALPHA', '0.92');
    context.lineWidth = 5.4;
    context.shadowBlur = 18;
    context.shadowColor = color.replace('ALPHA', '0.62');
    context.beginPath();
    context.moveTo(headSegment[0].x, headSegment[0].y);

    let previousPoint = headSegment[0];

    for (let index = 1; index < headSegment.length; index += 1) {
      const currentPoint = headSegment[index];
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

    const lastPoint = headSegment[headSegment.length - 1];
    context.quadraticCurveTo(
      previousPoint.x,
      previousPoint.y,
      lastPoint.x,
      lastPoint.y,
    );
    context.stroke();
  }

  context.restore();
}

function drawFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bodies: BodyState[],
  trails: TrailPoint[][],
  viewport: Viewport,
  showVelocityArrows: boolean,
) {
  drawBackground(context, width, height);

  const maxMass = Math.max(...bodies.map((body) => body.mass));
  const centerOfMass = calculateCenterOfMass(bodies);

  trails.forEach((trail, index) => {
    drawTrail(context, trail, TRAIL_COLORS[index]);
  });

  const centerX = toCanvasX(centerOfMass.x, width, viewport.centerX, viewport.scale);
  const centerY = toCanvasY(centerOfMass.y, height, viewport.centerY, viewport.scale);

  context.strokeStyle = 'rgba(236, 235, 228, 0.45)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(centerX - 10, centerY);
  context.lineTo(centerX + 10, centerY);
  context.moveTo(centerX, centerY - 10);
  context.lineTo(centerX, centerY + 10);
  context.stroke();

  bodies.forEach((body, index) => {
    const { x, y } = getBodyCanvasPosition(body, viewport, width, height);
    const radius = bodyRadius(body.mass, maxMass);
    const gradient = context.createRadialGradient(
      x - radius * 0.35,
      y - radius * 0.35,
      radius * 0.2,
      x,
      y,
      radius,
    );

    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.18, BODY_COLORS[index]);
    gradient.addColorStop(1, '#101820');

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();

    context.strokeStyle = 'rgba(255, 255, 255, 0.16)';
    context.lineWidth = 1;
    context.stroke();

    context.fillStyle = '#ecebe4';
    context.font = '14px Georgia';
    context.textAlign = 'center';
    context.fillText(body.id, x, y - radius - 10);
  });

  if (!showVelocityArrows) {
    return;
  }

  bodies.forEach((body, index) => {
    const bodyPosition = getBodyCanvasPosition(body, viewport, width, height);
    const tipPosition = getVelocityTipPosition(body, viewport, width, height);
    const dx = tipPosition.x - bodyPosition.x;
    const dy = tipPosition.y - bodyPosition.y;
    const arrowLength = Math.hypot(dx, dy);

    if (arrowLength < 4) {
      return;
    }

    const unitX = dx / arrowLength;
    const unitY = dy / arrowLength;
    const headLength = 12;
    const headWidth = 7;
    const arrowColor = TRAIL_COLORS[index].replace('ALPHA', '0.94');
    const glowColor = TRAIL_COLORS[index].replace('ALPHA', '0.54');

    context.save();
    context.strokeStyle = arrowColor;
    context.fillStyle = arrowColor;
    context.lineWidth = 3.2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.shadowBlur = 14;
    context.shadowColor = glowColor;

    context.beginPath();
    context.moveTo(bodyPosition.x, bodyPosition.y);
    context.lineTo(tipPosition.x, tipPosition.y);
    context.stroke();

    context.beginPath();
    context.moveTo(tipPosition.x, tipPosition.y);
    context.lineTo(
      tipPosition.x - unitX * headLength - unitY * headWidth,
      tipPosition.y - unitY * headLength + unitX * headWidth,
    );
    context.lineTo(
      tipPosition.x - unitX * headLength + unitY * headWidth,
      tipPosition.y - unitY * headLength - unitX * headWidth,
    );
    context.closePath();
    context.fill();

    context.fillStyle = 'rgba(236, 235, 228, 0.92)';
    context.beginPath();
    context.arc(tipPosition.x, tipPosition.y, 4, 0, Math.PI * 2);
    context.fill();
    context.restore();
  });
}

export function ThreeBodyCanvas({
  initialBodies,
  params,
  viewAnchorMode,
  isRunning,
  maxTrailPoints,
  onDebugSnapshotChange,
  onBodiesCommit,
  onEscapeThresholdExceeded,
  width,
  height,
}: ThreeBodyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();
  const statesRef = useRef<BodyState[]>(cloneBodies(initialBodies));
  const trailsRef = useRef<TrailPoint[][]>(
    initialBodies.map((body) => [{ x: body.x, y: body.y }]),
  );
  const viewportRef = useRef<Viewport>({
    centerX: initialBodies[0].x,
    centerY: initialBodies[0].y,
    scale: 1,
  });
  const dragViewportRef = useRef<Viewport | null>(null);
  const dragTargetRef = useRef<DragTarget>(null);
  const trailStepCounterRef = useRef(0);
  const fixedReferencePointRef = useRef(FIXED_START_REFERENCE);

  function recordTrailPoints(
    bodies: BodyState[],
    viewport: Viewport,
  ) {
    trailsRef.current = trailsRef.current.map((trail, index) => {
      const body = bodies[index];
      const nextPoint = {
        x: toCanvasX(body.x, width, viewport.centerX, viewport.scale),
        y: toCanvasY(body.y, height, viewport.centerY, viewport.scale),
      };

      const nextTrail = trail.concat(nextPoint);
      return nextTrail.slice(-maxTrailPoints);
    });
  }

  function resetDraggedTrail(
    bodies: BodyState[],
    viewport: Viewport,
    draggedBodyIndex: number,
  ) {
    trailsRef.current = trailsRef.current.map((trail, index) => {
      if (index !== draggedBodyIndex) {
        return trail;
      }

      const body = bodies[index];
      return [
        {
          x: toCanvasX(body.x, width, viewport.centerX, viewport.scale),
          y: toCanvasY(body.y, height, viewport.centerY, viewport.scale),
        },
      ];
    });
  }

  useEffect(() => {
    statesRef.current = cloneBodies(initialBodies);
    fixedReferencePointRef.current =
      viewAnchorMode === 'fixedStart'
        ? FIXED_START_REFERENCE
        : { x: initialBodies[0].x, y: initialBodies[0].y };
    const viewport = buildViewport(
      width,
      height,
      initialBodies,
      viewAnchorMode,
      fixedReferencePointRef.current,
    );
    viewportRef.current = viewport;
    trailStepCounterRef.current = 0;
    trailsRef.current = initialBodies.map((body) => [
      {
        x: toCanvasX(body.x, width, viewport.centerX, viewport.scale),
        y: toCanvasY(body.y, height, viewport.centerY, viewport.scale),
      },
    ]);
    onDebugSnapshotChange(buildSnapshot(statesRef.current, params));
  }, [
    height,
    initialBodies,
    maxTrailPoints,
    onDebugSnapshotChange,
    params,
    viewAnchorMode,
    width,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    const renderingContext = context;

    let cancelled = false;

    function render() {
      if (cancelled) {
        return;
      }

      if (isRunning) {
        let nextBodies = statesRef.current;

        for (let step = 0; step < 3; step += 1) {
          nextBodies = integrateBodies(nextBodies, params);
          trailStepCounterRef.current += 1;

          if (trailStepCounterRef.current % TRAIL_RECORD_INTERVAL === 0) {
            const runningViewport =
              dragViewportRef.current ??
              buildViewport(
                width,
                height,
                nextBodies,
                viewAnchorMode,
                fixedReferencePointRef.current,
              );
            recordTrailPoints(nextBodies, runningViewport);
          }
        }

        statesRef.current = nextBodies;

        if (hasEscapedThreshold(nextBodies)) {
          onEscapeThresholdExceeded();
        }
      }

      const viewport =
        dragViewportRef.current ??
        buildViewport(
          width,
          height,
          statesRef.current,
          viewAnchorMode,
          fixedReferencePointRef.current,
        );
      viewportRef.current = viewport;

      if (isRunning) {
        onDebugSnapshotChange(buildSnapshot(statesRef.current, params));
      }

      drawFrame(
        renderingContext,
        width,
        height,
        statesRef.current,
        trailsRef.current,
        viewport,
        !isRunning,
      );
      animationFrameRef.current = window.requestAnimationFrame(render);
    }

    render();

    return () => {
      cancelled = true;
      if (animationFrameRef.current !== undefined) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    height,
    isRunning,
    maxTrailPoints,
    onDebugSnapshotChange,
    onEscapeThresholdExceeded,
    params,
    viewAnchorMode,
    width,
  ]);

  function updateDragTarget(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const dragTarget = dragTargetRef.current;
    if (!canvas || !dragTarget) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const canvasX = ((clientX - rect.left) / rect.width) * width;
    const canvasY = ((clientY - rect.top) / rect.height) * height;
    const viewport = viewportRef.current;
    const nextX = clamp(
      viewport.centerX + (canvasX - width / 2) / viewport.scale,
      POSITION_MIN,
      POSITION_MAX,
    );
    const nextY = clamp(
      viewport.centerY - (canvasY - height / 2) / viewport.scale,
      POSITION_MIN,
      POSITION_MAX,
    );

    if (dragTarget.kind === 'body') {
      statesRef.current = statesRef.current.map((body, index) =>
        index === dragTarget.index
          ? {
              ...body,
              x: nextX,
              y: nextY,
            }
          : body,
      );

      resetDraggedTrail(statesRef.current, viewport, dragTarget.index);
      onDebugSnapshotChange(buildSnapshot(statesRef.current, params));
      return;
    }

    statesRef.current = statesRef.current.map((body, index) => {
      if (index !== dragTarget.index) {
        return body;
      }

      const bodyPosition = getBodyCanvasPosition(body, viewport, width, height);
      return {
        ...body,
        vx: (canvasX - bodyPosition.x) / VELOCITY_ARROW_SCALE,
        vy: (bodyPosition.y - canvasY) / VELOCITY_ARROW_SCALE,
      };
    });

    onDebugSnapshotChange(buildSnapshot(statesRef.current, params));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (isRunning) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const canvasX = ((event.clientX - rect.left) / rect.width) * width;
    const canvasY = ((event.clientY - rect.top) / rect.height) * height;
    const viewport = viewportRef.current;
    const maxMass = Math.max(...statesRef.current.map((body) => body.mass));

    for (let index = statesRef.current.length - 1; index >= 0; index -= 1) {
      const body = statesRef.current[index];
      const tipPosition = getVelocityTipPosition(body, viewport, width, height);
      const handleDistance = Math.hypot(canvasX - tipPosition.x, canvasY - tipPosition.y);

      if (handleDistance <= VELOCITY_HANDLE_RADIUS) {
        dragTargetRef.current = { kind: 'velocity', index };
        dragViewportRef.current = viewport;
        canvas.setPointerCapture(event.pointerId);
        updateDragTarget(event.clientX, event.clientY);
        return;
      }
    }

    for (let index = statesRef.current.length - 1; index >= 0; index -= 1) {
      const body = statesRef.current[index];
      const { x, y } = getBodyCanvasPosition(body, viewport, width, height);
      const radius = hitRadius(body.mass, maxMass);
      const distance = Math.hypot(canvasX - x, canvasY - y);

      if (distance <= radius) {
        dragTargetRef.current = { kind: 'body', index };
        dragViewportRef.current = viewport;
        canvas.setPointerCapture(event.pointerId);
        updateDragTarget(event.clientX, event.clientY);
        return;
      }
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragTargetRef.current) {
      return;
    }

    updateDragTarget(event.clientX, event.clientY);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!dragTargetRef.current || !canvas) {
      return;
    }

    updateDragTarget(event.clientX, event.clientY);
    dragTargetRef.current = null;
    dragViewportRef.current = null;
    onBodiesCommit(statesRef.current.map((body) => ({ ...body })));

    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="simulation-canvas"
      width={width}
      height={height}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
