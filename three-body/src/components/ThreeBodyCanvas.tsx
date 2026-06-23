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
} from '../types/simulation';

interface TrailPoint {
  x: number;
  y: number;
}

interface ThreeBodyCanvasProps {
  initialBodies: BodyState[];
  params: SimulationParams;
  isRunning: boolean;
  maxTrailPoints: number;
  onDebugSnapshotChange: (snapshot: SimulationSnapshot) => void;
  onBodiesCommit: (bodies: BodyState[]) => void;
  width: number;
  height: number;
}

const BODY_COLORS = ['#f4c16d', '#8cc9de', '#ef8aa1'];

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
  trails: TrailPoint[][],
) {
  const anchorBody = bodies[0];
  const points = bodies.flatMap((body, index) => [
    { x: body.x, y: body.y },
    ...trails[index],
  ]);
  const relativeXs = points.map((point) => Math.abs(point.x - anchorBody.x));
  const relativeYs = points.map((point) => Math.abs(point.y - anchorBody.y));
  const spanX = Math.max(1, Math.max(...relativeXs) * 2);
  const spanY = Math.max(1, Math.max(...relativeYs) * 2);
  const padding = 80;
  const scale = Math.min(
    (width - padding * 2) / spanX,
    (height - padding * 2) / spanY,
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

function drawFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  bodies: BodyState[],
  trails: TrailPoint[][],
) {
  drawBackground(context, width, height);

  const viewport = buildViewport(width, height, bodies, trails);
  const maxMass = Math.max(...bodies.map((body) => body.mass));
  const centerOfMass = calculateCenterOfMass(bodies);

  trails.forEach((trail, index) => {
    if (trail.length < 2) {
      return;
    }

    context.beginPath();
    trail.forEach((point, pointIndex) => {
      const x = toCanvasX(point.x, width, viewport.centerX, viewport.scale);
      const y = toCanvasY(point.y, height, viewport.centerY, viewport.scale);

      if (pointIndex === 0) {
        context.moveTo(x, y);
      } else {
        context.lineTo(x, y);
      }
    });

    context.strokeStyle = `${BODY_COLORS[index]}aa`;
    context.lineWidth = 2;
    context.stroke();
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
    const x = toCanvasX(body.x, width, viewport.centerX, viewport.scale);
    const y = toCanvasY(body.y, height, viewport.centerY, viewport.scale);
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
}

export function ThreeBodyCanvas({
  initialBodies,
  params,
  isRunning,
  maxTrailPoints,
  onDebugSnapshotChange,
  onBodiesCommit,
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
  const dragBodyIndexRef = useRef<number | null>(null);

  useEffect(() => {
    statesRef.current = cloneBodies(initialBodies);
    trailsRef.current = initialBodies.map((body) => [{ x: body.x, y: body.y }]);
    onDebugSnapshotChange(buildSnapshot(statesRef.current, params));
  }, [initialBodies, onDebugSnapshotChange, params]);

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

        for (let step = 0; step < 2; step += 1) {
          nextBodies = integrateBodies(nextBodies, params);
        }

        statesRef.current = nextBodies;
        trailsRef.current = trailsRef.current.map((trail, index) => {
          const nextTrail = trail.concat({
            x: nextBodies[index].x,
            y: nextBodies[index].y,
          });
          return nextTrail.slice(-maxTrailPoints);
        });

        onDebugSnapshotChange(buildSnapshot(nextBodies, params));
      }

      const viewport = buildViewport(
        width,
        height,
        statesRef.current,
        trailsRef.current,
      );
      viewportRef.current = viewport;

      drawFrame(
        renderingContext,
        width,
        height,
        statesRef.current,
        trailsRef.current,
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
  }, [height, isRunning, maxTrailPoints, onDebugSnapshotChange, params, width]);

  function updateDraggedBody(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const dragBodyIndex = dragBodyIndexRef.current;
    if (!canvas || dragBodyIndex === null) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const canvasX = ((clientX - rect.left) / rect.width) * width;
    const canvasY = ((clientY - rect.top) / rect.height) * height;
    const viewport = viewportRef.current;
    const nextX = viewport.centerX + (canvasX - width / 2) / viewport.scale;
    const nextY = viewport.centerY - (canvasY - height / 2) / viewport.scale;

    statesRef.current = statesRef.current.map((body, index) =>
      index === dragBodyIndex
        ? {
            ...body,
            x: nextX,
            y: nextY,
          }
        : body,
    );

    trailsRef.current = trailsRef.current.map((trail, index) =>
      index === dragBodyIndex ? [{ x: nextX, y: nextY }] : trail,
    );

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
      const x = toCanvasX(body.x, width, viewport.centerX, viewport.scale);
      const y = toCanvasY(body.y, height, viewport.centerY, viewport.scale);
      const radius = hitRadius(body.mass, maxMass);
      const distance = Math.hypot(canvasX - x, canvasY - y);

      if (distance <= radius) {
        dragBodyIndexRef.current = index;
        canvas.setPointerCapture(event.pointerId);
        updateDraggedBody(event.clientX, event.clientY);
        return;
      }
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (dragBodyIndexRef.current === null) {
      return;
    }

    updateDraggedBody(event.clientX, event.clientY);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (dragBodyIndexRef.current === null || !canvas) {
      return;
    }

    updateDraggedBody(event.clientX, event.clientY);
    dragBodyIndexRef.current = null;
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
