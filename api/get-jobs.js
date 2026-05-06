import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  try {
    // 1. Log what we are looking for
    const { what } = req.query;
    console.log("Searching for:", what);

    // 2. Simple query: No filters, no complex sorting yet
    // We use .from('jobs') - make sure this matches your table name exactly
    let request = supabase.from('jobs').select('*');

    // Only filter if 'what' exists
    if (what && what.trim() !== "") {
       request = request.ilike('title', `%${what.trim()}%`);
    }

    const { data, error } = await request.limit(20);

    if (error) {
      console.error("Supabase API Error:", error);
      return res.status(500).json({ error: error.message });
    }

    console.log("Raw Data Length:", data ? data.length : 0);
    return res.status(200).json({ results: data || [] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}