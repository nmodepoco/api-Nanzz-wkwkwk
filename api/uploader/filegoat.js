// POST — Upload file: {"file": "pilih_file"}
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');
const fs = require('fs');

module.exports = {
  category: 'Upload',
  creator: 'Nanzz',
  post: true,
  paramsFile: ['file'],
  'desc-file': 'File yang ingin diupload ke FileGoat',
  desc: 'FileGoat Uploader — Upload file dapat link direct & download',

  async run(req, res) {
    const file = req.file || (req.files || [])[0];

    if (!file) {
      return res.status(400).json({ status: false, creator: 'Nanzz', message: 'File wajib diupload' });
    }

    const BASE = 'https://filego.at';
    const S3_BASE = 'https://filegoat.s3.de.io.cloud.ovh.net';

    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(file.path), {
        filename: file.originalname,
        contentType: file.mimetype
      });

      const uploadRes = await axios.post(`${BASE}/api/file/upload`, form, {
        headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0', Origin: BASE },
        timeout: 60000
      });

      const uploadData = uploadRes.data;
      const fileIds = uploadData.fileIds || uploadData.ids || [uploadData.id].filter(Boolean);

      if (!fileIds.length) {
        return res.status(500).json({ status: false, creator: 'Nanzz', message: 'Upload gagal' });
      }

      const clientId = crypto.randomBytes(16).toString('hex');
      const bucketRes = await axios.post(`${BASE}/api/bucket`, {
        fileIds, deleteTime: 7, extendOnView: false, clientId
      }, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (!bucketRes.data.slug) {
        return res.status(500).json({ status: false, creator: 'Nanzz', message: 'Bucket gagal' });
      }

      const slug = bucketRes.data.slug;
      const detailRes = await axios.get(`${BASE}/api/bucket/${slug}`, { timeout: 30000 });
      const detail = detailRes.data;

      const files = (detail.files || []).map(f => ({
        name: f.fileName || f.file_name || '',
        size: f.bytes || 0,
        direct: `${S3_BASE}/${f.savedName || f.saved_name}/${f.fileName || f.file_name}`,
        download: `${S3_BASE}/${f.savedName || f.saved_name}/${f.fileName || f.file_name}?download=true`
      }));

      return res.json({
        status: true,
        creator: 'Nanzz',
        result: { slug, url: `${BASE}/bucket/${slug}`, files }
      });
    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    }
  }
};