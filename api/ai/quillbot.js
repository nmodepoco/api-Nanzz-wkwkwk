// params : ?text=halo
const axios = require('axios');
const crypto = require('crypto');

module.exports = {
  category: 'Ai-chat',
  creator: 'Nanzz',
  params: ['text'],
  'desc-text': 'Pertanyaan untuk Quillbot AI',
  desc: 'Quillbot AI Chat',

  async run(req, res) {
    const text = String(req.query.text || req.body.text || '').trim();
    if (!text) return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Parameter text diperlukan' });

    const conversationId = crypto.randomUUID();
    const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36';

    try {
      await axios.get('https://quillbot.com/', { headers: { 'User-Agent': UA, 'Accept': 'text/html' }, timeout: 30000 });

      const { data } = await axios.post(`https://quillbot.com/api/ai-chat/chat/conversation/${conversationId}`, {
        message: { content: text + '\n\n' },
        context: { editorContext: '', selectionContext: '', userDialect: 'en-us', apiVersion: 2 },
        origin: { name: 'ai-chat.chat', url: 'https://quillbot.com' }
      }, {
        headers: {
          'User-Agent': UA, 'Content-Type': 'application/json',
          'Origin': 'https://quillbot.com', 'Referer': `https://quillbot.com/ai-chat/c/${conversationId}`,
          'webapp-version': '42.51.6', 'qb-product': 'AI-CHAT', 'platform-type': 'webapp'
        },
        timeout: 60000, responseType: 'text'
      });

      let result = '';
      for (const line of data.split('\n')) {
        if (line.trim().startsWith('{')) {
          try { const j = JSON.parse(line.trim()); if (j.type === 'content') result += j.content || ''; } catch (e) {}
        }
      }

      return res.json({ status: true, creator: 'Nanzz', input: text, result: result || 'Gagal' });
    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    }
  }
};