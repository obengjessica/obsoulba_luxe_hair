import { createClient } from "@supabase/supabase-js";

const projectUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const publicKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

export const supabase = projectUrl && publicKey
  ? createClient(projectUrl, publicKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;
