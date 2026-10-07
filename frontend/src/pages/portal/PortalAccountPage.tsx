import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import { useOnboardingGate } from "../../lib/useOnboardingGate";
import { SubscriptionLockedState } from "../../components/portal/SubscriptionLockedState";
import { PasswordRecoveryModal } from "../../components/auth/PasswordRecoveryModal";
import { resolveAssetUrl } from "../../lib/media";
export function PortalAccountPage({ defaultTab = "settings" }: { defaultTab?: string }) {
  const { user } = useAuth();
  const gate = useOnboardingGate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || defaultTab;
  const brand = ["brand", "edit-brand"].includes(tab);
  const query = useQuery({
    queryKey: ["portal-profile", user?.id],
    queryFn: () => request<any>("/api/v1/portal/profile"),
    enabled: !!user?.id,
  });
  const [form, setForm] = useState({
    name: "",
    company: "",
    phone: "",
    summary: "",
    audience: "",
    voice: "",
    colors: "",
    instagram: "",
  });
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (query.data) {
      const p = query.data;
      setForm({
        instagram: p.instagram_username || "",
        name: p.full_name || "",
        company: p.company_name || "",
        phone: p.phone || "",
        summary: p.brand_dna?.summary_line || "",
        audience: p.brand_dna?.target_audience || "",
        voice: (p.brand_dna?.tone_keywords || []).join(", "),
        colors: (p.brand_dna?.brand_colors || p.brand_dna?.palette || []).join(", "),
      });
    }
  }, [query.data]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await request("/api/v1/portal/profile", {
        method: "PUT",
        body: JSON.stringify(
          brand
            ? {
                company_name: form.company,
                instagram_username: form.instagram,
                brand_summary: form.summary,
                brand_dna: {
                  ...(query.data?.brand_dna || {}),
                  summary_line: form.summary,
                  target_audience: form.audience,
                  tone_keywords: form.voice
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                  brand_colors: form.colors
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              }
            : { full_name: form.name, company_name: form.company, phone: form.phone },
        ),
      });
      await query.refetch();
      setMessage("Changes saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Changes could not be saved.");
    } finally {
      setBusy(false);
    }
  }
  if (brand && gate.isReady && !gate.isComplete)
    return (
      <SubscriptionLockedState
        title="Brand DNA locked"
        description="Complete onboarding to manage your brand guidelines."
      />
    );
  const field = "w-full p-3 rounded-xl bg-[#0B111C] border border-[#2A3446] text-white";
  return (
    <main className="text-white space-y-6 pb-12">
      <h1 className="text-3xl font-bold">{brand ? "Brand DNA" : "Account settings"}</h1>
      {query.isPending && <p role="status">Loading profile…</p>}
      {query.isError && (
        <p role="alert">
          {query.error.message} <button onClick={() => void query.refetch()}>Retry</button>
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!brand && <section className="bg-[#161F2D] border border-[#2A3446] p-5 rounded-3xl space-y-3"><h2 className="font-bold">Password sign-in</h2><p className="text-sm text-[#97A0B3]">Verify your email to set or reset a Creo password. You can continue using Google sign-in.</p><button className="underline" onClick={() => setRecoveryOpen(true)}>Set or reset password</button></section>}
      {recoveryOpen && <PasswordRecoveryModal initialEmail={user?.email || ""} onClose={() => setRecoveryOpen(false)} />}
      {query.data && (
        <>
          <div className="flex gap-5">
            <button onClick={() => setParams({ tab: "settings" })}>Account</button>
            <button onClick={() => setParams({ tab: "brand" })}>Brand DNA</button>
          </div>
          <form
            onSubmit={save}
            className="bg-[#161F2D] border border-[#2A3446] p-5 sm:p-8 rounded-3xl space-y-5"
          >
            {(brand
              ? ["company", "instagram", "summary", "audience", "voice", "colors"]
              : ["name", "company", "phone"]
            ).map((key) => (
              <label key={key} className="block space-y-2">
                <span>
                  {
                    {
                      name: "Name",
                      company: "Company",
                      phone: "Phone",
                      summary: "Brand summary",
                      audience: "Target audience",
                      voice: "Tone keywords (comma separated)",
                      colors: "Brand colors (comma separated)",
                      instagram: "Instagram handle",
                    }[key]
                  }
                </span>
                <input
                  aria-label={key}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  className={field}
                />
              </label>
            ))}
            {!brand && <p>Email: {query.data.email || user?.email || "Not provided"}</p>}
            <button
              disabled={busy}
              className="bg-[#BCCCE6] text-[#0B111C] px-6 py-3 rounded-xl font-bold"
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </form>
          {brand && (
            <section className="bg-[#161F2D] p-5 rounded-3xl space-y-3">
              <h2 className="font-bold">Stored brand guidelines</h2>
              <pre className="whitespace-pre-wrap break-words text-sm">
                {Object.keys(query.data.brand_dna || {}).length
                  ? JSON.stringify(query.data.brand_dna, null, 2)
                  : "No brand guidelines stored yet."}
              </pre>
              <h2 className="font-bold">Brand files</h2>
              {!query.data.brand_dna?.files?.length && <p>No brand files uploaded.</p>}
              {query.data.brand_dna?.files?.map((f: any, i: number) => (
                <p key={f.id || i}>
                  {f.url || f.file_url ? (
                    <a
                      className="underline"
                      href={resolveAssetUrl(f.url || f.file_url)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {f.name || "Brand file"}
                    </a>
                  ) : (
                    f.name || "File details unavailable"
                  )}
                  {f.size && ` · ${f.size}`}
                </p>
              ))}
            </section>
          )}
          {!brand && (
            <section className="bg-[#161F2D] p-5 rounded-3xl space-y-3">
              <h2 className="font-bold">Assigned team</h2>
              {!query.data.assigned_team?.length && <p>No team assigned yet.</p>}
              {query.data.assigned_team?.map((m: any) => (
                <p key={m.id || m.email}>
                  {m.name || m.full_name || m.email} · {m.role}
                </p>
              ))}
            </section>
          )}
        </>
      )}
    </main>
  );
}
