export interface PendulumState {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
}

export interface PendulumParams {
  length1: number;
  length2: number;
  mass1: number;
  mass2: number;
  gravity: number;
}

export interface DerivativeState {
  dTheta1: number;
  dTheta2: number;
  dOmega1: number;
  dOmega2: number;
}

export interface PendulumSnapshot {
  state: PendulumState;
  energy: number;
}

export interface TrailPoint {
  x: number;
  y: number;
}
