"use client";

import { Check, Leaf, ShoppingBag } from "lucide-react";
import { formatMoney, formatPer100Ml } from "@/lib/money";
import type { Product } from "@/lib/demo-store";

type ProductCardProps = {
  product: Product;
  selectedSizeIndex: number;
  added: boolean;
  onSelectSize: (index: number) => void;
  onAdd: () => void;
};

export function ProductCard({
  product,
  selectedSizeIndex,
  added,
  onSelectSize,
  onAdd
}: ProductCardProps) {
  const selectedSize = product.sizes[selectedSizeIndex];

  return (
    <article className="card in-view" data-product={product.id}>
      <div className="card-media">
        <img src={product.image} alt={product.name} loading="lazy" />
        <div className="organic-seal">
          <Leaf aria-hidden="true" size={10} strokeWidth={1.7} />
          Organic
        </div>
      </div>
      <div className="card-body">
        <h3>{product.name}</h3>
        <p className="note">{product.note}</p>
        <div className="size-row">
          {product.sizes.map((size, index) => (
            <button
              className="pill"
              type="button"
              aria-pressed={selectedSizeIndex === index}
              onClick={() => onSelectSize(index)}
              key={size.label}
            >
              {size.label}
            </button>
          ))}
        </div>
        <div className="price-row">
          <div className="price-main">
            <span className="amount">{formatMoney(selectedSize.price)}</span>
            <span className="per">= {formatPer100Ml(selectedSize.price, selectedSize.ml)}</span>
          </div>
        </div>
        <button className={added ? "add-btn added" : "add-btn"} type="button" onClick={onAdd}>
          {added ? (
            <>
              <Check aria-hidden="true" size={13} strokeWidth={1.9} />
              Added
            </>
          ) : (
            <>
              <ShoppingBag aria-hidden="true" size={13} strokeWidth={1.9} />
              Add to cart
            </>
          )}
        </button>
      </div>
    </article>
  );
}
