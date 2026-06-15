// params : ?text=king+biologi
const axios = require('axios');

module.exports = {
  category: 'Ai-chat',
  creator: 'Nanzz',
  params: ['text'],
  'desc-text': 'Deskripsi untuk generate prompt',
  desc: 'AI Prompt Generator — English & Indonesian',

  async run(req, res) {
    const text = String(req.query.text || req.body.text || '').trim();
    if (!text) return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Parameter text diperlukan' });

    const result = { english: '', indonesian: '' };

    try {
      for (let i = 0; i < 3; i++) {
        const { data } = await axios.post('https://generateprompt-faddai.vercel.app/api/generate', { prompt: text, mode: 'stream' }, {
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
          timeout: 60000, responseType: 'text'
        });

        for (const line of data.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const json = JSON.parse(line.slice(6));
            if (json.english) result.english = json.english;
            if (json.indonesian) result.indonesian = json.indonesian;
          } catch (e) {}
        }

        if (result.english || result.indonesian) break;
        await new Promise(r => setTimeout(r, 500));
      }

      return res.json({ status: !!(result.english || result.indonesian), creator: 'Nanzz', input: text, result });
    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    }
  }
};