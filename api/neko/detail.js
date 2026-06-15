// params : ?url=https://nekopoi.care/hentai/shinkyoku-no-grimoire/
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Download',
  creator: 'Nanzz',
  params: ['url'],
  'desc-url': 'URL halaman detail NekoPoi',
  desc: 'NekoPoi Detail — Info + Download Links',

  async run(req, res) {
    const url = String(req.query.url || req.body.url || '').trim();
    if (!url) return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Parameter url wajib diisi' });
    if (!url.includes('nekopoi.care')) return res.status(400).json({ status: false, creator: 'Nanzz', message: 'URL harus dari NekoPoi' });

    try {
      const { data } = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html'
        },
        timeout: 30000
      });

      const $ = cheerio.load(data);

      const title = $('h1').first().text().trim() || $('.entry-title').text().trim();
      const thumb = $('.nk-thumb-crop, .nk-hentai-thumb').attr('style') || '';
      const imgUrl = (thumb.match(/url\('(.+?)'\)/) || [])[1] || '';
      const downloadLinks = [];

      // Cari semua link download
      $('a[href*="download"], a[href*="dl."], a[href*="mega"], a[href*="drive"]').each((i, el) => {
        const dlUrl = $(el).attr('href') || '';
        const label = $(el).text().trim() || 'Download ' + (i + 1);
        if (dlUrl) downloadLinks.push({ label, url: dlUrl });
      });

      // Cari info tambahan
      const infoRows = [];
      $('.nk-tooltip-detail p, .entry-content p, .nk-post-meta span').each((i, el) => {
        const txt = $(el).text().trim();
        if (txt && txt.length > 3) infoRows.push(txt);
      });

      return res.json({
        status: true,
        creator: 'Nanzz',
        result: {
          title,
          thumbnail: imgUrl,
          info: infoRows.slice(0, 10),
          downloads: downloadLinks
        }
      });

    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    }
  }
};
