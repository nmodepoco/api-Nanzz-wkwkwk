// params : ?type=
const axios = require('axios');
const cheerio = require('cheerio');

module.exports = {
  category: 'Download',
  creator: 'Nanzz',
  params: ['type'],
  'desc-type': 'Jenis konten (hentai / episode / jav)',
  
  paramsSelect: {
    type: ['hentai', 'episode', 'jav']
  },

  desc: 'NekoPoi Scraper — Hentai, Episode Terbaru, JAV Sub Indo',

  async run(req, res) {
    const type = String(req.query.type || req.body.type || 'hentai').trim().toLowerCase();

    try {
      const { data } = await axios.get('https://nekopoi.care/', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html'
        },
        timeout: 30000
      });

      const $ = cheerio.load(data);
      let results = [];

      if (type === 'hentai') {
        $('.nk-hentai-grid ul li').each((i, el) => {
          const title = $(el).find('.title').text().trim();
          const link = $(el).find('a').attr('href') || '';
          const thumb = $(el).find('.nk-hentai-thumb').attr('style') || '';
          const imgUrl = (thumb.match(/url\('(.+?)'\)/) || [])[1] || '';
          
          if (title) {
            results.push({ title, link, thumbnail: imgUrl });
          }
        });
      }

      else if (type === 'episode') {
        $('#nk-episode-grid .nk-post-card').each((i, el) => {
          const title = $(el).find('h2 a').text().trim();
          const link = $(el).find('h2 a').attr('href') || '';
          const date = $(el).find('.dashicons-calendar-alt').parent().text().trim();
          const thumb = $(el).find('.nk-thumb-crop').attr('style') || '';
          const imgUrl = (thumb.match(/url\('(.+?)'\)/) || [])[1] || '';
          const series = $(el).find('a[href*="/hentai/"], a[href*="/jav/"], a[href*="/3d/"], a[href*="/l2d/"]').last().text().trim();

          if (title) {
            results.push({ title, link, date, thumbnail: imgUrl, series: series || null });
          }
        });
      }

      else if (type === 'jav') {
        $('.nk-jav-grid ul li').each((i, el) => {
          const title = $(el).find('h2').text().trim();
          const link = $(el).find('a').attr('href') || '';
          const date = $(el).find('.dashicons-calendar-alt').parent().text().trim();
          const thumb = $(el).find('.nk-grid-thumb').attr('style') || '';
          const imgUrl = (thumb.match(/url\('(.+?)'\)/) || [])[1] || '';

          if (title) {
            results.push({ title, link, date, thumbnail: imgUrl });
          }
        });
      }

      if (!results.length) {
        return res.status(404).json({ status: false, creator: 'Nanzz', message: 'Data tidak ditemukan' });
      }

      return res.json({
        status: true,
        creator: 'Nanzz',
        type,
        total: results.length,
        result: results
      });

    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    }
  }
};
