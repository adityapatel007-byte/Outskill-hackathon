import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // Only throws when a live (non-mock) call actually needs the client, so the
  // mock-mode dev flow (no .env set up yet) still works untouched.
  console.warn(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are not set — live Supabase calls will fail. " +
      "See ui/.env.example."
  );
}

export const supabase = createClient(supabaseUrl ?? "", supabaseAnonKey ?? "");
