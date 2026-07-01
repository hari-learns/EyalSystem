export type CartItem = {
  id: string;
  variantId?: string;
  name: string;
  label: string;
  price: number;
  rateDisplayMode?: "fixed" | "on_call";
  image: string;
  quantity: number;
};

export type CheckoutFormValues = {
  customerName: string;
  phone10: string;
  address: string;
  note: string;
  website: string;
};
