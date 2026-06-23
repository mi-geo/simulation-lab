import { useState } from 'react';
import type {
  BodyFormValues,
  BodyId,
  BodySetupErrors,
  SetupErrors,
  SetupFormValues,
  ViewAnchorMode,
} from '../types/simulation';

const BODY_IDS: BodyId[] = ['A', 'B', 'C'];
const VIEW_ANCHOR_OPTIONS: Array<{ value: ViewAnchorMode; label: string; note: string }> = [
  {
    value: 'centerOfMass',
    label: 'Three-body center',
    note: 'The view follows the system center of mass so the motion stays centered as a whole.',
  },
  {
    value: 'fixedStart',
    label: 'Starting reference',
    note: 'The view stays centered on the original reference point instead of following body A.',
  },
  {
    value: 'followA',
    label: 'Body A',
    note: 'The view follows body A so it stays pinned in place while the others move around it.',
  },
];

const FIELD_LABELS: Record<keyof BodyFormValues, string> = {
  mass: 'Mass',
  x: 'Initial horizontal position',
  y: 'Initial vertical position',
  speed: 'Initial speed',
  angle: 'Initial direction angle',
};

const FIELD_HELPERS: Record<keyof BodyFormValues, string> = {
  mass: 'Relative mass. Larger values draw larger bodies and deepen gravity.',
  x: 'Initial x position in world units (-400 to 400).',
  y: 'Initial y position in world units (-400 to 400).',
  speed: 'Initial speed magnitude (0 to 8).',
  angle: 'Initial direction angle in degrees (-180 to 180).',
};

const FIELD_MINIMUMS: Partial<Record<keyof BodyFormValues, number>> = {
  mass: 1,
  x: -400,
  y: -400,
  speed: 0,
  angle: -180,
};

const FIELD_MAXIMUMS: Partial<Record<keyof BodyFormValues, number>> = {
  mass: 5000,
  x: 400,
  y: 400,
  speed: 8,
  angle: 180,
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
  const inputId = `${bodyId}-${field}`;

  return (
    <label className={`setup-field${error ? ' setup-field-invalid' : ''}`}>
      <input
        id={inputId}
        aria-label={`Body ${bodyId} ${FIELD_LABELS[field]}`}
        type="number"
        step={field === 'mass' ? '1' : '0.01'}
        min={FIELD_MINIMUMS[field]}
        max={FIELD_MAXIMUMS[field]}
        value={values[field]}
        disabled={isRunning}
        onChange={(event) => onChange(bodyId, field, event.target.value)}
      />
      {error ? <small>{error}</small> : null}
    </label>
  );
}

interface SetupPanelProps {
  values: SetupFormValues;
  errors: SetupErrors;
  isValid: boolean;
  isRunning: boolean;
  onGlobalChange: (
    field: 'gravitationalConstant' | 'softening' | 'timeStep' | 'viewAnchorMode',
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
  const [showSystemSettings, setShowSystemSettings] = useState(false);

  return (
    <section className="setup-panel">
      <div className="setup-header">
        <div>
          <p className="setup-kicker">Initial Setup</p>
          <h2>Set the three bodies first, then fine-tune the simulation settings.</h2>
        </div>
        <button type="button" onClick={onApply} disabled={isRunning || !isValid}>
          Apply Setup
        </button>
      </div>

      <section className="body-card view-anchor-card">
        <div className="body-card-header">
          <p className="body-card-kicker">View Anchoring</p>
          <h3>Choose what stays centered on screen</h3>
        </div>

        <div className="anchor-button-row" role="radiogroup" aria-label="View anchoring">
          {VIEW_ANCHOR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`anchor-option-button${
                values.viewAnchorMode === option.value ? ' anchor-option-button-active' : ''
              }`}
              disabled={isRunning}
              aria-pressed={values.viewAnchorMode === option.value}
              onClick={() => onGlobalChange('viewAnchorMode', option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <p className="anchor-note">
          {VIEW_ANCHOR_OPTIONS.find((option) => option.value === values.viewAnchorMode)?.note}
        </p>
      </section>

      <section className="body-matrix-card">
        <div className="body-card-header">
          <p className="body-card-kicker">Body Comparison</p>
          <h3>Mass, starting position, and launch state in one view</h3>
        </div>

        <div className="body-matrix">
          <div className="body-matrix-header body-matrix-label">Parameters</div>
          {(Object.keys(FIELD_LABELS) as Array<keyof BodyFormValues>).map((field) => (
            <div key={field} className="body-matrix-header">
              <span>{FIELD_LABELS[field]}</span>
              <small>{FIELD_HELPERS[field]}</small>
            </div>
          ))}

          {BODY_IDS.map((bodyId) => (
            <>
              <div key={`${bodyId}-label`} className="body-matrix-label body-matrix-row-label">
                <span>Body {bodyId}</span>
              </div>

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
            </>
          ))}
        </div>
      </section>

      <section className="body-card setup-settings-card">
        <div className="setup-settings-header">
          <div className="body-card-header">
            <p className="body-card-kicker">System Settings</p>
            <h3>Shared parameters for the whole system</h3>
          </div>

          <button
            type="button"
            className="system-settings-toggle"
            disabled={isRunning}
            aria-expanded={showSystemSettings}
            onClick={() => setShowSystemSettings((current) => !current)}
          >
            {showSystemSettings ? 'Hide' : 'Show'}
          </button>
        </div>

        {showSystemSettings ? (
          <div className="setup-grid setup-grid-global">
            <label
              className={`setup-field${errors.gravitationalConstant ? ' setup-field-invalid' : ''}`}
            >
              <span className="field-label">Gravitational strength</span>
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
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="0.5"
                value={values.timeStep}
                disabled={isRunning}
                onChange={(event) => onGlobalChange('timeStep', event.target.value)}
              />
              <small>
                {errors.timeStep ??
                  'Integrator time step. Larger values move faster but can become less stable (0.01 to 0.5).'}
              </small>
            </label>
          </div>
        ) : null}
      </section>

      <p className="setup-note">
        Bodies are rendered as round masses. Their radius scales with mass, so
        the heavier bodies read visually as more dominant attractors.
      </p>
    </section>
  );
}
