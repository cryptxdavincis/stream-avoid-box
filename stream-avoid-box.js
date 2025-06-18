import express from 'express';
import { createCanvas } from 'canvas';
import { spawn } from 'child_process';

const app = express();
const PORT = 7860;

const width = 640;
const height = 360;
const fps = 30;
const gravity = 0.5;

const box = { x: 50, y: 150, w: 40, h: 40, vy: 0 };
let frameCount = 0;
let obstacles = [];

// Fungsi gambar frame dengan optional teks & posisi X teks
function drawFrame(teks = null, teksX = 0) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // Kotak logika & gambar
  box.vy += gravity;
  box.y += box.vy;
  if (box.y + box.h > height) {
    box.y = height - box.h;
    box.vy = -8;
  }
  ctx.fillStyle = 'cyan';
  ctx.fillRect(box.x, box.y, box.w, box.h);

  // Obstacle
  if (frameCount % 50 === 0) {
    obstacles.push({ x: width, y: height - 50, w: 20, h: 50 });
  }
  obstacles.forEach(obs => obs.x -= 4);
  obstacles = obstacles.filter(obs => obs.x + obs.w > 0);
  ctx.fillStyle = 'red';
  obstacles.forEach(obs => {
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  });

  // Teks bergerak jika ada
  if (teks) {
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Sans';
    ctx.fillText(teks, teksX, 50);
  }

  frameCount++;
  return canvas.toBuffer('image/png');
}

// Streaming tanpa teks
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'video/mp4');

  const ffmpeg = spawn('ffmpeg', [
    '-f', 'image2pipe',
    '-r', `${fps}`,
    '-i', '-',
    '-an',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-f', 'mp4',
    '-movflags', 'frag_keyframe+empty_moov',
    'pipe:1'
  ]);

  ffmpeg.stdout.pipe(res);
  ffmpeg.stderr.on('data', data => console.error('ffmpeg:', data.toString()));

  const interval = setInterval(() => {
    const frame = drawFrame();
    ffmpeg.stdin.write(frame);
  }, 1000 / fps);

  req.on('close', () => {
    clearInterval(interval);
    ffmpeg.stdin.end();
    ffmpeg.kill('SIGINT');
  });
});

// Streaming dengan teks bergerak dari kiri ke kanan
app.get('/teks', (req, res) => {
  const teks = req.query.q?.toString() || 'Teks kosong';
  let teksX = -200; // mulai dari luar kiri

  res.setHeader('Content-Type', 'video/mp4');

  const ffmpeg = spawn('ffmpeg', [
    '-f', 'image2pipe',
    '-r', `${fps}`,
    '-i', '-',
    '-an',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-f', 'mp4',
    '-movflags', 'frag_keyframe+empty_moov',
    'pipe:1'
  ]);

  ffmpeg.stdout.pipe(res);
  ffmpeg.stderr.on('data', data => console.error('ffmpeg:', data.toString()));

  const interval = setInterval(() => {
    const frame = drawFrame(teks, teksX);
    ffmpeg.stdin.write(frame);
    teksX += 4; // kecepatan teks ke kanan
    if (teksX > width + 200) teksX = -200; // reset jika keluar layar
  }, 1000 / fps);

  req.on('close', () => {
    clearInterval(interval);
    ffmpeg.stdin.end();
    ffmpeg.kill('SIGINT');
  });
});

app.listen(PORT, () => {
  console.log(`🎮 Streaming animasi aktif di http://localhost:${PORT}/stream`);
  console.log(`📝 Streaming dengan teks di http://localhost:${PORT}/teks?q=Hello`);
});
