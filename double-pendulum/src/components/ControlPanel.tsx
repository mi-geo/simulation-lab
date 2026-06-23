interface ControlPanelProps {
  isRunning: boolean;
  showDebugPanel: boolean;
  onToggleRun: () => void;
  onReset: () => void;
  onRandomize: () => void;
  onToggleDebugPanel: () => void;
}

export function ControlPanel({
  isRunning,
  showDebugPanel,
  onToggleRun,
  onReset,
  onRandomize,
  onToggleDebugPanel,
}: ControlPanelProps) {
  return (
    <div className="control-panel">
      <button type="button" onClick={onToggleRun}>
        {isRunning ? 'Pause' : 'Play'}
      </button>
      <button type="button" onClick={onReset}>
        Reset
      </button>
      <button type="button" onClick={onRandomize}>
        Randomize
      </button>
      <button type="button" onClick={onToggleDebugPanel}>
        {showDebugPanel ? 'Hide Debug' : 'Show Debug'}
      </button>
    </div>
  );
}
