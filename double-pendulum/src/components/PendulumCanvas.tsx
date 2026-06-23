import { useEffect, useRef } from 'react';
import { rk4Step } from '../lib/integrator';
import {
  drawBackground,
  drawPendulum,
  getBobPositions,
} from '../lib/drawing';
import {
  calculateEnergy,
  getDerivatives,
} from '../lib/physics';
import type {
  PendulumParams,
  PendulumSnapshot,
  PendulumState,
  TrailPoint,
} from '../types/pendulum';

interface PendulumCanvasProps {
  initialStates: PendulumState[];
  params: PendulumParams;
  isRunning: boolean;
  maxTrailPoints: number;
  onDebugSnapshotChange: (snapshot: PendulumSnapshot) => void;
  width?: number;
  height?: number;
}

const FIXED_TIME_STEP = 1 / 120;
const MAX_FRAME_DELTA = 0.05;
const DEBUG_UPDATE_INTERVAL_MS = 120;
const TRAIL_RECORD_INTERVAL = 2;

export function PendulumCanvas({
  initialStates,
  params,
  isRunning,
  maxTrailPoints,
  onDebugSnapshotChange,
  width = 720,
  height = 520,
}: PendulumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statesRef = useRef<PendulumState[]>(initialStates);
  const trailsRef = useRef<TrailPoint[][]>(
    Array.from({ length: initialStates.length }, () => []),
  );
  const frameRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef(0);
  const lastDebugUpdateRef = useRef(0);
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trailStepCounterRef = useRef(0);

  useEffect(() => {
    statesRef.current = initialStates;
    trailsRef.current = Array.from({ length: initialStates.length }, () => []);
    previousTimeRef.current = null;
    accumulatorRef.current = 0;
    lastDebugUpdateRef.current = 0;
    trailStepCounterRef.current = 0;
  }, [initialStates]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) {
      return;
    }
    const context: CanvasRenderingContext2D = canvasContext;

    const backgroundCanvas =
      backgroundCanvasRef.current ?? document.createElement('canvas');
    backgroundCanvas.width = width;
    backgroundCanvas.height = height;
    backgroundCanvasRef.current = backgroundCanvas;

    const backgroundContext = backgroundCanvas.getContext('2d');
    if (!backgroundContext) {
      return;
    }

    drawBackground(backgroundContext, { width, height });

    function extendTrails(nextStates: PendulumState[]) {
      nextStates.forEach((nextState, index) => {
        const positions = getBobPositions(nextState, params, { width, height });
        const trail = trailsRef.current[index] ?? [];
        trail.push({ x: positions.x2, y: positions.y2 });

        if (trail.length > maxTrailPoints) {
          trail.splice(0, trail.length - maxTrailPoints);
        }

        trailsRef.current[index] = trail;
      });
    }

    function emitDebugSnapshot(timestamp: number) {
      if (timestamp - lastDebugUpdateRef.current < DEBUG_UPDATE_INTERVAL_MS) {
        return;
      }

      const firstState = statesRef.current[0];
      if (!firstState) {
        return;
      }

      lastDebugUpdateRef.current = timestamp;
      onDebugSnapshotChange({
        state: firstState,
        energy: calculateEnergy(firstState, params),
      });
    }

    function animate(timestamp: number) {
      if (previousTimeRef.current === null) {
        previousTimeRef.current = timestamp;
      }

      const rawDeltaSeconds = (timestamp - previousTimeRef.current) / 1000;
      previousTimeRef.current = timestamp;
      const deltaSeconds = Math.min(rawDeltaSeconds, MAX_FRAME_DELTA);

      if (isRunning) {
        accumulatorRef.current += deltaSeconds;
        let nextStates = statesRef.current;

        while (accumulatorRef.current >= FIXED_TIME_STEP) {
          nextStates = nextStates.map((state) =>
            rk4Step(state, FIXED_TIME_STEP, (currentState) =>
              getDerivatives(currentState, params),
            ),
          );
          trailStepCounterRef.current += 1;
          if (trailStepCounterRef.current % TRAIL_RECORD_INTERVAL === 0) {
            extendTrails(nextStates);
          }
          accumulatorRef.current -= FIXED_TIME_STEP;
        }

        statesRef.current = nextStates;
      } else {
        accumulatorRef.current = 0;
      }

      drawPendulum(
        context,
        statesRef.current,
        params,
        { width, height },
        trailsRef.current,
        backgroundCanvas,
      );
      emitDebugSnapshot(timestamp);
      frameRef.current = window.requestAnimationFrame(animate);
    }

    extendTrails(statesRef.current);
    drawPendulum(
      context,
      statesRef.current,
      params,
      { width, height },
      trailsRef.current,
      backgroundCanvas,
    );
    emitDebugSnapshot(performance.now());
    frameRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
      previousTimeRef.current = null;
      accumulatorRef.current = 0;
    };
  }, [
    height,
    initialStates,
    isRunning,
    maxTrailPoints,
    onDebugSnapshotChange,
    params,
    width,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="pendulum-canvas"
    />
  );
}
