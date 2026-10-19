import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../lib/auth-context";

type Step = "email" | "code" | "password" | "done";

/**
 * One flow for "forgot password" and "add a password to my Google account":
 * email -> verification code -> new password. Saving the password signs the
 * user in; the account keeps its Google sign-in as well.
 */
export function PasswordRecoveryModal({
	initialEmail,
	onClose,
}: { initialEmail: string; onClose: () => void }) {
	const { forgotPassword, verifyResetOtp, resetPassword } = useAuth();
	const [step, setStep] = useState<Step>("email");
	const [email, setEmail] = useState(initialEmail);
	const [sentEmail, setSentEmail] = useState("");
	const [code, setCode] = useState("");
	const [resetToken, setResetToken] = useState("");
	const [methods, setMethods] = useState<string[]>([]);
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [showPassword, setShowPassword] = useState(false);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const [cooldown, setCooldown] = useState(0);
	useEffect(() => {
		if (!cooldown) return;
		const timer = window.setTimeout(() => setCooldown(cooldown - 1), 1000);
		return () => window.clearTimeout(timer);
	}, [cooldown]);

	const hasPassword = methods.includes("password");
	const hasGoogle = methods.includes("google");

	function startOver() {
		setStep("email");
		setSentEmail("");
		setCode("");
		setResetToken("");
		setNewPassword("");
		setConfirmPassword("");
		setError("");
	}

	async function run(action: () => Promise<void>, fallback: string) {
		setBusy(true);
		setError("");
		try {
			await action();
		} catch (e) {
			setError(e instanceof Error ? e.message : fallback);
		} finally {
			setBusy(false);
		}
	}

	const send = () =>
		run(async () => {
			const target = (sentEmail || email).trim();
			await forgotPassword(target);
			setSentEmail(target);
			setCode("");
			setCooldown(60);
			setStep("code");
		}, "Could not send code. Please try again.");

	const verify = () =>
		run(async () => {
			const res = await verifyResetOtp(sentEmail, code);
			setResetToken(res.reset_token);
			setMethods(res.sign_in_methods ?? []);
			setStep("password");
		}, "Could not verify code. Please try again.");

	const save = () => {
		const candidate = newPassword.trim();
		if (candidate.length < 8 || candidate.length > 128 || !/[a-zA-Z]/.test(candidate) || !/[0-9]/.test(candidate)) {
			setError("Use 8–128 characters, including a letter and a number.");
			return;
		}
		if (newPassword !== confirmPassword) {
			setError("Passwords do not match. Please re-enter.");
			return;
		}
		return run(async () => {
			await resetPassword(resetToken, newPassword);
			setStep("done");
		}, "Could not save your password. Please try again.");
	};

	async function submit(e: React.FormEvent) {
		e.preventDefault();
		if (step === "email") await send();
		else if (step === "code") await verify();
		else if (step === "password") await save();
	}

	const field =
		"w-full bg-app-nested border border-app-line-soft rounded-xl px-3 py-3 text-sm text-hi focus:outline-none focus:border-app-accent";
	const label = "block text-[11px] font-bold uppercase tracking-wider text-app-mist mb-1.5";
	const secondaryButton =
		"inline-flex min-h-10 items-center justify-center rounded-xl border border-app-line bg-app-nested px-3.5 py-2 text-sm font-semibold text-app-accent-soft transition-colors hover:border-app-accent/60 hover:bg-app-surface hover:text-hi focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent disabled:cursor-not-allowed disabled:opacity-45";

	const title =
		step === "password" && !hasPassword
			? "Create your CREO password"
			: step === "password"
				? "Choose a new password"
				: step === "done"
					? "Password saved"
					: "Reset or set your password";

	const description =
		step === "email"
			? "Enter your account email and we'll send a 6-digit code. Signed up with Google? Use that same email to add a password — Google sign-in keeps working."
			: step === "code"
				? `Enter the six-digit code sent to ${sentEmail}. It expires in 10 minutes. Check spam if needed.`
				: step === "password"
					? hasPassword
						? `Set a new password for ${sentEmail}. Other signed-in devices will be signed out.`
						: `Add a password to ${sentEmail} so you can sign in with email and password${hasGoogle ? " as well as Google" : ""}.`
					: `You can now sign in with your email and password${hasGoogle ? " or with Google" : ""}.`;

	return createPortal(
		<div className="fixed inset-0 z-[1000] grid min-h-dvh place-items-center overflow-y-auto p-4 sm:p-6 bg-app-base/80 backdrop-blur-md">
			<dialog
				open
				aria-modal="true"
				aria-labelledby="recovery-title"
				className="static m-0 w-full max-w-sm max-h-[calc(100dvh-2rem)] overflow-y-auto bg-app-bento border border-app-line-soft rounded-2xl p-6 text-hi space-y-4"
			>
				<h2 id="recovery-title" className="text-lg font-bold">
					{title}
				</h2>
				<p className="text-sm text-app-mist">{description}</p>
				{error && (
					<p role="alert" className="text-sm text-red-300">
						{error}
					</p>
				)}
				{step === "done" ? (
					<button
						type="button"
						onClick={onClose}
						className="w-full py-3 rounded-xl bg-app-accent-soft text-app-base font-bold"
					>
						Done
					</button>
				) : (
					<form onSubmit={submit} className="space-y-4">
						{step === "email" && (
							<div>
								<label htmlFor="recovery-email" className={label}>
									Account email
								</label>
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
							</div>
						)}
						{step === "code" && (
							<div>
								<label htmlFor="recovery-code" className={label}>
									Verification code
								</label>
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
									className={`${field} text-center font-mono tracking-[0.35em]`}
								/>
							</div>
						)}
						{step === "password" && (
							<>
								{/* Lets password managers save the credential against the right account */}
								<input type="email" autoComplete="username" value={sentEmail} readOnly hidden />
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
											placeholder="8+ characters, a letter and a number"
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
											className={`${field} pr-10`}
										/>
										<button
											type="button"
											onClick={() => setShowPassword(!showPassword)}
											className="absolute right-3 top-1/2 -translate-y-1/2 text-app-mist hover:text-hi"
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
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										className={field}
									/>
								</div>
							</>
						)}
						<button
							disabled={busy}
							className="w-full py-3 rounded-xl bg-app-accent-soft text-app-base font-bold disabled:opacity-50"
						>
							{busy
								? "Please wait..."
								: step === "email"
									? "Send verification code"
									: step === "code"
										? "Verify code"
										: hasPassword
											? "Save new password"
											: "Save password & sign in"}
						</button>
					</form>
				)}
				{step === "code" && (
					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							disabled={busy || cooldown > 0}
							onClick={() => void send()}
							className={secondaryButton}
						>
							{cooldown ? `Resend in ${cooldown}s` : "Resend code"}
						</button>
						<button type="button" disabled={busy} onClick={startOver} className={secondaryButton}>
							Change email
						</button>
					</div>
				)}
				{step === "password" && (
					<button type="button" disabled={busy} onClick={startOver} className={secondaryButton}>
						Start over
					</button>
				)}
				{step !== "done" && (
					<button
						type="button"
						disabled={busy}
						onClick={onClose}
						className={secondaryButton}
					>
						Cancel
					</button>
				)}
			</dialog>
		</div>,
		document.body,
	);
}
