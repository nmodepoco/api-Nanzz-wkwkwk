// params : ?q=buatkan+fungsi+sorting+php
const axios = require('axios');

module.exports = {
  category: 'Ai',
  creator: 'Nanzz',
  params: ['q'],
  'desc-q': 'Pertanyaan atau prompt untuk Blackbox AI',
  desc: 'Blackbox AI Engine — Tanya coding atau apapun ke Blackbox AI',

  async run(req, res) {
    const q = String(req.query.q || req.body.q || '').trim();

    if (!q) {
      return res.status(400).json({
        status: false,
        creator: 'Nanzz',
        message: 'Parameter q wajib diisi'
      });
    }

    const payload = {
      messages: [
        {
          role: 'user',
          content: q,
          id: 'S4ejD3n'
        }
      ],
      id: 'V8xrcYS',
      previewToken: null,
      userId: null,
      codeModelMode: true,
      trendingAgentMode: {},
      isMicMode: false,
      userSystemPrompt: null,
      maxTokens: 1024,
      userSelectedAgent: 'VscodeAgent',
      validated: 'a38f5889-8fef-46d4-8ede-bf4668b6a9bb',
      webSearchModeOption: {
        autoMode: true,
        webMode: false,
        offlineMode: false
      },
      session: {
        user: {
          name: 'mas amba',
          email: 'masamba@gmail.com',
          id: 'd75c762a-a582-4516-8d64-b7fdf1b7f929'
        }
      },
      isPremium: false
    };

    try {
      const { status, data } = await axios.post('https://app.blackbox.ai/api/chat', payload, {
        headers: {
          'Host': 'app.blackbox.ai',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36',
          'Origin': 'https://app.blackbox.ai',
          'Referer': 'https://app.blackbox.ai/'
        },
        timeout: 45000,
        responseType: 'text'
      });

      if (status === 200 && data) {
        return res.json({
          status: true,
          creator: 'Nanzz',
          result: { response: data.trim() }
        });
      }

      return res.status(status).json({
        status: false,
        creator: 'Nanzz',
        message: `Gagal mendapatkan respon valid (HTTP ${status})`
      });

    } catch (err) {
      return res.status(500).json({
        status: false,
        creator: 'Nanzz',
        message: err.message
      });
    }
  }
};
