export type ProductVariant = {
  id?: string;
  label: string;
  ml: number;
  price: number;
  rateDisplayMode?: "fixed" | "on_call";
  availabilityStatus?: "available" | "unavailable";
};

export type StoreCategory = {
  id: string;
  name: string;
  description: string;
};

export type Product = {
  id: string;
  categoryId: string;
  name: string;
  shortName: string;
  note: string;
  image: string;
  availabilityStatus?: "available" | "unavailable";
  variants: ProductVariant[];
};

export type StorefrontStore = {
  slug: string;
  name: string;
  navBrand: string;
  location: string;
  phoneNumbers: string[];
  theme: {
    primary: string;
    accent: string;
    surface: string;
  };
  categories: StoreCategory[];
  products: Product[];
};

export const eyalStore: StorefrontStore = {
  slug: "eyal-chekku-oils",
  name: "Eyal Chekku Oils",
  navBrand: "EYAL CHEKKU",
  location: "Chennai, India",
  phoneNumbers: ["+91 97863 64331", "+91 98404 45725"],
  theme: {
    primary: "#2b1d12",
    accent: "#a67c2e",
    surface: "#f5efe3"
  },
  categories: [
    {
      id: "oils",
      name: "Oils",
      description: "Cold-pressed and natural oils for everyday home use."
    },
    {
      id: "rice-poha",
      name: "Rice & Poha",
      description: "Reserved for future grains and breakfast staples."
    },
    {
      id: "nuts-seeds",
      name: "Nuts & Seeds",
      description: "Reserved for future raw nuts, seeds, and pantry items."
    },
    {
      id: "others",
      name: "Others",
      description: "Special care and household products."
    }
  ],
  products: [
    {
      id: "coconut",
      categoryId: "oils",
      name: "Cold Wood-Pressed Coconut Oil",
      shortName: "Coconut Oil",
      note: "Light and faintly sweet - good for tempering, hair and skin.",
      image: "/images/coconut.jpg",
      variants: [
        { id: "coconut-500ml", label: "500 ml", ml: 500, price: 200, availabilityStatus: "available" },
        { id: "coconut-1l", label: "1 L", ml: 1000, price: 400, availabilityStatus: "available" },
        { id: "coconut-5l", label: "5 L", ml: 5000, price: 1970, availabilityStatus: "available" }
      ]
    },
    {
      id: "sesame",
      categoryId: "oils",
      name: "Cold Wood-Pressed Sesame Oil",
      shortName: "Sesame Oil",
      note: "Nutty and warm - the everyday oil of Tamil kitchens.",
      image: "/images/sesame.jpg",
      variants: [
        { label: "500 ml", ml: 500, price: 210 },
        { label: "1 L", ml: 1000, price: 420 },
        { label: "5 L", ml: 5000, price: 2050 }
      ]
    },
    {
      id: "groundnut",
      categoryId: "oils",
      name: "Cold Wood-Pressed Groundnut Oil",
      shortName: "Groundnut Oil",
      note: "Mild, steady and practical - built for everyday cooking.",
      image: "/images/groundnut.jpg",
      variants: [
        { label: "500 ml", ml: 500, price: 130 },
        { label: "1 L", ml: 1000, price: 250 },
        { label: "5 L", ml: 5000, price: 1220 }
      ]
    },
    {
      id: "mustard",
      categoryId: "oils",
      name: "Mustard Oil",
      shortName: "Mustard Oil",
      note: "Sharp and pungent - wakes up pickles and curries.",
      image: "/images/mustard.jpg",
      variants: [{ label: "200 ml", ml: 200, price: 60 }]
    },
    {
      id: "olive",
      categoryId: "oils",
      name: "Olive Oil",
      shortName: "Olive Oil",
      note: "Smooth and clean - suited for light cooking and finishing.",
      image: "/images/coconut.jpg",
      variants: [{ label: "200 ml", ml: 200, price: 200 }]
    },
    {
      id: "neem",
      categoryId: "oils",
      name: "Neem Oil",
      shortName: "Neem Oil",
      note: "Traditional neem oil for home and garden care routines.",
      image: "/images/mustard.jpg",
      variants: [{ label: "200 ml", ml: 200, price: 70 }]
    },
    {
      id: "castor",
      categoryId: "oils",
      name: "Castor Oil",
      shortName: "Castor Oil",
      note: "Thick, rich oil commonly used for hair and skin care.",
      image: "/images/groundnut.jpg",
      variants: [
        { label: "200 ml", ml: 200, price: 70 },
        { label: "500 ml", ml: 500, price: 150 }
      ]
    },
    {
      id: "deepa",
      categoryId: "oils",
      name: "Deepa Oil",
      shortName: "Deepa Oil",
      note: "Prepared for daily lamp lighting and pooja use.",
      image: "/images/sesame.jpg",
      variants: [
        { label: "500 ml", ml: 500, price: 110 },
        { label: "1 L", ml: 1000, price: 210 }
      ]
    },
    {
      id: "iluppa",
      categoryId: "oils",
      name: "Iluppa Oil (Mahua Oil)",
      shortName: "Iluppa Oil",
      note: "Natural mahua oil for traditional household uses.",
      image: "/images/sesame.jpg",
      variants: [{ label: "200 ml", ml: 200, price: 60 }]
    },
    {
      id: "rosemary-hair",
      categoryId: "others",
      name: "Homemade Rosemary Hair Oil",
      shortName: "Rosemary Hair Oil",
      note: "Homemade hair oil with rosemary for regular scalp care.",
      image: "/images/coconut.jpg",
      variants: [{ label: "200 ml", ml: 200, price: 200 }]
    }
  ]
};

export function getStoreBySlug(slug: string) {
  if (slug === eyalStore.slug) return eyalStore;
  return null;
}
