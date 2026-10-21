import { useState, type FormEvent } from "react";
import { useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { apiUrl, request } from "../../lib/http";
import type { CRMProposal } from "../../lib/revenue-crm";
import { ProposalPreview } from "./RevenueCRMPage";

export function SharedProposalPage() {
	const { token } = useParams();
	const query = useQuery({
		queryKey: ["shared-crm-proposal", token],
		queryFn: () =>
			request<CRMProposal>(`/api/v1/public/crm/proposals/${token}`),
		retry: false,
	});
	const [name, setName] = useState("");
	const [note, setNote] = useState("");
	const [decision, setDecision] = useState("accepted");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	async function submit(e: FormEvent) {
		e.preventDefault();
		setBusy(true);
		setError("");
		try {
			await request(`/api/v1/public/crm/proposals/${token}/decision`, {
				method: "POST",
				body: JSON.stringify({ name, note, decision }),
			});
			await query.refetch();
		} catch (e) {
			setError(
				e instanceof Error ? e.message : "Unable to record your decision.",
			);
		} finally {
			setBusy(false);
		}
	}
	return (
		<main className="min-h-screen bg-app-base px-4 py-8 text-hi">
			<div className="mx-auto max-w-4xl space-y-6">
				<p className="text-xs font-bold uppercase tracking-widest text-[#8FAEDC]">
					Creo · Secure proposal review
				</p>
				{query.isPending && <p role="status">Loading your proposal...</p>}
				{query.isError && (
					<p
						role="alert"
						className="rounded-xl border border-rose-400/30 p-5 text-rose-200"
					>
						This proposal link is unavailable, expired or revoked. Contact the
						agency for a current version.
					</p>
				)}
				{query.data && (
					<>
						<ProposalPreview proposal={query.data} />
						<a
							href={apiUrl(`/api/v1/public/crm/proposals/${token}/pdf`)}
							className="inline-flex min-h-11 items-center rounded-xl border border-[#34435C] px-5 text-sm font-semibold"
							download
						>
							Download issued PDF
						</a>
						{["sent", "viewed"].includes(query.data.status) ? (
							<form
								onSubmit={submit}
								className="space-y-4 rounded-2xl border border-app-line bg-[#131C2A] p-5"
							>
								<h1 className="text-lg font-semibold">
									Your decision on version {query.data.version}
								</h1>
								<p className="text-sm text-[#96A5BB]">
									Review the scope and terms above. Your response applies only
									to this proposal version.
								</p>
								{error && (
									<p role="alert" className="text-rose-300">
										{error}
									</p>
								)}
								<label className="block space-y-2 text-sm">
									Your full name
									<input
										required
										minLength={2}
										maxLength={255}
										className="min-h-11 w-full rounded-xl border border-[#34435C] bg-app-base p-3"
										value={name}
										onChange={(e) => setName(e.target.value)}
									/>
								</label>
								<label className="block space-y-2 text-sm">
									Decision
									<select
										className="min-h-11 w-full rounded-xl border border-[#34435C] bg-app-base p-3"
										value={decision}
										onChange={(e) => setDecision(e.target.value)}
									>
										<option value="accepted">Accept this version</option>
										<option value="revision_requested">
											Request a revision
										</option>
										<option value="declined">Decline</option>
									</select>
								</label>
								<label className="block space-y-2 text-sm">
									Comments
									<textarea
										maxLength={5000}
										className="w-full rounded-xl border border-[#34435C] bg-app-base p-3"
										rows={3}
										value={note}
										onChange={(e) => setNote(e.target.value)}
									/>
								</label>
								<button
									disabled={busy}
									className="min-h-11 rounded-xl bg-app-accent-soft px-5 font-semibold text-app-base disabled:opacity-50"
								>
									{busy ? "Recording..." : "Confirm decision"}
								</button>
							</form>
						) : (
							<p
								role="status"
								className="rounded-xl border border-app-line p-5"
							>
								Your proposal status: {query.data.status.replaceAll("_", " ")}.
								Contact the agency for changes.
							</p>
						)}
					</>
				)}
			</div>
		</main>
	);
}
