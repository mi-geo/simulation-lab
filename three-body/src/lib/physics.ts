import type {
  BodyId,
  BodyState,
  SetupValues,
  SimulationParams,
  SimulationSnapshot,
} from '../types/simulation';

const BODY_IDS: BodyId[] = ['A', 'B', 'C'];

export const DEFAULT_SETUP_VALUES: SetupValues = {
  gravitationalConstant: 0.8,
  softening: 12,
  timeStep: 0.12,
  viewAnchorMode: 'centerOfMass',
  bodies: {
    A: { mass: 1000, x: 0, y: 0, speed: 0.036, angle: -90 },
    B: { mass: 200, x: 220, y: 0, speed: 2.954, angle: 90 },
    C: { mass: 20, x: 260, y: 0, speed: 3.647, angle: 90 },
  },
};

interface BodyDerivative {
  dx: number;
  dy: number;
  dvx: number;
  dvy: number;
}

function cloneBody(body: BodyState): BodyState {
  return { ...body };
}

function degreesToRadians(value: number) {
  return (value * Math.PI) / 180;
}

function velocityFromPolar(speed: number, angleDegrees: number) {
  const angle = degreesToRadians(angleDegrees);
  return {
    vx: speed * Math.cos(angle),
    vy: speed * Math.sin(angle),
  };
}

function softenedDistance(dx: number, dy: number, softening: number) {
  return Math.max(Math.hypot(dx, dy), softening);
}

function computeAccelerations(
  bodies: BodyState[],
  params: SimulationParams,
) {
  return bodies.map((body, index) => {
    let ax = 0;
    let ay = 0;

    bodies.forEach((otherBody, otherIndex) => {
      if (index === otherIndex) {
        return;
      }

      const dx = otherBody.x - body.x;
      const dy = otherBody.y - body.y;
      const distance = softenedDistance(dx, dy, params.softening);
      const scale =
        (params.gravitationalConstant * otherBody.mass) / Math.pow(distance, 3);

      ax += dx * scale;
      ay += dy * scale;
    });

    return { ax, ay };
  });
}

function computeDerivatives(
  bodies: BodyState[],
  params: SimulationParams,
): BodyDerivative[] {
  const accelerations = computeAccelerations(bodies, params);

  return bodies.map((body, index) => ({
    dx: body.vx,
    dy: body.vy,
    dvx: accelerations[index].ax,
    dvy: accelerations[index].ay,
  }));
}

function applyDerivatives(
  bodies: BodyState[],
  derivatives: BodyDerivative[],
  scale: number,
) {
  return bodies.map((body, index) => ({
    ...body,
    x: body.x + derivatives[index].dx * scale,
    y: body.y + derivatives[index].dy * scale,
    vx: body.vx + derivatives[index].dvx * scale,
    vy: body.vy + derivatives[index].dvy * scale,
  }));
}

export function buildBodiesFromSetup(values: SetupValues): BodyState[] {
  return BODY_IDS.map((id) => {
    const body = values.bodies[id];
    const velocity = velocityFromPolar(body.speed, body.angle);

    return {
      id,
      mass: body.mass,
      x: body.x,
      y: body.y,
      vx: velocity.vx,
      vy: velocity.vy,
    };
  });
}

export function buildParamsFromSetup(values: SetupValues): SimulationParams {
  return {
    gravitationalConstant: values.gravitationalConstant,
    softening: values.softening,
    timeStep: values.timeStep,
  };
}

export function integrateBodies(
  bodies: BodyState[],
  params: SimulationParams,
): BodyState[] {
  const dt = params.timeStep;
  const k1 = computeDerivatives(bodies, params);
  const k2 = computeDerivatives(applyDerivatives(bodies, k1, dt / 2), params);
  const k3 = computeDerivatives(applyDerivatives(bodies, k2, dt / 2), params);
  const k4 = computeDerivatives(applyDerivatives(bodies, k3, dt), params);

  return bodies.map((body, index) => ({
    ...body,
    x:
      body.x +
      (dt / 6) *
        (k1[index].dx + 2 * k2[index].dx + 2 * k3[index].dx + k4[index].dx),
    y:
      body.y +
      (dt / 6) *
        (k1[index].dy + 2 * k2[index].dy + 2 * k3[index].dy + k4[index].dy),
    vx:
      body.vx +
      (dt / 6) *
        (k1[index].dvx + 2 * k2[index].dvx + 2 * k3[index].dvx + k4[index].dvx),
    vy:
      body.vy +
      (dt / 6) *
        (k1[index].dvy + 2 * k2[index].dvy + 2 * k3[index].dvy + k4[index].dvy),
  }));
}

export function calculateEnergy(
  bodies: BodyState[],
  params: SimulationParams,
) {
  const kineticEnergy = bodies.reduce(
    (total, body) => total + 0.5 * body.mass * (body.vx * body.vx + body.vy * body.vy),
    0,
  );

  let potentialEnergy = 0;

  for (let index = 0; index < bodies.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < bodies.length; otherIndex += 1) {
      const body = bodies[index];
      const otherBody = bodies[otherIndex];
      const dx = otherBody.x - body.x;
      const dy = otherBody.y - body.y;
      const distance = softenedDistance(dx, dy, params.softening);

      potentialEnergy -=
        (params.gravitationalConstant * body.mass * otherBody.mass) / distance;
    }
  }

  return kineticEnergy + potentialEnergy;
}

export function calculateCenterOfMass(bodies: BodyState[]) {
  const totalMass = bodies.reduce((total, body) => total + body.mass, 0);

  if (totalMass === 0) {
    return { x: 0, y: 0 };
  }

  return bodies.reduce(
    (center, body) => ({
      x: center.x + (body.x * body.mass) / totalMass,
      y: center.y + (body.y * body.mass) / totalMass,
    }),
    { x: 0, y: 0 },
  );
}

export function calculateTotalMomentum(bodies: BodyState[]) {
  return bodies.reduce(
    (momentum, body) => ({
      x: momentum.x + body.mass * body.vx,
      y: momentum.y + body.mass * body.vy,
    }),
    { x: 0, y: 0 },
  );
}

export function buildSnapshot(
  bodies: BodyState[],
  params: SimulationParams,
): SimulationSnapshot {
  const clonedBodies = bodies.map(cloneBody);

  return {
    bodies: clonedBodies,
    energy: calculateEnergy(clonedBodies, params),
    centerOfMass: calculateCenterOfMass(clonedBodies),
    totalMomentum: calculateTotalMomentum(clonedBodies),
  };
}

export function createRandomSetupValues(): SetupValues {
  const nextBodies = BODY_IDS.reduce((collection, id) => {
    const source = DEFAULT_SETUP_VALUES.bodies[id];
    const massScale = 0.8 + Math.random() * 0.6;

    collection[id] = {
      mass: Math.round(source.mass * massScale),
      x: source.x + (Math.random() - 0.5) * 80,
      y: source.y + (Math.random() - 0.5) * 80,
      speed: Math.max(0, source.speed + (Math.random() - 0.5) * 0.5),
      angle: source.angle + (Math.random() - 0.5) * 24,
    };

    return collection;
  }, {} as SetupValues['bodies']);

  return {
    gravitationalConstant:
      DEFAULT_SETUP_VALUES.gravitationalConstant + (Math.random() - 0.5) * 0.2,
    softening: DEFAULT_SETUP_VALUES.softening + (Math.random() - 0.5) * 4,
    timeStep: DEFAULT_SETUP_VALUES.timeStep,
    viewAnchorMode: DEFAULT_SETUP_VALUES.viewAnchorMode,
    bodies: nextBodies,
  };
}
