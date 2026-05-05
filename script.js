const jobsList = document.getElementById('jobsList');

// Example data structure based on your screenshots
const mockJobs = [
    { title: "Senior Software Engineer", company: "Kizumi Tech", loc: "Remote", salary: "130k - 170k", tags: ["Python", "Go", "AWS"], time: "10m" },
    { title: "DevOps Engineer", company: "CloudScale", loc: "Paris", salary: "80k - 150k", tags: ["Kubernetes", "CI/CD", "Docker"], time: "40m" },
    { title: "Product Designer", company: "Creative Flow", loc: "Mumbai", salary: "60k - 90k", tags: ["Figma", "UI/UX"], time: "1h" }
];

function displayJobs(jobs) {
    jobsList.innerHTML = '';
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
                        <span class="sal-pill">USD ${job.salary}</span>
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

// Initialize with mock data
displayJobs(mockJobs);