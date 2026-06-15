// Path yang di-skip dari logging (exact match atau startsWith)
const SKIP_EXACT  = new Set(['/', '/docs', '/endpoint', '/monitor', '/monitor/data', '/monitor/stream']);
const SKIP_PREFIX = ['/assets/', '/favicon', '/.well-known', '/monitor/'];

const logApiRequest = (req, res, next) => {
    // Skip static & monitor paths
    if (SKIP_EXACT.has(req.path)) return next();
    if (SKIP_PREFIX.some(p => req.path.startsWith(p))) return next();

    const startTime = Date.now();

    res.on('finish', () => {
        try {
            const ms      = Date.now() - startTime;
            const status  = res.statusCode || 200;
            const ip      = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
                          || req.socket?.remoteAddress || '';
            const apikey  = req.query.apikey || req.body?.apikey || null;
            const isPremium  = !!apikey;
            const userAgent  = req.headers['user-agent'] || '';

            setImmediate(() => {
                try {
                    const { insertLog } = require('./db');
                    insertLog({ method: req.method, path: req.path, status, ms, ip, apikey, isPremium, userAgent });
                } catch(e) {}
            });
        } catch(e) {}
    });

    next();
};

module.exports = logApiRequest;
