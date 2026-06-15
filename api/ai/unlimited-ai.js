// params : ?prompt=halo&model=chat-model-reasoning
const axios = require('axios');
const crypto = require('crypto');

module.exports = {
  category: 'Ai-chat',
  creator: 'Nanzz',
  params: ['prompt', 'model'],
  'desc-prompt': 'Pertanyaan untuk AI',
  'desc-model': 'Pilih model AI',

  paramsSelect: {
    model: ['chat-model-reasoning', 'chat-model-standard']
  },

  desc: 'UnlimitedAI Chat — 2 model AI',

  async run(req, res) {
    const prompt = String(req.query.prompt || req.body.prompt || '').trim();
    const model = String(req.query.model || req.body.model || 'chat-model-reasoning').trim();
    if (!prompt) return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Parameter prompt wajib diisi' });

    const chatId = crypto.randomUUID();
    const messageId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const deviceId = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    try {
      const { data } = await axios.post('https://app.unlimitedai.chat/api/chat', {
        chatId, messages: [
          { id: messageId, role: 'user', content: prompt, parts: [{ type: 'text', text: prompt }], createdAt: timestamp },
          { id: assistantId, role: 'assistant', content: '', parts: [{ type: 'text', text: '' }], createdAt: timestamp }
        ],
        selectedChatModel: model, selectedCharacter: null, selectedStory: null, deviceId, locale: 'id'
      }, {
        headers: { 'Content-Type': 'application/json', 'x-next-intl-l