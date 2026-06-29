import { runSync } from './_sync-helper.js'

export default async function handler(req, res) {

    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const result = await runSync();
        res.status(200).json({ message: 'Sync completed successfully', result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}