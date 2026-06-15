(async () => {
    global.logger = require('./lib/logger');
    const express = require('express');
    const path = require('path');
    const chalk = require('chalk');
    const fs = require('node:fs');
    const PORT = process.env.PORT || 4000;
    const app = express();

    app.set('trust proxy', true);
    app.set('json spaces', 2);

    // CORS — allow semua origin
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
        if (req.method === 'OPTIONS') return res.sendStatus(204);
        next();
    });

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(require('./lib/logApiRequest'));
    app.use('/', express.static(path.join(__dirname, 'html')));

    // Block direct access to apikey.json
    app.use('/assets/apikey.json', (req, res) => {
        res.status(403).json({ status: false, message: 'Forbidden' });
    });
    app.use('/assets', express.static(path.join(__dirname, 'assets')));

    // Load valid API keys
    let validApiKeys = [];
    try {
        validApiKeys = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets/apikey.json'), 'utf8'));
    } catch(e) {
        logger.warn('Failed to load apikey.json');
    }

    app.use((req, res, next) => {
        const originalJson = res.json;
        res.json = async function (data) {
            if (data && typeof data === 'object') {
                const statusCode = res.statusCode || 200;
                let author = 'unknown';
                try {
                    const json = JSON.parse(
                        fs.readFileSync(
                            path.join(process.cwd(), 'assets/setting.json')
                        )
                    );
                    author = json.author;
                } catch (e) {
                    logger.warn('Failed read setting.json');
                }
                const responseData = {
                    statusCode: statusCode,
                    creator: author,
                    ...data,
                    timestamp: new Date().toISOString()
                };
                return originalJson.call(this, responseData);
            }
            return originalJson.call(this, data);
        };
        next();
    });

    logger.info('Starting server initialization...');
    logger.info('Loading API endpoints...');

    const allEndpoints = await require('./lib/loader').loadEndpointsFromDirectory('api', app);

    console.log('');
    logger.ready(`Loaded ${allEndpoints.reduce((total, category) => total + category.items.length, 0)} endpoints`);

    app.get('/', async (req, res) => {
        res.sendFile(
            path.join(process.cwd(), 'html', 'index.html')
        );
    });

    app.get('/docs', async (req, res) => {
        res.sendFile(
            path.join(process.cwd(), 'html', 'docs.html')
        );
    });

    app.get('/endpoint', async (req, res) => {
        res.status(200).json({
            endpoints: allEndpoints
        });
    });

    // /monitor — dashboard HTML
    app.get('/monitor', (req, res) => {
        res.sendFile(path.join(process.cwd(), 'html', 'monitor.html'));
    });

    // /monitor/data — snapshot JSON untuk polling
    app.get('/monitor/data', (req, res) => {
        try {
            const db = require('./lib/db');
            const today = db.getTodayStats();
            const recent = db.getRecentLogs(80);
            const top = db.getTopEndpoints(10);
            const hourly = db.getHourlyStats();
            const weekly = db.getWeeklyStats();
            const maxId = db.getMaxLogId();
            res.json({ today, recent, top, hourly, weekly, maxId });
        } catch(e) {
            res.status(500).json({ error: e.message });
        }
    });

    // /monitor/stream — SSE untuk live log feed
    app.get('/monitor/stream', (req, res) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        const db = require('./lib/db');
        let lastId = db.getMaxLogId();

        // Kirim heartbeat tiap 5 detik
        const hb = setInterval(() => {
            res.write(':heartbeat\n\n');
        }, 5000);

        // Poll DB tiap 1 detik untuk log baru
        const poll = setInterval(() => {
            try {
                const newLogs = db.getLogsAfter(lastId, 20);
                if (newLogs.length > 0) {
                    lastId = newLogs[newLogs.length - 1].id;
                    res.write(`data: ${JSON.stringify({ logs: newLogs, today: db.getTodayStats() })}\n\n`);
                }
            } catch(e) {}
        }, 1000);

        req.on('close', () => {
            clearInterval(hb);
            clearInterval(poll);
        });
    });

    // Cron reset 00.00 WIB (17.00 UTC)
    // Cek setiap menit, reset kalau jam 00.00 WIB
    let lastResetDate = '';
    setInterval(() => {
        const db = require('./lib/db');
        const today = db.getWIBDate();
        if (today !== lastResetDate) {
            lastResetDate = today;
            const now = new Date();
            const wibHour = (now.getUTCHours() + 7) % 24;
            if (wibHour === 0) {
                db.resetDailyStats();
                logger.info('Daily stats reset (00.00 WIB)');
            }
        }
    }, 60 * 1000);

    app.use((req, res, next) => {
        logger.info(`404: ${req.method} ${req.path}`);
        res.sendFile(
            path.join(process.cwd(), 'html', '404.html')
        );
    });

    app.use((err, req, res, next) => {
        logger.error(`500: ${err.message}`);
        res.sendFile(
            path.join(process.cwd(), 'html', '500.html')
        );
    });

    app.listen(PORT, () => {
        console.log('');
        logger.ready(`Server started successfully`);
        logger.info(`Local:   ${chalk.cyan(`http://localhost:${PORT}`)}`);
        try {
            const { networkInterfaces } = require('os');
            const nets = networkInterfaces();
            const results = {};
            for (const name of Object.keys(nets)) {
                for (const net of nets[name]) {
                    if (net.family === 'IPv4' && !net.internal) {
                        if (!results[name]) {
                            results[name] = [];
                        }
                        results[name].push(net.address);
                    }
                }
            }
            for (const [, addresses] of Object.entries(results)) {
                for (const addr of addresses) {
                    logger.info(`Network: ${chalk.cyan(`http://${addr}:${PORT}`)}`);
                }
            }
        } catch (error) {
            logger.warn(`Cannot detect network interfaces: ${error.message}`);
        }
        logger.info(`${chalk.dim('Ready for connections')}`);
        console.log('');
    });

    module.exports = app;
})();

