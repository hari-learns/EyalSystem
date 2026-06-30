"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/demo-store";
import { ProductCard } from "./ProductCard";
import type { CartItem } from "./types";

type ProductGridProps = {
  products: Product[];
  onAddToCart: (item: CartItem, productShortName: string) => void;
};

export function ProductGrid({ products, onAddToCart }: ProductGridProps) {
  const initialSelected = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, 0])),
    [products]
  );
  const [selected, setSelected] = useState<Record<string, number>>(initialSelected);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  function selectSize(productId: string, index: number) {
    setSelected((current) => ({ ...current, [productId]: index }));
  }

  function addProduct(product: Product) {
    const sizeIndex = selected[product.id] ?? 0;
    const size = product.sizes[sizeIndex];
    onAddToCart(
      {
        id: product.id,
        name: product.name,
        label: size.label,
        price: size.price,
        image: product.image,
        quantity: 1
      },
      product.shortName
    );
    setAddedProductId(product.id);
    window.setTimeout(() => setAddedProductId(null), 1100);
  }

  return (
    <section id="products">
      <div className="wrap">
        <div className="section-head">
          <div>
            <div className="eyebrow">The Range</div>
            <h2>Four oils, one press.</h2>
          </div>
          <p className="section-note">
            Pick a size per oil. The price and the per-100ml rate update as you go.
          </p>
        </div>

        <div className="grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              selectedSizeIndex={selected[product.id] ?? 0}
              added={addedProductId === product.id}
              onSelectSize={(index) => selectSize(product.id, index)}
              onAdd={() => addProduct(product)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
