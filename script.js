// 1. The API Fetcher (Calls your Vercel Serverless Function)
async function getAdzunaJobs(query = '', location = '') {
    const url = `/api/get-jobs?what=${encodeURIComponent(query)}&where=${encodeURIComponent(location)}`;

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        return data.results || []; 
    } catch (error) {
        console.error('Fetch Error:', error);
        return [];
    }
}

// 2. The Renderer (Creates the HTML cards)
function displayJobs(jobs) {
    const jobsList = document.getElementById('jobsList');
    jobsList.innerHTML = ''; // Clear loading message

    jobs.forEach(job => {
        const item = document.createElement('div');
        item.className = 'job-item';
        item.innerHTML = `
            <div class="job-main">
                <div class="company-logo">${job.company.charAt(0)}</div>
                <div class="job-details">
                    <span class="company-name">${job.company}</span>
                    <h3>${job.title}</h3>
                    <div class="job-meta">
                        <span class="loc-pill">${job.loc}</span>
                        <span class="sal-pill">${job.salary}</span>
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

// 3. The Controller (Connects Fetcher and Renderer)
async function updateJobFeed(keyword = 'Software', location = '') {
    const jobsContainer = document.getElementById('jobsList');
    jobsContainer.innerHTML = '<p style="text-align:center; width:100%; color:#718096;">Searching for creative roles...</p>';

    const rawJobs = await getAdzunaJobs(keyword, location);
    
    if (rawJobs.length === 0) {
        jobsContainer.innerHTML = '<p style="text-align:center; width:100%;">No jobs found. Try adjusting your search.</p>';
        return;
    }

    // Map the Adzuna data to our clean UI format
    const formattedJobs = rawJobs.map(job => ({
        title: job.title,
        company: job.company.display_name,
        loc: job.location.display_name,
        salary: job.salary_min ? `USD ${Math.round(job.salary_min).toLocaleString()}` : 'Salary Undisclosed',
        tags: [job.category.label, job.contract_type].filter(Boolean),
        time: new Date(job.created).toLocaleDateString()
    }));

    displayJobs(formattedJobs);
}

// 4. UI Interactivity (Search Button & Tags)
document.querySelector('.search-btn').addEventListener('click', () => {
    const keyword = document.getElementById('keyword').value;
    const location = document.getElementById('location').value;
    updateJobFeed(keyword, location);
});

// Optional: Allow pressing "Enter" to search
document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const keyword = document.getElementById('keyword').value;
        const location = document.getElementById('location').value;
        updateJobFeed(keyword, location);
    }
});

// 5. Initial Load
updateJobFeed('Creative');