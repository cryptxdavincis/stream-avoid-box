import express from 'express';
import { createCanvas } from 'canvas';
import { spawn } from 'child_process';

const app = express();
const PORT = 7860;

// Ukuran canvas
const width = 640;
const height = 360;
const fps = 30;
const box = { x: 50, y: 150, w: 40, h: 40, vy: 0 };
const gravity = 0.5;
let frameCount = 0;

let obstacles = [];

function drawFrame() {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Clear background
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);

  // Logic kotak
  box.vy += gravity;
  box.y += box.vy;

  if (box.y + box.h > height) {
    box.y = height - box.h;
    box.vy = -8; // loncat otomatis
  }

  // Gambar kotak
  ctx.fillStyle = 'cyan';
  ctx.fillRect(box.x, box.y, box.w, box.h);

  // Obstacle logic
  if (frameCount % 50 === 0) {
    obstacles.push({ x: width, y: height - 50, w: 20, h: 50 });
  }

  obstacles.forEach(obs => obs.x -= 4);
  obstacles = obstacles.filter(obs => obs.x + obs.w > 0);

  ctx.fillStyle = 'red';
  obstacles.forEach(obs => {
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  });

  frameCount++;
  return canvas.toBuffer('image/png');
}

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

app.listen(PORT, () => {
  console.log(`🎮 Streaming animasi aktif di http://localhost:${PORT}/stream`);
});
