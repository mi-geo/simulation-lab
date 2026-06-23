import type { SimulationSnapshot } from '../types/simulation';

interface InfoPanelProps {
  snapshot: SimulationSnapshot;
}

function formatNumber(value: number) {
  return value.toFixed(3);
}

export function InfoPanel({ snapshot }: InfoPanelProps) {
  return (
    <section className="info-panel">
      <h2>Debug State</h2>
      <div className="info-grid">
        <div>
          <span>energy</span>
          <strong>{formatNumber(snapshot.energy)}</strong>
        </div>
        <div>
          <span>com.x</span>
          <strong>{formatNumber(snapshot.centerOfMass.x)}</strong>
        </div>
        <div>
          <span>com.y</span>
          <strong>{formatNumber(snapshot.centerOfMass.y)}</strong>
        </div>
        <div>
          <span>p.x</span>
          <strong>{formatNumber(snapshot.totalMomentum.x)}</strong>
        </div>
        <div>
          <span>p.y</span>
          <strong>{formatNumber(snapshot.totalMomentum.y)}</strong>
        </div>
        {snapshot.bodies.map((body) => (
          <div key={body.id}>
            <span>{body.id} @ (x, y)</span>
            <strong>
              {formatNumber(body.x)}, {formatNumber(body.y)}
            </strong>
          </div>
        ))}
      </div>
      <p className="info-note">
        This panel tracks the current body positions, total energy, center of
        mass, and total momentum for the live simulation.
      </p>
    </section>
  );
}
