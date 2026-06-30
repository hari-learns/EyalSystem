"use client";

import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { CartItem } from "./types";

type CartDrawerProps = {
  cart: CartItem[];
  open: boolean;
  subtotal: number;
  onClose: () => void;
  onQuantityChange: (id: string, label: string, delta: number) => void;
  onRemove: (id: string, label: string) => void;
  onCheckout: () => void;
};

export function CartDrawer({
  cart,
  open,
  subtotal,
  onClose,
  onQuantityChange,
  onRemove,
  onCheckout
}: CartDrawerProps) {
  return (
    <>
      <div className={open ? "overlay open" : "overlay"} onClick={onClose} aria-hidden="true" />
      <aside className={open ? "drawer open" : "drawer"} aria-label="Shopping cart">
        <div className="drawer-head">
          <h3>Your Cart</h3>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Close cart">
            <X aria-hidden="true" size={16} strokeWidth={1.8} />
          </button>
        </div>

        <div className="drawer-items">
          {cart.length === 0 ? (
            <div className="empty-cart">
              <ShoppingBag aria-hidden="true" size={34} strokeWidth={1.5} />
              <div>
                Your cart is empty.
                <br />
                Add an oil to get started.
              </div>
            </div>
          ) : (
            cart.map((item) => (
              <div className="cart-item" key={`${item.id}-${item.label}`}>
                <img src={item.image} alt={item.name} />
                <div className="ci-info">
                  <span className="ci-name">{item.name}</span>
                  <span className="ci-size">{item.label}</span>
                  <div className="ci-controls">
                    <div className="qty">
                      <button
                        type="button"
                        onClick={() => onQuantityChange(item.id, item.label, -1)}
                        aria-label={`Decrease ${item.name} quantity`}
                      >
                        <Minus aria-hidden="true" size={12} strokeWidth={1.8} />
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onQuantityChange(item.id, item.label, 1)}
                        aria-label={`Increase ${item.name} quantity`}
                      >
                        <Plus aria-hidden="true" size={12} strokeWidth={1.8} />
                      </button>
                    </div>
                    <span className="ci-price">{formatMoney(item.price * item.quantity)}</span>
                  </div>
                </div>
                <button
                  className="ci-remove"
                  type="button"
                  onClick={() => onRemove(item.id, item.label)}
                  aria-label={`Remove ${item.name}`}
                >
                  <X aria-hidden="true" size={15} strokeWidth={1.8} />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="drawer-foot">
          <div className="subtotal-row">
            <span>Subtotal</span>
            <span className="amount">{formatMoney(subtotal)}</span>
          </div>
          <button className="checkout-btn" type="button" onClick={onCheckout}>
            Checkout
          </button>
        </div>
      </aside>
    </>
  );
}
