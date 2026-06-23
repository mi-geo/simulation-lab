export type BodyId = 'A' | 'B' | 'C';

export interface BodyState {
  id: BodyId;
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface SimulationParams {
  gravitationalConstant: number;
  softening: number;
  timeStep: number;
}

export interface BodySetupValues {
  mass: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export interface SetupValues {
  gravitationalConstant: number;
  softening: number;
  timeStep: number;
  bodies: Record<BodyId, BodySetupValues>;
}

export interface BodyFormValues {
  mass: string;
  x: string;
  y: string;
  vx: string;
  vy: string;
}

export interface SetupFormValues {
  gravitationalConstant: string;
  softening: string;
  timeStep: string;
  bodies: Record<BodyId, BodyFormValues>;
}

export interface BodySetupErrors {
  mass?: string;
  x?: string;
  y?: string;
  vx?: string;
  vy?: string;
}

export interface SetupErrors {
  gravitationalConstant?: string;
  softening?: string;
  timeStep?: string;
  bodies: Record<BodyId, BodySetupErrors>;
}

export interface SimulationSnapshot {
  bodies: BodyState[];
  energy: number;
  centerOfMass: { x: number; y: number };
  totalMomentum: { x: number; y: number };
}
