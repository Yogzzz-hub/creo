"use client"

import { Suspense } from "react"
import { AuthSplitLayout } from "@/components/auth/auth-split-layout"
import { Loader2 } from "lucide-react"

function SignupFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <Loader2 className="size-8 animate-spin text-[#2B7BC4]" />
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <AuthSplitLayout initialView="signup" />
    </Suspense>
  )
}
