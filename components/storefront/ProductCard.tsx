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
  const selectedVariant = product.variants[selectedSizeIndex];
  const productAvailable = (product.availabilityStatus ?? "available") === "available";
  const selectedVariantAvailable =
    (selectedVariant?.availabilityStatus ?? "available") === "available";
  const canAdd = productAvailable && selectedVariantAvailable && Boolean(selectedVariant);

  return (
    <article
      className={productAvailable ? "card in-view" : "card in-view unavailable"}
      data-product={product.id}
    >
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
          {product.variants.map((variant, index) => (
            <button
              className="pill"
              type="button"
              aria-pressed={selectedSizeIndex === index}
              disabled={(variant.availabilityStatus ?? "available") === "unavailable"}
              onClick={() => onSelectSize(index)}
              key={variant.label}
            >
              {variant.label}
            </button>
          ))}
        </div>
        <div className="price-row">
          <div className="price-main">
            {selectedVariant ? (
              <>
                <span className="amount">{formatMoney(selectedVariant.price)}</span>
                <span className="per">
                  = {formatPer100Ml(selectedVariant.price, selectedVariant.ml)}
                </span>
              </>
            ) : (
              <span className="amount">Unavailable</span>
            )}
          </div>
        </div>
        <button
          className={added ? "add-btn added" : "add-btn"}
          type="button"
          onClick={onAdd}
          disabled={!canAdd}
        >
          {added ? (
            <>
              <Check aria-hidden="true" size={13} strokeWidth={1.9} />
              Added
            </>
          ) : (
            <>
              <ShoppingBag aria-hidden="true" size={13} strokeWidth={1.9} />
              {canAdd ? "Add to cart" : "Unavailable"}
            </>
          )}
        </button>
      </div>
    </article>
  );
}
