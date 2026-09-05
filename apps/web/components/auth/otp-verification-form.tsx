"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react"
import { toast } from "sonner"

interface OtpVerificationFormProps {
  email: string
  fullName: string
  onGoBack: () => void
  onSuccess?: () => void
}

export function OtpVerificationForm({
  email,
  fullName,
  onGoBack,
  onSuccess,
}: OtpVerificationFormProps) {
  const router = useRouter()
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [activeIdx, setActiveIdx] = useState<number>(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [countdown, setCountdown] = useState(30)
  const [isResending, setIsResending] = useState(false)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Resend countdown timer
  useEffect(() => {
    if (countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [countdown])

  // Focus the first cell on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const isComplete = digits.every((d) => d.trim().length === 1)
  const otpCode = digits.join("")

  const handleChange = (index: number, val: string) => {
    setError(null)
    const char = val.replace(/\D/g, "").slice(-1)

    const nextDigits = [...digits]
    nextDigits[index] = char
    setDigits(nextDigits)

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus()
      setActiveIdx(index + 1)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus()
        setActiveIdx(index - 1)
        const nextDigits = [...digits]
        nextDigits[index - 1] = ""
        setDigits(nextDigits)
      } else {
        const nextDigits = [...digits]
        nextDigits[index] = ""
        setDigits(nextDigits)
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus()
      setActiveIdx(index - 1)
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus()
      setActiveIdx(index + 1)
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    setError(null)
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasteData) return

    const nextDigits = [...digits]
    for (let i = 0; i < pasteData.length; i++) {
      nextDigits[i] = pasteData[i]
    }
    setDigits(nextDigits)

    const targetIdx = Math.min(pasteData.length, 5)
    inputRefs.current[targetIdx]?.focus()
    setActiveIdx(targetIdx)
  }

  const handleResend = useCallback(async () => {
    if (countdown > 0 || isResending) return
    setIsResending(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error: resendErr } = await supabase.auth.signInWithOtp({
        email,
        options: {
          data: { full_name: fullName, role: "client" },
        },
      })

      if (resendErr) {
        toast.error(resendErr.message || "Failed to resend code")
      } else {
        toast.success("A new 6-digit code has been sent to your email!")
        setCountdown(30)
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setIsResending(false)
    }
  }, [countdown, email, fullName, isResending])

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!isComplete || loading) return

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Attempt verification with type "email" (standard for email OTP)
      let { data, error: verifyErr } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      })

      // Fallback to "signup" type if "email" type fails
      if (verifyErr) {
        const fallback = await supabase.auth.verifyOtp({
          email,
          token: otpCode,
          type: "signup",
        })
        if (!fallback.error) {
          data = fallback.data
          verifyErr = null
        }
      }

      if (verifyErr) {
        setError(verifyErr.message || "Invalid verification code. Please check and try again.")
        setLoading(false)
        return
      }

      const authId = data?.user?.id || (await supabase.auth.getUser()).data.user?.id

      if (authId) {
        // Register in PostgreSQL backend
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              auth_id: authId,
              email,
              phone: null,
              full_name: fullName || "User",
              business_name: null,
            }),
          })
        } catch {
          // Continue if registration already succeeded or silently handled
        }
      }

      toast.success("Email verified successfully!")
      if (onSuccess) {
        onSuccess()
      } else {
        router.push("/signup/plan")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Verification failed. Please try again.")
      setLoading(false)
    }
  }

  const formatCountdown = (secs: number) => {
    const s = secs < 10 ? `0${secs}` : `${secs}`
    return `00:${s}`
  }

  return (
    <div className="w-full">
      <div className="mb-6 text-center lg:text-left">
        <h2 className="text-2xl font-bold tracking-tight text-[#0D2137] sm:text-3xl">
          Verify your email
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          We&apos;ve sent a 6-digit code to{" "}
          <span className="font-semibold text-[#0D2137]">{email}</span>.
        </p>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50/80 p-3.5 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-6">
        {/* 6-digit OTP boxed cells */}
        <div className="flex items-center justify-between gap-2 sm:gap-3">
          {digits.map((digit, idx) => {
            const isFocused = activeIdx === idx
            return (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                onFocus={() => setActiveIdx(idx)}
                className={`h-13 w-11 sm:h-14 sm:w-14 text-center text-xl font-bold rounded-xl border transition-all duration-200 outline-none select-none ${
                  isFocused
                    ? "border-[#2B7BC4] ring-3 ring-[#2B7BC4]/20 bg-white shadow-sm"
                    : digit
                    ? "border-slate-300 bg-slate-50 text-[#0D2137]"
                    : "border-slate-200 bg-white text-slate-900 hover:border-slate-300"
                }`}
              />
            )
          })}
        </div>

        {/* Resend Code with Countdown */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Didn&apos;t receive code?</span>
          {countdown > 0 ? (
            <span className="font-mono text-xs font-medium text-[#2B7BC4] bg-[#E8F4FD] px-2.5 py-1 rounded-full border border-[#2B7BC4]/20">
              Resend in {formatCountdown(countdown)}
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-sm font-semibold text-[#2B7BC4] hover:text-[#0D2137] hover:underline cursor-pointer transition-colors"
            >
              {isResending ? "Sending..." : "Resend code"}
            </button>
          )}
        </div>

        {/* Verify & Continue Button */}
        <Button
          type="submit"
          disabled={!isComplete || loading}
          className={`h-12 w-full rounded-xl text-base font-semibold shadow-md transition-all duration-200 ${
            isComplete && !loading
              ? "bg-[#2B7BC4] text-white hover:bg-[#2264a2] shadow-[#2B7BC4]/25 active:scale-[0.99] cursor-pointer"
              : "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
          }`}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-5 animate-spin text-white" />
              Verifying...
            </>
          ) : (
            "Verify & Continue"
          )}
        </Button>
      </form>

      {/* Footer link: Wrong email? Go back */}
      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onGoBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-[#0D2137] transition-colors cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          Wrong email? Go back
        </button>
      </div>
    </div>
  )
}
