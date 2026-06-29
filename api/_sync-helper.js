import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function runSync() {
    // 1. Determine which city to sync (alternate Mumbai and Pune)
    const { data: marker } = await supabase
        .from('jobs')
        .select('location')
        .eq('job_id', 'sync_marker')
        .maybeSingle();

    let cityToSync = 'mumbai';
    if (marker && marker.location === 'mumbai') {
        cityToSync = 'pune';
    }

    console.log(`[Sync] Initiating sync for city: ${cityToSync}`);

    // Update marker to current time immediately to act as a lock
    await supabase
        .from('jobs')
        .upsert({
            job_id: 'sync_marker',
            title: 'Sync Marker (Syncing...)',
            company: 'System',
            location: cityToSync,
            redirect_url: 'http://localhost',
            posted_at: new Date().toISOString()
        }, { onConflict: 'job_id' });

    const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=50&sort_by=date&where=${encodeURIComponent(cityToSync)}&what=engineer&content-type=application/json`;

    const response = await fetch(adzunaUrl);
    if (!response.ok) {
        throw new Error(`Adzuna API responded with status ${response.status}`);
    }
    const data = await response.json();
    const adzunaJobs = data.results || [];

    // Filter to software & hardware engineering jobs, and double-check location
    const techKeywords = [
        'software', 'developer', 'programmer', 'web', 'frontend', 'backend',
        'fullstack', 'full-stack', 'qa', 'devops', 'cloud', 'network', 'system', 
        'embedded', 'electronics', 'vlsi', 'firmware', 'database', 'security', 
        'cyber', 'machine learning', 'ai', 'data engineer', 'data scientist', 
        'coder', 'architect', 'test engineer', 'app developer', 'mobile developer', 
        'android', 'ios', 'support engineer', 'it engineer', 'technology',
        'hardware engineer', 'microcontroller', 'semiconductor', 'computer'
    ];
    
    const nonTechKeywords = [
        'civil', 'mechanical', 'chemical', 'construction', 'structural', 'sales', 
        'hr', 'marketing', 'marine', 'aerospace', 'petroleum', 'mining', 
        'site engineer', 'project manager', 'business analyst', 'operations'
    ];

    const filteredJobs = adzunaJobs.filter(job => {
        const title = (job.title || '').toLowerCase();
        const loc = (job.location.display_name || '').toLowerCase();

        // Must be in Mumbai or Pune
        const isLocMatch = loc.includes('mumbai') || loc.includes('pune');
        if (!isLocMatch) return false;

        // Must match tech keywords and not non-tech keywords
        const matchesTech = techKeywords.some(kw => title.includes(kw));
        const matchesNonTech = nonTechKeywords.some(kw => title.includes(kw));

        return matchesTech && !matchesNonTech;
    });

    const jobsToUpload = filteredJobs.map(job => ({
        job_id:     job.id,
        title:      job.title,
        company:    job.company.display_name,
        location:   job.location.display_name,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        redirect_url: job.redirect_url,
        category:   job.category?.label || 'IT Jobs',
        posted_at:  job.created
    }));

    console.log(`[Sync] Found ${adzunaJobs.length} raw jobs, matched ${jobsToUpload.length} engineering jobs in ${cityToSync}.`);

    // If we have matching jobs, upload them
    if (jobsToUpload.length > 0) {
        const { error } = await supabase
            .from('jobs')
            .upsert(jobsToUpload, { onConflict: 'job_id' });
        if (error) throw error;
    }

    // Finalize the sync marker with the final timestamp and location
    const { error: markerError } = await supabase
        .from('jobs')
        .upsert({
            job_id: 'sync_marker',
            title: 'Sync Marker',
            company: 'System',
            location: cityToSync,
            redirect_url: 'http://localhost',
            posted_at: new Date().toISOString()
        }, { onConflict: 'job_id' });
        
    if (markerError) throw markerError;

    // Delete jobs older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    await supabase
        .from('jobs')
        .delete()
        .lt('posted_at', thirtyDaysAgo.toISOString())
        .neq('job_id', 'sync_marker');

    return {
        citySynced: cityToSync,
        totalFetched: adzunaJobs.length,
        totalUploaded: jobsToUpload.length
    };
}
