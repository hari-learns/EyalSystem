import { ShoppingBag } from "lucide-react";

export function Hero() {
  return (
    <section className="hero">
      <div className="hero-glow" />
      <div className="wrap">
        <div className="hero-inner">
          <div className="eyebrow">Wood-Pressed - Small Batch - Chennai</div>
          <h1>
            Pressed slow.
            <br />
            Tastes <em>whole.</em>
          </h1>
          <p className="lede">
            We still press the old way - a wooden ghani, turning slow, never touching heat. What
            comes out is oil the way it used to taste, before the shortcuts.
          </p>
          <div className="hero-ctas">
            <a className="btn-primary" href="#products">
              Shop the range
              <ShoppingBag aria-hidden="true" size={15} strokeWidth={1.8} />
            </a>
            <a href="#process" className="link-arrow">
              How we press it -&gt;
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
