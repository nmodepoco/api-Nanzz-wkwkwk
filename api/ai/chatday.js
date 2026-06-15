// params : ?prompt=hai+perkenalkan+dirimu&model=openai/gpt-5.5
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

module.exports = {
  category: 'Ai-chat',
  creator: 'Nanzz',
  params: ['prompt', 'model'],
  'desc-prompt': 'Pertanyaan atau pesan untuk AI',
  'desc-model': 'Pilih model AI yang ingin digunakan',

  paramsSelect: {
    model: [
      'openai/gpt-5.5',
      'openai/gpt-5.4',
      'openai/gpt-5.3-chat',
      'openai/gpt-5.1-instant',
      'openai/gpt-5',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'xai/grok-4.1-fast-non-reasoning',
      'anthropic/claude-haiku-4.5',
      'anthropic/claude-sonnet-4.6',
      'anthropic/claude-opus-4.5',
      'anthropic/claude-opus-4.6',
      'anthropic/claude-opus-4.7',
      'anthropic/claude-opus-4.8',
      'anthropic/claude-fable-5',
      'deepseek/deepseek-v4-pro',
      'deepseek/deepseek-v4-flash',
      'deepseek/deepseek-v3.2-thinking',
      'google/gemini-3.1-pro-preview',
      'google/gemini-3-pro-preview',
      'google/gemini-3.1-flash-lite',
      'alibaba/qwen3-max',
      'meta/llama-4-maverick',
      'moonshotai/kimi-k2.6'
    ]
  },

  desc: 'Chatday AI — Multi model AI dengan 24 pilihan model (1 req/detik)',

  async run(req, res) {
    const prompt = String(req.query.prompt || req.body.prompt || '').trim();
    const model = String(req.query.model || req.body.model || 'openai/gpt-5.5').trim();

    const credit = { creator: 'Nanzz' };

    if (!prompt) {
      return res.status(400).json({ ...credit, status: false, result: 'Parameter prompt wajib diisi' });
    }

    const validModels = [
      'openai/gpt-5.5', 'openai/gpt-5.4', 'openai/gpt-5.3-chat', 'openai/gpt-5.1-instant',
      'openai/gpt-5', 'openai/gpt-4o', 'openai/gpt-4o-mini',
      'xai/grok-4.1-fast-non-reasoning',
      'anthropic/claude-haiku-4.5', 'anthropic/claude-sonnet-4.6', 'anthropic/claude-opus-4.5',
      'anthropic/claude-opus-4.6', 'anthropic/claude-opus-4.7', 'anthropic/claude-opus-4.8',
      'anthropic/claude-fable-5',
      'deepseek/deepseek-v4-pro', 'deepseek/deepseek-v4-flash', 'deepseek/deepseek-v3.2-thinking',
      'google/gemini-3.1-pro-preview', 'google/gemini-3-pro-preview', 'google/gemini-3.1-flash-lite',
      'alibaba/qwen3-max', 'meta/llama-4-maverick', 'moonshotai/kimi-k2.6'
    ];

    if (!validModels.includes(model)) {
      return res.status(400).json({ ...credit, status: false, result: 'Model tidak valid' });
    }

    // ========== RATE LIMIT ==========
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const rateDir = path.join(__dirname, '..', 'cache', 'ratelimit');
    
    try {
      if (!fs.existsSync(rateDir)) {
        fs.mkdirSync(rateDir, { recursive: true });
      }
    } catch (e) { /* ignore */ }

    const rateFile = path.join(rateDir, crypto.createHash('md5').update(ip).digest('hex') + '.json');
    const now = Date.now() / 1000;

    let rate = { last_request: 0, ban_until: 0 };

    try {
      if (fs.existsSync(rateFile)) {
        const raw = JSON.parse(fs.readFileSync(rateFile, 'utf8'));
        rate = { ...rate, ...raw };
      }
    } catch (e) { /* ignore */ }

    // Cek banned
    if (rate.ban_until > now) {
      const wait = Math.ceil(rate.ban_until - now);
      return res.status(429).json({
        ...credit,
        status: false,
        result: `IP diblokir sementara, coba lagi dalam ${wait} detik`
      });
    }

    // Cek rate limit 1 detik
    if ((now - rate.last_request) < 1) {
      rate.ban_until = now + 60;
      try { fs.writeFileSync(rateFile, JSON.stringify(rate)); } catch (e) { /* ignore */ }

      return res.status(429).json({
        ...credit,
        status: false,
        result: 'Rate limit terlampaui, IP diblokir selama 1 menit'
      });
    }

    rate.last_request = now;
    rate.ban_until = 0;
    try { fs.writeFileSync(rateFile, JSON.stringify(rate)); } catch (e) { /* ignore */ }

    // ========== CHATDAY AI ==========
    const base_url = 'https://www.chatday.ai';
    const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36';

    function uuidv4() {
      return crypto.randomUUID();
    }

    try {
      // Anonymous Sign In
      const loginRes = await axios.post(base_url + '/api/auth/sign-in/anonymous', {}, {
        headers: {
          'User-Agent': UA,
          'Origin': base_url,
          'Referer': base_url + '/chat',
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      // Ambil cookie dari response header
      const setCookie = loginRes.headers['set-cookie'] || [];
      const cookies = setCookie.map(c => c.split(';')[0]);
      const cookie = cookies.join('; ');

      // Buat ID
      const visitorId = uuidv4().replace(/-/g, '');
      const conversationId = crypto.createHash('md5').update(Date.now().toString() + Math.random().toString()).digest('hex').substring(0, 16).toUpperCase();

      // Chat request
      const chatRes = await axios.post(base_url + '/api/v2/chat/anonymous', {
        content: prompt,
        model: model,
        visitorId: visitorId,
        conversationId: conversationId
      }, {
        headers: {
          'User-Agent': UA,
          'Origin': base_url,
          'Referer': base_url + '/chat',
          'Content-Type': 'application/json',
          'Cookie': cookie,
          'Accept': 'text/event-stream'
        },
        timeout: 60000,
        responseType: 'text'
      });

      // Parse SSE
      let answer = '';
      const lines = chatRes.data.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;

        const json = line.substring(5).trim();
        if (!json) continue;

        try {
          const evt = JSON.parse(json);
          if (evt.type === 'text-delta' && evt.delta) {
            answer += evt.delta;
          }
        } catch (e) { /* skip bad JSON */ }
      }

      // Hapus key creator/author dari result
      function removeKeys(obj, keys) {
        if (typeof obj !== 'object' || obj === null) return obj;
        if (Array.isArray(obj)) return obj.map(v => removeKeys(v, keys));
        const cleaned = {};
        for (const [k, v] of Object.entries(obj)) {
          if (!keys.includes(k.toLowerCase())) {
            cleaned[k] = removeKeys(v, keys);
          }
        }
        return cleaned;
      }

      const result = removeKeys({ model, response: answer }, ['creator', 'author']);

      return res.json({
        ...credit,
        status: true,
        result: result
      });

    } catch (err) {
      return res.status(500).json({
        ...credit,
        status: false,
        result: err.message
      });
    }
  }
};
