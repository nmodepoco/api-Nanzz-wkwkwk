// lib/db.js — SQLite database untuk monitoring
const path = require('path');
const fs = require('fs');

// Pakai better-sqlite3 (sync, simple, no setup)
let db;

function getDb() {
    if (db) return db;

    const Database = require('better-sqlite3');
    const dbPath = path.join(process.cwd(), 'data', 'synox.db');

    // Pastikan folder data/ ada
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    db = new Database(dbPath);

    // WAL mode buat performa
    db.pragma('journal_mode = WAL');

    // Tabel request logs
    db.exec(`
        CREATE TABLE IF NOT EXISTS request_logs (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            ts          INTEGER NOT NULL,           -- unix ms
            method      TEXT NOT NULL,
            path        TEXT NOT NULL,
            status      INTEGER NOT NULL,
            ms          INTEGER NOT NULL,           -- response time
            ip          TEXT,
            apikey      TEXT,                       -- null kalau ga pakai
            is_premium  INTEGER DEFAULT 0,          -- 1 = endpoint premium
            user_agent  TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_ts ON request_logs(ts);
        CREATE INDEX IF NOT EXISTS idx_path ON request_logs(path);

        -- Tabel daily stats (cache harian, reset 00.00 WIB)
        CREATE TABLE IF NOT EXISTS daily_stats (
            date        TEXT PRIMARY KEY,           -- YYYY-MM-DD (WIB)
            total_req   INTEGER DEFAULT 0,
            unique_ips  TEXT DEFAULT '[]',          -- JSON array
            premium_req INTEGER DEFAULT 0,
            errors      INTEGER DEFAULT 0
        );

        -- Tabel top endpoints (biar bisa rank)
        CREATE TABLE IF NOT EXISTS endpoint_stats (
            path        TEXT PRIMARY KEY,
            hits        INTEGER DEFAULT 0,
            errors      INTEGER DEFAULT 0,
            total_ms    INTEGER DEFAULT 0,
            last_hit    INTEGER DEFAULT 0
        );
    `);

    return db;
}

// Insert satu log entry
function insertLog({ method, path, status, ms, ip, apikey, isPremium, userAgent }) {
    const d = getDb();
    try {
        d.prepare(`
            INSERT INTO request_logs (ts, method, path, status, ms, ip, apikey, is_premium, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(Date.now(), method, path, status, ms, maskIP(ip), apikey || null, isPremium ? 1 : 0, userAgent || '');

        // Update endpoint_stats
        d.prepare(`
            INSERT INTO endpoint_stats (path, hits, errors, total_ms, last_hit)
            VALUES (?, 1, ?, ?, ?)
            ON CONFLICT(path) DO UPDATE SET
                hits = hits + 1,
                errors = errors + ?,
                total_ms = total_ms + ?,
                last_hit = ?
        `).run(path, status >= 400 ? 1 : 0, ms, Date.now(), status >= 400 ? 1 : 0, ms, Date.now());

        // Update daily_stats
        const dateWIB = getWIBDate();
        const existing = d.prepare('SELECT * FROM daily_stats WHERE date = ?').get(dateWIB);
        if (!existing) {
            d.prepare('INSERT OR IGNORE INTO daily_stats (date, total_req, unique_ips, premium_req, errors) VALUES (?, 0, ?, 0, 0)').run(dateWIB, '[]');
        }
        const row = d.prepare('SELECT unique_ips FROM daily_stats WHERE date = ?').get(dateWIB);
        let ips = [];
        try { ips = JSON.parse(row.unique_ips); } catch(e) {}
        if (ip && !ips.includes(ip)) ips.push(ip);

        d.prepare(`
            UPDATE daily_stats SET
                total_req = total_req + 1,
                unique_ips = ?,
                premium_req = premium_req + ?,
                errors = errors + ?
            WHERE date = ?
        `).run(JSON.stringify(ips), isPremium ? 1 : 0, status >= 400 ? 1 : 0, dateWIB);

    } catch(e) {
        // jangan crash server gara-gara log error
    }
}

// Mask IP address — sembunyikan oktet terakhir
function maskIP(ip) {
    if (!ip) return '—';
    // IPv4
    if (/^\d+\.\d+\.\d+\.\d+$/.test(ip)) {
        return ip.split('.').slice(0, 3).join('.') + '.***';
    }
    // IPv6 — tampilkan 3 grup pertama saja
    if (ip.includes(':')) {
        const parts = ip.split(':');
        return parts.slice(0, 3).join(':') + ':***';
    }
    return ip.slice(0, 6) + '***';
}

// Ambil date string WIB (UTC+7)
function getWIBDate() {
    const now = new Date();
    const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
    return wib.toISOString().slice(0, 10);
}

// Ambil stats harian hari ini
function getTodayStats() {
    const d = getDb();
    const date = getWIBDate();
    const row = d.prepare('SELECT * FROM daily_stats WHERE date = ?').get(date);
    if (!row) return { total_req: 0, unique_users: 0, premium_req: 0, errors: 0, date };
    let ips = [];
    try { ips = JSON.parse(row.unique_ips); } catch(e) {}
    return { ...row, unique_users: ips.length };
}

// Ambil recent logs (untuk live feed)
function getRecentLogs(limit = 50) {
    const d = getDb();
    return d.prepare(`
        SELECT id, ts, method, path, status, ms, ip, apikey, is_premium
        FROM request_logs
        ORDER BY id DESC
        LIMIT ?
    `).all(limit);
}

// Ambil top endpoints hari ini
function getTopEndpoints(limit = 10) {
    const d = getDb();
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return d.prepare(`
        SELECT path,
               COUNT(*) as hits,
               SUM(CASE WHEN status >= 400 THEN 1 ELSE 0 END) as errors,
               AVG(ms) as avg_ms,
               MAX(ts) as last_hit
        FROM request_logs
        WHERE ts > ?
        GROUP BY path
        ORDER BY hits DESC
        LIMIT ?
    `).all(since, limit);
}

// Ambil log per jam hari ini (untuk grafik)
function getHourlyStats() {
    const d = getDb();
    const todayStart = new Date();
    todayStart.setUTCHours(todayStart.getUTCHours() - 7); // WIB midnight
    todayStart.setHours(0, 0, 0, 0);
    const startMs = new Date(todayStart.getTime() - 7 * 60 * 60 * 1000).getTime();

    return d.prepare(`
        SELECT
            CAST((ts - ?) / 3600000 AS INTEGER) as hour_offset,
            COUNT(*) as count
        FROM request_logs
        WHERE ts >= ?
        GROUP BY hour_offset
        ORDER BY hour_offset
    `).all(startMs, startMs);
}

// Reset log harian (dipanggil 00.00 WIB)
function resetDailyStats() {
    // Kita ga hapus, cukup biarkan — setiap hari pake date key sendiri
    // Tapi hapus request_logs > 7 hari biar ga gembung
    const d = getDb();
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    d.prepare('DELETE FROM request_logs WHERE ts < ?').run(cutoff);
}

// Ambil semua daily stats (7 hari terakhir)
function getWeeklyStats() {
    const d = getDb();
    return d.prepare(`
        SELECT date, total_req, premium_req, errors,
               json_array_length(unique_ips) as unique_users
        FROM daily_stats
        ORDER BY date DESC
        LIMIT 7
    `).all();
}

// ID counter untuk SSE (last seen id)
function getLogsAfter(lastId, limit = 20) {
    const d = getDb();
    return d.prepare(`
        SELECT id, ts, method, path, status, ms, ip, apikey, is_premium
        FROM request_logs
        WHERE id > ?
        ORDER BY id ASC
        LIMIT ?
    `).all(lastId, limit);
}

function getMaxLogId() {
    const d = getDb();
    const row = d.prepare('SELECT MAX(id) as maxid FROM request_logs').get();
    return row?.maxid || 0;
}

module.exports = { insertLog, getTodayStats, getRecentLogs, getTopEndpoints, getHourlyStats, resetDailyStats, getWeeklyStats, getLogsAfter, getMaxLogId, getWIBDate };
