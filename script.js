const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const finalScoreEl = document.getElementById('finalScore');
const inputEl = document.getElementById('inputValue');
const overlayEl = document.getElementById('overlay');
const lifeEls = Array.from(document.querySelectorAll('.life'));
const keypadButtons = Array.from(document.querySelectorAll('.key'));

let width = 0;
let height = 0;
let waterY = 0;
let lastTime = 0;
let spawnTimer = 0;
let elapsed = 0;
let score = 0;
let lives = 3;
let drops = [];
let userInput = '';
let gameOver = false;
let lastPointerTime = 0;

const noisePattern = createNoisePattern();

function resize() {
  const dpr = window.devicePixelRatio || 1;
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  waterY = height * 0.82;
}

window.addEventListener('resize', resize);
resize();

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

function randInt(min, max) {
  return Math.floor(rand(min, max + 1));
}

function generateEquation(level) {
  const maxBase = Math.min(20, 12 + level * 2);
  const a = randInt(1, maxBase);
  const b = randInt(1, maxBase);
  const operators = ['+', '-', 'x', '÷'];
  const op = operators[randInt(0, operators.length - 1)];

  let text;
  let result;

  switch (op) {
    case '+':
      text = `${a} + ${b}`;
      result = a + b;
      break;
    case '-':
      if (a < b) {
        text = `${b} - ${a}`;
        result = b - a;
      } else {
        text = `${a} - ${b}`;
        result = a - b;
      }
      break;
    case 'x':
      text = `${a} x ${b}`;
      result = a * b;
      break;
    case '÷': {
      const divisor = randInt(2, Math.max(2, Math.floor(maxBase / 2)));
      const quotient = randInt(2, maxBase);
      const dividend = divisor * quotient;
      text = `${dividend} ÷ ${divisor}`;
      result = quotient;
      break;
    }
  }

  return { text, result };
}

class Drop {
  constructor(level) {
    const size = rand(56, 74) + level * 1.2;
    this.radius = size * 0.4;
    this.x = rand(40, width - 40);
    this.y = -size;
    this.speed = rand(45, 70) + level * 8;
    const eq = generateEquation(level);
    this.text = eq.text;
    this.result = eq.result;
  }

  update(dt) {
    this.y += this.speed * dt;
  }

  draw() {
    const r = this.radius;
    const x = this.x;
    const y = this.y;

    ctx.save();
    ctx.fillStyle = '#1b4b5f';
    ctx.strokeStyle = '#e9f7f7';
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(x, y - r * 1.3);
    ctx.quadraticCurveTo(x + r * 1.2, y - r * 0.6, x + r * 0.9, y + r * 0.7);
    ctx.quadraticCurveTo(x + r * 0.5, y + r * 1.6, x, y + r * 2.1);
    ctx.quadraticCurveTo(x - r * 0.5, y + r * 1.6, x - r * 0.9, y + r * 0.7);
    ctx.quadraticCurveTo(x - r * 1.2, y - r * 0.6, x, y - r * 1.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#f2fbfb';
    ctx.font = `bold ${r * 0.9}px "Nunito"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const parts = this.text.split(' ');
    if (parts.length >= 3) {
      ctx.fillText(parts[0], x, y - r * 0.1);
      ctx.fillText(parts[1], x, y + r * 0.5);
      ctx.fillText(parts[2], x, y + r * 1.1);
    } else {
      ctx.fillText(this.text, x, y + r * 0.6);
    }

    ctx.restore();
  }
}

function createNoisePattern() {
  const off = document.createElement('canvas');
  off.width = 200;
  off.height = 200;
  const octx = off.getContext('2d');
  const img = octx.createImageData(off.width, off.height);
  for (let i = 0; i < img.data.length; i += 4) {
    const val = 220 + Math.random() * 35;
    img.data[i] = val;
    img.data[i + 1] = val;
    img.data[i + 2] = val;
    img.data[i + 3] = 18;
  }
  octx.putImageData(img, 0, 0);
  return ctx.createPattern(off, 'repeat');
}

function drawBackground(time) {
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#1fb5b8');
  grad.addColorStop(0.6, '#26c3c8');
  grad.addColorStop(1, '#1ca8ac');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = noisePattern;
  ctx.fillRect(0, 0, width, height);

  drawCloud(140, 120, 110);
  drawCloud(width * 0.6, 170, 140);
  drawCloud(width * 0.85, 120, 90);

  drawWater(time);
}

function drawCloud(x, y, size) {
  ctx.save();
  ctx.globalAlpha = 0.32;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x - size * 0.36, y + size * 0.05, size * 0.28, size * 0.22, 0, 0, Math.PI * 2);
  ctx.ellipse(x - size * 0.1, y - size * 0.08, size * 0.38, size * 0.28, 0, 0, Math.PI * 2);
  ctx.ellipse(x + size * 0.2, y - size * 0.05, size * 0.36, size * 0.26, 0, 0, Math.PI * 2);
  ctx.ellipse(x + size * 0.46, y + size * 0.06, size * 0.3, size * 0.22, 0, 0, Math.PI * 2);
  ctx.ellipse(x + size * 0.05, y + size * 0.18, size * 0.52, size * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWater(time) {
  const waveHeight = 10;
  ctx.save();
  ctx.fillStyle = '#1c445a';
  ctx.beginPath();
  ctx.moveTo(0, waterY);
  for (let x = 0; x <= width; x += 20) {
    const y = waterY + Math.sin((x + time * 0.05) * 0.04) * waveHeight;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function updateLives() {
  lifeEls.forEach((el, idx) => {
    if (idx < lives) {
      el.classList.remove('lost');
    } else {
      el.classList.add('lost');
    }
  });
}

function loseLife() {
  lives -= 1;
  updateLives();
  if (lives <= 0) {
    endGame();
  }
}

function endGame() {
  gameOver = true;
  overlayEl.hidden = false;
  finalScoreEl.textContent = score;
}

function resetGame() {
  drops = [];
  score = 0;
  lives = 3;
  elapsed = 0;
  spawnTimer = 0;
  userInput = '';
  scoreEl.textContent = score;
  inputEl.textContent = '';
  updateLives();
  gameOver = false;
  overlayEl.hidden = true;
}

function checkAnswer(answer) {
  if (!Number.isFinite(answer)) {
    return;
  }
  for (let i = 0; i < drops.length; i++) {
    if (drops[i].result === answer) {
      drops.splice(i, 1);
      score += 100;
      scoreEl.textContent = score;
      return true;
    }
  }
  return false;
}

function canAcceptInput() {
  return !gameOver;
}

function appendDigit(digit) {
  if (!canAcceptInput()) return;
  if (userInput.length < 6) {
    userInput += digit;
    inputEl.textContent = userInput;
  }
}

function backspaceInput() {
  if (!canAcceptInput()) return;
  userInput = userInput.slice(0, -1);
  inputEl.textContent = userInput;
}

function submitInput() {
  if (!canAcceptInput()) return;
  checkAnswer(parseInt(userInput, 10));
  userInput = '';
  inputEl.textContent = userInput;
}

function update(dt, time) {
  if (gameOver) return;

  elapsed += dt;
  spawnTimer += dt * 1000;

  const level = Math.min(10, Math.floor(elapsed / 18));
  const spawnInterval = Math.max(650, 2000 - level * 130);

  if (spawnTimer > spawnInterval) {
    drops.push(new Drop(level));
    spawnTimer = 0;
  }

  for (let i = drops.length - 1; i >= 0; i--) {
    const drop = drops[i];
    drop.update(dt);
    if (drop.y + drop.radius * 2.2 >= waterY) {
      drops.splice(i, 1);
      loseLife();
    }
  }
}

function draw(time) {
  drawBackground(time);
  for (const drop of drops) {
    drop.draw();
  }
}

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = Math.min(0.033, (timestamp - lastTime) / 1000);
  lastTime = timestamp;

  update(dt, timestamp);
  draw(timestamp);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);

window.addEventListener('keydown', (e) => {
  if (gameOver && e.key === 'Enter') {
    resetGame();
    return;
  }

  if (gameOver) return;

  if (e.key >= '0' && e.key <= '9') {
    appendDigit(e.key);
  } else if (e.key === 'Backspace') {
    backspaceInput();
  } else if (e.key === 'Enter') {
    submitInput();
  }
});

keypadButtons.forEach((btn) => {
  const key = btn.dataset.key;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    lastPointerTime = Date.now();
    if (!key) return;
    if (key === 'back') {
      backspaceInput();
    } else if (key === 'enter') {
      submitInput();
    } else {
      appendDigit(key);
    }
  });

  btn.addEventListener('click', (e) => {
    if (Date.now() - lastPointerTime < 400) {
      e.preventDefault();
    }
  });
});

updateLives();
