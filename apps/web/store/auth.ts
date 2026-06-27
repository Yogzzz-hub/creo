"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { create } from "zustand";

interface User {
  id: string;
  email: string;
  role: string;
  full_name: string;
  business_name?: string;
  account_status: string;
  avatar_url?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    set({ user: null });
    window.location.href = "/login";
  },
}));

export function useAuthListener() {
  const supabase = createClient();
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const { user } = session;
          setUser({
            id: user.id,
            email: user.email ?? "",
            role: user.user_metadata?.role ?? "client",
            full_name: user.user_metadata?.full_name ?? "",
            business_name: user.user_metadata?.business_name ?? undefined,
            account_status: user.user_metadata?.account_status ?? "pending_verification",
            avatar_url: user.user_metadata?.avatar_url ?? undefined,
          });
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [supabase, setUser, setLoading]);
}
