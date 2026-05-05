import { createClient } from '@supabase/supabase-js'

// We use the SERVICE_ROLE_KEY here so we can write to the DB
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {

    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    // 1. Fetch from Adzuna
    const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=50&content-type=application/json`;

    try {
        const response = await fetch(adzunaUrl);
        const data = await response.json();
        const adzunaJobs = data.results;

        // 2. Prepare data for Supabase
        const jobsToUpload = adzunaJobs.map(job => ({
            job_id: job.id,
            title: job.title,
            company: job.company.display_name,
            location: job.location.display_name,
            salary_min: job.salary_min,
            salary_max: job.salary_max,
            redirect_url: job.redirect_url,
            category: job.category.label,
            posted_at: job.created
        }));

        // 3. "Upsert" into Supabase (Update if exists, Insert if new)
        const { error } = await supabase
            .from('jobs')
            .upsert(jobsToUpload, { onConflict: 'job_id' });

        if (error) throw error;

        // 4. Cleanup: Delete jobs older than 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        await supabase
            .from('jobs')
            .delete()
            .lt('posted_at', thirtyDaysAgo.toISOString());

        res.status(200).json({ message: `Successfully synced ${jobsToUpload.length} jobs.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}