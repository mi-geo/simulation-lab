interface SetupValues {
  theta1: number;
  theta2: number;
  omega1: number;
  omega2: number;
  theta2OffsetStep: number;
  pendulumCount: number;
  jointFraction: number;
}

function FieldLabel({ field }: { field: keyof SetupValues }) {
  if (field === 'pendulumCount') {
    return <span className="math-symbol">N</span>;
  }

  if (field === 'jointFraction') {
    return <span className="math-symbol">f</span>;
  }

  if (field === 'theta2OffsetStep') {
    return (
      <span className="math-symbol">
        {'\u0394'}
        {'\u03B8'}
        <sub>2</sub>
      </span>
    );
  }

  if (field === 'theta1' || field === 'theta2') {
    return (
      <span className="math-symbol">
        {'\u03B8'}
        <sub>{field === 'theta1' ? '1' : '2'}</sub>
      </span>
    );
  }

  return (
    <span className="math-symbol">
      {'\u03C9'}
      <sub>{field === 'omega1' ? '1' : '2'}</sub>
    </span>
  );
}

interface SetupPanelProps {
  values: Record<keyof SetupValues, string>;
  errors: Partial<Record<keyof SetupValues, string>>;
  isValid: boolean;
  isRunning: boolean;
  onChange: (field: keyof SetupValues, value: string) => void;
  onApply: () => void;
}

const FIELD_DESCRIPTIONS: Record<keyof SetupValues, string> = {
  theta1: 'Initial angle of the first rod (degrees)',
  theta2: 'Initial angle of the second rod (degrees)',
  omega1: 'Initial angular velocity of the first rod (degrees per second)',
  omega2: 'Initial angular velocity of the second rod (degrees per second)',
  theta2OffsetStep:
    'Tiny theta-2 difference between neighboring pendulums (degrees)',
  pendulumCount: 'Number of pendulums in the bundle (1 to 10)',
  jointFraction:
    'Relative location of the first joint as a fraction of total length (0 to 1)',
};

export function SetupPanel({
  values,
  errors,
  isValid,
  isRunning,
  onChange,
  onApply,
}: SetupPanelProps) {
  return (
    <section className="setup-panel">
      <div className="setup-header">
        <div>
          <p className="setup-kicker">Initial Setup</p>
          <h2>Choose the starting conditions before you hit play.</h2>
        </div>
        <button type="button" onClick={onApply} disabled={isRunning || !isValid}>
          Apply Setup
        </button>
      </div>

      <div className="setup-grid">
        {(Object.keys(values) as Array<keyof SetupValues>).map((field) => (
          <label
            key={field}
            className={`setup-field${errors[field] ? ' setup-field-invalid' : ''}`}
          >
            <FieldLabel field={field} />
            <input
              type="number"
              step={
                field === 'theta2OffsetStep'
                  ? '0.00001'
                  : field === 'pendulumCount'
                    ? '1'
                    : field === 'jointFraction'
                      ? '0.01'
                      : '0.01'
              }
              min={
                field === 'jointFraction'
                  ? 0
                  : field === 'pendulumCount'
                    ? 1
                    : field === 'theta1' || field === 'theta2'
                      ? -180
                      : field === 'omega1' || field === 'omega2'
                        ? -40
                        : field === 'theta2OffsetStep'
                          ? 0
                    : undefined
              }
              max={
                field === 'jointFraction'
                  ? 1
                  : field === 'pendulumCount'
                    ? 10
                    : field === 'theta1' || field === 'theta2'
                      ? 180
                      : field === 'omega1' || field === 'omega2'
                        ? 40
                        : field === 'theta2OffsetStep'
                          ? 5
                    : undefined
              }
              value={values[field]}
              onChange={(event) => onChange(field, event.target.value)}
              disabled={isRunning}
            />
            <small>{errors[field] ?? FIELD_DESCRIPTIONS[field]}</small>
          </label>
        ))}
      </div>

      <p className="setup-note">
        Inputs are locked while the simulation is running. Pause first, then
        apply a valid setup and press play again.
      </p>
    </section>
  );
}
