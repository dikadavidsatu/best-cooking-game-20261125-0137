// Ember & Thyme — game state: orders, stations, plates, scoring, combos,
// particles and the shift lifecycle. Pure logic; rendering lives in render.js.

import {
  INGREDIENTS, RECIPES, RECIPE_BY_ID, CUSTOMERS, SHIFTS,
  COOK_TIME, BURN_AFTER, CHOP_CLICKS, recipeSteps, starsFor,
} from './data.js';
import { sfx } from './audio.js';

// Deterministic RNG (mulberry32) so scripted screenshot modes are stable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function newItem(id, state = 'raw') {
  return { id, state, chop: 0, cook: 0, done: false, burned: false };
}

export function itemLabel(item) {
  const ing = INGREDIENTS[item.id];
  if (item.burned) return `Burned ${ing.name}`;
  if (item.state === 'raw') return ing.name;
  const word = { chopped: 'Chopped', boiled: 'Boiled', grilled: 'Grilled', fried: 'Fried' }[item.state] || item.state;
  return `${word} ${ing.name}`;
}

export function itemCookTarget(item) {
  return INGREDIENTS[item.id].cook; // 'stove' | 'grill' | 'fryer' | null
}

export function stationAccepts(station, item) {
  if (!item || item.burned) return false;
  if (station.kind === 'board') return INGREDIENTS[item.id].chop && item.state === 'raw';
  if (station.kind === 'stove' || station.kind === 'grill' || station.kind === 'fryer') {
    return itemCookTarget(item) === station.kind && item.state === 'raw';
  }
  return false;
}

export function createGame() {
  return {
    screen: 'title', // title | playing | paused | dayEnd | gameOver | help | book
    dayIndex: 0,
    timeLeft: 0,
    score: 0,
    coins: 0,
    served: 0,
    missed: 0,
    burnedCount: 0,
    combo: 0,
    bestCombo: 0,
    comboTimer: 0,
    orders: [],
    orderSeq: 0,
    spawnTimer: 0,
    held: null,
    selectedPlate: 0,
    plates: [[], []],
    stations: [
      { kind: 'board', label: 'Chopping Board', item: null, x: 24, y: 196, w: 252, h: 118 },
      { kind: 'stove', label: 'Stove · Pot 1', item: null, x: 292, y: 196, w: 252, h: 118 },
      { kind: 'stove', label: 'Stove · Pot 2', item: null, x: 560, y: 196, w: 252, h: 118 },
      { kind: 'grill', label: 'Grill', item: null, x: 828, y: 196, w: 208, h: 118 },
      { kind: 'fryer', label: 'Fryer', item: null, x: 1052, y: 196, w: 204, h: 118 },
    ],
    particles: [],
    floaters: [],
    messages: [],
    achievements: new Set(),
    unlocked: [],
    dayScores: [],
    elapsed: 0,
    rushAnnounced: false,
    lastTickSecond: -1,
    rng: mulberry32(20261125),
    best: loadBest(),
    hint: '',
    hintTimer: 0,
    shake: 0,
  };
}

const BEST_KEY = 'ember-thyme-best-v1';
export function loadBest() {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (!raw) return { score: 0, day: 0 };
    const parsed = JSON.parse(raw);
    return { score: parsed.score || 0, day: parsed.day || 0 };
  } catch { return { score: 0, day: 0 }; }
}
export function saveBest(game) {
  const total = game.dayScores.reduce((a, b) => a + b, 0);
  if (total > game.best.score) {
    game.best = { score: total, day: game.dayIndex + 1 };
    try { localStorage.setItem(BEST_KEY, JSON.stringify(game.best)); } catch { /* storage unavailable */ }
  }
}

export function startShift(game, dayIndex) {
  const shift = SHIFTS[dayIndex];
  game.dayIndex = dayIndex;
  game.timeLeft = shift.seconds;
  game.score = 0;
  game.coins = 0;
  game.served = 0;
  game.missed = 0;
  game.burnedCount = 0;
  game.combo = 0;
  game.bestCombo = 0;
  game.comboTimer = 0;
  game.orders = [];
  game.orderSeq = 0;
  game.spawnTimer = 2;
  game.held = null;
  game.plates = [[], []];
  game.stations.forEach((s) => { s.item = null; });
  game.particles = [];
  game.floaters = [];
  game.elapsed = 0;
  game.rushAnnounced = false;
  game.lastTickSecond = -1;
  game.screen = 'playing';
  game.hint = shift.intro;
  game.hintTimer = 6;
  sfx.dayStart();
  spawnOrder(game);
  spawnOrder(game);
}

export function spawnOrder(game) {
  const shift = SHIFTS[game.dayIndex];
  if (game.orders.length >= shift.maxOrders) return;
  const recipe = RECIPE_BY_ID[pickFrom(game.rng, shift.pool)];
  const customer = CUSTOMERS[Math.floor(game.rng() * CUSTOMERS.length)];
  game.orderSeq += 1;
  game.orders.push({
    id: game.orderSeq,
    recipe,
    customer,
    patience: recipe.time * (shift.patience / 70),
    maxPatience: recipe.time * (shift.patience / 70),
    steps: recipeSteps(recipe),
    bornAt: game.elapsed,
  });
  sfx.order();
}

export function plateMatchesOrder(plate, order) {
  if (plate.length !== order.recipe.steps.length) return false;
  const need = order.recipe.steps.map(([id, state]) => `${id}:${state}`).sort();
  const have = plate.map((it) => `${it.id}:${it.state}`).sort();
  return need.every((v, i) => v === have[i]);
}

export function plateProgress(plate, order) {
  const need = order.recipe.steps.map(([id, state]) => `${id}:${state}`);
  const have = plate.map((it) => `${it.id}:${it.state}`);
  let matched = 0;
  const rest = [...have];
  for (const n of need) {
    const i = rest.indexOf(n);
    if (i !== -1) { matched += 1; rest.splice(i, 1); }
  }
  return matched / need.length;
}

export function bestOrderForPlate(game, plate) {
  let best = null;
  let bestScore = 0;
  for (const order of game.orders) {
    if (!plateMatchesOrder(plate, order)) continue;
    const score = order.patience / order.maxPatience;
    if (!best || score < bestScore) { best = order; bestScore = score; }
  }
  return best;
}

export function addFloater(game, x, y, text, color = '#fff') {
  game.floaters.push({ x, y, text, color, life: 1.4, max: 1.4 });
}

export function addParticles(game, x, y, color, n = 14, spread = 90) {
  for (let i = 0; i < n; i++) {
    const a = game.rng() * Math.PI * 2;
    const sp = 30 + game.rng() * spread;
    game.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
      life: 0.6 + game.rng() * 0.5, max: 1.1, color,
      size: 3 + game.rng() * 5,
    });
  }
}

export function unlock(game, id, label) {
  if (game.achievements.has(id)) return;
  game.achievements.add(id);
  game.unlocked.push({ id, label, life: 4 });
  game.messages.push(label);
  sfx.star();
}

export function servePlate(game, plateIndex) {
  const plate = game.plates[plateIndex];
  if (plate.length === 0) return false;
  const order = bestOrderForPlate(game, plate);
  if (!order) {
    game.combo = 0;
    game.comboTimer = 0;
    game.shake = 0.35;
    sfx.wrong();
    addFloater(game, 640, 470, 'No order matches this plate!', '#ff8a7a');
    return false;
  }
  const patienceFrac = Math.max(0, order.patience / order.maxPatience);
  const tip = Math.round(order.recipe.price * 0.5 * patienceFrac);
  const comboBonus = game.combo * 10;
  const earned = order.recipe.price + tip + comboBonus;
  game.score += earned;
  game.coins += earned;
  game.served += 1;
  game.combo += 1;
  game.bestCombo = Math.max(game.bestCombo, game.combo);
  game.comboTimer = 20;
  game.orders = game.orders.filter((o) => o.id !== order.id);
  game.plates[plateIndex] = [];
  addParticles(game, 1150, 380, '#ffd34d', 22, 130);
  addFloater(game, 1150, 360, `+$${earned}  ${order.customer.name} loved it!`, '#ffd34d');
  if (tip >= Math.round(order.recipe.price * 0.4)) {
    addFloater(game, 1150, 330, `Big tip +$${tip}`, '#7be495');
  }
  if (game.combo >= 3) {
    sfx.combo(game.combo);
    addFloater(game, 640, 120, `COMBO x${game.combo}!`, '#ff9d2e');
    if (game.combo === 3) unlock(game, 'combo3', 'Combo Chef — 3 serves in a row!');
    if (game.combo === 5) unlock(game, 'combo5', 'On Fire — 5 serves in a row!');
  } else {
    sfx.serve();
  }
  if (game.served === 5) unlock(game, 'serve5', 'Five Plates — served 5 dishes!');
  if (game.served === 10) unlock(game, 'serve10', 'Dinner Service — served 10 dishes!');
  if (game.score >= 1000) unlock(game, 'score1k', 'Grand Total — $1,000 in one shift!');
  return true;
}

export function trashHeld(game) {
  if (!game.held) return;
  if (game.held.burned) game.burnedCount += 1;
  game.held = null;
  sfx.trash();
}

export function clearPlate(game, plateIndex) {
  if (game.plates[plateIndex].length === 0) return;
  game.plates[plateIndex] = [];
  sfx.trash();
  addFloater(game, 640, 470, 'Plate cleared', '#c9b8a3');
}

export function updateGame(game, dt) {
  if (game.screen !== 'playing') return;
  game.elapsed += dt;
  game.timeLeft -= dt;
  if (game.comboTimer > 0) {
    game.comboTimer -= dt;
    if (game.comboTimer <= 0) game.combo = 0;
  }
  if (game.hintTimer > 0) game.hintTimer -= dt;
  if (game.shake > 0) game.shake -= dt;

  const whole = Math.ceil(game.timeLeft);
  if (whole <= 10 && whole !== game.lastTickSecond && whole > 0) {
    game.lastTickSecond = whole;
    sfx.tick();
  }
  if (game.timeLeft <= 30 && !game.rushAnnounced) {
    game.rushAnnounced = true;
    game.hint = 'SERVICE RUSH! Last 30 seconds — serve everything!';
    game.hintTimer = 4;
    sfx.order();
  }

  // Orders: patience drains, spawn timer ticks.
  game.spawnTimer -= dt;
  if (game.spawnTimer <= 0) {
    spawnOrder(game);
    game.spawnTimer = SHIFTS[game.dayIndex].spawnEvery * (0.85 + game.rng() * 0.3);
  }
  for (const order of [...game.orders]) {
    order.patience -= dt;
    if (order.patience <= 0) {
      game.orders = game.orders.filter((o) => o.id !== order.id);
      game.missed += 1;
      game.combo = 0;
      game.comboTimer = 0;
      game.shake = 0.3;
      sfx.wrong();
      addFloater(game, 640, 150, `${order.customer.name} walked out — ${order.recipe.name} too slow!`, '#ff8a7a');
    }
  }

  // Cooking stations advance: raw food cooks, finished food burns if left.
  for (const st of game.stations) {
    const item = st.item;
    if (!item || st.kind === 'board' || item.burned) continue;
    const need = COOK_TIME[st.kind];
    item.cook += dt;
    if (item.state === 'raw' && item.cook >= need && !item.done) {
      item.done = true;
      const finished = { stove: 'boiled', grill: 'grilled', fryer: 'fried' }[st.kind];
      item.state = finished;
      sfx.cooked();
      addParticles(game, st.x + st.w / 2, st.y + 30, '#ffd34d', 10, 60);
      addFloater(game, st.x + st.w / 2, st.y - 6, `${itemLabel(item)} ready!`, '#7be495');
    } else if (item.done && item.cook >= need + BURN_AFTER) {
      item.burned = true;
      item.state = 'raw';
      game.burnedCount += 1;
      sfx.burn();
      addFloater(game, st.x + st.w / 2, st.y - 6, 'Burned! Bin it!', '#ff8a7a');
    }
  }

  // Particles and floaters.
  for (const p of game.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 160 * dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);
  for (const f of game.floaters) { f.life -= dt; f.y -= 26 * dt; }
  game.floaters = game.floaters.filter((f) => f.life > 0);
  for (const u of game.unlocked) u.life -= dt;
  game.unlocked = game.unlocked.filter((u) => u.life > 0);

  if (game.timeLeft <= 0) {
    game.timeLeft = 0;
    endShift(game);
  }
}

export function endShift(game) {
  const shift = SHIFTS[game.dayIndex];
  game.dayScores[game.dayIndex] = game.score;
  game.screen = 'dayEnd';
  saveBest(game);
  sfx.dayEnd();
}

export function nextDay(game) {
  if (game.dayIndex + 1 < SHIFTS.length) startShift(game, game.dayIndex + 1);
  else game.screen = 'gameOver';
}

export function totalScore(game) {
  return game.dayScores.reduce((a, b) => a + b, 0);
}

export { RECIPES, starsFor };
