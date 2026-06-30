import { Check } from "lucide-react";

type ToastProps = {
  message: string | null;
};

export function Toast({ message }: ToastProps) {
  return (
    <div className={message ? "toast show" : "toast"} role="status" aria-live="polite">
      <Check aria-hidden="true" size={16} strokeWidth={1.8} />
      <span>{message ?? "Added to cart"}</span>
    </div>
  );
}
