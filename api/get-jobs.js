import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  try {
    const { what } = req.query;
    console.log("Searching for:", what);

    let request = supabase.from('jobs').select('*');

    if (what && what.trim() !== "") {
       request = request.ilike('title', `%${what.trim()}%`);
    }

    const { data, error } = await request.limit(40).order('posted_at', { ascending: false });

    if (error) {
      console.error("Supabase API Error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ results: data || [] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}