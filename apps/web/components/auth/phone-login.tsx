"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Phone } from "lucide-react";
import { getApiUrl } from "@/lib/api-url";

export function PhoneLogin() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cooldown > 0) return;

    setLoading(true);
    setError(null);

    let formattedPhone = phone.trim();
    if (!formattedPhone) {
      setError("Please enter a valid phone number.");
      setLoading(false);
      return;
    }
    if (!formattedPhone.startsWith("+")) {
      // Default to India country code if not provided
      formattedPhone = `+91${formattedPhone}`;
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setMode("otp");
      setCooldown(60);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Failed to send verification code. Please try again.");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let formattedPhone = phone.trim();
    if (!formattedPhone.startsWith("+")) {
      formattedPhone = `+91${formattedPhone}`;
    }

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: otp,
        type: "sms",
      });

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // Role detection and routing
      let role: string | null = null;
      const accessToken = data.session?.access_token;
      if (accessToken) {
        try {
          const apiUrl = getApiUrl();
          const res = await fetch(`${apiUrl}/api/v1/auth/me/role`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (res.ok) {
            const roleData = await res.json();
            role = roleData.role;
          }
        } catch {
          // Fallback
        }
      }
      role = role || (data.user?.user_metadata?.role as string) || "client";

      // Redirect based on role logic
      const ROLE_HOMES: Record<string, string> = {
        client: "/portal",
        team_member: "/dashboard",
        team_lead: "/dashboard",
        sales: "/sales",
        admin: "/admin",
        super_admin: "/admin",
        investor_relations: "/admin/reports",
      };

      const targetPath = ROLE_HOMES[role] ?? "/portal";
      router.push(targetPath);
      router.refresh();
    } catch (err: any) {
      setError("A network error occurred. Please try again.");
      setLoading(false);
    }
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, "");
    if (value.length <= 6) {
      setOtp(value);
    }
  };

  if (mode === "phone") {
    return (
      <form onSubmit={handleSendOtp} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium text-text">
            Phone Number
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="e.g. 9876543210"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="border-border focus:border-brand focus:ring-brand"
          />
        </div>

        {error && (
          <div className="text-sm text-error bg-error-light p-3 rounded-md">
            {error}
          </div>
        )}

        <Button
          type="submit"
          className="w-full bg-brand hover:bg-brand/90 text-white"
          disabled={loading || cooldown > 0}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending OTP...
            </>
          ) : cooldown > 0 ? (
            `Wait ${cooldown}s`
          ) : (
            <>
              <Phone className="mr-2 h-4 w-4" />
              Continue with Phone
            </>
          )}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleVerifyOtp} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="otp" className="text-sm font-medium text-text">
          Enter Verification Code
        </label>
        <p className="text-xs text-text-muted mb-2">
          Sent to {phone.startsWith("+") ? phone : `+91 ${phone}`}
        </p>
        <Input
          id="otp"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="123456"
          value={otp}
          onChange={handleOtpChange}
          required
          maxLength={6}
          className="border-border focus:border-brand focus:ring-brand tracking-widest text-center text-lg font-medium"
        />
      </div>

      {error && (
        <div className="text-sm text-error bg-error-light p-3 rounded-md">
          {error}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full border-border"
          onClick={() => {
            setMode("phone");
            setError(null);
            setOtp("");
          }}
          disabled={loading}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="w-full bg-brand hover:bg-brand/90 text-white"
          disabled={loading || otp.length !== 6}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify OTP"
          )}
        </Button>
      </div>

      <div className="text-center mt-2">
        <button
          type="button"
          onClick={() => handleSendOtp()}
          disabled={loading || cooldown > 0}
          className="text-xs text-brand hover:underline disabled:text-text-muted disabled:no-underline"
        >
          {cooldown > 0 ? `Resend available in ${cooldown}s` : "Didn't receive code? Resend"}
        </button>
      </div>
    </form>
  );
}
