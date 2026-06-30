import type { StorefrontStore } from "@/lib/demo-store";

type FooterProps = {
  store: StorefrontStore;
};

export function Footer({ store }: FooterProps) {
  return (
    <footer id="footer-contact">
      <div className="wrap">
        <div className="foot-grid">
          <div className="foot-brand">
            <div className="brand">
              <span className="dot" />
              {store.name}
            </div>
            <p>
              Cold wood-pressed oils, pressed fresh in small batches out of Chennai. No heat, no
              shortcuts, no chemicals.
            </p>
          </div>
          <div>
            <h5>Shop</h5>
            <ul>
              {store.categories.map((category) => (
                <li key={category.id}>
                  <a href={`#category-${category.id}`}>{category.name}</a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5>Contact</h5>
            <ul>
              {store.phoneNumbers.map((number) => (
                <li key={number}>
                  <a href={`tel:${number.replace(/\s/g, "")}`}>{number}</a>
                </li>
              ))}
              <li>{store.location}</li>
            </ul>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© 2026 {store.name}.</span>
          <span>{store.location}</span>
        </div>
      </div>
    </footer>
  );
}
