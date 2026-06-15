// params : ?q=elf
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Search',
  creator: 'Nanzz',
  params: ['q'],
  'desc-q': 'Kata kunci pencarian',
  desc: 'NekoPoi Search — Cari hentai/JAV',

  async run(req, res) {
    const q = String(req.query.q || req.body.q || '').trim();
    if (!q) return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Parameter q wajib diisi' });

    try {
      const { data } = await axios.get(`https://nekopoi.care/?s=${encodeURIComponent(q)}&post_type=anime`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html'
        },
        timeout: 30000
      });

      const $ = cheerio.load(data);
      const results = [];

      $('.nk-post-card, .nk-hentai-grid li, article').each((i, el) => {
        const title = $(el).find('h2 a, .title').first().text().trim();
        const link = $(el).find('h2 a, a').first().attr('href') || '';
        const thumb = $(el).find('[style*="background"]').attr('style') || '';
        const imgUrl = (thumb.match(/url\('(.+?)'\)/) || [])[1] || '';

        if (title && link) {
          results.push({ title, link, thumbnail: imgUrl });
        }
      });

      if (!results.length) {
        return res.status(404).json({ status: false, creator: 'Nanzz', message: 'Tidak ditemukan' });
      }

      return res.json({
        status: true,
        creator: 'Nanzz',
        query: q,
        total: results.length,
        result: results.slice(0, 20)
      });

    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    }
  }
};
