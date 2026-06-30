import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-page">
      <p className="eyebrow">Not Found</p>
      <h1>This page is not available.</h1>
      <p>The store link may be wrong, inactive, or moved.</p>
      <Link href="/s/eyal-chekku-oils">Open Eyal Chekku Oils</Link>
    </main>
  );
}
