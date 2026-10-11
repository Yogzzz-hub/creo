import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../lib/auth-context";
import { request } from "../../lib/http";
import { useConfirm } from "../ui/ConfirmDialog";

interface Connection {
  status: string;
  connected: boolean;
  configured: boolean;
  publishing_enabled: boolean;
  username?: string;
  account_id?: string;
  picture?: string;
  page_name?: string;
  last_verified_at?: string;
  expires_at?: string;
  error?: string;
}
interface Selection {
  selection_id: string;
  accounts: { id: string; username: string; page_name: string }[];
}
const endpoint = "/api/v1/portal/integrations/instagram";
const button =
  "min-h-11 rounded-xl border border-[#2A3446] px-4 py-2 text-sm font-semibold disabled:opacity-50 hover:bg-[#2A3446]";

export function InstagramConnection() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const cache = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const callbackStarted = useRef(false);
  const query = useQuery({
    queryKey: ["instagram-connection", user?.id],
    queryFn: () => request<Connection>(endpoint),
    enabled: user?.role === "client",
  });
  const invalidate = useCallback(() => {
    void cache.invalidateQueries({ queryKey: ["instagram-connection"] });
    void cache.invalidateQueries({ queryKey: ["publishing"] });
  }, [cache]);
  useEffect(() => {
    if (!user || callbackStarted.current) return;
    const params = new URLSearchParams(window.location.search);
    if (!params.has("code") && !params.has("error")) return;
    callbackStarted.current = true;
    const saved = sessionStorage.getItem("creo-instagram-oauth");
    window.history.replaceState(null, "", "/portal/account/instagram");
    sessionStorage.removeItem("creo-instagram-oauth");
    let flow: { state: string; verifier: string; userId: string };
    try {
      flow = JSON.parse(saved || "null");
      if (!flow || flow.state !== params.get("state") || flow.userId !== user.id) throw new Error();
    } catch {
      setMessage(
        "Authorization state is missing or expired. Start the connection again in this browser.",
      );
      return;
    }
    setBusy(true);
    void request<Connection | Selection>(`${endpoint}/callback`, {
      method: "POST",
      body: JSON.stringify({
        state: flow.state,
        verifier: flow.verifier,
        code: params.get("code"),
        denied: params.has("error"),
      }),
    })
      .then((data) => {
        if ("accounts" in data) setSelection(data);
        else setMessage("Instagram connected. Review any paused schedules before resuming.");
        invalidate();
      })
      .catch((e) => setMessage(e instanceof Error ? e.message : "Connection failed. Try again."))
      .finally(() => setBusy(false));
  }, [user, invalidate]);

  async function perform(action: "connect" | "verify" | "disconnect", accountId?: string) {
    if (
      action === "disconnect" &&
      !(await confirm({
        title: "Disconnect Instagram?",
        description:
          "Future publishing will pause. Existing Instagram posts and Creo deliverables will be preserved.",
        confirmText: "Disconnect",
      }))
    )
      return;
    setBusy(true);
    setMessage("");
    try {
      if (accountId && selection) {
        await request(`${endpoint}/select`, {
          method: "POST",
          body: JSON.stringify({ selection_id: selection.selection_id, account_id: accountId }),
        });
        setSelection(null);
        setMessage("Instagram connected.");
      } else if (action === "connect") {
        const data = await request<{ url: string; state: string; verifier: string }>(
          `${endpoint}/connect`,
          { method: "POST" },
        );
        sessionStorage.setItem(
          "creo-instagram-oauth",
          JSON.stringify({ state: data.state, verifier: data.verifier, userId: user?.id }),
        );
        window.location.assign(data.url);
      } else if (action === "disconnect") {
        const data = await request<{ provider_revoked: boolean }>(endpoint, { method: "DELETE" });
        setMessage(
          data.provider_revoked
            ? "Instagram disconnected. Future publishing is paused."
            : "Disconnected from Creo. Meta could not confirm revocation; remove Creo under Facebook Business Integrations as well.",
        );
      } else {
        const data = await request<Connection>(`${endpoint}/verify`, { method: "POST" });
        setMessage(data.error || "Connection verified.");
      }
      invalidate();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Instagram request failed.");
    } finally {
      setBusy(false);
    }
  }
  if (user?.role !== "client")
    return <p>Only the client account holder can manage Instagram authorization.</p>;
  const data = query.data;
  return (
    <section className="rounded-2xl border border-[#2A3446] bg-[#161F2D] p-5 sm:p-7 text-white space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Instagram connection</h2>
        <Link to="/portal/account" className="text-sm underline">
          Account
        </Link>
      </div>
      <p className="text-sm text-[#97A0B3]">
        Connect an Instagram Business account linked to a Facebook Page you manage. Approve content
        in Creo, then your authorized team schedules it. Your Instagram password is never shared
        with the team.
      </p>
      {query.isPending && <output>Checking connection…</output>}
      {query.isError && (
        <p role="alert">
          {query.error.message}{" "}
          <button type="button" className={button} onClick={() => void query.refetch()}>
            Retry
          </button>
        </p>
      )}
      {message && <output className="text-sm break-words">{message}</output>}
      {data && (
        <>
          <div className="flex gap-3 items-center">
            {data.picture && (
              <img
                src={data.picture}
                alt="Instagram profile"
                referrerPolicy="no-referrer"
                className="size-12 rounded-full"
              />
            )}
            <div>
              <p className="font-semibold">
                {data.username ? `@${data.username}` : "No connected account"}
              </p>
              <p className="text-sm capitalize text-[#97A0B3]">
                {data.status.replaceAll("_", " ")}
              </p>
            </div>
          </div>
          {data.account_id && (
            <p className="text-xs text-[#97A0B3] break-all">
              Account {data.account_id} · {data.page_name}
            </p>
          )}
          {data.last_verified_at && (
            <p className="text-xs text-[#97A0B3]">
              Last verified: {new Date(data.last_verified_at).toLocaleString()}
            </p>
          )}
          {data.error && (
            <p role="alert" className="text-amber-300 text-sm">
              {data.error}
            </p>
          )}
          {!data.configured && (
            <p className="text-sm text-amber-300">
              Instagram connection is awaiting administrator setup.
            </p>
          )}
          {!data.publishing_enabled && (
            <p className="text-sm text-[#97A0B3]">
              Automatic publishing is currently disabled. Approved content remains in Creo.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={button}
              disabled={busy || !data.configured}
              onClick={() => void perform("connect")}
            >
              {busy ? "Please wait…" : data.connected ? "Reconnect Instagram" : "Connect Instagram"}
            </button>
            {data.connected && (
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => void perform("verify")}
              >
                Verify connection
              </button>
            )}
            {data.status !== "disconnected" && (
              <button
                type="button"
                className={button}
                disabled={busy}
                onClick={() => void perform("disconnect")}
              >
                Disconnect
              </button>
            )}
          </div>
        </>
      )}
      {selection && (
        <fieldset className="space-y-2">
          <legend className="font-semibold mb-2">Choose the account for this client</legend>
          {selection.accounts.map((a) => (
            <button
              type="button"
              key={a.id}
              disabled={busy}
              className={`${button} block w-full text-left`}
              onClick={() => void perform("connect", a.id)}
            >
              @{a.username} · {a.page_name}
            </button>
          ))}
        </fieldset>
      )}
      <p className="text-xs text-[#97A0B3]">
        You can revoke access here or in Facebook Business Integrations. Only you control
        authorization. Stories require an eligible Business account.
      </p>
    </section>
  );
}
