import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://flanejpbaedltatetqhg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EvqENyvwfp1BgH1p0s1EdQ_NkE8N73a';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  console.log("Checking Supabase Connection...");
  // Try to fetch app_meta
  let { data, error } = await supabase.from('app_meta').select('*');
  console.log("app_meta:", data, "error:", error);

  // Try to fetch users
  let res = await supabase.from('users').select('*').limit(1);
  console.log("users:", res.data, "error:", res.error);

  // Try to fetch categories
  let res2 = await supabase.from('categories').select('*').limit(1);
  console.log("categories:", res2.data, "error:", res2.error);
}

check();
