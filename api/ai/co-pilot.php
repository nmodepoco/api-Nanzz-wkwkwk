// params : ?q=halo
const axios = require('axios');

module.exports = {
  category: 'Ai-chat',
  creator: 'Nanzz',
  params: ['q'],
  'desc-q': 'Pertanyaan untuk Copilot AI',
  desc: 'Copilot AI Pro — GPT-5 model',

  async run(req, res) {
    const q = String(req.query.q || req.body.q || '').trim();
    if (!q) return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Parameter q wajib diisi' });

    function cleanWatermark(obj) {
      if (typeof obj !== 'object' || obj === null) return;
      delete obj.creator; delete obj.author; delete obj.attribution; delete obj.code;
      Object.values(obj).forEach(v => { if (typeof v === 'object') cleanWatermark(v); });
    }

    try {
      const { data } = await axios.get(`https://api.lexcode.biz.id/api/ai/copilot?prompt=${encodeURIComponent(q)}&model=gpt-5`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 35000
      });

      if (data.status === false) {
        const msg = (data.message || data.msg || 'Upstream Error').replace(/lexcode|❌/gi, '').trim();
        return res.json({ status: false, creator: 'Nanzz', result: { message: msg } });
      }

      const result = data.result || data.data || data;
      cleanWatermark(result);
      return res.json({ status: true, creator: 'Nanzz', result });
    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    }
  }
};