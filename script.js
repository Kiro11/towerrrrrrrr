(function () {
  'use strict';
 
  var frame = document.getElementById('frame');
  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var hud = document.getElementById('hud');
  var scoreVal = document.getElementById('scoreVal');
  var startOverlay = document.getElementById('startOverlay');
  var overOverlay = document.getElementById('overOverlay');
  var startBtn = document.getElementById('startBtn');
  var restartBtn = document.getElementById('restartBtn');
  var startBest = document.getElementById('startBest');
  var finalScoreEl = document.getElementById('finalScore');
  var bestScoreEl = document.getElementById('bestScore');
  var overTitle = document.getElementById('overTitle');
  var overNote = document.getElementById('overNote');
 
  var COLORS = ['#e8b354', '#dfa23f', '#d69433', '#cb8527', '#c0771c'];
 
  var W = 0, H = 0, DPR = 1;
  var PLATE_Y = 0, TARGET_TOP_Y = 0, VISIBLE_RISE = 0, PLAY_MARGIN = 0;
  var LAYER_H = 30;
 
  var BASE_SPEED = 110;
  var SPEED_STEP = 4.2;
  var SPEED_MAX = 340;
  var GRAVITY = 900;
 
  var state = 'start';
  var stack = [];
  var current = null;
  var fallingCurrent = null;
  var chunks = [];
  var crumbs = [];
  var popups = [];
  var steams = [];
  var camera = 0;
  var cameraTarget = 0;
  var comboStreak = 0;
  var shakeMag = 0;
  var shakeDuration = 1;
  var shakeTimeLeft = 0;
  var best = 0;
 
  try {
    best = parseInt(localStorage.getItem('flapjack-best'), 10) || 0;
  } catch (e) {
    best = 0;
  }
  startBest.textContent = 'Best tower: ' + best;
 
  function seededRandom(seed) {
    var x = Math.sin(seed * 999.7) * 10000;
    return x - Math.floor(x);
  }
 
  function roundRect(x, y, w, h, r) {
    var rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }
 
  function resize() {
    var rect = frame.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    H = Math.max(1, Math.round(rect.height));
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
 
    PLATE_Y = H - 62;
    TARGET_TOP_Y = H * 0.27;
    VISIBLE_RISE = PLATE_Y - TARGET_TOP_Y;
    PLAY_MARGIN = Math.max(14, W * 0.07);
  }
 
  function pickGarnish(rowIndex) {
    if (rowIndex <= 0 || rowIndex % 4 !== 0) return null;
    var types = ['blueberry', 'butter', 'strawberry'];
    return types[(rowIndex / 4 - 1) % types.length];
  }
 
  function spawnCurrent(prevWidth, rowIndex, score) {
    var speed = Math.min(BASE_SPEED + score * SPEED_STEP, SPEED_MAX);
    var halfW = prevWidth / 2;
    var leftBound = PLAY_MARGIN + halfW;
    var rightBound = W - PLAY_MARGIN - halfW;
    var startFromLeft = Math.random() < 0.5;
    current = {
      x: startFromLeft ? leftBound : rightBound,
      width: prevWidth,
      rowIndex: rowIndex,
      dir: startFromLeft ? 1 : -1,
      speed: speed,
      colorIndex: rowIndex % COLORS.length
    };
  }
 
  function reset() {
    var baseWidth = Math.min(190, W * 0.5);
    stack = [{ x: W / 2, width: baseWidth, colorIndex: 0, garnish: null }];
    chunks = [];
    crumbs = [];
    popups = [];
    comboStreak = 0;
    camera = 0;
    cameraTarget = 0;
    fallingCurrent = null;
    spawnCurrent(baseWidth, 1, 0);
    updateScoreDisplay();
  }
 
  function updateScoreDisplay() {
    var score = stack.length - 1;
    scoreVal.textContent = String(score);
  }
 
  function shake(mag, durationMs) {
    shakeMag = mag;
    shakeDuration = durationMs;
    shakeTimeLeft = durationMs;
  }
 
  function spawnChunk(x, worldY, w, h, dir, colorIndex) {
    chunks.push({
      x: x, y: worldY, w: w, h: h,
      vx: dir * (40 + Math.random() * 40),
      vy: -40 - Math.random() * 40,
      rot: 0,
      vr: dir * (2 + Math.random() * 2),
      colorIndex: colorIndex,
      life: 1
    });
  }

  function spawnCrumbs(x,worldY, count) {
for (var i = 0; i < count; i++) {
var angle = Math.random() * Math.PI * 2;
      var speed = 30 + Math.random() * 70;
      crumbs.push({
        x: x, y: worldY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        r: 1.5 + Math.random() * 2,
        alpha: 1,
        life: 1
      });
    }
  }

  function spawnPopup(x, worldY, text, color) {
popups.push({ x: x, y: worldY, text: text, color: color, alpha: 1, vy:-34, life: 1 });
  }

  function spawnSteamIfNeeded() {
    if (steams.length < 5 && Math.random() < 0.02) {
      steams.push({
        x: W * 0.3 + Math.random() * W * 0.4,
        y: PLATE_Y - 20,
        r: 10 + Math.random() * 14,
        alpha: 0,
        phase: Math.random() * Math.PI * 2,
        speed: 14 + Math.random() * 10,
        life: 1
      });
    }
  }
   
    function worldRowY(rowIndex) {
        return PLATE_Y - (rowIndex + 1) * LAYER_H;
  }
    function handlePrimaryAction() {
 if (state === 'start') {
  startGame();
 } else if (state === 'playing') {
    handleDrop();
 } else if (state === 'gameover') {
     startGame();
 }
}
    function startGame() {
    state = 'playing';
    startOverlay.hidden = true;
    overOverlay.hidden = true;
    hud.hidden = false;
    reset();
    }
 function handleDrop() {
    if (state !== 'playing' || !current) return;
 
    var top = stack[stack.length - 1];
    var curLeft = current.x - current.width / 2;
    var curRight = current.x + current.width / 2;
    var topLeft = top.x - top.width / 2;
    var topRight = top.x + top.width / 2;
    var overlapLeft = Math.max(curLeft, topLeft);
    var overlapRight = Math.min(curRight, topRight);
    var overlapWidth = overlapRight - overlapLeft;
    var rowY = worldRowY(current.rowIndex);
 
    if (overlapWidth <= 3) {
      triggerGameOver();
     return;
  }


 var isPerfect = overlapWidth >= current.width * 0.94 && overlapWidth >= top.width * 0.94;

if (curLeft < overlapLeft - 0.5) {
  spawnChunk(curLeft, rowY, overlapLeft - curLeft, LAYER_H, -1, current.colorIndex);
}
if (curRight > overlapRight + 0.5) {
  spawnChunk(overlapRight, rowY, curRight - overlapRight, LAYER_H, 1, current.colorIndex);
}
    var newWidth = isPerfect ? current.width : overlapWidth;
    var newX = isPerfect ? top.x : (overlapLeft + overlapRight) / 2;
 
    comboStreak = isPerfect ? comboStreak + 1 : 0;
    spawnCrumbs(newX, rowY, isPerfect ? 10 : 5);
 
    if (isPerfect) {
      spawnPopup(newX, rowY - 6, comboStreak >= 3 ? 'SWEET STREAK!' : 'PERFECT!', '#d6432f');
    }
 var newRowIndex = current.rowIndex;
    stack.push({
      x: newX,
      width: newWidth,
      colorIndex: newRowIndex % COLORS.length,
      garnish: pickGarnish(newRowIndex)
    });
     updateScoreDisplay();
    spawnCurrent(newWidth, newRowIndex + 1, stack.length - 1);
  }
function triggerGameOver() {
    state = 'gameover';
    shake(10, 380);
 
    if (current) {
      fallingCurrent = {
        x: current.x,
        y: worldRowY(current.rowIndex),
        w: current.width,
        h: LAYER_H,
        vx: current.dir * 70,
        vy: -30,
        rot: 0,
        vr: current.dir * 2.4,
        colorIndex: current.colorIndex
      };
    }
    current = null;
 var finalScore = stack.length - 1;
    var isNewBest = finalScore > best;
    if (isNewBest) {
  best = finalScore;
  try { localStorage.setItem('flapjack-best', String(best)); } catch (e) {}
}
finalScoreEl.textContent = String(finalScore);
bestScoreEl.textContent = String(best);
overTitle.textContent = isNewBest ? 'New best tower!' : 'Tower toppled!';
overNote.textContent = isNewBest
  ? 'That is your tallest stack yet. Butter someone up about it.'
  : 'Even the best short-order cooks miss one sometimes.';

hud.hidden = true;
overOverlay.hidden = false;
  }
 
  function update(dt) {
    spawnSteamIfNeeded();
 
    for (var s = steams.length - 1; s >= 0; s--) {
      var st = steams[s];
      st.y -= st.speed * dt / 1000;
      st.phase += dt / 600;
      st.alpha = Math.min(0.16, st.alpha + dt / 800);
      if (st.y < TARGET_TOP_Y - 60) { st.life = 0; st.alpha -= dt / 300; }
      if (st.alpha <= 0 && st.life === 0) steams.splice(s, 1);
    }
 
    if (state === 'playing' && current) {
      var halfW = current.width / 2;
      var leftBound = PLAY_MARGIN + halfW;
      var rightBound = W - PLAY_MARGIN - halfW;
      current.x += current.dir * current.speed * dt / 1000;
      if (current.x < leftBound) { current.x = leftBound; current.dir = 1; }
      if (current.x > rightBound) { current.x = rightBound; current.dir = -1; }
  var topRow = current.rowIndex;
   cameraTarget = Math.max(0, (topRow + 1) * LAYER_H - VISIBLE_RISE);
    }
  var camFactor = 1 - Math.pow(0.0025, dt / 1000);
    camera += (cameraTarget - camera) * camFactor;
    
     for (var c = chunks.length - 1; c >= 0; c--) {
      var ch = chunks[c];
      ch.vy += GRAVITY * dt / 1000;
      ch.x += ch.vx * dt / 1000;
      ch.y += ch.vy * dt / 1000;
      ch.rot += ch.vr * dt / 1000;
      ch.life -= dt / 900;
      if (ch.life <= 0 || (ch.y - camera) > H + 60) chunks.splice(c, 1);
    }
    for (var r = crumbs.length - 1; r >= 0; r--) {
       var cr = crumbs[r];
       cr.vy += GRAVITY * 0.6 * dt / 1000;
  cr.x += cr.vx * dt / 1000;
      cr.y += cr.vy * dt / 1000;
      cr.life -= dt / 500;
      cr.alpha = Math.max(0, cr.life);
      if (cr.life <= 0) crumbs.splice(r, 1);
    }


for (var p = popups.length - 1; p >= 0; p--) {
  var po = popups[p];
  po.y += po.vy * dt / 1000;
po.life -= dt / 750;
po.alpha = Math.max(0, po.life);
if (po.life <= 0) popups.splice(p, 1);
}


 if (fallingCurrent) {
   fallingCurrent.vy += GRAVITY * dt / 1000;
      fallingCurrent.x += fallingCurrent.vx * dt / 1000;
      fallingCurrent.y += fallingCurrent.vy * dt / 1000;
      fallingCurrent.rot += fallingCurrent.vr * dt / 1000;
      if ((fallingCurrent.y - camera) > H + 80) fallingCurrent = null;
    }
   if (shakeTimeLeft > 0) {
     shakeTimeLeft -= dt;
        if (shakeTimeLeft < 0) shakeTimeLeft = 0;
   }
  }
   
    function drawBackground() {
var g = ctx.createLinearGradient(0, 0, 0, H);
 g.addColorStop(0, '#fff3cf');
    g.addColorStop(1, '#ffdd8a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
function drawSteam() {
    for (var i = 0; i < steams.length; i++) {
      var st = steams[i];
      var sy = st.y - camera;
      var sx = st.x + Math.sin(st.phase) * 8;
      var grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, st.r);
      grad.addColorStop(0, 'rgba(255,255,255,' + st.alpha + ')');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, st.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPlate() {
    var y = PLATE_Y + camera;
    ctx.save();
    ctx.fillStyle = 'rgba(140,86,19,0.14)';
    ctx.beginPath();
    ctx.ellipse(W / 2, y + 12, W * 0.43, 15, 0, 0, Math.PI * 2);
    ctx.fill();
  ctx.fillStyle = '#ecdfc0';
    ctx.beginPath();
    ctx.ellipse(W / 2, y + 9, W * 0.42, 16, 0, 0, Math.PI * 2);
    ctx.fill();
 
    ctx.fillStyle = '#fffaf0';
    ctx.beginPath();
    ctx.ellipse(W / 2, y + 5, W * 0.4, 13, 0, 0, Math.PI * 2);
    ctx.fill();
 ctx.strokeStyle = 'rgba(233,220,187,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(W / 2, y + 5, W * 0.34, 10, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
 function drawGarnish(x, y, w, type) {
    if (!type) return;
    if (type === 'blueberry') {
      ctx.fillStyle = '#3d4a7a';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(x - 1.5, y - 1.5, 1.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'butter') {
      ctx.fillStyle = '#ffe066';
      roundRect(x - 9, y - 6, 18, 10, 3);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      roundRect(x - 6, y - 4, 6, 3, 2);
      ctx.fill();
    } else if (type === 'strawberry') {
      ctx.fillStyle = '#d6432f';
      ctx.beginPath();
      ctx.moveTo(x, y - 6);
      ctx.quadraticCurveTo(x + 7, y - 2, x, y + 6);
      ctx.quadraticCurveTo(x - 7, y - 2, x, y - 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (var s = 0; s < 3; s++) {
        ctx.beginPath();
        ctx.arc(x - 2 + s * 2, y - 1 + s, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
 }
 }
function drawPancake(x, y, w, h, colorIndex, garnish, seed) {
    var base = COLORS[colorIndex % COLORS.length];
    var grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, base);
    grad.addColorStop(1, shadeColor(base, -14));
    ctx.fillStyle = grad;
    roundRect(x - w / 2, y, w, h, 7);
    ctx.fill();
 
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.beginPath();
    ctx.ellipse(x - w * 0.15, y + h * 0.32, w * 0.28, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
 if (seed !== undefined && w > 24) {
      var bubbleCount = 3;
      for (var i = 0; i < bubbleCount; i++) {
        var fx = 0.16 + seededRandom(seed * 7.3 + i * 3.1) * 0.68;
        var fy = 0.3 + seededRandom(seed * 11.7 + i * 5.9) * 0.42;
        var br = 1.1 + seededRandom(seed * 17.1 + i * 2.3) * 1.3;
        ctx.fillStyle = 'rgba(74,46,18,0.13)';
        ctx.beginPath();
        ctx.arc(x - w / 2 + fx * w, y + fy * h, br, 0, Math.PI * 2);
        ctx.fill();
      }
    }
ctx.strokeStyle = 'rgba(74,46,18,0.18)';
ctx.lineWidth = 1;
roundRect(x - w / 2, y, w, h, 7);
ctx.stroke();

    if (garnish) drawGarnish(x, y + h* 0.4, w, garnish);
  }









