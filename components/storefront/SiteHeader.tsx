"use client";

import { ShoppingBag } from "lucide-react";

type SiteHeaderProps = {
  brand: string;
  cartCount: number;
  onOpenCart: () => void;
};

export function SiteHeader({ brand, cartCount, onOpenCart }: SiteHeaderProps) {
  return (
    <header className="site">
      <div className="nav">
        <a href="#top" className="brand" aria-label={`${brand} home`}>
          <span className="dot" />
          {brand}
          <span className="brand-sub">OILS</span>
        </a>
        <nav className="navlinks" aria-label="Storefront navigation">
          <a href="#products">Our Oils</a>
          <a href="#process">The Press</a>
          <a href="#footer-contact">Contact</a>
        </nav>
        <button className="cart-btn" type="button" onClick={onOpenCart} aria-label="Open cart">
          <ShoppingBag aria-hidden="true" size={18} strokeWidth={1.8} />
          <span>Cart</span>
          {cartCount > 0 ? <span className="cart-badge">{cartCount}</span> : null}
        </button>
      </div>
    </header>
  );
}
