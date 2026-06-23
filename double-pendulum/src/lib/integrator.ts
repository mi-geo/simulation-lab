import type { DerivativeState, PendulumState } from '../types/pendulum';

export type DerivativeFunction = (state: PendulumState) => DerivativeState;

function addScaledState(
  state: PendulumState,
  derivative: DerivativeState,
  scale: number,
): PendulumState {
  return {
    theta1: state.theta1 + derivative.dTheta1 * scale,
    theta2: state.theta2 + derivative.dTheta2 * scale,
    omega1: state.omega1 + derivative.dOmega1 * scale,
    omega2: state.omega2 + derivative.dOmega2 * scale,
  };
}

export function rk4Step(
  state: PendulumState,
  dt: number,
  getDerivative: DerivativeFunction,
): PendulumState {
  const k1 = getDerivative(state);
  const k2 = getDerivative(addScaledState(state, k1, dt / 2));
  const k3 = getDerivative(addScaledState(state, k2, dt / 2));
  const k4 = getDerivative(addScaledState(state, k3, dt));

  return {
    theta1:
      state.theta1 +
      (dt / 6) * (k1.dTheta1 + 2 * k2.dTheta1 + 2 * k3.dTheta1 + k4.dTheta1),
    theta2:
      state.theta2 +
      (dt / 6) * (k1.dTheta2 + 2 * k2.dTheta2 + 2 * k3.dTheta2 + k4.dTheta2),
    omega1:
      state.omega1 +
      (dt / 6) * (k1.dOmega1 + 2 * k2.dOmega1 + 2 * k3.dOmega1 + k4.dOmega1),
    omega2:
      state.omega2 +
      (dt / 6) * (k1.dOmega2 + 2 * k2.dOmega2 + 2 * k3.dOmega2 + k4.dOmega2),
  };
}
