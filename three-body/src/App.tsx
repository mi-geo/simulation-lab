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
} from './types/simulation';

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 520;
const MAX_TRAIL_POINTS = 900;

const BODY_IDS: BodyId[] = ['A', 'B', 'C'];

function formatSetupValues(values: SetupValues): SetupFormValues {
  return {
    gravitationalConstant: String(values.gravitationalConstant),
    softening: String(values.softening),
    timeStep: String(values.timeStep),
    bodies: BODY_IDS.reduce((collection, bodyId) => {
      collection[bodyId] = {
        mass: String(values.bodies[bodyId].mass),
        x: String(values.bodies[bodyId].x),
        y: String(values.bodies[bodyId].y),
        vx: String(values.bodies[bodyId].vx),
        vy: String(values.bodies[bodyId].vy),
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
    bodies: {
      A: { mass: 0, x: 0, y: 0, vx: 0, vy: 0 },
      B: { mass: 0, x: 0, y: 0, vx: 0, vy: 0 },
      C: { mass: 0, x: 0, y: 0, vx: 0, vy: 0 },
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
  } else if (timeStepResult.value < 0.001 || timeStepResult.value > 0.05) {
    errors.timeStep = 'Use 0.001 to 0.05';
  } else {
    parsedValues.timeStep = timeStepResult.value;
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

        if ((field === 'vx' || field === 'vy') && (result.value < -8 || result.value > 8)) {
          errors.bodies[bodyId][field] = 'Use -8 to 8';
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
        collection[body.id] = {
          mass: body.mass,
          x: body.x,
          y: body.y,
          vx: body.vx,
          vy: body.vy,
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

    setAppliedSetupValues(parsedValues);
    applySetup(parsedValues);
  }

  function handleReset() {
    applySetup(appliedSetupValues);
  }

  function handleRandomize() {
    const nextSetupValues = createRandomSetupValues();
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
        <h1>Three Body Lab</h1>
        <p className="hero-copy">
          A gravitational playground for three mutually attracting bodies,
          rendered as weighted spheres instead of anonymous points.
        </p>
      </header>

      <ControlPanel
        isRunning={isRunning}
        showDebugPanel={showDebugPanel}
        onToggleRun={() => setIsRunning((current) => !current)}
        onReset={handleReset}
        onRandomize={handleRandomize}
        onToggleDebugPanel={() => setShowDebugPanel((current) => !current)}
      />

      <section className="canvas-card">
        <div className="canvas-copy">
          <p className="canvas-kicker">Motion Study</p>
          <h2>Mass shows up twice here: in the equations and in the visual hierarchy.</h2>
          <p>
            Each body is still simulated as a point mass, but the display draws
            it as a circular body whose radius grows with mass. That keeps the
            scene legible and makes the dominant attractors immediately obvious.
          </p>
        </div>

        <ThreeBodyCanvas
          initialBodies={simulationBodies}
          params={simulationParams}
          isRunning={isRunning}
          maxTrailPoints={MAX_TRAIL_POINTS}
          onDebugSnapshotChange={setDebugSnapshot}
          onBodiesCommit={handleBodiesCommit}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
        />
      </section>

      <SetupPanel
        values={setupFormValues}
        errors={setupErrors}
        isValid={Boolean(parsedValues)}
        isRunning={isRunning}
        onGlobalChange={handleGlobalChange}
        onBodyChange={handleBodyChange}
        onApply={handleApplySetup}
      />

      <IntroPanel />

      {showDebugPanel ? <InfoPanel snapshot={debugSnapshot} /> : null}
    </main>
  );
}
