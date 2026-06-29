import { createClient } from '@supabase/supabase-js'
import { runSync } from './_sync-helper.js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

export default async function handler(req, res) {
  try {
    const { what } = req.query;
    console.log("Searching for:", what);

    // 1. Check if we need to run on-demand sync (limit to at most once every 20 minutes)
    try {
      const { data: syncMarker } = await supabase
        .from('jobs')
        .select('posted_at')
        .eq('job_id', 'sync_marker')
        .maybeSingle();

      const now = new Date();
      let shouldSync = false;

      if (!syncMarker) {
        shouldSync = true;
      } else {
        const lastSyncTime = new Date(syncMarker.posted_at);
        const diffMinutes = (now - lastSyncTime) / (1000 * 60);
        if (diffMinutes >= 20) {
          shouldSync = true;
        }
      }

      if (shouldSync) {
        console.log("[GetJobs] Triggering on-demand sync...");
        await runSync();
      }
    } catch (syncErr) {
      console.error("[GetJobs] On-demand sync error (serving existing data):", syncErr);
    }

    // 2. Fetch jobs from Supabase
    let request = supabase.from('jobs').select('*');

    // Filter out the sync marker row
    request = request.neq('job_id', 'sync_marker');

    // Filter by location (Mumbai and Pune regions only)
    request = request.or('location.ilike.%mumbai%,location.ilike.%pune%');

    if (what && what.trim() !== "") {
       request = request.ilike('title', `%${what.trim()}%`);
    }

    // Increase amount of jobs displayed to 100
    const { data, error } = await request.limit(100).order('posted_at', { ascending: false });

    if (error) {
      console.error("Supabase API Error:", error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ results: data || [] });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}