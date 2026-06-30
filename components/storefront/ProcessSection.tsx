const steps = [
  {
    number: "01",
    title: "Sourced",
    body: "Whole seeds and kernels, bought direct from growers we know by name."
  },
  {
    number: "02",
    title: "Pressed",
    body: "A wooden ghani turns slow - low friction, low heat, every bit of flavor kept in."
  },
  {
    number: "03",
    title: "Settled",
    body: "The oil rests so natural sediment falls away on its own."
  },
  {
    number: "04",
    title: "Bottled",
    body: "Filtered, never refined. Sealed fresh, with nothing held back."
  }
];

export function ProcessSection() {
  return (
    <section id="process">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">How We Press</div>
            <h2>From seed to bottle, in four honest steps.</h2>
          </div>
          <p className="section-note">
            No hydraulics, no hexane, no rush. Just enough patience to keep the oil intact.
          </p>
        </div>

        <div className="steps lit">
          {steps.map((step) => (
            <div className="step" key={step.number}>
              <div className="step-dot" />
              <div className="step-num">{step.number}</div>
              <h4>{step.title}</h4>
              <p>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
