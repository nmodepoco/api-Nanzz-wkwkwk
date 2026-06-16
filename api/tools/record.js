// params : ?url=https://example.com&duration=10&scroll=true&mode=desktop
const puppeteer = require('puppeteer');
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

module.exports = {
  category: 'Tools',
  creator: 'Nanzz',
  params: ['url', 'duration', 'scroll', 'mode'],
  'desc-url': 'URL website yang mau direkam (wajib http/https)',
  'desc-duration': 'Durasi rekaman dalam detik (default: 10, max: 30)',
  'desc-scroll': 'Auto-scroll? true/false (default: true)',
  'desc-mode': 'Tampilan: desktop atau android (default: desktop)',
  
  paramsSelect: {
    mode: ['desktop', 'android']
  },

  desc: 'Record Website — Rekam website auto-scroll jadi video MP4 (Desktop/Android)',

  async run(req, res) {
    const url = String(req.query.url || req.body.url || '').trim();
    let duration = parseInt(req.query.duration || req.body.duration || '10');
    const scroll = String(req.query.scroll || req.body.scroll || 'true').trim() === 'true';
    const mode = String(req.query.mode || req.body.mode || 'desktop').trim().toLowerCase();

    if (!url) return res.status(400).json({ status: false, creator: 'Nanzz', message: 'URL wajib diisi' });
    if (!url.startsWith('http')) return res.status(400).json({ status: false, creator: 'Nanzz', message: 'URL harus pakai http/https' });
    if (duration > 30) duration = 30;
    if (duration < 3) duration = 3;

    // Config viewport
    const viewports = {
      desktop: { width: 1280, height: 720, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36' },
      android: { width: 412, height: 915, userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36' }
    };

    const vp = viewports[mode] || viewports.desktop;

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webvid-'));
    const outputPath = path.join(tmpDir, 'output.mp4');

    try {
      const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });

      const page = await browser.newPage();
      await page.setViewport({ width: vp.width, height: vp.height });
      await page.setUserAgent(vp.userAgent);

      // Kalau android, tambahin extra header
      if (mode === 'android') {
        await page.setExtraHTTPHeaders({
          'Accept-Language': 'id-ID,id;q=0.9,en;q=0.8'
        });
      }

      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Screenshot frame demi frame
      const fps = 12;
      const totalFrames = duration * fps;
      const frameInterval = 1000 / fps;
      const frames = [];

      for (let i = 0; i < totalFrames; i++) {
        const framePath = path.join(tmpDir, `frame-${String(i).padStart(4, '0')}.png`);
        await page.screenshot({ path: framePath });
        frames.push(framePath);

        if (scroll) {
          await page.evaluate(() => window.scrollBy(0, 5));
        }

        if (i < totalFrames - 1) {
          await new Promise(r => setTimeout(r, frameInterval));
        }
      }

      await browser.close();

      // Concat frames jadi video
      const concatPath = path.join(tmpDir, 'concat.txt');
      fs.writeFileSync(concatPath, frames.map(f => `file '${f}'`).join('\n'));

      await new Promise((resolve, reject) => {
        execFile('ffmpeg', [
          '-y', '-f', 'concat', '-safe', '0', '-i', concatPath,
          '-vf', `fps=${fps},scale=${vp.width}:${vp.height}:flags=lanczos,format=yuv420p`,
          '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
          '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
          outputPath
        ], { maxBuffer: 1024 * 1024 * 50 }, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      const videoBuffer = fs.readFileSync(outputPath);
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Content-Disposition', `inline; filename="record-${mode}-${Date.now()}.mp4"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      return res.send(videoBuffer);

    } catch (err) {
      return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
    } finally {
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
    }
  }
};