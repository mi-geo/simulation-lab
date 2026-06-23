import { useState } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { InfoPanel } from './components/InfoPanel';
import { IntroPanel } from './components/IntroPanel';
import { PendulumCanvas } from './components/PendulumCanvas';
import { SetupPanel } from './components/SetupPanel';
import {
  calculateEnergy,
  createRandomState,
  DEFAULT_PARAMS,
} from './lib/physics';
import type {
  PendulumParams,
  PendulumSnapshot,
  PendulumState,
} from './types/pendulum';

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 520;
const MAX_TRAIL_POINTS = 600;
const MIN_PENDULUM_COUNT = 1;
const MAX_PENDULUM_COUNT = 10;
const DEFAULT_PENDULUM_COUNT = 6;
const INITIAL_THETA2_OFFSET_STEP = 0.001;
const MIN_JOINT_FRACTION = 0.001;
const MAX_JOINT_FRACTION = 0.999;
const MIN_ANGLE_DEGREES = -180;
const MAX_ANGLE_DEGREES = 180;
const MIN_ANGULAR_VELOCITY = -40;
const MAX_ANGULAR_VELOCITY = 40;
const MIN_OFFSET_STEP_DEGREES = 0.00001;
const MAX_OFFSET_STEP_DEGREES = 5;

interface SetupValues {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
  theta2OffsetStep: number;
  pendulumCount: number;
  jointFraction: number;
}

type SetupFormValues = Record<keyof SetupValues, string>;

const DEFAULT_SETUP_VALUES: SetupValues = {
  theta1: 90,
  theta2: 90,
  omega1: 7,
  omega2: 2,
  theta2OffsetStep: 0.001,
  pendulumCount: 6,
  jointFraction: 0.6,
};

function radiansToDegrees(value: number) {
  return (value * 180) / Math.PI;
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function buildSnapshot(
  state: PendulumState,
  params: PendulumParams,
): PendulumSnapshot {
  return {
    state,
    energy: calculateEnergy(state, params),
  };
}

function clampPendulumCount(value: number) {
  const roundedValue = Math.round(value);
  return Math.min(MAX_PENDULUM_COUNT, Math.max(MIN_PENDULUM_COUNT, roundedValue));
}

function clampJointFraction(value: number) {
  return Math.min(MAX_JOINT_FRACTION, Math.max(MIN_JOINT_FRACTION, value));
}

function formatSetupValues(values: SetupValues): SetupFormValues {
  return {
    theta1: String(values.theta1),
    theta2: String(values.theta2),
    omega1: String(values.omega1),
    omega2: String(values.omega2),
    theta2OffsetStep: String(values.theta2OffsetStep),
    pendulumCount: String(values.pendulumCount),
    jointFraction: String(values.jointFraction),
  };
}

function parseSetupField(
  field: keyof SetupValues,
  rawValue: string,
) {
  const trimmedValue = rawValue.trim();

  if (trimmedValue.length === 0) {
    return { isValid: false, error: 'Required' };
  }

  const parsedValue = Number(trimmedValue);
  if (!Number.isFinite(parsedValue)) {
    return { isValid: false, error: 'Must be a number' };
  }

  if (field === 'theta1' || field === 'theta2') {
    if (parsedValue < MIN_ANGLE_DEGREES || parsedValue > MAX_ANGLE_DEGREES) {
      return {
        isValid: false,
        error: `Use ${MIN_ANGLE_DEGREES} to ${MAX_ANGLE_DEGREES}`,
      };
    }
    return { isValid: true, value: parsedValue };
  }

  if (field === 'omega1' || field === 'omega2') {
    if (parsedValue < MIN_ANGULAR_VELOCITY || parsedValue > MAX_ANGULAR_VELOCITY) {
      return {
        isValid: false,
        error: `Use ${MIN_ANGULAR_VELOCITY} to ${MAX_ANGULAR_VELOCITY}`,
      };
    }
    return { isValid: true, value: parsedValue };
  }

  if (field === 'theta2OffsetStep') {
    if (
      parsedValue < MIN_OFFSET_STEP_DEGREES ||
      parsedValue > MAX_OFFSET_STEP_DEGREES
    ) {
      return {
        isValid: false,
        error: `Use ${MIN_OFFSET_STEP_DEGREES} to ${MAX_OFFSET_STEP_DEGREES}`,
      };
    }
    return { isValid: true, value: parsedValue };
  }

  if (field === 'pendulumCount') {
    if (!Number.isInteger(parsedValue)) {
      return { isValid: false, error: 'Use a whole number' };
    }
    if (parsedValue < MIN_PENDULUM_COUNT || parsedValue > MAX_PENDULUM_COUNT) {
      return {
        isValid: false,
        error: `Use ${MIN_PENDULUM_COUNT} to ${MAX_PENDULUM_COUNT}`,
      };
    }
    return { isValid: true, value: parsedValue };
  }

  if (parsedValue <= 0 || parsedValue >= 1) {
    return {
      isValid: false,
      error: `Use > 0 and < 1`,
    };
  }

  return { isValid: true, value: parsedValue };
}

function parseSetupFormValues(values: SetupFormValues) {
  const errors: Partial<Record<keyof SetupValues, string>> = {};
  const parsedValues = {} as SetupValues;

  (Object.keys(values) as Array<keyof SetupValues>).forEach((field) => {
    const result = parseSetupField(field, values[field]);
    if (!result.isValid) {
      errors[field] = result.error;
      return;
    }
    if (result.value === undefined) {
      errors[field] = 'Invalid value';
      return;
    }
    parsedValues[field] = result.value;
  });

  return {
    errors,
    parsedValues: Object.keys(errors).length === 0 ? parsedValues : null,
  };
}

function buildBaseState(values: SetupValues): PendulumState {
  return {
    theta1: degreesToRadians(values.theta1),
    theta2: degreesToRadians(values.theta2),
    omega1: degreesToRadians(values.omega1),
    omega2: degreesToRadians(values.omega2),
  };
}

function buildStateSet(
  baseState: PendulumState,
  pendulumCount = DEFAULT_PENDULUM_COUNT,
  offsetStep = INITIAL_THETA2_OFFSET_STEP,
) {
  const safePendulumCount = clampPendulumCount(pendulumCount);
  const centerOffset = (safePendulumCount - 1) / 2;

  return Array.from({ length: safePendulumCount }, (_, index) => ({
    ...baseState,
    theta2: baseState.theta2 + (index - centerOffset) * offsetStep,
  }));
}

function buildParamsFromSetup(values: SetupValues): PendulumParams {
  const totalLength = DEFAULT_PARAMS.length1 + DEFAULT_PARAMS.length2;
  const jointFraction = clampJointFraction(values.jointFraction);

  return {
    ...DEFAULT_PARAMS,
    length1: totalLength * jointFraction,
    length2: totalLength * (1 - jointFraction),
  };
}

function buildDefaultSetupValues(): SetupValues {
  return DEFAULT_SETUP_VALUES;
}

export default function App() {
  const initialSetupValues = buildDefaultSetupValues();
  const initialParams = buildParamsFromSetup(initialSetupValues);
  const initialBaseState = buildBaseState(initialSetupValues);
  const initialStateSet = buildStateSet(
    initialBaseState,
    initialSetupValues.pendulumCount,
    degreesToRadians(initialSetupValues.theta2OffsetStep),
  );

  const [isRunning, setIsRunning] = useState(false);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [appliedSetupValues, setAppliedSetupValues] = useState<SetupValues>(
    initialSetupValues,
  );
  const [setupFormValues, setSetupFormValues] = useState<SetupFormValues>(
    formatSetupValues(initialSetupValues),
  );
  const [simulationParams, setSimulationParams] = useState<PendulumParams>(initialParams);
  const [initialStates, setInitialStates] = useState<PendulumState[]>(initialStateSet);
  const [debugSnapshot, setDebugSnapshot] = useState<PendulumSnapshot>(
    buildSnapshot(initialStateSet[0], initialParams),
  );
  const { errors: setupErrors, parsedValues: parsedSetupValues } =
    parseSetupFormValues(setupFormValues);

  function handleToggleRun() {
    setIsRunning((current) => !current);
  }

  function handleToggleDebugPanel() {
    setShowDebugPanel((current) => !current);
  }

  function handleSetupValueChange(field: keyof SetupValues, value: string) {
    setSetupFormValues((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function applySetup(nextValues: SetupValues) {
    const nextBaseState = buildBaseState(nextValues);
    const nextParams = buildParamsFromSetup(nextValues);
    const nextStates = buildStateSet(
      nextBaseState,
      nextValues.pendulumCount,
      degreesToRadians(nextValues.theta2OffsetStep),
    );

    setSimulationParams(nextParams);
    setInitialStates(nextStates);
    setDebugSnapshot(buildSnapshot(nextStates[0], nextParams));
  }

  function handleApplySetup() {
    if (!parsedSetupValues) {
      return;
    }

    setAppliedSetupValues(parsedSetupValues);
    applySetup(parsedSetupValues);
  }

  function handleReset() {
    applySetup(appliedSetupValues);
  }

  function handleRandomize() {
    const randomState = createRandomState();
    const nextSetupValues: SetupValues = {
      ...appliedSetupValues,
      theta1: radiansToDegrees(randomState.theta1),
      theta2: radiansToDegrees(randomState.theta2),
      omega1: radiansToDegrees(randomState.omega1),
      omega2: radiansToDegrees(randomState.omega2),
    };

    setAppliedSetupValues(nextSetupValues);
    setSetupFormValues(formatSetupValues(nextSetupValues));
    applySetup(nextSetupValues);
  }

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Interactive Physics Study</p>
        <h1>Double Pendulum Lab</h1>
        <p className="hero-copy">
          An interactive study of coupled pendulum motion, sensitivity to
          initial conditions, and the visual structure of chaos.
        </p>
      </header>

      <ControlPanel
        isRunning={isRunning}
        showDebugPanel={showDebugPanel}
        onToggleRun={handleToggleRun}
        onReset={handleReset}
        onRandomize={handleRandomize}
        onToggleDebugPanel={handleToggleDebugPanel}
      />

      <section className="canvas-card">
        <div className="canvas-copy">
          <p className="canvas-kicker">Motion Study</p>
          <h2>Nearly identical starting states can diverge into very different motion.</h2>
          <p>
            The trails make sensitivity to initial conditions visible.
          </p>
        </div>

        <PendulumCanvas
          initialStates={initialStates}
          params={simulationParams}
          isRunning={isRunning}
          maxTrailPoints={MAX_TRAIL_POINTS}
          onDebugSnapshotChange={setDebugSnapshot}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
        />
      </section>

      <SetupPanel
        values={setupFormValues}
        errors={setupErrors}
        isValid={Boolean(parsedSetupValues)}
        isRunning={isRunning}
        onChange={handleSetupValueChange}
        onApply={handleApplySetup}
      />

      <IntroPanel />

      {showDebugPanel ? (
        <InfoPanel
          snapshot={debugSnapshot}
          pendulumCount={appliedSetupValues.pendulumCount}
          divergenceStep={degreesToRadians(appliedSetupValues.theta2OffsetStep)}
        />
      ) : null}
    </main>
  );
}
