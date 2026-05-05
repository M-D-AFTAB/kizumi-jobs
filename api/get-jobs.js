import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  const { what, where } = req.query;

  let query = supabase
    .from('jobs')
    .select('*')
    .order('posted_at', { ascending: false });

  // Add search filters if provided
  if (what) {
      query = query.ilike('title', `%${what}%`);
  }
  if (where) {
      query = query.ilike('location', `%${where}%`);
  }

  const { data, error } = await query.limit(20);

  if (error) return res.status(500).json({ error: error.message });
  
  res.status(200).json({ results: data });
}