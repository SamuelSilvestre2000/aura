import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://flanejpbaedltatetqhg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_EvqENyvwfp1BgH1p0s1EdQ_NkE8N73a';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
  let { data, error } = await supabase.from('non_existent_table').select('*');
  console.log("non_existent_table:", data, "error:", error);
}

check();
