"use client";

import { useMemo, useState } from "react";
import type { StorefrontStore } from "@/lib/demo-store";
import { CartDrawer } from "./CartDrawer";
import { Footer } from "./Footer";
import { Hero } from "./Hero";
import { ProcessSection } from "./ProcessSection";
import { ProductGrid } from "./ProductGrid";
import { SiteHeader } from "./SiteHeader";
import { Toast } from "./Toast";
import { TrustStrip } from "./TrustStrip";
import type { CartItem, CheckoutFormValues } from "./types";

type StorefrontAppProps = {
  store: StorefrontStore;
};

export function StorefrontApp({ store }: StorefrontAppProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 2400);
  }

  function addToCart(item: CartItem, productShortName: string) {
    setCart((current) => {
      const existing = current.find(
        (cartItem) => cartItem.id === item.id && cartItem.label === item.label
      );

      if (existing) {
        return current.map((cartItem) =>
          cartItem.id === item.id && cartItem.label === item.label
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }

      return [...current, item];
    });

    showToast(`Added - ${productShortName} (${item.label})`);
  }

  function changeQuantity(id: string, label: string, delta: number) {
    setCart((current) =>
      current.flatMap((item) => {
        if (item.id !== id || item.label !== label) return [item];
        const nextQuantity = item.quantity + delta;
        return nextQuantity > 0 ? [{ ...item, quantity: nextQuantity }] : [];
      })
    );
  }

  function removeItem(id: string, label: string) {
    setCart((current) => current.filter((item) => item.id !== id || item.label !== label));
  }

  async function submitCheckout(values: CheckoutFormValues) {
    if (cartCount === 0) {
      showToast("Your cart is empty.");
      return;
    }

    const items = cart.map((item) => ({
      variantId: item.variantId,
      quantity: item.quantity
    }));

    if (items.some((item) => !item.variantId)) {
      showToast("Please refresh and add the item again.");
      return;
    }

    setCheckoutLoading(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          storeSlug: store.slug,
          customer: values,
          items,
          phoneVerified: false
        })
      });

      const payload = (await response.json()) as {
        order?: { orderNumber: number; totalInr: number };
        error?: string;
      };

      if (!response.ok) {
        showToast(payload.error ?? "Order could not be placed.");
        return;
      }

      setCart([]);
      setDrawerOpen(false);
      showToast(`Order #${payload.order?.orderNumber ?? ""} placed. We will call you soon.`);
    } catch {
      showToast("Order could not be placed. Please try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  return (
    <>
      <SiteHeader
        brand={store.navBrand}
        cartCount={cartCount}
        onOpenCart={() => setDrawerOpen(true)}
      />
      <main id="top">
        <Hero />
        <section className="trust-section">
          <div className="wrap">
            <TrustStrip />
          </div>
        </section>
        <ProductGrid
          products={store.products}
          categories={store.categories}
          onAddToCart={addToCart}
        />
        <ProcessSection />
      </main>
      <Footer store={store} />
      <CartDrawer
        cart={cart}
        open={drawerOpen}
        subtotal={subtotal}
        onClose={() => setDrawerOpen(false)}
        onQuantityChange={changeQuantity}
        onRemove={removeItem}
        onCheckout={submitCheckout}
        checkoutLoading={checkoutLoading}
      />
      <Toast message={toast} />
    </>
  );
}
