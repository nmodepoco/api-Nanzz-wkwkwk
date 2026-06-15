const fs   = require('fs');
const path = require('path');
const chalk  = require('chalk');
const logger = require('./logger');

function loadApiKeys() {
    try {
        const raw = fs.readFileSync(path.join(__dirname, '../assets/apikey.json'), 'utf8');
        return JSON.parse(raw);
    } catch(e) { return []; }
}

function requiresApiKey(filePath) {
    try {
        const src = fs.readFileSync(filePath, 'utf8');
        return /\/\/\s*(apikeys?|api|kunci|akses)\s*=\s*true/i.test(src);
    } catch(e) { return false; }
}

function apiKeyMiddleware(req, res, next) {
    const keys   = loadApiKeys();
    const apikey = req.query.apikey || req.body?.apikey;
    if (!apikey || !keys.includes(apikey)) {
        return res.status(403).json({ status: false, message: 'Invalid or missing API key. Pass &apikey=yourkey' });
    }
    next();
}

function extractParamExamples(filePath) {
    try {
        const src = fs.readFileSync(filePath, 'utf8');
        const m1  = src.match(/\/\/\s*params\s*:\s*\?([^\n]+)/i);
        if (m1) {
            const result = {};
            m1[1].trim().split('&').forEach(part => {
                const idx = part.indexOf('=');
                if (idx !== -1) {
                    const k = decodeURIComponent(part.slice(0, idx).trim());
                    const v = decodeURIComponent(part.slice(idx + 1).trim());
                    result[k] = v;
                } else if (part.trim()) {
                    result[decodeURIComponent(part.trim())] = '';
                }
            });
            return result;
        }
        const m2 = src.match(/\/\/\s*(?:Contoh|Example)\s*:\s*(\{[^\n]+\})/i);
        if (m2) {
            try {
                const obj = JSON.parse(m2[1].trim());
                if (obj && typeof obj === 'object') {
                    const result = {};
                    Object.entries(obj).forEach(([k, v]) => { result[k] = String(v); });
                    return result;
                }
            } catch(e) {}
        }
        return null;
    } catch(e) { return null; }
}

/**
 * Resolve paramsSelect — support static array dan async function.
 * Kalau module.paramsSelect adalah object biasa, langsung return.
 * Kalau ada field yang valuenya function async, panggil dan tunggu hasilnya.
 * Timeout 5 detik per field biar ga nge-hang boot server.
 */
async function resolveParamsSelect(mod) {
    const raw = mod.paramsSelect;
    if (!raw || typeof raw !== 'object') return raw;

    const resolved = {};
    for (const [key, val] of Object.entries(raw)) {
        if (typeof val === 'function') {
            try {
                const result = await Promise.race([
                    Promise.resolve(val()),
                    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
                ]);
                // Kalau return array of string, pakai langsung
                // Kalau return array of object (misal [{coin_id, name}]), ambil field pertama atau .value
                if (Array.isArray(result)) {
                    resolved[key] = result.map(item => {
                        if (typeof item === 'string') return item;
                        // Support {value, label} atau {coin_id, name} atau {slug, name}
                        return item.value || item.coin_id || item.slug || item.id || String(item);
                    });
                } else {
                    resolved[key] = [];
                }
            } catch(e) {
                logger.warn(`paramsSelect[${key}] async failed: ${e.message} — using fallback`);
                // Fallback ke static jika ada di module.paramsSelectFallback
                resolved[key] = mod.paramsSelectFallback?.[key] || [];
            }
        } else {
            resolved[key] = val;
        }
    }
    return resolved;
}

async function loadEndpointsFromDirectory(directory, app, baseRoute = '') {
    let endpoints = [];
    const fullPath = path.join(__dirname, '..', directory);

    if (!fs.existsSync(fullPath)) {
        logger.warn(`Directory not found: ${fullPath}`);
        return endpoints;
    }

    const items = fs.readdirSync(fullPath);

    for (const item of items) {
        const itemPath = path.join(fullPath, item);
        const stats    = fs.statSync(itemPath);

        if (stats.isDirectory()) {
            const nested = await loadEndpointsFromDirectory(
                path.join(directory, item), app, `${baseRoute}/${item}`
            );
            endpoints = [...endpoints, ...nested];
            continue;
        }

        if (!stats.isFile() || !item.endsWith('.js') || item.startsWith('_')) continue;

        try {
            const mod          = require(itemPath);
            if (!mod || !mod.run || typeof mod.run !== 'function') continue;

            const endpointName = item.replace('.js', '');
            const endpointPath = `${baseRoute}/${endpointName}`;
            const needsKey     = requiresApiKey(itemPath);

            if (needsKey) {
                app.all(endpointPath, apiKeyMiddleware, mod.run);
            } else {
                app.all(endpointPath, mod.run);
            }

            const paramExamples = extractParamExamples(itemPath);
            const category      = mod.category ?? 'Other';
            const post          = mod.post ?? false;
            const pathModule    = mod.path ?? false;

            // Resolve paramsSelect — support dynamic async
            const resolvedSelect = await resolveParamsSelect(mod);

            const buildParamInfo = (params) => params.map(p => {
                const info = {
                    name:    p,
                    desc:    mod[`desc-${p}`] || '',
                    example: paramExamples && paramExamples[p] !== undefined ? paramExamples[p] : p
                };
                if (resolvedSelect && resolvedSelect[p]) {
                    info.select = resolvedSelect[p];
                }
                return info;
            });

            let fullPathWithParams = endpointPath;
            if (!post && mod.params && mod.params.length > 0) {
                fullPathWithParams += '?' + mod.params.map(param => {
                    const ex = paramExamples && paramExamples[param];
                    return `${param}=${ex !== undefined ? encodeURIComponent(ex) : ''}`;
                }).join('&');
            }

            const subfolderParts = baseRoute.replace(/^\//, '').split('/');
            const subfolder      = subfolderParts.length > 1 ? subfolderParts[0] : null;

            const catIdx = endpoints.findIndex(e => e.name === category);
            if (catIdx === -1) {
                endpoints.push({ name: category, post, path: pathModule, subfolder, items: [] });
            }
            const catObj = endpoints.find(e => e.name === category);

            let itemObj = {
                path:       fullPathWithParams,
                post,
                desc:       mod.desc || '',
                needsApiKey: needsKey,
                subfolder:  subfolderParts[0] || null
            };

            if (mod.params && mod.params.length > 0) {
                itemObj.paramInfo = buildParamInfo(mod.params);
            }

            if (!post && mod.params && mod.params.length > 0) {
                itemObj.params = mod.params.map(param => {
                    const ex = paramExamples && paramExamples[param];
                    return `${param}=${ex !== undefined ? ex : ''}`;
                });
            }

            if (post) {
                const paramsSource = mod.params || mod.paramsPost;
                if (paramsSource && Array.isArray(paramsSource)) {
                    itemObj.paramsPost = [
                        paramsSource.reduce((acc, param) => {
                            const ex = paramExamples && paramExamples[param];
                            acc[param] = ex !== undefined ? ex : '';
                            return acc;
                        }, {})
                    ];
                } else if (paramsSource && typeof paramsSource === 'object') {
                    itemObj.paramsPost = [paramsSource];
                }

                if (Array.isArray(mod.paramsFile) && mod.paramsFile.length > 0) {
                    itemObj.paramsFile = [
                        mod.paramsFile.reduce((acc, param) => { acc[param] = null; return acc; }, {})
                    ];
                }
            }

            catObj.items.push(itemObj);

        } catch (error) {
            logger.error(`Failed to load module ${item}: ${error.message}`);
        }
    }

    return endpoints;
}

module.exports = { loadEndpointsFromDirectory };
