// params : POST — {"username":"jhon","name":"nana","email":"a@b.com","password":"123"}
const axios = require('axios');
const crypto = require('crypto');

module.exports = {
  category: 'Tools',
  creator: 'Nanzz',
  post: true,
  params: ['username', 'name', 'email', 'password'],
  'desc-username': 'Username',
  'desc-name': 'Nama display',
  'desc-email': 'Email',
  'desc-password': 'Password',
  desc: 'Register Theresa API — Auto bypass IP limit dengan random IP',

  async run(req, res) {
    const username = String(req.body.username || req.query.username || '').trim();
    const name = String(req.body.name || req.query.name || '').trim();
    const email = String(req.body.email || req.query.email || '').trim();
    const password = String(req.body.password || req.query.password || '').trim();

    if (!username || !name || !email || !password) {
      return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Semua parameter wajib diisi' });
    }

    // Generate random IP (spoof)
    function randomIP() {
      return `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    }

    const fakeIP = randomIP();

    try {
      const response = await axios.post('https://api.theresav.biz.id/auth/register', {
        username, name, email, password
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
          'X-Forwarded-For': fakeIP,
          'CF-Connecting-IP': fakeIP,
          'X-Real-IP': fakeIP,
          'Origin': 'https://api.theresav.biz.id'
        },
        timeout: 30000,
        validateStatus: () => true
      });

      return res.json({
        status: response.data?.status || false,
        creator: 'Nanzz',
        used_ip: fakeIP,
        result: response.data
      });

    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    }
  }
};
