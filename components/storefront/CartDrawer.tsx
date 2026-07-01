"use client";

import { FormEvent, useState } from "react";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { formatMoney } from "@/lib/money";
import type { CartItem, CheckoutFormValues } from "./types";

type CartDrawerProps = {
  cart: CartItem[];
  open: boolean;
  subtotal: number;
  hasOnCallItems: boolean;
  onClose: () => void;
  onQuantityChange: (id: string, label: string, delta: number) => void;
  onRemove: (id: string, label: string) => void;
  onCheckout: (values: CheckoutFormValues) => void;
  checkoutLoading: boolean;
};

export function CartDrawer({
  cart,
  open,
  subtotal,
  hasOnCallItems,
  onClose,
  onQuantityChange,
  onRemove,
  onCheckout,
  checkoutLoading
}: CartDrawerProps) {
  const [form, setForm] = useState<CheckoutFormValues>({
    customerName: "",
    phone10: "",
    address: "",
    note: "",
    website: ""
  });

  function updateField(field: keyof CheckoutFormValues, value: string) {
    setForm((current) => ({
      ...current,
      [field]: field === "phone10" ? value.replace(/\D/g, "").slice(0, 10) : value
    }));
  }

  function submitCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onCheckout(form);
  }

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
                    <span className="ci-price">
                      {item.rateDisplayMode === "on_call"
                        ? "Rate on call"
                        : formatMoney(item.price * item.quantity)}
                    </span>
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

        <form className="drawer-foot checkout-form" onSubmit={submitCheckout}>
          <div className="checkout-fields">
            <label>
              <span>Name</span>
              <input
                value={form.customerName}
                autoComplete="name"
                placeholder="Your name"
                onChange={(event) => updateField("customerName", event.target.value)}
              />
            </label>
            <label>
              <span>Mobile number</span>
              <div className="phone-field">
                <strong>+91</strong>
                <input
                  value={form.phone10}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={10}
                  placeholder="10 digit number"
                  onChange={(event) => updateField("phone10", event.target.value)}
                />
              </div>
            </label>
            <label>
              <span>Address / area</span>
              <textarea
                value={form.address}
                rows={3}
                placeholder="Door number, street, area"
                onChange={(event) => updateField("address", event.target.value)}
              />
            </label>
            <label>
              <span>Note <em>optional</em></span>
              <input
                value={form.note}
                placeholder="Timing or delivery note"
                onChange={(event) => updateField("note", event.target.value)}
              />
            </label>
            <label className="hp-field" aria-hidden="true">
              Website
              <input
                value={form.website}
                tabIndex={-1}
                autoComplete="off"
                onChange={(event) => updateField("website", event.target.value)}
              />
            </label>
          </div>
          <div className="subtotal-row">
            <span>{hasOnCallItems ? "Known subtotal" : "Subtotal"}</span>
            <span className="amount">{formatMoney(subtotal)}</span>
          </div>
          {hasOnCallItems ? (
            <p className="checkout-note">
              Some rates will be confirmed by the shop on call before final payment.
            </p>
          ) : null}
          <button className="checkout-btn" type="submit" disabled={cart.length === 0 || checkoutLoading}>
            {checkoutLoading ? "Placing order..." : "Place order"}
          </button>
          <p className="checkout-note">
            No online payment. The shop will call you to confirm availability and payment.
          </p>
        </form>
      </aside>
    </>
  );
}
