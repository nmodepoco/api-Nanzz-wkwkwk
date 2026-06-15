// params : ?text=halo+apa+kabar&model=chatgpt
const axios = require('axios');
const crypto = require('crypto');
const querystring = require('querystring');
const fs = require('fs');
const os = require('os');
const path = require('path');

module.exports = {
  category: 'Ai-chat',
  creator: 'Nanzz',
  params: ['text', 'model'],
  'desc-text': 'Pertanyaan atau prompt untuk AI',
  'desc-model': 'Pilih model AI yang ingin digunakan',

  paramsSelect: {
    model: [
      'chatgpt',
      'deepseek',
      'claude',
      'grok',
      'perplexity',
      'llama',
      'qwen'
    ]
  },

  desc: 'ChatGPT Free AI — Multi model (ChatGPT, DeepSeek, Claude, Grok, Perplexity, Llama, Qwen)',

  async run(req, res) {
    const text = String(req.query.text || req.body.text || '').trim();
    const model = String(req.query.model || req.body.model || 'chatgpt').trim().toLowerCase();

    const credit = { creator: 'Nanzz' };

    if (!text) {
      return res.status(400).json({ ...credit, status: false, message: 'Parameter text wajib diisi' });
    }

    const models = {
      chatgpt:    { bot_id: 25871, name: 'ChatGPT 5 Nano' },
      deepseek:   { bot_id: 25873, name: 'DeepSeek' },
      claude:     { bot_id: 25875, name: 'Claude' },
      grok:       { bot_id: 25872, name: 'Xai (Grok)' },
      perplexity: { bot_id: 29624, name: 'Perplexity Sonar' },
      llama:      { bot_id: 25870, name: 'Meta: Llama 4 Maverick' },
      qwen:       { bot_id: 25869, name: 'Qwen 3 30B A3B' }
    };

    if (!models[model]) {
      return res.status(400).json({ ...credit, status: false, message: `Model tidak valid. Pilih: ${Object.keys(models).join(', ')}` });
    }

    const cfg = models[model];
    const BASE = 'https://chatgptfree.ai';
    const AJAX = BASE + '/wp-admin/admin-ajax.php';
    const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    const jarFile = path.join(os.tmpdir(), `gptfree_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`);
    const fsPromises = fs.promises || fs;

    function uuid() {
      return crypto.randomUUID();
    }

    try {
      // Init session
      await axios.get(BASE + '/chat/', {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 30000,
        withCredentials: true
      });

      // Simpan cookie dummy
      await fsPromises.writeFile(jarFile, '');

      // Get nonce
      const nonceRes = await axios.post(AJAX, querystring.stringify({
        action: 'aipkit_get_frontend_chat_nonce',
        bot_id: '25871',
        post_id: '261'
      }), {
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': BASE + '/chat/',
          'Origin': BASE,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 30000
      });

      const nonce = nonceRes.data?.data?.nonce || '';
      if (!nonce) throw new Error(`Gagal nonce: HTTP ${nonceRes.status} - ${JSON.stringify(nonceRes.data).substring(0, 200)}`);

      const suid = uuid();
      const cuid = uuid();
      const mid = uuid();
      const ckey = uuid();
      const ts = String(Date.now());

      // Cache message
      const cacheRes = await axios.post(AJAX, querystring.stringify({
        action: 'aipkit_cache_sse_message',
        bot_id: cfg.bot_id,
        message: text,
        _ajax_nonce: nonce,
        post_id: '261',
        user_client_message_id: mid,
        cache_key: ckey,
        session_id: suid,
        conversation_uuid: cuid,
        _ts: ts
      }), {
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json, text/javascript, */*; q=0.01',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': BASE + '/chat/',
          'Origin': BASE,
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 30000
      });

      if (!cacheRes.data?.success) throw new Error('Cache failed: ' + JSON.stringify(cacheRes.data));

      const cacheKey = cacheRes.data.data.cache_key;
      const streamUrl = `${AJAX}?action=aipkit_frontend_chat_stream&cache_key=${encodeURIComponent(cacheKey)}&bot_id=${cfg.bot_id}&session_id=${suid}&conversation_uuid=${cuid}&post_id=261&_ajax_nonce=${encodeURIComponent(nonce)}&_ts=${ts}`;

      // Stream
      const streamRes = await axios.get(streamUrl, {
        headers: {
          'User-Agent': UA,
          'Accept': 'text/event-stream',
          'Referer': BASE + '/chat/',
          'Origin': BASE,
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 60000,
        responseType: 'text'
      });

      // Parse SSE
      let fullText = '';
      const lines = streamRes.data.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const j = JSON.parse(line.substring(6));
            if (j && j.delta) fullText += j.delta;
            if (j && j.finished) break;
          } catch (e) { /* skip bad JSON */ }
        }
      }

      if (!fullText) throw new Error('Response kosong');

      return res.json({
        ...credit,
        status: true,
        result: {
          model: cfg.name,
          text: fullText
        }
      });

    } catch (err) {
      return res.status(500).json({
        ...credit,
        status: false,
        message: err.message
      });
    } finally {
      // Cleanup
      try { await fsPromises.unlink(jarFile); } catch (e) { /* ignore */ }
    }
  }
};
