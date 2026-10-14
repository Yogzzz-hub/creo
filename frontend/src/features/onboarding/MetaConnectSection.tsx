import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ArrowUpRight, CheckCircle2, Facebook, Instagram, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useConfirm } from "../../components/ui/ConfirmDialog";
import {
  disconnectInstagram,
  fetchInstagramStatus,
  startMetaConnect,
  verifyInstagram,
} from "../../lib/instagram-oauth";

interface MetaConnectSectionProps {
  userId: string;
  /** Persist any unsaved questionnaire answers before the browser leaves for Meta. */
  beforeConnect: () => Promise<void>;
  onConnectingChange?: (connecting: boolean) => void;
}

/** Section H: connect Instagram/Facebook through Meta OAuth (optional). */
export function MetaConnectSection({ userId, beforeConnect, onConnectingChange }: MetaConnectSectionProps) {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [busy, setBusy] = useState<"connect" | "verify" | "disconnect" | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<"facebook" | "instagram" | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const status = useQuery({
    queryKey: ["instagram-connection", userId],
    queryFn: fetchInstagramStatus,
    staleTime: 30_000,
  });
  const data = status.data;
  const needsReconnect = data?.status === "reconnect_required";

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["instagram-connection"] });
    void queryClient.invalidateQueries({ queryKey: ["portal-profile"] });
    void queryClient.invalidateQueries({ queryKey: ["portal-dashboard"] });
  };

  async function connect(provider: "facebook" | "instagram" = "facebook") {
    if (busy !== null) return;
    onConnectingChange?.(true);
    setConnectingProvider(provider);
    setBusy("connect");
    setMessage(null);
    try {
      // Meta sends the client back to the same questionnaire tab.
      const params = new URLSearchParams(window.location.search);
      params.set("section", "h");
      if (window.location.pathname === "/onboarding") params.set("step", "4");
      await startMetaConnect(userId, `${window.location.pathname}?${params.toString()}`, beforeConnect, provider);
      // Leaving the page; keep the button busy.
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Could not start the Meta connection.",
      });
      setBusy(null);
      setConnectingProvider(null);
      onConnectingChange?.(false);
    }
  }

  async function verify() {
    setBusy("verify");
    setMessage(null);
    try {
      const res = await verifyInstagram();
      refresh();
      setMessage(
        res.error
          ? { type: "error", text: res.error }
          : { type: "success", text: "Connection verified." },
      );
    } catch (e) {
      setMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Could not verify the connection.",
      });
    } finally {
      setBusy(null);
    }
  }

  async function disconnect() {
    const ok = await confirm({
      title: "Disconnect Instagram?",
      description:
        "Future publishing will pause. Existing Instagram posts and Creo deliverables are preserved.",
      confirmText: "Disconnect",
    });
    if (!ok) return;
    setBusy("disconnect");
    setMessage(null);
    try {
      const res = await disconnectInstagram();
      refresh();
      setMessage({
        type: "success",
        text: res.provider_revoked
          ? "Instagram disconnected."
          : "Disconnected from Creo. Meta could not confirm revocation; also remove Creo under Facebook Business Integrations.",
      });
    } catch (e) {
      setMessage({ type: "error", text: e instanceof Error ? e.message : "Could not disconnect." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-[#2A3446] pb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-white">Section H: Connect Meta</h2>
          <span className="text-[11px] font-bold bg-[#D8BF9B]/20 text-[#D8BF9B] border border-[#D8BF9B]/30 px-2 py-0.5 rounded-full">
            Optional
          </span>
        </div>
        <p className="text-xs text-[#97A0B3] mt-1">
          Connect your Instagram Business or Creator account directly, or use Facebook with a linked
          Page. Your password stays with Instagram or Facebook. You can also connect later in Account settings.
        </p>
      </div>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`p-3 rounded-xl text-xs font-medium ${
            message.type === "success"
              ? "bg-emerald-950/40 text-emerald-300 border border-emerald-800/60"
              : "bg-rose-950/40 text-rose-300 border border-rose-800/60"
          }`}
        >
          {message.text}
        </div>
      )}

      {status.isPending && (
        <output className="text-xs text-[#97A0B3] flex items-center gap-2">
          <Loader2 className="size-3.5 animate-spin" /> Checking connection…
        </output>
      )}
      {status.isError && (
        <p role="alert" className="text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="size-3.5" />
          {status.error instanceof Error
            ? status.error.message
            : "Could not load connection status."}
          <button
            type="button"
            className="underline cursor-pointer"
            onClick={() => void status.refetch()}
          >
            Retry
          </button>
        </p>
      )}

      {data && !data.connected && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {([
            { provider: "instagram", title: "Instagram", subtitle: "Connect directly", description: "Connect your Business or Creator account. No Facebook Page needed.", label: "Connect Instagram", Icon: Instagram, badge: "Direct connection", color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]" },
            { provider: "facebook", title: "Facebook", subtitle: "Connect a linked Instagram account", description: "Sign in with Facebook and select the Page linked to your Instagram professional account.", label: "Connect with Facebook", Icon: Facebook, badge: "Via Facebook Page", color: "bg-[#1877F2]" },
          ] as const).map(({ provider, title, subtitle, description, label, Icon, badge, color }) => (
            <section key={provider} className="flex flex-col rounded-2xl border border-[#2A3446] bg-[#0B111C] p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <span className={`inline-flex size-12 shrink-0 items-center justify-center rounded-2xl text-white ${color}`}>
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <span className="rounded-full border border-[#2A3446] px-3 py-1 text-[10px] font-semibold text-[#BCCCE6]">{badge}</span>
              </div>
              <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
              <p className="mt-1 text-xs font-semibold text-[#BCCCE6]">{subtitle}</p>
              <p className="mt-3 flex-1 text-xs leading-relaxed text-[#97A0B3]">{description}</p>
              <button type="button" disabled={busy !== null} onClick={() => void connect(provider)}
                className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#BCCCE6] px-4 py-3 text-sm font-bold text-[#0B111C] hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B111C] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                {busy === "connect" && connectingProvider === provider ? <Icon className="size-5 animate-pulse motion-reduce:animate-none" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
                {busy === "connect" && connectingProvider === provider ? "Opening authorization..." : label}
                {connectingProvider !== provider && <ArrowUpRight className="size-4" aria-hidden="true" />}
              </button>
            </section>
          ))}
          <p className="md:col-span-2 flex items-start justify-center gap-2 text-[11px] leading-relaxed text-[#97A0B3]">
            <ShieldCheck className="size-4 shrink-0 text-[#7FA0D6]" aria-hidden="true" />
            Your password stays with Instagram or Facebook. You choose what to share and can disconnect anytime.
          </p>
          {needsReconnect && <p role="alert" className="md:col-span-2 text-xs text-amber-300">{data.error || "Your connection expired. Choose a method above to reconnect."}</p>}
        </div>
      )}
      {data?.connected && (
        <div className="rounded-2xl border border-[#2A3446] bg-[#0B111C] p-4 space-y-4">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] p-[2px]">
              <div className="size-full rounded-full bg-[#0B111C] flex items-center justify-center">
                <Instagram className="size-4 text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">
                @{(data.username || "").replace(/^@/, "")}
              </p>
              <p className="text-[11px] text-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="size-3" /> Connected
                {data.page_name ? ` · ${data.page_name}` : ""}
              </p>
            </div>
          </div>
          {data.error && <p className="text-xs text-amber-300">{data.error}</p>}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void verify()}
              className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#BCCCE6] hover:text-white hover:border-[#7FA0D6] disabled:opacity-50 cursor-pointer"
            >
              {busy === "verify" ? "Verifying…" : "Verify connection"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void connect()}
              className="px-4 py-2 rounded-xl border border-[#2A3446] text-xs font-bold text-[#BCCCE6] hover:text-white hover:border-[#7FA0D6] disabled:opacity-50 cursor-pointer"
            >
              {busy === "connect" ? "Redirecting…" : "Reconnect"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void disconnect()}
              className="px-4 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs font-bold text-rose-300 hover:text-rose-200 disabled:opacity-50 cursor-pointer"
            >
              {busy === "disconnect" ? "Disconnecting…" : "Disconnect"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
