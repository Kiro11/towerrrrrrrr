(function () {
    'use strict';

    var frame = document.getElementById('frame');
    var canvas =document.getElementById('game');
    var ctx = canvas.getContext('2d');
var hud= document.getElementById('hud');
var scoreVal = document.getElementById('scoreVal');
 var startOverlay = document.getElementById('startOverlay');
 var startBtn = document.getElementById('startBtn');
 var startBest =document.getElementById('startBest');
 var finalScoreEl = document.getElementById('finalScore');
 var bestScoreEl = document.getElementById('bestScore');
 var overTitle = document.getElementById('overTitle');
var OverNote = document.getElementById('OverNote');
 
var COLORS = ['#e8b354', '#dfa23f', '#d69433', '#cb8527', '#c0771c'];

var W = 0, H = 0, DPR = 1;
var PLATE_Y = 0, TARGET_TOP_Y = 0, VISIBLE_RISE = 0, PLAY_MARGIN = 0;
var LAYER_H =30;

var BASE_SPEED = 110;
var Speed_STEP = 4.2
var SPEED_MAX =340;
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
var cameraTarget =0;
var shakeMag = 0;
var shake Duration = 1;
var shakeTimeLeft = 0;
var best = 0;

