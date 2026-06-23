import type {
  BodyFormValues,
  BodyId,
  BodySetupErrors,
  SetupErrors,
  SetupFormValues,
} from '../types/simulation';

const BODY_IDS: BodyId[] = ['A', 'B', 'C'];

const FIELD_LABELS: Record<keyof BodyFormValues, string> = {
  mass: 'Mass',
  x: 'Initial horizontal position',
  y: 'Initial vertical position',
  vx: 'Initial horizontal velocity',
  vy: 'Initial vertical velocity',
};

const FIELD_HELPERS: Record<keyof BodyFormValues, string> = {
  mass: 'Relative mass. Larger values draw larger bodies and deepen gravity.',
  x: 'Initial x position in world units.',
  y: 'Initial y position in world units.',
  vx: 'Initial velocity along x.',
  vy: 'Initial velocity along y.',
};

function BodyField({
  bodyId,
  field,
  values,
  errors,
  isRunning,
  onChange,
}: {
  bodyId: BodyId;
  field: keyof BodyFormValues;
  values: BodyFormValues;
  errors: BodySetupErrors;
  isRunning: boolean;
  onChange: (bodyId: BodyId, field: keyof BodyFormValues, value: string) => void;
}) {
  const error = errors[field];

  return (
    <label className={`setup-field${error ? ' setup-field-invalid' : ''}`}>
      <span className="field-label">
        {FIELD_LABELS[field]}
      </span>
      <span className="field-token">
        Internal name: {bodyId}.{field}
      </span>
      <input
        type="number"
        step={field === 'mass' ? '1' : '0.01'}
        value={values[field]}
        disabled={isRunning}
        onChange={(event) => onChange(bodyId, field, event.target.value)}
      />
      <small>{error ?? FIELD_HELPERS[field]}</small>
    </label>
  );
}

interface SetupPanelProps {
  values: SetupFormValues;
  errors: SetupErrors;
  isValid: boolean;
  isRunning: boolean;
  onGlobalChange: (
    field: 'gravitationalConstant' | 'softening' | 'timeStep',
    value: string,
  ) => void;
  onBodyChange: (
    bodyId: BodyId,
    field: keyof BodyFormValues,
    value: string,
  ) => void;
  onApply: () => void;
}

export function SetupPanel({
  values,
  errors,
  isValid,
  isRunning,
  onGlobalChange,
  onBodyChange,
  onApply,
}: SetupPanelProps) {
  return (
    <section className="setup-panel">
      <div className="setup-header">
        <div>
          <p className="setup-kicker">Initial Setup</p>
          <h2>Place three bodies in space, assign mass, then let gravity negotiate.</h2>
        </div>
        <button type="button" onClick={onApply} disabled={isRunning || !isValid}>
          Apply Setup
        </button>
      </div>

      <div className="setup-grid setup-grid-global">
        <label
          className={`setup-field${errors.gravitationalConstant ? ' setup-field-invalid' : ''}`}
        >
          <span className="field-label">Gravitational strength</span>
          <span className="field-token">Internal name: gravitationalConstant</span>
          <input
            type="number"
            step="0.01"
            value={values.gravitationalConstant}
            disabled={isRunning}
            onChange={(event) =>
              onGlobalChange('gravitationalConstant', event.target.value)
            }
          />
          <small>
            {errors.gravitationalConstant ??
              'Gravitational strength in normalized simulation units.'}
          </small>
        </label>

        <label className={`setup-field${errors.softening ? ' setup-field-invalid' : ''}`}>
          <span className="field-label">Close-pass softening radius</span>
          <span className="field-token">Internal name: softening</span>
          <input
            type="number"
            step="0.1"
            value={values.softening}
            disabled={isRunning}
            onChange={(event) => onGlobalChange('softening', event.target.value)}
          />
          <small>
            {errors.softening ??
              'Softening radius that keeps close approaches numerically stable.'}
          </small>
        </label>

        <label className={`setup-field${errors.timeStep ? ' setup-field-invalid' : ''}`}>
          <span className="field-label">Simulation speed step</span>
          <span className="field-token">Internal name: timeStep</span>
          <input
            type="number"
            step="0.001"
            value={values.timeStep}
            disabled={isRunning}
            onChange={(event) => onGlobalChange('timeStep', event.target.value)}
          />
          <small>
            {errors.timeStep ?? 'Integrator step size. Smaller values are slower but steadier.'}
          </small>
        </label>
      </div>

      <div className="setup-stack">
        {BODY_IDS.map((bodyId) => (
          <section key={bodyId} className="body-card">
            <div className="body-card-header">
              <p className="body-card-kicker">Body {bodyId}</p>
              <h3>Mass, position, velocity</h3>
            </div>

            <div className="setup-grid">
              {(Object.keys(values.bodies[bodyId]) as Array<keyof BodyFormValues>).map(
                (field) => (
                  <BodyField
                    key={`${bodyId}-${field}`}
                    bodyId={bodyId}
                    field={field}
                    values={values.bodies[bodyId]}
                    errors={errors.bodies[bodyId]}
                    isRunning={isRunning}
                    onChange={onBodyChange}
                  />
                ),
              )}
            </div>
          </section>
        ))}
      </div>

      <p className="setup-note">
        Bodies are rendered as round masses. Their radius scales with mass, so
        the heavier bodies read visually as more dominant attractors.
      </p>
    </section>
  );
}
