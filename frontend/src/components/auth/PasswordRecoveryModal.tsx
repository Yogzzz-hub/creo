import { useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

/**
 * Direct password reset without email verification codes:
 * Account email + new password + confirm password -> directly saved.
 */
export function PasswordRecoveryModal({
	initialEmail,
	onClose,
}: { initialEmail: string; onClose: () => void }) {
	const { directResetPassword } = useAuth();
	const [email, setEmail] = useState(initialEmail);
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [done, setDone] = useState(false);

	const field =
		"w-full bg-[#0A0F18] border border-[#222F44] rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-[#7FA0D6]";
	const label = "block text-[11px] font-bold uppercase tracking-wider text-[#97A0B3] mb-1.5";
	const secondaryButton =
		"inline-flex min-h-10 items-center justify-center rounded-xl border border-[#2A3446] bg-[#0A0F18] px-3.5 py-2 text-sm font-semibold text-[#BCCCE6] transition-colors hover:border-[#7FA0D6]/60 hover:bg-[#1A2433] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FA0D6] disabled:cursor-not-allowed disabled:opacity-45";

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		setError("");

		const targetEmail = email.trim();
		if (!targetEmail) {
			setError("Please enter your account email.");
			return;
		}

		const candidate = newPassword.trim();
		if (candidate.length < 8 || candidate.length > 128 || !/[a-zA-Z]/.test(candidate) || !/[0-9]/.test(candidate)) {
			setError("Use 8–128 characters, including at least one letter and one number.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match. Please re-enter.");
			return;
		}

		setBusy(true);
		try {
			await directResetPassword(targetEmail, candidate);
			setDone(true);
		} catch (err: any) {
			setError(err instanceof Error ? err.message : "Failed to reset password. Please try again.");
		} finally {
			setBusy(false);
		}
	}

	return createPortal(
		<div className="fixed inset-0 z-[1000] grid min-h-dvh place-items-center overflow-y-auto p-4 sm:p-6 bg-[#0B111C]/80 backdrop-blur-md">
			<dialog
				open
				aria-modal="true"
				aria-labelledby="recovery-title"
				className="static m-0 w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto bg-[#121926] border border-[#222F44] rounded-2xl p-6 text-white space-y-4"
			>
				{done ? (
					<div className="space-y-4 text-center py-2">
						<div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 mx-auto flex items-center justify-center">
							<CheckCircle2 className="w-7 h-7" />
						</div>
						<h2 id="recovery-title" className="text-lg font-bold text-white">
							Password Saved!
						</h2>
						<p className="text-sm text-[#97A0B3]">
							Your password for <strong className="text-white">{email}</strong> has been updated directly. You can now use your new password.
						</p>
						<button
							type="button"
							onClick={onClose}
							className="w-full py-3 rounded-xl bg-[#BCCCE6] text-[#0B111C] font-bold cursor-pointer hover:bg-white transition-all shadow-md"
						>
							Done
						</button>
					</div>
				) : (
					<>
						<div>
							<h2 id="recovery-title" className="text-lg font-bold">
								Reset or set your password
							</h2>
							<p className="text-xs text-[#97A0B3] mt-1">
								Enter your account email and choose your new password. You can reset directly without email verification codes.
							</p>
						</div>

						{error && (
							<p role="alert" className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-xl">
								{error}
							</p>
						)}

						<form onSubmit={handleSubmit} className="space-y-4">
							<div>
								<label htmlFor="recovery-email" className={label}>
									Account email
								</label>
								<input
									id="recovery-email"
									type="email"
									autoComplete="email"
									required
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className={field}
								/>
							</div>

							<div>
								<label htmlFor="recovery-new-password" className={label}>
									New password
								</label>
								<div className="relative">
									<input
										id="recovery-new-password"
										type={showPassword ? "text" : "password"}
										autoComplete="new-password"
										autoFocus
										required
										minLength={8}
										maxLength={128}
										placeholder="8+ characters, letters & numbers"
										value={newPassword}
										onChange={(e) => setNewPassword(e.target.value)}
										className={`${field} pr-10`}
									/>
									<button
										type="button"
										onClick={() => setShowPassword(!showPassword)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-[#97A0B3] hover:text-white cursor-pointer"
										aria-label={showPassword ? "Hide password" : "Show password"}
									>
										{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
									</button>
								</div>
							</div>

							<div>
								<label htmlFor="recovery-confirm-password" className={label}>
									Confirm password
								</label>
								<input
									id="recovery-confirm-password"
									type={showPassword ? "text" : "password"}
									autoComplete="new-password"
									required
									minLength={8}
									maxLength={128}
									placeholder="Re-enter your new password"
									value={confirmPassword}
									onChange={(e) => setConfirmPassword(e.target.value)}
									className={field}
								/>
							</div>

							<button
								disabled={busy}
								type="submit"
								className="w-full py-3 rounded-xl bg-[#BCCCE6] text-[#0B111C] font-bold disabled:opacity-50 cursor-pointer hover:bg-white transition-all shadow-md"
							>
								{busy ? "Updating password..." : "Set New Password"}
							</button>

							<button
								type="button"
								disabled={busy}
								onClick={onClose}
								className={`w-full ${secondaryButton} cursor-pointer`}
							>
								Cancel
							</button>
						</form>
					</>
				)}
			</dialog>
		</div>,
		document.body,
	);
}
