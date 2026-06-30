"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import type { Product, StoreCategory } from "@/lib/demo-store";
import { ProductCard } from "./ProductCard";
import type { CartItem } from "./types";

type ProductGridProps = {
  products: Product[];
  categories: StoreCategory[];
  onAddToCart: (item: CartItem, productShortName: string) => void;
};

export function ProductGrid({ products, categories, onAddToCart }: ProductGridProps) {
  const initialSelected = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, 0])),
    [products]
  );
  const [selected, setSelected] = useState<Record<string, number>>(initialSelected);
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const media = window.matchMedia("(min-width: 760px)");

    function applyDefaultExpansion() {
      setExpanded(
        Object.fromEntries(categories.map((category) => [category.id, media.matches]))
      );
    }

    applyDefaultExpansion();
    media.addEventListener("change", applyDefaultExpansion);
    return () => media.removeEventListener("change", applyDefaultExpansion);
  }, [categories]);

  const categoryById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories]
  );

  const normalizedQuery = query.trim().toLowerCase();
  const filteredProducts = useMemo(() => {
    if (!normalizedQuery) return products;

    return products.filter((product) => {
      const category = categoryById.get(product.categoryId);
      const haystack = [
        product.name,
        product.shortName,
        product.note,
        category?.name,
        category?.description,
        ...product.variants.map((variant) => variant.label)
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [categoryById, normalizedQuery, products]);

  const productsByCategory = useMemo(() => {
    return categories.map((category) => ({
      category,
      products: filteredProducts.filter((product) => product.categoryId === category.id)
    }));
  }, [categories, filteredProducts]);

  const totalMatches = filteredProducts.length;

  function selectSize(productId: string, index: number) {
    setSelected((current) => ({ ...current, [productId]: index }));
  }

  function toggleCategory(categoryId: string) {
    setExpanded((current) => ({ ...current, [categoryId]: !current[categoryId] }));
  }

  function addProduct(product: Product) {
    const sizeIndex = selected[product.id] ?? 0;
    const size = product.variants[sizeIndex];
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
            <h2>Browse the Eyal shelf.</h2>
          </div>
          <p className="section-note">
            Search by product, category, or size. Categories stay compact on mobile and open on
            desktop.
          </p>
        </div>

        <div className="catalog-tools">
          <label className="search-box">
            <Search aria-hidden="true" size={18} strokeWidth={1.8} />
            <span className="sr-only">Search products</span>
            <input
              type="search"
              value={query}
              placeholder="Search oils, hair care, 500 ml..."
              onChange={(event) => setQuery(event.target.value)}
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search">
                <X aria-hidden="true" size={16} strokeWidth={1.8} />
              </button>
            ) : null}
          </label>

          <div className="category-chips" aria-label="Product categories">
            {categories.map((category) => {
              const count = products.filter((product) => product.categoryId === category.id).length;
              return (
                <a className="category-chip" href={`#category-${category.id}`} key={category.id}>
                  {category.name}
                  <span>{count}</span>
                </a>
              );
            })}
          </div>
        </div>

        <div className="catalog-meta" aria-live="polite">
          {normalizedQuery ? `${totalMatches} product${totalMatches === 1 ? "" : "s"} found` : ""}
        </div>

        <div className="catalog-sections">
          {productsByCategory.map(({ category, products: categoryProducts }) => {
            const isExpanded = normalizedQuery ? true : Boolean(expanded[category.id]);

            return (
              <section className="catalog-section" id={`category-${category.id}`} key={category.id}>
                <button
                  className="category-toggle"
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  aria-expanded={isExpanded}
                >
                  <span>
                    <strong>{category.name}</strong>
                    <small>{category.description}</small>
                  </span>
                  <span className="category-count">{categoryProducts.length}</span>
                  <ChevronDown aria-hidden="true" size={20} strokeWidth={1.8} />
                </button>

                {isExpanded ? (
                  categoryProducts.length > 0 ? (
                    <div className="grid">
                      {categoryProducts.map((product) => (
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
                  ) : (
                    <div className="empty-section">No products match this category yet.</div>
                  )
                ) : null}
              </section>
            );
          })}
        </div>
      </div>
    </section>
  );
}
