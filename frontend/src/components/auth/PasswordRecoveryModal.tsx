import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "../../lib/auth-context";
import { AuthField, EYEBROW, FIELD_INPUT, SubmitPill, TEXT_ACTION } from "./AuthPieces";

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


	const passwordToggle = (
		<button
			type="button"
			onClick={() => setShowPassword(!showPassword)}
			className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-site-mist transition-colors hover:text-site-ink"
			aria-label={showPassword ? "Hide password" : "Show password"}
		>
			{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
		</button>
	);

	// Rendered inside the auth page's .public-site root so the site palette applies
	return createPortal(
		<div className="fixed inset-0 z-[1000] grid min-h-dvh place-items-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-6">
			<dialog
				open
				aria-modal="true"
				aria-labelledby="recovery-title"
				className="st-base static m-0 max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-[2rem] border border-hi/10 bg-site-bg p-7 text-site-ink shadow-[0_30px_80px_-30px_rgb(0_0_0/0.8)] sm:p-9"
			>
				<div className="flex items-start justify-between gap-4">
					<p className={EYEBROW}>
						{step === "done" ? "All set" : step === "email" ? "Step 1 of 3" : step === "code" ? "Step 2 of 3" : "Step 3 of 3"}
					</p>
					{step !== "done" && (
						<button
							type="button"
							disabled={busy}
							onClick={onClose}
							aria-label="Close"
							className="-mr-2 -mt-2 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-site-mist transition-colors hover:text-site-ink disabled:opacity-50"
						>
							<X className="size-5" />
						</button>
					)}
				</div>
				<h2 id="recovery-title" className="mt-3 text-3xl font-medium leading-tight tracking-[-0.04em] text-site-ink">
					{title}
				</h2>
				<p className="mt-3 text-base leading-relaxed text-site-mist">{description}</p>
				{error && (
					<p role="alert" className="mt-6 rounded-2xl border border-site-rose/40 bg-site-rose/10 px-4 py-3 text-sm font-medium text-site-ink">
						{error}
					</p>
				)}
				{step === "done" ? (
					<div className="mt-8">
						<SubmitPill type="button" onClick={onClose}>
							Done
						</SubmitPill>
					</div>
				) : (
					<form onSubmit={submit} className="mt-8 space-y-7">
						{step === "email" && (
							<AuthField id="recovery-email" label="Account email">
								<input
									id="recovery-email"
									type="email"
									autoComplete="email"
									autoFocus
									required
									placeholder="name@brand.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									className={FIELD_INPUT}
								/>
							</AuthField>
						)}
						{step === "code" && (
							<AuthField id="recovery-code" label="Verification code">
								<input
									id="recovery-code"
									type="text"
									inputMode="numeric"
									autoComplete="one-time-code"
									autoFocus
									required
									pattern="[0-9]{6}"
									maxLength={6}
									placeholder="000000"
									value={code}
									onChange={(e) =>
										setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
									}
									className={`${FIELD_INPUT} text-center font-mono text-3xl! tracking-[0.45em]`}
								/>
							</AuthField>
						)}
						{step === "password" && (
							<>
								{/* Lets password managers save the credential against the right account */}
								<input type="email" autoComplete="username" value={sentEmail} readOnly hidden />
								<AuthField id="recovery-new-password" label="New password">
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
										className={FIELD_INPUT}
									/>
									{passwordToggle}
								</AuthField>
								<AuthField id="recovery-confirm-password" label="Confirm password">
									<input
										id="recovery-confirm-password"
										type={showPassword ? "text" : "password"}
										autoComplete="new-password"
										required
										minLength={8}
										maxLength={128}
										value={confirmPassword}
										onChange={(e) => setConfirmPassword(e.target.value)}
										className={FIELD_INPUT}
									/>
								</AuthField>
							</>
						)}
						<SubmitPill loading={busy}>
							{busy
								? "Please wait..."
								: step === "email"
									? "Send verification code"
									: step === "code"
										? "Verify code"
										: hasPassword
											? "Save new password"
											: "Save password & sign in"}
						</SubmitPill>
					</form>
				)}
				{step === "code" && (
					<div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
						<button type="button" disabled={busy} onClick={startOver} className="cursor-pointer font-semibold text-site-mist transition-colors hover:text-site-ink disabled:opacity-50">
							Change email
						</button>
						<button
							type="button"
							disabled={busy || cooldown > 0}
							onClick={() => void send()}
							className={TEXT_ACTION}
						>
							{cooldown ? `Resend in ${cooldown}s` : "Resend code"}
						</button>
					</div>
				)}
				{step === "password" && (
					<div className="mt-6 text-sm">
						<button type="button" disabled={busy} onClick={startOver} className="cursor-pointer font-semibold text-site-mist transition-colors hover:text-site-ink disabled:opacity-50">
							Start over
						</button>
					</div>
				)}
			</dialog>
		</div>,
		document.querySelector(".public-site") ?? document.body,
	);
}
