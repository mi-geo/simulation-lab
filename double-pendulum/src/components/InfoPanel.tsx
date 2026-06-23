import type { PendulumSnapshot } from '../types/pendulum';

interface InfoPanelProps {
  snapshot: PendulumSnapshot;
  pendulumCount: number;
  divergenceStep: number;
}

function formatNumber(value: number) {
  return value.toFixed(4);
}

export function InfoPanel({
  snapshot,
  pendulumCount,
  divergenceStep,
}: InfoPanelProps) {
  const { state, energy } = snapshot;

  return (
    <section className="info-panel">
      <h2>Debug State</h2>
      <div className="info-grid">
        <div>
          <span>theta1</span>
          <strong>{formatNumber(state.theta1)}</strong>
        </div>
        <div>
          <span>theta2</span>
          <strong>{formatNumber(state.theta2)}</strong>
        </div>
        <div>
          <span>omega1</span>
          <strong>{formatNumber(state.omega1)}</strong>
        </div>
        <div>
          <span>omega2</span>
          <strong>{formatNumber(state.omega2)}</strong>
        </div>
        <div>
          <span>energy</span>
          <strong>{formatNumber(energy)}</strong>
        </div>
        <div>
          <span>pendulums</span>
          <strong>{pendulumCount}</strong>
        </div>
        <div>
          <span>theta2 step</span>
          <strong>{divergenceStep.toExponential(2)}</strong>
        </div>
      </div>
      <p className="info-note">
        This panel shows the first pendulum in the set. The only intentional
        initial difference between pendulums is a tiny offset in `theta2`.
      </p>
    </section>
  );
}
