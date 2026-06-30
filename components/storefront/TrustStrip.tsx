import { BadgeCheck, Droplet, Leaf, RotateCcw } from "lucide-react";

const items = [
  {
    title: "Wood-Pressed",
    body: "No steel expellers. Just a wooden ghani, turning slow.",
    Icon: RotateCcw
  },
  {
    title: "Zero Heat",
    body: "Cold-extracted, so nutrients stay where they belong.",
    Icon: Droplet
  },
  {
    title: "Nothing Added",
    body: "No solvents, no refining, no quiet additives.",
    Icon: Leaf
  },
  {
    title: "Small Batch",
    body: "Pressed fresh in Chennai, in batches we can vouch for.",
    Icon: BadgeCheck
  }
];

export function TrustStrip() {
  return (
    <div className="trust-strip">
      {items.map(({ title, body, Icon }) => (
        <div className="trust-card" key={title}>
          <Icon aria-hidden="true" size={24} strokeWidth={1.6} />
          <h4>{title}</h4>
          <p>{body}</p>
        </div>
      ))}
    </div>
  );
}
