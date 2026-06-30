export type ProductSize = {
  label: string;
  ml: number;
  price: number;
};

export type Product = {
  id: string;
  name: string;
  shortName: string;
  note: string;
  image: string;
  sizes: ProductSize[];
};

export type StorefrontStore = {
  slug: string;
  name: string;
  navBrand: string;
  location: string;
  phoneNumbers: string[];
  products: Product[];
};

export const eyalStore: StorefrontStore = {
  slug: "eyal-chekku-oils",
  name: "Eyal Chekku Oils",
  navBrand: "EYAL CHEKKU",
  location: "Chennai, India",
  phoneNumbers: ["+91 97863 64331", "+91 98404 45725"],
  products: [
    {
      id: "coconut",
      name: "Cold Wood-Pressed Coconut Oil",
      shortName: "Coconut Oil",
      note: "Light and faintly sweet - good for tempering, hair and skin.",
      image: "/images/coconut.jpg",
      sizes: [
        { label: "500 ml", ml: 500, price: 200 },
        { label: "1 L", ml: 1000, price: 400 },
        { label: "5 L", ml: 5000, price: 1970 }
      ]
    },
    {
      id: "sesame",
      name: "Cold Wood-Pressed Sesame Oil",
      shortName: "Sesame Oil",
      note: "Nutty and warm - the everyday oil of Tamil kitchens.",
      image: "/images/sesame.jpg",
      sizes: [
        { label: "500 ml", ml: 500, price: 210 },
        { label: "1 L", ml: 1000, price: 420 },
        { label: "5 L", ml: 5000, price: 2050 }
      ]
    },
    {
      id: "groundnut",
      name: "Cold Wood-Pressed Groundnut Oil",
      shortName: "Groundnut Oil",
      note: "Mild, steady and practical - built for everyday cooking.",
      image: "/images/groundnut.jpg",
      sizes: [
        { label: "500 ml", ml: 500, price: 130 },
        { label: "1 L", ml: 1000, price: 250 },
        { label: "5 L", ml: 5000, price: 1220 }
      ]
    },
    {
      id: "mustard",
      name: "Mustard Oil",
      shortName: "Mustard Oil",
      note: "Sharp and pungent - wakes up pickles and curries.",
      image: "/images/mustard.jpg",
      sizes: [{ label: "200 ml", ml: 200, price: 60 }]
    }
  ]
};

export function getStoreBySlug(slug: string) {
  if (slug === eyalStore.slug) return eyalStore;
  return null;
}
