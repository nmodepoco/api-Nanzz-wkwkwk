// POST — {"username":"jhonchena","name":"nanananananna","email":"ocody43877@gmail.com","password":"nanananannaa"}
const axios = require('axios');

module.exports = {
  category: 'Tools',
  creator: 'Nanzz',
  post: true,
  params: ['username', 'name', 'email', 'password'],
  'desc-username': 'Username untuk akun',
  'desc-name': 'Nama display',
  'desc-email': 'Email untuk registrasi',
  'desc-password': 'Password akun',
  desc: 'Register Theresa API',

  async run(req, res) {
    const username = String(req.body.username || req.query.username || '').trim();
    const name = String(req.body.name || req.query.name || '').trim();
    const email = String(req.body.email || req.query.email || '').trim();
    const password = String(req.body.password || req.query.password || '').trim();

    if (!username || !name || !email || !password) {
      return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Semua parameter (username, name, email, password) wajib diisi' });
    }

    try {
      const response = await axios.post('https://api.theresav.biz.id/auth/register', {
        username, name, email, password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
          'Origin': 'https://theresav.biz.id',
          'Referer': 'https://theresav.biz.id/'
        },
        timeout: 30000,
        validateStatus: () => true
      });

      return res.json({
        status: response.status === 200 || response.status === 201,
        creator: 'Nanzz',
        http_code: response.status,
        result: response.data
      });

    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    }
  }
};