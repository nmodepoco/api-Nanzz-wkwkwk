// params : ?url=https://example.com/foto.jpg
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
  category: 'Image',
  creator: 'Nanzz',
  post: true,
  params: ['url'],
  paramsFile: ['file'],
  'desc-url': 'URL gambar (opsional kalau upload file)',
  'desc-file': 'Upload file gambar',
  desc: 'AI Ghibli Transformer — Ubah foto jadi gaya Studio Ghibli',

  async run(req, res) {
    let imageUrl = String(req.query.url || req.body.url || '').trim();
    const hasFile = req.file;
    const prompt = 'Transform this person into Studio Ghibli anime style. Give them large expressive anime eyes, soft features, and that signature Ghibli art style. Place them in a beautiful Ghibli-style background with soft watercolor-like colors, gentle lighting, and magical atmosphere. Keep the face recognizable but in Ghibli art style. Add some Ghibli elements like floating spirits, lush nature, or whimsical details. Do not change the person completely, just apply Ghibli art filter.';

    if (!imageUrl && !hasFile) {
      return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Upload file atau masukkan URL' });
    }

    try {
      // Upload file ke CDN kalau ada
      if (hasFile) {
        const filePath = req.file.path;
        const fileName = req.file.originalname;
        const mimeType = req.file.mimetype;

        const form = new FormData();
        form.append('file', fs.createReadStream(filePath), { filename: fileName, contentType: mimeType });

        const uploadRes = await axios.post('https://cdnn.ikyyxd.my.id/api/upload.php', form, {
          headers: form.getHeaders(),
          timeout: 30000
        });

        imageUrl = uploadRes.data.url || uploadRes.data?.result?.url || '';
        
        // Cleanup temp file
        try { fs.unlinkSync(filePath); } catch (e) {}
      }

      if (!imageUrl) {
        return res.status(500).json({ status: false, creator: 'Nanzz', message: 'Upload gagal' });
      }

      // Edit gambar
      const editRes = await axios.get(`https://api.ikyyxd.my.id/edit/nanobananav3?url=${encodeURIComponent(imageUrl)}&prompt=${encodeURIComponent(prompt)}`, {
        timeout: 120000
      });

      const resultUrl = editRes.data?.result?.result_url || editRes.data?.result?.url || '';

      if (!resultUrl) {
        return res.status(500).json({ status: false, creator: 'Nanzz', message: 'Edit gagal' });
      }

      // Download & output
      const imgRes = await axios.get(resultUrl, {
        responseType: 'arraybuffer',
        timeout: 30000
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('X-Creator', 'Nanzz');
      return res.send(Buffer.from(imgRes.data));

    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    }
  }
};
