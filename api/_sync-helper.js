import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function runSync() {
    // 1. Determine which city to sync (alternate Mumbai and Pune)
    const { data: marker } = await supabase
        .from('jobs')
        .select('location, company')
        .eq('job_id', 'sync_marker')
        .maybeSingle();

    let cityToSync = 'mumbai';
    if (marker && marker.location === 'mumbai') {
        cityToSync = 'pune';
    }

    // Determine if we should sync JobDataLake (rate-limited to once per 45 minutes)
    let lastJdlSyncTime = new Date(0);
    try {
        if (marker && marker.company && marker.company.trim().startsWith('{')) {
            const parsed = JSON.parse(marker.company);
            if (parsed.last_jdl_sync) {
                lastJdlSyncTime = new Date(parsed.last_jdl_sync);
            }
        }
    } catch (e) {
        console.error("[Sync] Error parsing JDL sync marker:", e);
    }

    const now = new Date();
    const diffJdlMinutes = (now - lastJdlSyncTime) / (1000 * 60);
    const shouldSyncJdl = diffJdlMinutes >= 45;

    console.log(`[Sync] Initiating sync for city: ${cityToSync}. shouldSyncJdl: ${shouldSyncJdl} (diff: ${diffJdlMinutes.toFixed(1)}m)`);

    // Update marker lock immediately
    await supabase
        .from('jobs')
        .upsert({
            job_id: 'sync_marker',
            title: 'Sync Marker (Syncing...)',
            company: JSON.stringify({ last_jdl_sync: shouldSyncJdl ? now.toISOString() : lastJdlSyncTime.toISOString() }),
            location: cityToSync,
            redirect_url: 'http://localhost',
            posted_at: now.toISOString()
        }, { onConflict: 'job_id' });

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

    const seniorKeywords = [
        'senior', 'lead', 'principal', 'manager', 'director', 'head', 
        'architect', 'staff', 'vp', 'vice president', 'expert'
    ];

    const jobsToUpload = [];

    // Fetch from Adzuna (20m interval)
    try {
        const adzunaUrl = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${process.env.ADZUNA_APP_ID}&app_key=${process.env.ADZUNA_APP_KEY}&results_per_page=50&sort_by=date&where=${encodeURIComponent(cityToSync)}&what=engineer&content-type=application/json`;
        const response = await fetch(adzunaUrl);
        if (response.ok) {
            const data = await response.json();
            const adzunaJobs = data.results || [];
            
            const filteredAdzuna = adzunaJobs.filter(job => {
                const title = (job.title || '').toLowerCase();
                const loc = (job.location.display_name || '').toLowerCase();

                const isLocMatch = loc.includes('mumbai') || loc.includes('pune');
                if (!isLocMatch) return false;

                const matchesTech = techKeywords.some(kw => title.includes(kw));
                const matchesNonTech = nonTechKeywords.some(kw => title.includes(kw));
                if (!matchesTech || matchesNonTech) return false;

                const isSenior = seniorKeywords.some(kw => title.includes(kw)) || title.includes('sr.') || /\bsr\b/.test(title);
                return !isSenior;
            }).map(job => ({
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

            jobsToUpload.push(...filteredAdzuna);
            console.log(`[Sync] Adzuna: fetched ${adzunaJobs.length}, matched ${filteredAdzuna.length}`);
        } else {
            console.error(`[Sync] Adzuna API failed with status ${response.status}`);
        }
    } catch (err) {
        console.error("[Sync] Adzuna fetch error:", err);
    }

    // Fetch from JobDataLake (45m rate-limited)
    if (shouldSyncJdl && process.env.JOBDATALAKE_API_KEY) {
        try {
            const jdlUrl = `https://api.jobdatalake.com/v1/jobs?q=engineer&countries=IN&location=${encodeURIComponent(cityToSync)}&per_page=50`;
            const response = await fetch(jdlUrl, {
                headers: { "X-API-Key": process.env.JOBDATALAKE_API_KEY }
            });
            if (response.ok) {
                const data = await response.json();
                const jdlJobs = data.jobs || [];
                
                const filteredJdl = jdlJobs.filter(job => {
                    const title = (job.title || '').toLowerCase();
                    const loc = (job.locations || []).join(', ').toLowerCase();

                    const isLocMatch = loc.includes('mumbai') || loc.includes('pune');
                    if (!isLocMatch) return false;

                    const matchesTech = techKeywords.some(kw => title.includes(kw));
                    const matchesNonTech = nonTechKeywords.some(kw => title.includes(kw));
                    if (!matchesTech || matchesNonTech) return false;

                    const isSenior = seniorKeywords.some(kw => title.includes(kw)) || title.includes('sr.') || /\bsr\b/.test(title);
                    return !isSenior;
                }).map(job => {
                    let salaryMin = null;
                    let salaryMax = null;
                    if (job.salary_min_usd && job.salary_min_usd > 1000) {
                        salaryMin = job.salary_min_usd * 85;
                    }
                    if (job.salary_max_usd && job.salary_max_usd > 1000) {
                        salaryMax = job.salary_max_usd * 85;
                    }

                    return {
                        job_id:     `jdl_${job.id}`,
                        title:      job.title,
                        company:    job.company_name,
                        location:   job.locations ? job.locations.join(', ') : 'Remote',
                        salary_min: salaryMin,
                        salary_max: salaryMax,
                        redirect_url: job.url,
                        category:   job.job_function === 'eng' ? 'IT Jobs' : 'Engineering',
                        posted_at:  job.posted_at ? new Date(job.posted_at).toISOString() : new Date().toISOString()
                    };
                });

                jobsToUpload.push(...filteredJdl);
                console.log(`[Sync] JobDataLake: fetched ${jdlJobs.length}, matched ${filteredJdl.length}`);
            } else {
                console.error(`[Sync] JobDataLake API failed with status ${response.status}`);
            }
        } catch (err) {
            console.error("[Sync] JobDataLake fetch error:", err);
        }
    }

    // If we have matching jobs, upload them
    if (jobsToUpload.length > 0) {
        const { error } = await supabase
            .from('jobs')
            .upsert(jobsToUpload, { onConflict: 'job_id' });
        if (error) throw error;
    }

    // Finalize the sync marker
    const { error: markerError } = await supabase
        .from('jobs')
        .upsert({
            job_id: 'sync_marker',
            title: 'Sync Marker',
            company: JSON.stringify({ last_jdl_sync: shouldSyncJdl ? now.toISOString() : lastJdlSyncTime.toISOString() }),
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
        jdlSynced: shouldSyncJdl,
        totalUploaded: jobsToUpload.length
    };
}
