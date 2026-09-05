// Global environment variable type declarations for Next.js
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_API_URL?: string;
    BACKEND_API_URL?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    NEXT_PUBLIC_APP_URL?: string;
    NEXT_PUBLIC_INSTAGRAM_APP_ID?: string;
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
    NEXT_PUBLIC_RAZORPAY_KEY_ID?: string;
    NODE_ENV?: "development" | "production" | "test";
    [key: string]: string | undefined;
  }
}
