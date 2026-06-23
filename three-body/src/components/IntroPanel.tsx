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
        Three bodies, pairwise gravity, and a canvas that shows mass as radius
      </h2>

      <p className="intro-text">
        This study treats each body as a point mass for the force calculation,
        but draws it as a filled sphere on the canvas so the heavier bodies feel
        physically important instead of disappearing into single-pixel markers.
      </p>

      <div className="formula-card">
        <p className="formula-line">
          F<sub>ij</sub> = G m<sub>i</sub> m<sub>j</sub> r<sub>ij</sub> / (|r
          <sub>ij</sub>|<sup>2</sup> + epsilon<sup>2</sup>)<sup>3/2</sup>
        </p>
        <p className="formula-line">
          a<sub>i</sub> = sum of pairwise accelerations from the other two bodies
        </p>
      </div>

      <div className="formula-card">
        <p className="formula-line">
          <SymbolWithSubscript symbol="x" subscript="i" />' ={' '}
          <SymbolWithSubscript symbol="v" subscript="x,i" />
        </p>
        <p className="formula-line">
          <SymbolWithSubscript symbol="y" subscript="i" />' ={' '}
          <SymbolWithSubscript symbol="v" subscript="y,i" />
        </p>
      </div>

      <p className="intro-text">
        The softening term prevents singular accelerations during very close
        passes, and the integrator advances the full three-body system together
        so momentum exchange stays visible in every orbit, slingshot, and near miss.
      </p>

      <p className="intro-note">
        Try making one body much heavier than the others, then nudge the lighter
        bodies into tangential motion to create star-planet-moon style behavior.
      </p>
    </section>
  );
}
