// 1. The Controller - Handles the flow
async function updateJobFeed(keyword = '', location = '') {
    const jobsContainer = document.getElementById('jobsList');
    
    // Loading state
    jobsContainer.innerHTML = '<p style="text-align:center; width:100%; color:#718096; padding: 20px;">Fetching the latest opportunities...</p>';

    // We call our internal API (which now fetches from Supabase)
    const url = `/api/get-jobs?what=${encodeURIComponent(keyword)}&where=${encodeURIComponent(location)}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        const jobs = data.results || [];

        if (jobs.length === 0) {
            jobsContainer.innerHTML = '<p style="text-align:center; width:100%; padding: 20px;">No jobs found. Try a different keyword!</p>';
            return;
        }

        // Clean and Map the data for the UI
        const formattedJobs = jobs.map(job => {
            // Logic to format Salary nicely
            let salaryText = 'Salary Undisclosed';
            const isMonthly = (job.salary_min && job.salary_min < 50000) || (job.salary_max && job.salary_max < 50000);
            
            if (isMonthly) {
                if (job.salary_min && job.salary_max) {
                    salaryText = `₹${Math.round(job.salary_min / 1000)}k - ₹${Math.round(job.salary_max / 1000)}k/mo`;
                } else if (job.salary_min) {
                    salaryText = `₹${Math.round(job.salary_min / 1000)}k+/mo`;
                }
            } else {
                if (job.salary_min && job.salary_max) {
                    const minLakh = (job.salary_min / 100000).toFixed(1).replace(/\.0$/, '');
                    const maxLakh = (job.salary_max / 100000).toFixed(1).replace(/\.0$/, '');
                    salaryText = `₹${minLakh} - ₹${maxLakh} LPA`;
                } else if (job.salary_min) {
                    const minLakh = (job.salary_min / 100000).toFixed(1).replace(/\.0$/, '');
                    salaryText = `₹${minLakh} LPA+`;
                }
            }

            return {
                title: job.title,
                company: job.company,
                loc: job.location || 'Remote',
                salary: salaryText,
                url: job.redirect_url,
                tags: [job.category].filter(Boolean),
                time: timeAgo(new Date(job.posted_at)) // Helper for "2 days ago"
            };
        });

        displayJobs(formattedJobs);
    } catch (error) {
        console.error('Fetch Error:', error);
        jobsContainer.innerHTML = '<p style="text-align:center; width:100%;">Something went wrong. Please try again later.</p>';
    }
}

// 2. The Renderer
function displayJobs(jobs) {
    const jobsList = document.getElementById('jobsList');
    jobsList.innerHTML = ''; 

    jobs.forEach(job => {
        const item = document.createElement('div');
        item.className = 'job-item';
        item.style.cursor = 'pointer';
        item.onclick = () => window.open(job.url, '_blank');

        item.innerHTML = `
            <div class="job-main">
                <div class="company-logo">${job.company.charAt(0)}</div>
                <div class="job-details">
                    <span class="company-name">${job.company}</span>
                    <h3>${job.title}</h3>
                    <div class="job-meta">
                        <span class="loc-pill">📍 ${job.loc}</span>
                        <span class="sal-pill">💰 ${job.salary}</span>
                    </div>
                </div>
            </div>
            <div class="job-tags">
                ${job.tags.map(t => `<span>${t}</span>`).join('')}
            </div>
            <div class="job-time">${job.time}</div>
        `;
        jobsList.appendChild(item);
    });
}

// Helper function for nice dates
function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "m";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h";
    return "New";
}

// 3. UI Events
document.querySelector('.search-btn').addEventListener('click', () => {
    updateJobFeed(document.getElementById('keyword').value, document.getElementById('location').value);
});

document.querySelectorAll('.tag').forEach(tag => {
    tag.addEventListener('click', () => {
        document.getElementById('keyword').value = tag.innerText;
        updateJobFeed(tag.innerText);
    });
});

// Initial Load
updateJobFeed('', '');

document.querySelector('.search-btn').addEventListener('click', () => {
    const keyword = document.getElementById('keyword').value;
    const location = document.getElementById('location').value;
    // Calling with empty strings will trigger the "show all" logic in our API
    updateJobFeed(keyword, location);
});