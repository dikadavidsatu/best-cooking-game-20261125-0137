// Ember & Thyme — boot, game loop and scripted screenshot scenes.
// The game runs on requestAnimationFrame with a fixed-dt update; the
// ?shot= scenes (start / play / rush / end) stage a deterministic kitchen
// so screenshots are real renders of this exact code, frozen in time.

import { createGame, startShift, updateGame, nextDay, mulberry32, newItem, servePlate } from './state.js';
import { SHIFTS, RECIPES, RECIPE_BY_ID } from './data.js';
import { render, hitZone } from './render.js';
import { handleClick, handleKey, canvasPoint } from './input.js';
import { sfx } from './audio.js';

const canvas = document.getElementById('game');
const fallback = document.getElementById('fallback');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number(params.get('seed') || '1');

const game = createGame();
let mouse = { x: 640, y: 360 };
let last = performance.now();
let previousScreen = 'title';

const callbacks = {
  startShift(day) { startShift(game, day); },
  pause() { if (game.screen === 'playing') { previousScreen = 'playing'; game.screen = 'paused'; } },
  resume() { if (game.screen === 'paused') game.screen = 'playing'; },
  showHelp() { if (game.screen === 'playing' || game.screen === 'title') { previousScreen = game.screen; game.screen = 'help'; } },
  showBook() { if (game.screen === 'playing' || game.screen === 'title') { previousScreen = game.screen; game.screen = 'book'; } },
  closeOverlay() { game.screen = previousScreen === 'title' ? 'title' : 'playing'; },
  nextDay() { nextDay(game); },
  toTitle() { game.screen = 'title'; game.dayScores = []; },
  replay() { startShift(game, 0); game.dayScores = []; },
};

function stageShot(name) {
  // Build a fixed, deterministic scene for screenshots. No wall clock, no
  // randomness beyond the seeded RNG: the same URL always renders the same
  // kitchen, which is what makes these screenshots reproducible.
  game.rng = mulberry32(1000 + seed);
  if (name === 'start') {
    game.screen = 'title';
    game.dayIndex = 0;
    game.timeLeft = 150;
    game.score = 0;
    game.orders = [];
    return;
  }
  startShift(game, name === 'end' ? 2 : 0);
  game.screen = 'playing';
  if (name === 'play') {
    // Mid-assembly: two orders on the board, a chopped tomato on the board,
    // pasta boiling, a half-built plate, cheese in hand, timer at 02:14.
    game.timeLeft = 134;
    game.elapsed = 16;
    game.score = 230;
    game.served = 2;
    game.combo = 2;
    game.comboTimer = 14;
    // Two distinct, readable tickets instead of whatever the RNG dealt.
    game.orders = [
      {
        id: 1, recipe: RECIPE_BY_ID['garden-salad'],
        customer: { name: 'Maya', emoji: '👩', color: '#e8a0b4', note: '' },
        patience: 52, maxPatience: 55,
        steps: RECIPE_BY_ID['garden-salad'].steps.map(([id, state]) => ({ id, state, done: false })),
        bornAt: 0,
      },
      {
        id: 2, recipe: RECIPE_BY_ID['tomato-pasta'],
        customer: { name: 'Theo', emoji: '👨', color: '#7fb3e8', note: '' },
        patience: 64, maxPatience: 70,
        steps: RECIPE_BY_ID['tomato-pasta'].steps.map(([id, state]) => ({ id, state, done: false })),
        bornAt: 0,
      },
    ];

    const board = game.stations[0];
    const t = newItem('tomato', 'chopped');
    t.chop = 3;
    board.item = t;
    const pot = game.stations[1];
    const pasta = newItem('pasta', 'raw');
    pasta.cook = 4;
    pot.item = pasta;
    const grill = game.stations[3];
    const patty = newItem('patty', 'grilled');
    patty.done = true;
    patty.cook = 7;
    grill.item = patty;
    game.plates[0] = [newItem('pasta', 'boiled'), newItem('tomato', 'chopped'), newItem('cheese', 'raw')];
    game.plates[1] = [newItem('bread', 'raw')];
    game.held = null;
    game.selectedPlate = 0;
    game.hint = 'Tomato Pasta is ready — serve it at the window!';
    game.hintTimer = 99;
  } else if (name === 'rush') {
    // Service rush: timer at 00:24, four tickets, one plate finished and
    // glowing, combo x5, a salmon on the grill about to burn.
    game.dayIndex = 2;
    game.timeLeft = 24;
    game.elapsed = 156;
    game.score = 980;
    game.combo = 5;
    game.comboTimer = 18;
    game.bestCombo = 5;
    game.served = 9;
    game.orders = [];
    while (game.orders.length < 4) {
      // Plate 1 is a finished Classic Burger, so one ticket must be for it:
      // the plate then glows gold and the window reads READY TO SERVE.
      const ids = ['garden-salad', 'classic-burger', 'salmon-pasta', 'sunny-breakfast'];
      const recipe = RECIPE_BY_ID[ids[game.orders.length]];
      game.orders.push({
        id: game.orders.length + 1,
        recipe,
        customer: { name: ['Maya', 'Theo', 'June', 'Ravi'][game.orders.length], emoji: ['👩', '👨', '👵', '👨‍🍳'][game.orders.length], color: '#fff', note: '' },
        patience: [9, 22, 41, 55][game.orders.length],
        maxPatience: 60,
        steps: recipe.steps.map(([id, state]) => ({ id, state, done: false })),
        bornAt: 0,
      });
    }
    const grill = game.stations[3];
    const salmon = newItem('salmon', 'grilled');
    salmon.done = true;
    salmon.cook = 13;
    grill.item = salmon;
    const pot = game.stations[1];
    const soupTomato = newItem('tomato', 'chopped');
    soupTomato.chop = 3;
    pot.item = newItem('pasta', 'raw');
    pot.item.cook = 5;
    game.plates[0] = [
      newItem('bread', 'raw'),
      newItem('patty', 'grilled'),
      newItem('lettuce', 'chopped'),
      newItem('cheese', 'raw'),
    ];
    game.plates[1] = [newItem('lettuce', 'chopped'), newItem('tomato', 'chopped')];
    game.selectedPlate = 0;
    game.hint = 'SERVICE RUSH! Last 30 seconds — serve everything!';
    game.hintTimer = 99;
  } else if (name === 'end') {
    // Shift complete: day 3 finished with three stars.
    game.dayIndex = 2;
    game.timeLeft = 0;
    game.score = 1240;
    game.served = 12;
    game.missed = 1;
    game.bestCombo = 6;
    game.burnedCount = 0;
    game.dayScores = [520, 860, 1240];
    game.screen = 'dayEnd';
    game.hintTimer = 0;
  }
}

if (!ctx) {
  if (fallback) fallback.hidden = false;
} else {
  if (shot) {
    stageShot(shot);
    // Frozen frame: render once, no ticking, so the capture is stable.
    render(ctx, game, mouse.x, mouse.y);
    document.title = `Ember & Thyme — shot: ${shot}`;
  } else {
    canvas.addEventListener('pointermove', (e) => {
      mouse = canvasPoint(canvas, e);
    });
    canvas.addEventListener('pointerleave', () => { mouse = { x: -100, y: -100 }; });
    canvas.addEventListener('click', (e) => {
      const p = canvasPoint(canvas, e);
      handleClick(game, hitZone(game, p.x, p.y), 0, callbacks);
    });
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const p = canvasPoint(canvas, e);
      const zone = hitZone(game, p.x, p.y);
      if (zone && zone.kind === 'plate') handleClick(game, zone, 2, callbacks);
    });
    window.addEventListener('keydown', (e) => {
      if ([' ', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
      handleKey(game, e, callbacks);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && game.screen === 'playing') callbacks.pause();
    });

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      updateGame(game, dt);
      render(ctx, game, mouse.x, mouse.y);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
}

// Expose a tiny handle for local play-testing from the console.
window.__emberThyme = { game, startShift: (d) => startShift(game, d), servePlate: (i) => servePlate(game, i) };
export { game };
