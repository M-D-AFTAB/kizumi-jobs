import fs from 'fs';

// Load .env manually into process.env
const envFile = fs.readFileSync('.env', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let val = match[2] || '';
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        }
        env[match[1]] = val.trim();
    }
});

async function run() {
    console.log("Fetching job from JobDataLake...");
    const url = "https://api.jobdatalake.com/v1/jobs?q=engineer&per_page=1";
    const resp = await fetch(url, {
        headers: { "X-API-Key": env.JOBDATALAKE_API_KEY }
    });
    const data = await resp.json();
    console.log(JSON.stringify(data, null, 2));
}

run();
