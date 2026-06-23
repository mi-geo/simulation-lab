import { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { InfoPanel } from './components/InfoPanel';
import { IntroPanel } from './components/IntroPanel';
import { SetupPanel } from './components/SetupPanel';
import { ThreeBodyCanvas } from './components/ThreeBodyCanvas';
import {
  buildBodiesFromSetup,
  buildParamsFromSetup,
  buildSnapshot,
  createRandomSetupValues,
  DEFAULT_SETUP_VALUES,
} from './lib/physics';
import type {
  BodyFormValues,
  BodyId,
  SetupErrors,
  SetupFormValues,
  SetupValues,
  ViewAnchorMode,
} from './types/simulation';

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 520;
const MAX_TRAIL_POINTS = 300;

const BODY_IDS: BodyId[] = ['A', 'B', 'C'];

function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function normalizeAngleDegrees(value: number) {
  let normalizedValue = value;

  while (normalizedValue > 180) {
    normalizedValue -= 360;
  }

  while (normalizedValue <= -180) {
    normalizedValue += 360;
  }

  return normalizedValue;
}

function polarFromVelocity(vx: number, vy: number) {
  return {
    speed: Math.sqrt(vx * vx + vy * vy),
    angle: normalizeAngleDegrees(radiansToDegrees(Math.atan2(vy, vx))),
  };
}

function formatDisplayNumber(value: number) {
  const roundedValue = Number(value.toFixed(3));
  return String(roundedValue);
}

function formatSetupValues(values: SetupValues): SetupFormValues {
  return {
    gravitationalConstant: formatDisplayNumber(values.gravitationalConstant),
    softening: formatDisplayNumber(values.softening),
    timeStep: formatDisplayNumber(values.timeStep),
    viewAnchorMode: values.viewAnchorMode,
    bodies: BODY_IDS.reduce((collection, bodyId) => {
      collection[bodyId] = {
        mass: formatDisplayNumber(values.bodies[bodyId].mass),
        x: formatDisplayNumber(values.bodies[bodyId].x),
        y: formatDisplayNumber(values.bodies[bodyId].y),
        speed: formatDisplayNumber(values.bodies[bodyId].speed),
        angle: formatDisplayNumber(values.bodies[bodyId].angle),
      };
      return collection;
    }, {} as SetupFormValues['bodies']),
  };
}

function parseNumber(rawValue: string) {
  const trimmedValue = rawValue.trim();

  if (trimmedValue.length === 0) {
    return { isValid: false, error: 'Required' };
  }

  const parsedValue = Number(trimmedValue);

  if (!Number.isFinite(parsedValue)) {
    return { isValid: false, error: 'Must be a number' };
  }

  return { isValid: true, value: parsedValue };
}

function buildEmptyErrors(): SetupErrors {
  return {
    bodies: {
      A: {},
      B: {},
      C: {},
    },
  };
}

function validateSetup(values: SetupFormValues) {
  const errors = buildEmptyErrors();
  const parsedValues: SetupValues = {
    gravitationalConstant: 0,
    softening: 0,
    timeStep: 0,
    viewAnchorMode: values.viewAnchorMode,
    bodies: {
      A: { mass: 0, x: 0, y: 0, speed: 0, angle: 0 },
      B: { mass: 0, x: 0, y: 0, speed: 0, angle: 0 },
      C: { mass: 0, x: 0, y: 0, speed: 0, angle: 0 },
    },
  };

  const gravitationalConstantResult = parseNumber(values.gravitationalConstant);
  if (!gravitationalConstantResult.isValid || gravitationalConstantResult.value === undefined) {
    errors.gravitationalConstant = gravitationalConstantResult.error;
  } else if (
    gravitationalConstantResult.value < 0.05 ||
    gravitationalConstantResult.value > 5
  ) {
    errors.gravitationalConstant = 'Use 0.05 to 5';
  } else {
    parsedValues.gravitationalConstant = gravitationalConstantResult.value;
  }

  const softeningResult = parseNumber(values.softening);
  if (!softeningResult.isValid || softeningResult.value === undefined) {
    errors.softening = softeningResult.error;
  } else if (softeningResult.value < 1 || softeningResult.value > 40) {
    errors.softening = 'Use 1 to 40';
  } else {
    parsedValues.softening = softeningResult.value;
  }

  const timeStepResult = parseNumber(values.timeStep);
  if (!timeStepResult.isValid || timeStepResult.value === undefined) {
    errors.timeStep = timeStepResult.error;
  } else if (timeStepResult.value < 0.01 || timeStepResult.value > 0.5) {
    errors.timeStep = 'Use 0.01 to 0.5';
  } else {
    parsedValues.timeStep = timeStepResult.value;
  }

  if (
    values.viewAnchorMode !== 'followA' &&
    values.viewAnchorMode !== 'fixedStart' &&
    values.viewAnchorMode !== 'centerOfMass'
  ) {
    return {
      errors,
      parsedValues: null,
    };
  }

  BODY_IDS.forEach((bodyId) => {
    (Object.keys(values.bodies[bodyId]) as Array<keyof BodyFormValues>).forEach(
      (field) => {
        const result = parseNumber(values.bodies[bodyId][field]);
        if (!result.isValid || result.value === undefined) {
          errors.bodies[bodyId][field] = result.error;
          return;
        }

        if (field === 'mass' && (result.value < 1 || result.value > 5000)) {
          errors.bodies[bodyId].mass = 'Use 1 to 5000';
          return;
        }

        if ((field === 'x' || field === 'y') && (result.value < -400 || result.value > 400)) {
          errors.bodies[bodyId][field] = 'Use -400 to 400';
          return;
        }

        if (field === 'speed' && (result.value < 0 || result.value > 8)) {
          errors.bodies[bodyId].speed = 'Use 0 to 8';
          return;
        }

        if (field === 'angle' && (result.value < -180 || result.value > 180)) {
          errors.bodies[bodyId].angle = 'Use -180 to 180';
          return;
        }

        parsedValues.bodies[bodyId][field] = result.value;
      },
    );
  });

  const hasErrors =
    Boolean(errors.gravitationalConstant) ||
    Boolean(errors.softening) ||
    Boolean(errors.timeStep) ||
    BODY_IDS.some((bodyId) => Object.keys(errors.bodies[bodyId]).length > 0);

  return {
    errors,
    parsedValues: hasErrors ? null : parsedValues,
  };
}

export default function App() {
  const initialSetupValues = DEFAULT_SETUP_VALUES;
  const initialBodies = buildBodiesFromSetup(initialSetupValues);
  const initialParams = buildParamsFromSetup(initialSetupValues);

  const [isRunning, setIsRunning] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [appliedSetupValues, setAppliedSetupValues] = useState<SetupValues>(
    initialSetupValues,
  );
  const [setupFormValues, setSetupFormValues] = useState<SetupFormValues>(
    formatSetupValues(initialSetupValues),
  );
  const [simulationBodies, setSimulationBodies] = useState(initialBodies);
  const [simulationParams, setSimulationParams] = useState(initialParams);
  const [debugSnapshot, setDebugSnapshot] = useState(
    buildSnapshot(initialBodies, initialParams),
  );
  const { errors: setupErrors, parsedValues } = validateSetup(setupFormValues);

  function syncBodiesIntoSetupValues(
    baseValues: SetupValues,
    nextBodies: Array<{
      id: BodyId;
      mass: number;
      x: number;
      y: number;
      vx: number;
      vy: number;
    }>,
  ): SetupValues {
    return {
      ...baseValues,
      bodies: nextBodies.reduce((collection, body) => {
        const velocity = polarFromVelocity(body.vx, body.vy);
        collection[body.id] = {
          mass: body.mass,
          x: body.x,
          y: body.y,
          speed: velocity.speed,
          angle: velocity.angle,
        };
        return collection;
      }, { ...baseValues.bodies }),
    };
  }

  function applySetup(nextValues: SetupValues) {
    const nextBodies = buildBodiesFromSetup(nextValues);
    const nextParams = buildParamsFromSetup(nextValues);

    setSimulationBodies(nextBodies);
    setSimulationParams(nextParams);
    setDebugSnapshot(buildSnapshot(nextBodies, nextParams));
  }

  function handleApplySetup() {
    if (!parsedValues) {
      return;
    }

    setStatusMessage('');
    setAppliedSetupValues(parsedValues);
    applySetup(parsedValues);
  }

  function handleReset() {
    setStatusMessage('');
    applySetup(appliedSetupValues);
  }

  function handleRandomize() {
    const nextSetupValues = createRandomSetupValues();
    setStatusMessage('');
    setAppliedSetupValues(nextSetupValues);
    setSetupFormValues(formatSetupValues(nextSetupValues));
    applySetup(nextSetupValues);
  }

  function handleGlobalChange(
    field: 'gravitationalConstant' | 'softening' | 'timeStep',
    value: string,
  ) {
    setSetupFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleViewAnchorModeChange(value: ViewAnchorMode) {
    setSetupFormValues((current) => ({
      ...current,
      viewAnchorMode: value,
    }));
  }

  function handleBodyChange(
    bodyId: BodyId,
    field: keyof BodyFormValues,
    value: string,
  ) {
    setSetupFormValues((current) => ({
      ...current,
      bodies: {
        ...current.bodies,
        [bodyId]: {
          ...current.bodies[bodyId],
          [field]: value,
        },
      },
    }));
  }

  function handleBodiesCommit(nextBodies: typeof simulationBodies) {
    const nextSetupValues = syncBodiesIntoSetupValues(appliedSetupValues, nextBodies);
    setSimulationBodies(nextBodies);
    setAppliedSetupValues(nextSetupValues);
    setSetupFormValues(formatSetupValues(nextSetupValues));
    setDebugSnapshot(buildSnapshot(nextBodies, simulationParams));
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Interactive Physics Study</p>
        <h1>Three-body Lab</h1>
        <p className="hero-copy">
          A gravitational playground for three mutually attracting bodies,
          rendered as weighted spheres instead of anonymous points.
        </p>
      </header>

      <ControlPanel
        isRunning={isRunning}
        showDebugPanel={showDebugPanel}
        onToggleRun={() => {
          setStatusMessage('');
          setIsRunning((current) => !current);
        }}
        onReset={handleReset}
        onRandomize={handleRandomize}
        onToggleDebugPanel={() => setShowDebugPanel((current) => !current)}
      />

      {statusMessage ? <p className="setup-note">{statusMessage}</p> : null}

      <section className="canvas-card">
        <div className="canvas-copy">
          <p className="canvas-kicker">Motion Study</p>
          <h2>Bodies are computed as point masses and displayed as mass-scaled spheres.</h2>
          <p>
            Size is a visual cue for gravitational weight.
          </p>
        </div>

        <ThreeBodyCanvas
          initialBodies={simulationBodies}
          params={simulationParams}
          viewAnchorMode={appliedSetupValues.viewAnchorMode}
          isRunning={isRunning}
          maxTrailPoints={MAX_TRAIL_POINTS}
          onDebugSnapshotChange={setDebugSnapshot}
          onBodiesCommit={handleBodiesCommit}
          onEscapeThresholdExceeded={() => {
            setIsRunning(false);
            setStatusMessage(
              'Simulation paused because a body moved beyond the escape threshold.',
            );
          }}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
        />
      </section>

      <SetupPanel
        values={setupFormValues}
        errors={setupErrors}
        isValid={Boolean(parsedValues)}
        isRunning={isRunning}
        onGlobalChange={(field, value) => {
          if (field === 'viewAnchorMode') {
            handleViewAnchorModeChange(value as ViewAnchorMode);
            return;
          }
          handleGlobalChange(field, value);
        }}
        onBodyChange={handleBodyChange}
        onApply={handleApplySetup}
      />

      <IntroPanel />

      {showDebugPanel ? <InfoPanel snapshot={debugSnapshot} /> : null}
    </main>
  );
}
