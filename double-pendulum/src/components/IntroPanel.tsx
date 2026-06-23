function SymbolWithSubscript({
  symbol,
  subscript,
}: {
  symbol: string;
  subscript: string;
}) {
  return (
    <span className="math-symbol">
      {symbol}
      <sub>{subscript}</sub>
    </span>
  );
}

export function IntroPanel() {
  return (
    <section className="intro-panel">
      <p className="intro-kicker">Reference</p>
      <h2>
        Coordinate conventions for <SymbolWithSubscript symbol={'\u03B8'} subscript="1" /> and{' '}
        <SymbolWithSubscript symbol={'\u03B8'} subscript="2" />
      </h2>

      <p className="intro-text">
        In the standard textbook model of a double pendulum, the generalized
        coordinates are the angular displacements of the two rods measured from
        the vertical direction.
      </p>

      <div className="formula-card">
        <p className="formula-line">
          <SymbolWithSubscript symbol={'\u03B8'} subscript="1" /> = angle of the
          first rod from the vertical
        </p>
        <p className="formula-line">
          <SymbolWithSubscript symbol={'\u03B8'} subscript="2" /> = angle of the
          second rod from the vertical
        </p>
      </div>

      <div className="formula-card">
        <p className="formula-line">
          <SymbolWithSubscript symbol={'\u03C9'} subscript="1" /> = d
          <SymbolWithSubscript symbol={'\u03B8'} subscript="1" /> / dt
        </p>
        <p className="formula-line">
          <SymbolWithSubscript symbol={'\u03C9'} subscript="2" /> = d
          <SymbolWithSubscript symbol={'\u03B8'} subscript="2" /> / dt
        </p>
      </div>

      <p className="intro-text">
        Here, <SymbolWithSubscript symbol={'\u03B8'} subscript="1" /> describes
        the upper rod and <SymbolWithSubscript symbol={'\u03B8'} subscript="2" /> describes
        the lower rod. Their time derivatives{' '}
        <SymbolWithSubscript symbol={'\u03C9'} subscript="1" /> and{' '}
        <SymbolWithSubscript symbol={'\u03C9'} subscript="2" /> are the angular
        velocities. In the setup panel they are entered in degrees per second,
        then converted internally to radians per second for the simulation.
      </p>

      <div className="formula-card">
        <p className="formula-line">
          x<sub>1</sub> = l<sub>1</sub> sin(
          <SymbolWithSubscript symbol={'\u03B8'} subscript="1" />
          ), y<sub>1</sub> = l<sub>1</sub> cos(
          <SymbolWithSubscript symbol={'\u03B8'} subscript="1" />)
        </p>
        <p className="formula-line">
          x<sub>2</sub> = x<sub>1</sub> + l<sub>2</sub> sin(
          <SymbolWithSubscript symbol={'\u03B8'} subscript="2" />
          ), y<sub>2</sub> = y<sub>1</sub> + l<sub>2</sub> cos(
          <SymbolWithSubscript symbol={'\u03B8'} subscript="2" />)
        </p>
      </div>

      <p className="intro-note">
        This prototype is already useful for qualitative experiments: comparing
        nearby trajectories, studying trail structure, and testing how the
        system responds to changes in initial conditions.
      </p>
    </section>
  );
}
