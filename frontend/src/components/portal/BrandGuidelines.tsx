import type { ReactNode } from "react";

function label(key: string) { return key.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase()); }
function valueView(value: unknown, depth = 0): ReactNode {
  if (value == null || value === "") return <span className="text-app-mist">Not provided</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value !== "object") return String(value);
  if (Array.isArray(value)) return value.length ? <ul className="space-y-2 list-disc pl-5">{value.map((item, i) => <li key={i}>{valueView(item, depth + 1)}</li>)}</ul> : <span className="text-app-mist">None recorded</span>;
  return <dl className="space-y-3">{Object.entries(value).map(([key, item]) => <div key={key} className={depth ? "space-y-1" : "rounded-xl p-4 bg-app-base space-y-2"}><dt className="text-sm font-semibold text-app-accent-soft">{label(key)}</dt><dd className="text-sm leading-relaxed text-hi break-words">{valueView(item, depth + 1)}</dd></div>)}</dl>;
}

export function BrandGuidelines({ dna }: { dna: Record<string, unknown> }) {
  const sections = Object.entries(dna).filter(([key]) => !["files", "subscription_pause"].includes(key));
  return <section className="space-y-5"><h2 className="text-xl font-bold">Your brand guidelines</h2>{sections.length ? <div className="grid lg:grid-cols-2 gap-4">{sections.map(([key, value]) => <article key={key} className="min-w-0 rounded-2xl border border-app-line bg-app-surface p-5 space-y-4"><h3 className="text-lg font-semibold text-hi">{label(key)}</h3>{valueView(value)}</article>)}</div> : <p>No brand guidelines stored yet.</p>}</section>;
}
