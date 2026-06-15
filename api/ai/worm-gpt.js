// params : ?prompt=cara+hek+nasa
const axios = require('axios');

module.exports = {
  category: 'Ai-chat',
  creator: 'Nanzz',
  params: ['prompt'],
  'desc-prompt': 'Pertanyaan untuk WormGPT AI',
  desc: 'WormGPT AI Chat — Uncensored AI',

  async run(req, res) {
    const prompt = String(req.query.prompt || req.body.prompt || '').trim();
    if (!prompt) return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Parameter prompt wajib diisi' });

    function removeKeysRecursive(obj, keys) {
      if (typeof obj !== 'object' || obj === null) return obj;
      if (Array.isArray(obj)) return obj.map(v => removeKeysRecursive(v, keys));
      const cleaned = {};
      for (const [k, v] of Object.entries(obj)) {
        if (!keys.includes(k.toLowerCase())) cleaned[k] = removeKeysRecursive(v, keys);
      }
      return cleaned;
    }

    const keysToRemove = ['creator', 'creathor', 'author', 'apikey', 'api_key', 'status', 'name'];

    try {
      const { data } = await axios.get(`https://apiz.xhclinton.me/api/ai/wormgpt?apikey=toxicapis&prompt=${encodeURIComponent(prompt)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K)', 'Accept': 'application/json' },
        timeout: 30000
      });

      const cleaned = removeKeysRecursive(data, keysToRemove);
      return res.json({ status: true, creator: 'Nanzz', result: cleaned });
    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    }
  }
};