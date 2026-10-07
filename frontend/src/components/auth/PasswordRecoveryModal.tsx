import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth-context";

export function PasswordRecoveryModal({
	initialEmail,
	onClose,
}: { initialEmail: string; onClose: () => void }) {
	const { forgotPassword, verifyResetOtp } = useAuth();
	const [email, setEmail] = useState(initialEmail);
	const [sentEmail, setSentEmail] = useState("");
	const [code, setCode] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [cooldown, setCooldown] = useState(0);
	useEffect(() => {
		if (!cooldown) return;
		const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [cooldown]);
	async function send() {
		setBusy(true);
		setError("");
		try {
			const target = (sentEmail || email).trim();
			await forgotPassword(target);
			setSentEmail(target);
			setCode("");
			setCooldown(60);
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: "Could not send code. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	}
	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (!sentEmail) {
			await send();
			return;
		}
		setBusy(true);
		setError("");
		try {
			await verifyResetOtp(sentEmail, code);
		} catch (e) {
			setError(
				e instanceof Error
					? e.message
					: "Could not verify code. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	}
	const field =
		"w-full bg-[#0A0F18] border border-[#222F44] rounded-xl px-3 py-3 text-sm text-white";
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby="recovery-title"
				className="w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto bg-[#121926] border border-[#222F44] rounded-2xl p-6 text-white space-y-4"
			>
				<h2 id="recovery-title" className="text-lg font-bold">
					Reset or set your password
				</h2>
				<p className="text-sm text-[#97A0B3]">
					{sentEmail
						? `Enter the six-digit code sent to ${sentEmail}. It expires in 10 minutes. Check spam if needed.`
						: "Enter your account email. If you joined with Google, use that same email to set a Creo password. You can still sign in with Google."}
				</p>
				{error && (
					<p role="alert" className="text-sm text-red-300">
						{error}
					</p>
				)}
				<form onSubmit={submit} className="space-y-4">
					{!sentEmail ? (
						<>
							<label htmlFor="recovery-email">Account email</label>
							<input
								id="recovery-email"
								type="email"
								autoComplete="email"
								autoFocus
								required
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								className={field}
							/>
						</>
					) : (
						<>
							<label htmlFor="recovery-code">Verification code</label>
							<input
								id="recovery-code"
								type="text"
								inputMode="numeric"
								autoComplete="one-time-code"
								autoFocus
								required
								pattern="[0-9]{6}"
								maxLength={6}
								value={code}
								onChange={(e) =>
									setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
								}
								className={field}
							/>
						</>
					)}
					<button
						disabled={busy}
						className="w-full py-3 rounded-xl bg-[#BCCCE6] text-[#0B111C] font-bold disabled:opacity-50"
					>
						{busy
							? "Please wait..."
							: sentEmail
								? "Verify code"
								: "Send verification code"}
					</button>
				</form>
				{sentEmail && (
					<div className="flex flex-wrap gap-4 text-sm">
						<button disabled={busy || cooldown > 0} onClick={() => void send()}>
							{cooldown ? `Resend in ${cooldown}s` : "Resend code"}
						</button>
						<button
							disabled={busy}
							onClick={() => {
								setSentEmail("");
								setCode("");
								setError("");
							}}
						>
							Change email
						</button>
					</div>
				)}
				<button
					disabled={busy}
					onClick={onClose}
					className="text-sm text-[#97A0B3]"
				>
					Cancel
				</button>
			</section>
		</div>
	);
}
