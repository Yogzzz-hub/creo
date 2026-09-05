// Global environment variable type declarations for Next.js
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_PUBLIC_API_URL?: string;
    readonly BACKEND_API_URL?: string;
    readonly NEXT_PUBLIC_SUPABASE_URL?: string;
    readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    readonly NEXT_PUBLIC_APP_URL?: string;
    readonly NEXT_PUBLIC_INSTAGRAM_APP_ID?: string;
    readonly NODE_ENV?: "development" | "production" | "test";
    [key: string]: string | undefined;
  }
}
