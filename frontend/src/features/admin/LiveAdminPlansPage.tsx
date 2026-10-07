import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { request } from "../../lib/http";
import { useAuth } from "../../lib/auth-context";
import {
  fetchClientRoster,
  fetchPlansSummary,
  fetchPlanNegotiations,
  updatePlanNegotiation,
  createPlanNegotiation,
  type PlanNegotiationApiItem,
} from "../../lib/ops-api";
import { LiveAdminFrame, DataState } from "./LiveAdminPages";

interface Plan {
  id: string;
  name: string;
  display_name: string;
  price_minor: number;
  currency: string;
  highlights: string[];
  poster_quota: number;
  reel_quota: number;
  story_quota: number;
}
export function LiveAdminPlansPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [edit, setEdit] = useState<Plan | null>(null);
  const [quoteAction, setQuoteAction] = useState<"accept" | "counter">("counter");
  const clients = useQuery({ queryKey: ["admin_clients", user?.id], queryFn: () => fetchClientRoster(), enabled: !!user });
  const [counter, setCounter] = useState<PlanNegotiationApiItem | null>(null);
  const catalog = useQuery({
    queryKey: ["admin_plan_catalog", user?.id],
    queryFn: () => request<Plan[]>("/api/v1/payments/plans"),
    enabled: !!user,
  });
  const summary = useQuery({
    queryKey: ["admin_plans_summary", user?.id],
    queryFn: fetchPlansSummary,
    enabled: !!user,
  });
  const negotiations = useQuery({
    queryKey: ["admin_negotiations", user?.id],
    queryFn: fetchPlanNegotiations,
    enabled: !!user,
  });
  async function save(action: () => Promise<unknown>) {
    setBusy(true);
    setMessage("");
    try {
      await action();
      await Promise.all([catalog.refetch(), summary.refetch(), negotiations.refetch()]);
      setEdit(null);
      setCounter(null);
      setMessage("Saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setBusy(false);
    }
  }
  const panel = "p-5 bg-[#161F2D] rounded-xl space-y-3";
  const field = "w-full p-3 bg-[#0B111C] rounded-lg border border-[#2A3446]";
  return (
    <LiveAdminFrame title="Plans and negotiations">
      <DataState query={catalog} />
      <DataState query={summary} />
      <DataState query={negotiations} />
      {message && <p role="status">{message}</p>}
      <section className="grid md:grid-cols-3 gap-4">
        {catalog.data?.map((p) => (
          <article key={p.id} className={panel}>
            <h2 className="font-bold">{p.display_name}</h2>
            <p>
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: p.currency }).format(
                p.price_minor / 100,
              )}{" "}
              / month
            </p>
            <p>
              {summary.data
                ? `${summary.data.plans.find((s) => s.id === p.id)?.subscriber_count ?? 0} subscribers`
                : "Subscriber counts unavailable"}
            </p>
            <p>
              {p.reel_quota} reels · {p.poster_quota} posters · {p.story_quota} stories
            </p>
            {p.highlights.map((h, i) => (
              <p key={i}>{h}</p>
            ))}
            <button onClick={() => setEdit(p)}>Edit plan price and features</button>
          </article>
        ))}
      </section>
      {catalog.isSuccess && !catalog.data.length && <p>No plans configured.</p>}
      {edit && (
        <form
          className={panel}
          onSubmit={(e) => {
            e.preventDefault();
            const values = new FormData(e.currentTarget);
            void save(() =>
              request(`/api/v1/admin/plans/${edit.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                  price_minor: Math.round(Number(values.get("price")) * 100),
                  monthly_price: Number(values.get("price")),
                  highlights: String(values.get("features")).split("\n").filter(Boolean),
                }),
              }),
            );
          }}
        >
          <h2>Edit {edit.display_name}</h2>
          <label>
            Monthly price
            <input
              name="price"
              type="number"
              min={0}
              step="0.01"
              aria-label="Plan monthly price"
              defaultValue={edit.price_minor / 100}
              className={field}
              required
            />
          </label>
          <label>
            Features
            <textarea
              name="features"
              aria-label="Plan features"
              defaultValue={edit.highlights.join("\n")}
              className={field}
            />
          </label>
          <button disabled={busy}>Save plan</button>
          <button type="button" onClick={() => setEdit(null)}>
            Cancel
          </button>
        </form>
      )}
      <h2 className="text-lg font-bold">Pricing negotiations</h2>
      {negotiations.isSuccess && !negotiations.data.length && <p>No pricing requests yet.</p>}
      <section className="grid md:grid-cols-2 gap-4">
        {negotiations.data?.map((n) => (
          <article key={n.id} className={panel}>
            <h3 className="font-bold">{n.clientName}</h3>
            {n.clientEmail && <p>{n.clientEmail}</p>}
            <p>
              {n.targetTopic} · {n.status}
            </p>
            {n.proposedOffer && <p>Proposed offer: {n.proposedOffer}</p>}
            {n.counterPrice != null && (
              <p>Counter price: ₹{n.counterPrice.toLocaleString("en-IN")}</p>
            )}
            {n.notes && <p>{n.notes}</p>}
            {n.counterNote && <p>{n.counterNote}</p>}
            {n.declineReason && <p>{n.declineReason}</p>}
            {n.requestedAt && <p>{new Date(n.requestedAt).toLocaleString()}</p>}
            {["Pending Review", "Counter Offered", "Accepted"].includes(n.status) && (
              <div className="flex flex-wrap gap-4">
                <button
                  disabled={busy}
                  onClick={() => { setQuoteAction("accept"); setCounter(n); }}
                >
                  Apply agreed price
                </button>
                <button disabled={busy} onClick={() => { setQuoteAction("counter"); setCounter(n); }}>
                  Counter offer
                </button>
                <button
                  disabled={busy}
                  onClick={() => void save(() => updatePlanNegotiation(n.id, "decline"))}
                >
                  Decline
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
      {counter && (
        <form
          className={panel}
          onSubmit={(e) => {
            e.preventDefault();
            const values = new FormData(e.currentTarget);
            void save(() =>
              updatePlanNegotiation(counter.id, quoteAction, {
                ...(quoteAction === "accept" ? {
                  agreed_price: Number(values.get("price")),
                  ...Object.fromEntries(["reel_quota", "poster_quota", "story_quota"].filter(key => values.get(key) !== "").map(key => [key, Number(values.get(key))])),
                } : { counter_price: Number(values.get("price")) }),
                counter_note: String(values.get("note")),
              }),
            );
          }}
        >
          <h3>{quoteAction === "accept" ? "Apply agreed price" : "Counter offer"} for {counter.clientName}</h3><p className="text-sm text-slate-400">Leave quotas blank to preserve the current plan. Enter all three quotas for a client without a plan.</p>
          <input
            name="price"
            type="number"
            min={1}
            step="1"
            defaultValue={counter.counterPrice || undefined}
            aria-label={quoteAction === "accept" ? "Agreed monthly price" : "Counter price"}
            className={field}
            required
          />
          <textarea name="note" aria-label="Counter offer note" className={field} />
          {quoteAction === "accept" && ["reel_quota", "poster_quota", "story_quota"].map(key => <label key={key} className="block">{key.replace("_quota", " quota")}<input name={key} type="number" min={0} step={1} aria-label={key.replace("_quota", " quota")} placeholder="Keep current" className={field} /></label>)}
          <button disabled={busy}>{quoteAction === "accept" ? "Save client price" : "Submit counter offer"}</button>
          <button type="button" onClick={() => setCounter(null)}>
            Cancel
          </button>
        </form>
      )}
      <form
        className={panel}
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const values = new FormData(form);
          void save(async () => {
            const client = clients.data?.find(c => c.client_id === values.get("client"));
            if (!client) throw new Error("Select a registered client");
            await createPlanNegotiation({
              client_id: client.client_id,
              client_name: client.company_name || client.email,
              client_email: client.email,
              target_topic: String(values.get("topic")),
              proposed_offer: String(values.get("offer")) || undefined,
              notes: String(values.get("notes")) || undefined,
            });
            form.reset();
          });
        }}
      >
        <h2>Create pricing proposal</h2>
        <DataState query={clients} /><select name="client" aria-label="Proposal client" className={field} required><option value="">Select registered client</option>{clients.data?.map(c => <option key={c.client_id} value={c.client_id}>{c.company_name || c.email}</option>)}</select>
        <input
          name="topic"
          aria-label="Proposal scope"
          placeholder="Proposal scope"
          className={field}
          required
        />
        <input
          name="offer"
          aria-label="Proposed offer"
          placeholder="Proposed offer"
          className={field}
        />
        <textarea name="notes" aria-label="Proposal notes" placeholder="Notes" className={field} />
        <button disabled={busy}>Create proposal</button>
      </form>
    </LiveAdminFrame>
  );
}
