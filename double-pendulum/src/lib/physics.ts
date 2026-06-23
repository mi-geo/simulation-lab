import type {
  DerivativeState,
  PendulumParams,
  PendulumState,
} from '../types/pendulum';

export const DEFAULT_PARAMS: PendulumParams = {
  length1: 1,
  length2: 1,
  mass1: 1,
  mass2: 1,
  gravity: 9.81,
};

export const DEFAULT_STATE: PendulumState = {
  theta1: Math.PI / 4,
  theta2: Math.PI / 4 + 0.15,
  omega1: 0,
  omega2: 0,
};

export function getDerivatives(
  state: PendulumState,
  params: PendulumParams,
): DerivativeState {
  const { theta1, theta2, omega1, omega2 } = state;
  const { length1, length2, mass1, mass2, gravity } = params;

  const delta = theta1 - theta2;

  const denominator1 =
    length1 * (2 * mass1 + mass2 - mass2 * Math.cos(2 * theta1 - 2 * theta2));
  const denominator2 =
    length2 * (2 * mass1 + mass2 - mass2 * Math.cos(2 * theta1 - 2 * theta2));

  const dOmega1Numerator =
    -gravity * (2 * mass1 + mass2) * Math.sin(theta1) -
    mass2 * gravity * Math.sin(theta1 - 2 * theta2) -
    2 *
      Math.sin(delta) *
      mass2 *
      (omega2 * omega2 * length2 +
        omega1 * omega1 * length1 * Math.cos(delta));

  const dOmega2Numerator =
    2 *
    Math.sin(delta) *
    (omega1 * omega1 * length1 * (mass1 + mass2) +
      gravity * (mass1 + mass2) * Math.cos(theta1) +
      omega2 * omega2 * length2 * mass2 * Math.cos(delta));

  return {
    dTheta1: omega1,
    dTheta2: omega2,
    dOmega1: dOmega1Numerator / denominator1,
    dOmega2: dOmega2Numerator / denominator2,
  };
}

export function calculateEnergy(
  state: PendulumState,
  params: PendulumParams,
): number {
  const { theta1, theta2, omega1, omega2 } = state;
  const { length1, length2, mass1, mass2, gravity } = params;

  const velocity1Squared = length1 * length1 * omega1 * omega1;
  const velocity2Squared =
    velocity1Squared +
    length2 * length2 * omega2 * omega2 +
    2 * length1 * length2 * omega1 * omega2 * Math.cos(theta1 - theta2);

  const kineticEnergy =
    0.5 * mass1 * velocity1Squared + 0.5 * mass2 * velocity2Squared;

  const potentialEnergy =
    -(mass1 + mass2) * gravity * length1 * Math.cos(theta1) -
    mass2 * gravity * length2 * Math.cos(theta2);

  return kineticEnergy + potentialEnergy;
}

export function createRandomState(): PendulumState {
  const maxAngle = Math.PI;
  const maxAngularVelocity = 1;

  return {
    theta1: (Math.random() * 2 - 1) * maxAngle,
    theta2: (Math.random() * 2 - 1) * maxAngle,
    omega1: (Math.random() * 2 - 1) * maxAngularVelocity,
    omega2: (Math.random() * 2 - 1) * maxAngularVelocity,
  };
}
