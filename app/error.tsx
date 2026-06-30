"use client";

export default function ErrorPage({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="system-page">
      <p className="eyebrow">Error</p>
      <h1>Something failed.</h1>
      <p>Please retry. If it repeats, check the deployment logs.</p>
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}
