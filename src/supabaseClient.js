import { createClient } from "@supabase/supabase-js";

// 1. Paste your Supabase Project URL inside the quotes below
//    (Example: "https://udymulruitfntqeemszg.supabase.co")
const SUPABASE_URL = "https://udymulruitfntqeemszg.supabase.co/rest/v1/";

// 2. Paste your Supabase Public / Publishable Key inside the quotes below
const SUPABASE_PUBLIC_KEY = "sb_publishable_FjYqO_lq4kglH07GuqDUTA_YJLJHJQK";

// Strip trailing "/rest/v1/" if present so Supabase Auth endpoints resolve properly
const normalizedUrl = SUPABASE_URL.replace(/\/rest\/v1\/?$/, "");

// Export a single Supabase client for the entire project
export const supabase = createClient(normalizedUrl, SUPABASE_PUBLIC_KEY);
