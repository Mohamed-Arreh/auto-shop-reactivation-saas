import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// SERVER-ONLY: this client uses the service role key and bypasses Row Level
// Security entirely. Never import it into a Client Component or any module
// that could end up in the browser bundle — it must stay on the server.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
