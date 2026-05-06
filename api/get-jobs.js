import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  const { what, where } = req.query;

  // Start with a clean query
  let query = supabase
    .from('jobs')
    .select('*')
    .order('posted_at', { ascending: false });

  // ONLY add filters if the user actually typed something
  if (what && what.trim() !== "") {
    query = query.ilike('title', `%${what}%`);
  }
  
  if (where && where.trim() !== "") {
    query = query.ilike('location', `%${where}%`);
  }

  const { data, error } = await query.limit(40);

  if (error) {
    console.error("Supabase Error:", error);
    return res.status(500).json({ error: error.message });
  }
  
  // LOG the result so you can see it in Vercel logs
  console.log(`Found ${data ? data.length : 0} jobs in Supabase`);

  res.status(200).json({ results: data || [] });
}