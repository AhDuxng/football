import { createClient } from "@supabase/supabase-js";

import { env } from "./env.js";

const baseClientOptions = {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      "x-application-name": "football-team-management-backend",
    },
  },
};

export const supabase = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  baseClientOptions
);

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  baseClientOptions
);