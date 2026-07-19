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

































































































