import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Deliberately nullable so the visual prototype remains runnable before a
 * household's Supabase project has been configured.
 */
export const supabase = url && publishableKey
  ? createClient(url, publishableKey)
  : null;
