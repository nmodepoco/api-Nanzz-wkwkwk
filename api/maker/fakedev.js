// params : ?urlfoto=https://example.com/foto.jpg&text1=Nanzz&text2=@nanzzapi
const axios = require('axios');
const { createCanvas, loadImage, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BG_URL = 'https://raw.githubusercontent.com/saurusaraara/penting/refs/heads/main/image/logo_bg.jpg';
const VERIFIED_URL = 'https://raw.githubusercontent.com/saurusaraara/penting/refs/heads/main/image/pngtree-instagram-bule-tick-insta-blue-star-vector-png-image-6695210.png';
const FONT_URL_ANTON = 'https://raw.githubusercontent.com/saurusaraara/penting/main/font/Anton-Regular.ttf';

const TMP_DIR = path.join(os.tmpdir(), 'fakedev_tmp');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

let fontLoaded = false;

async function loadFont() {
    if (fontLoaded) return;
    try {
        const fontPath = path.join(TMP_DIR, 'Anton-Regular.ttf');
        if (!fs.existsSync(fontPath)) {
            const { data } = await axios.get(FONT_URL_ANTON, { responseType: 'arraybuffer', timeout: 10000 });
            fs.writeFileSync(fontPath, Buffer.from(data));
        }
        registerFont(fontPath, { family: 'AntonX' });
        fontLoaded = true;
    } catch (e) {}
}

function drawArcText(ctx, text, cx, cy, radiusText, midAngle, isTop, fontFamily) {
    text = String(text || '').trim();
    if (!text) return { totalAngle: 0 };

    let fontSize = 64;
    if (text.length > 14) fontSize = 58;
    if (text.length > 18) fontSize = 52;
    if (text.length > 22) fontSize = 46;

    ctx.font = `900 ${fontSize}px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(10, Math.floor(fontSize * 0.20));
    ctx.strokeStyle = 'rgba(0,0,0,0.86)';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.60)';
    ctx.shadowBlur = 10;

    const gap = 5;
    const widths = [];
    let totalW = 0;
    for (const ch of text) {
        const w = ctx.measureText(ch).width + gap;
        widths.push(w);
        totalW += w;
    }

    const maxArc = isTop ? Math.PI * 0.82 : Math.PI * 0.68;
    const totalAngle = Math.min(maxArc, totalW / radiusText);

    if (isTop) {
        let cursor = midAngle - totalAngle / 2;
        for (let i = 0; i < text.length; i++) {
            const step = widths[i] / radiusText;
            const a = cursor + step / 2;
            const x = cx + Math.cos(a) * radiusText;
            const y = cy + Math.sin(a) * radiusText;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(a + Math.PI / 2);
            ctx.strokeText(text[i], 0, 0);
            ctx.fillText(text[i], 0, 0);
            ctx.restore();
            cursor += step;
        }
    } else {
        let cursor = midAngle + totalAngle / 2;
        for (let i = 0; i < text.length; i++) {
            const step = widths[i] / radiusText;
            const a = cursor - step / 2;
            const x = cx + Math.cos(a) * radiusText;
            const y = cy + Math.sin(a) * radiusText;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(a - Math.PI / 2);
            ctx.strokeText(text[i], 0, 0);
            ctx.fillText(text[i], 0, 0);
            ctx.restore();
            cursor -= step;
        }
    }
    return { totalAngle };
}

function drawDot(ctx, a, rad, cx, cy) {
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.restore();
}

module.exports = {
    category: 'Maker',
    creator: 'Nanzz',
    params: ['urlfoto', 'text1', 'text2'],
    'desc-urlfoto': 'URL foto profil',
    'desc-text1': 'Nama / judul utama (maks 30 karakter)',
    'desc-text2': 'Username / subtitle (maks 30 karakter)',
    desc: 'FakeDev Card Generator — Kartu developer aesthetic HD',

    async run(req, res) {
        const urlfoto = String(req.query.urlfoto || req.body.urlfoto || '').trim();
        const text1 = String(req.query.text1 || req.body.text1 || 'Nanzz').trim().slice(0, 30);
        const text2 = String(req.query.text2 || req.body.text2 || '@nanzzapi').trim().slice(0, 30);

        if (!urlfoto) {
            return res.status(400).json({ status: false, creator: 'Nanzz', message: 'Parameter urlfoto wajib diisi' });
        }

        const tmpOut = path.join(TMP_DIR, `fakedev_${Date.now()}.png`);

        try {
            await loadFont();
            const FONT_FAMILY = fontLoaded ? 'AntonX' : 'sans-serif';
            const W = 1024, H = 1024;
            const cx = W / 2, cy = H / 2;

            const canvas = createCanvas(W, H);
            const ctx = canvas.getContext('2d');

            // Background
            try {
                const bg = await loadImage(BG_URL);
                const ir = bg.width / bg.height;
                const cr = W / H;
                let dw, dh;
                if (ir > cr) { dh = H; dw = bg.width * (H / bg.height); }
                else { dw = W; dh = bg.height * (W / bg.width); }
                ctx.drawImage(bg, (W - dw) / 2, (H - dh) / 2, dw, dh);
            } catch (e) {
                ctx.fillStyle = '#0b0f17';
                ctx.fillRect(0, 0, W, H);
            }

            // Overlay
            ctx.fillStyle = 'rgba(0,0,0,0.18)';
            ctx.fillRect(0, 0, W, H);

            const vign = ctx.createRadialGradient(cx, cy, 260, cx, cy, 720);
            vign.addColorStop(0, 'rgba(0,0,0,0)');
            vign.addColorStop(1, 'rgba(0,0,0,0.35)');
            ctx.fillStyle = vign;
            ctx.fillRect(0, 0, W, H);

            // Avatar
            const avatar = await loadImage(urlfoto);
            const r = 270;

            // Glow
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r + 34, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.06)';
            ctx.shadowColor = 'rgba(255,255,255,0.20)';
            ctx.shadowBlur = 32;
            ctx.fill();
            ctx.restore();

            // Avatar clip
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.clip();
            const crop = Math.min(avatar.width, avatar.height);
            ctx.drawImage(avatar, (avatar.width - crop) / 2, (avatar.height - crop) / 2, crop, crop, cx - r, cy - r, r * 2, r * 2);
            ctx.restore();

            // Rings
            const ring = (rad, w, color, blur = 0) => {
                ctx.save();
                ctx.beginPath();
                ctx.arc(cx, cy, rad, 0, Math.PI * 2);
                ctx.strokeStyle = color;
                ctx.lineWidth = w;
                ctx.shadowColor = color;
                ctx.shadowBlur = blur;
                ctx.stroke();
                ctx.restore();
            };
            ring(r + 12, 18, 'rgba(255,255,255,0.95)', 10);
            ring(r + 30, 6, 'rgba(0,0,0,0.55)');
            ring(r + 42, 4, 'rgba(255,255,255,0.35)', 8);

            // Text
            const textRadius = r + 92;
            const topInfo = drawArcText(ctx, text1, cx, cy, textRadius, -Math.PI / 2, true, FONT_FAMILY);

            // Verified badge
            try {
                const verifiedImg = await loadImage(VERIFIED_URL);
                if (topInfo.totalAngle > 0) {
                    const endA = (-Math.PI / 2) + (topInfo.totalAngle / 2) + 0.09;
                    const bx = cx + Math.cos(endA) * (textRadius - 4);
                    const by = cy + Math.sin(endA) * (textRadius - 4);
                    const size = 58;
                    ctx.save();
                    ctx.translate(bx, by);
                    ctx.rotate(endA + Math.PI / 2 - 0.18);
                    ctx.drawImage(verifiedImg, -size / 2, -size / 2, size, size);
                    ctx.restore();
                }
            } catch (e) {}

            drawArcText(ctx, text2, cx, cy, textRadius, Math.PI / 2, false, FONT_FAMILY);
            drawDot(ctx, 0, textRadius, cx, cy);
            drawDot(ctx, Math.PI, textRadius, cx, cy);

            // Output
            fs.writeFileSync(tmpOut, canvas.toBuffer('image/png'));
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=86400');

            const stream = fs.createReadStream(tmpOut);
            stream.pipe(res);
            stream.on('end', () => { try { fs.unlinkSync(tmpOut); } catch (e) {} });

        } catch (err) {
            try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch (e) {}
            return res.status(500).json({ status: false, creator: 'Nanzz', message: err.message });
        }
    }
};
