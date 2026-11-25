// Ember & Thyme — all canvas drawing: kitchen, order board, stations,
// ingredient bins, plates, overlays and effects. One clear job: make the
// kitchen read at a glance, even shrunk to a contact sheet.

import { INGREDIENTS, INGREDIENT_ORDER, RECIPES, SHIFTS, formatClock, starsFor, TIPS, CHOP_CLICKS } from './data.js';
import { itemLabel, plateMatchesOrder, plateProgress, bestOrderForPlate, totalScore } from './state.js';
import { isMuted } from './audio.js';

export const W = 1280;
export const H = 720;

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function text(ctx, s, x, y, size, color, align = 'left', weight = 'bold') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px "Trebuchet MS", "Segoe UI", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

export function emoji(ctx, s, x, y, size) {
  ctx.font = `${size}px "Noto Color Emoji", "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function bar(ctx, x, y, w, h, frac, bg, fg, r = 5) {
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  const f = Math.max(0, Math.min(1, frac));
  if (f > 0) {
    ctx.fillStyle = fg;
    roundRect(ctx, x, y, Math.max(r * 2, w * f), h, r);
    ctx.fill();
  }
}

// Hit zones shared with input.js. Each zone: {kind, ...} with x,y,w,h.
export function zones(game) {
  const z = [];
  // Header buttons
  z.push({ kind: 'mute', x: 1120, y: 10, w: 44, h: 44 });
  z.push({ kind: 'pause', x: 1172, y: 10, w: 44, h: 44 });
  z.push({ kind: 'help', x: 1224, y: 10, w: 40, h: 44 });
  // Serve window
  z.push({ kind: 'serve', x: 916, y: 72, w: 348, h: 106 });
  // Stations
  for (const st of game.stations) z.push({ kind: 'station', station: st, x: st.x, y: st.y, w: st.w, h: st.h });
  // Plates
  z.push({ kind: 'plate', index: 0, x: 24, y: 330, w: 288, h: 116 });
  z.push({ kind: 'plate', index: 1, x: 328, y: 330, w: 288, h: 116 });
  // Book + tips panel buttons
  z.push({ kind: 'book', x: 636, y: 330, w: 300, h: 52 });
  z.push({ kind: 'howto', x: 636, y: 392, w: 300, h: 52 });
  z.push({ kind: 'trash', x: 1080, y: 458, w: 184, h: 246 });
  // Ingredient bins: 6 columns x 2 rows
  INGREDIENT_ORDER.forEach((id, i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    z.push({
      kind: 'bin', id,
      x: 24 + col * 172, y: 458 + row * 124, w: 160, h: 112,
    });
  });
  // Title screen buttons
  z.push({ kind: 'start', x: 440, y: 520, w: 400, h: 64 });
  z.push({ kind: 'startBook', x: 440, y: 600, w: 400, h: 48 });
  // Day-end / game-over buttons
  z.push({ kind: 'nextDay', x: 440, y: 560, w: 400, h: 60 });
  z.push({ kind: 'replay', x: 440, y: 560, w: 400, h: 60 });
  z.push({ kind: 'title', x: 440, y: 632, w: 400, h: 48 });
  // Overlay close
  z.push({ kind: 'close', x: 1080, y: 84, w: 140, h: 48 });
  return z;
}

export function hitZone(game, x, y) {
  const list = zones(game);
  // Later zones are on top; check in reverse for buttons over panels.
  for (let i = list.length - 1; i >= 0; i--) {
    const z = list[i];
    if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return z;
  }
  return null;
}

function drawHeader(ctx, game) {
  ctx.fillStyle = '#3a1f10';
  ctx.fillRect(0, 0, W, 64);
  ctx.fillStyle = '#ff9d2e';
  ctx.fillRect(0, 64, W, 4);
  emoji(ctx, '🍳', 40, 34, 34);
  text(ctx, 'EMBER & THYME', 66, 26, 24, '#ffd34d');
  text(ctx, 'Sizzle & Serve', 66, 50, 13, '#f6e3c2', 'left', 'normal');
  const shift = SHIFTS[game.dayIndex];
  text(ctx, `DAY ${game.dayIndex + 1} · ${shift.name.toUpperCase()}`, 330, 26, 15, '#fff', 'left');
  text(ctx, `Target $${shift.target}  ·  Served ${game.served}  ·  Missed ${game.missed}`, 330, 48, 13, '#d8c3a5', 'left', 'normal');

  // Timer — big, central, turns red in the rush.
  const rush = game.timeLeft <= 30 && game.screen === 'playing';
  const tColor = rush ? '#ff5a4a' : '#ffffff';
  ctx.fillStyle = rush ? '#5a1408' : '#241610';
  roundRect(ctx, 640, 8, 150, 48, 12);
  ctx.fill();
  ctx.strokeStyle = rush ? '#ff5a4a' : '#ff9d2e';
  ctx.lineWidth = 2;
  ctx.stroke();
  emoji(ctx, '⏱️', 668, 33, 24);
  text(ctx, formatClock(game.timeLeft), 720, 33, 26, tColor, 'center');

  text(ctx, `SCORE $${game.score}`, 830, 26, 20, '#ffd34d', 'left');
  text(ctx, `BEST $${Math.max(game.best.score, totalScore(game))}`, 830, 48, 12, '#d8c3a5', 'left', 'normal');
  if (game.combo >= 2) {
    ctx.fillStyle = '#ff6b1a';
    roundRect(ctx, 990, 12, 108, 40, 20);
    ctx.fill();
    text(ctx, `🔥 COMBO x${game.combo}`, 1044, 33, 16, '#fff', 'center');
  }
  // Header buttons
  for (const [label, x] of [['🔊', 1120], ['⏸', 1172], ['?', 1224]]) {
    ctx.fillStyle = '#5a3a1e';
    roundRect(ctx, x, 10, 44, 44, 10);
    ctx.fill();
    ctx.strokeStyle = '#ff9d2e';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    const shown = label === '🔊' && isMuted() ? '🔇' : label;
    text(ctx, shown, x + 22, 33, 20, '#fff', 'center');
  }
  if (labelUnused()) return;
  function labelUnused() { return false; }
}

function drawOrders(ctx, game) {
  ctx.fillStyle = '#6b4423';
  roundRect(ctx, 16, 72, 884, 106, 12);
  ctx.fill();
  text(ctx, '📋  ORDER BOARD', 30, 92, 14, '#ffd34d');
  if (game.orders.length === 0) {
    text(ctx, 'No orders yet — the lunch crowd is on its way…', 440, 138, 16, '#f6e3c2', 'center', 'normal');
  }
  game.orders.forEach((order, i) => {
    const x = 24 + i * 218;
    const y = 100;
    const frac = Math.max(0, order.patience / order.maxPatience);
    const urgent = frac < 0.25;
    ctx.fillStyle = urgent ? '#7a1f12' : '#fff8ea';
    roundRect(ctx, x, y, 206, 70, 10);
    ctx.fill();
    ctx.strokeStyle = urgent ? '#ff5a4a' : '#d9a05b';
    ctx.lineWidth = urgent ? 3 : 1.5;
    ctx.stroke();
    const tc = urgent ? '#ffffff' : '#3a1f10';
    const pc = urgent ? '#ffd34d' : '#7a4a12';
    emoji(ctx, order.customer.emoji, x + 24, y + 22, 26);
    text(ctx, order.customer.name, x + 44, y + 16, 13, tc);
    text(ctx, order.recipe.name, x + 44, y + 36, 13, tc);
    text(ctx, `$${order.recipe.price}`, x + 188, y + 16, 13, pc, 'right');
    // Recipe steps as small icons with state colour.
    order.recipe.steps.forEach(([id, state], j) => {
      const ing = INGREDIENTS[id];
      const done = order.steps[j] && order.steps[j].done;
      ctx.globalAlpha = done ? 0.35 : 1;
      ctx.fillStyle = ing.color;
      ctx.beginPath();
      ctx.arc(x + 24 + j * 34, y + 54, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      emoji(ctx, ing.emoji, x + 24 + j * 34, y + 55, 15);
    });
    if (order.recipe.steps.length <= 3) text(ctx, stateWord(order), x + 150, y + 54, 11, pc, 'center', 'normal');
    bar(ctx, x + 8, y + 62, 190, 5, frac, '#e8d5b5', frac > 0.5 ? '#57a83c' : frac > 0.25 ? '#ff9d2e' : '#e23b2e', 3);
  });
  function stateWord(o) {
    return o.recipe.steps.length <= 3 ? '3 steps' : `${o.recipe.steps.length} steps`;
  }
}

function drawServeWindow(ctx, game) {
  const ready = game.plates.some((p, i) => p.length > 0 && bestOrderForPlate(game, p));
  const pulse = ready && game.screen === 'playing' ? 0.5 + 0.5 * Math.sin(game.elapsed * 6) : 0;
  ctx.fillStyle = ready ? '#2e7d32' : '#8a5a2b';
  roundRect(ctx, 916, 72, 348, 106, 12);
  ctx.fill();
  ctx.strokeStyle = ready ? '#ffd34d' : '#d9a05b';
  ctx.lineWidth = ready ? 3 + pulse * 2 : 2;
  ctx.stroke();
  emoji(ctx, '🛎️', 960, 112, 40);
  text(ctx, ready ? 'READY TO SERVE!' : 'SERVING WINDOW', 990, 108, 22, '#fff');
  text(ctx, ready ? 'Click here — or press SPACE' : 'Serve a finished plate here', 990, 140, 13, '#ffe9c4', 'left', 'normal');
  text(ctx, 'Click a plate, then this window', 990, 160, 12, '#d8c3a5', 'left', 'normal');
}

function drawStation(ctx, game, st) {
  const item = st.item;
  const isBoard = st.kind === 'board';
  ctx.fillStyle = '#8a5a2b';
  roundRect(ctx, st.x, st.y, st.w, st.h, 12);
  ctx.fill();
  ctx.fillStyle = '#a9713f';
  ctx.fillRect(st.x + 6, st.y + 6, st.w - 12, 34);
  text(ctx, st.label.toUpperCase(), st.x + st.w / 2, st.y + 24, 13, '#fff', 'center');
  // Work surface
  ctx.fillStyle = isBoard ? '#e8c98f' : '#3d3d3d';
  roundRect(ctx, st.x + 10, st.y + 46, st.w - 20, 62, 8);
  ctx.fill();
  if (!isBoard) {
    // Burner rings / grill bars / oil
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(st.x + st.w / 2, st.y + 77, 12 + i * 9, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  if (item) {
    const cx = st.x + st.w / 2;
    const cy = st.y + 70;
    const ing = INGREDIENTS[item.id];
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    ctx.beginPath();
    ctx.arc(cx - 7, cy - 8, 8, 0, Math.PI * 2);
    ctx.fill();
    emoji(ctx, ing.emoji, cx, cy, 28);
    if (item.burned) {
      text(ctx, '🔥 BURNED — bin it!', cx, st.y + 99, 10, '#ffb3a7', 'center');
    } else if (st.kind === 'board') {
      const frac = item.chop / CHOP_CLICKS;
      text(ctx, item.state === 'chopped' ? '✓ Chopped — grab it!' : `Chop! ${item.chop}/${CHOP_CLICKS} clicks`, cx, st.y + 99, 10, '#3a1f10', 'center');
      bar(ctx, st.x + 30, st.y + 107, st.w - 60, 5, frac, '#d8c3a5', '#57a83c', 3);
    } else if (item.state === 'raw') {
      const need = { stove: 6, grill: 7, fryer: 5 }[st.kind];
      const frac = Math.min(1, item.cook / need);
      bar(ctx, st.x + 30, st.y + 107, st.w - 60, 5, frac, '#222', '#ff9d2e', 3);
      text(ctx, `Cooking… ${Math.ceil(need - item.cook)}s`, cx, st.y + 99, 10, '#fff', 'center', 'normal');
      if (frac > 0.4) drawSteam(ctx, cx + 18, cy - 26, game.elapsed);
    } else {
      text(ctx, `✓ ${itemLabel(item)} — grab it!`, cx, st.y + 99, 10, '#7be495', 'center');
      const burnFrac = 1 - Math.max(0, (item.cook - { stove: 6, grill: 7, fryer: 5 }[st.kind]) / 8);
      bar(ctx, st.x + 30, st.y + 107, st.w - 60, 5, burnFrac, '#222', burnFrac > 0.4 ? '#7be495' : '#e23b2e', 3);
      drawSteam(ctx, cx + 18, cy - 26, game.elapsed);
    }
  } else {
    const hint = {
      board: 'Drop a raw vegetable here, then click to chop',
      stove: 'Drop pasta, egg, soup… to boil',
      grill: 'Drop a patty or salmon to grill',
      fryer: 'Drop potato or egg to fry',
    }[st.kind];
    text(ctx, hint, st.x + st.w / 2, st.y + 77, 11, isBoard ? '#7a5a2e' : '#bbb', 'center', 'normal');
  }
}

function drawSteam(ctx, x, y, t) {
  ctx.fillStyle = 'rgba(255,255,255,.55)';
  for (let i = 0; i < 3; i++) {
    const yy = y - ((t * 22 + i * 12) % 36);
    const xx = x + Math.sin(t * 3 + i * 2) * 5;
    ctx.beginPath();
    ctx.arc(xx, yy, 5 - i, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawBins(ctx, game) {
  INGREDIENT_ORDER.forEach((id, i) => {
    const ing = INGREDIENTS[id];
    const col = i % 6;
    const row = Math.floor(i / 6);
    const x = 24 + col * 172;
    const y = 458 + row * 124;
    const heldHere = game.held && game.held.id === id;
    ctx.fillStyle = heldHere ? '#ff9d2e' : '#fff8ea';
    roundRect(ctx, x, y, 160, 112, 12);
    ctx.fill();
    ctx.strokeStyle = heldHere ? '#ffd34d' : '#d9a05b';
    ctx.lineWidth = heldHere ? 3 : 1.5;
    ctx.stroke();
    ctx.fillStyle = ing.color;
    ctx.beginPath();
    ctx.arc(x + 34, y + 34, 24, 0, Math.PI * 2);
    ctx.fill();
    emoji(ctx, ing.emoji, x + 34, y + 35, 30);
    text(ctx, ing.name, x + 66, y + 26, 12, '#3a1f10');
    const need = [];
    if (ing.chop) need.push('chop');
    if (ing.cook) need.push({ stove: 'boil', grill: 'grill', fryer: 'fry' }[ing.cook]);
    text(ctx, need.length ? need.join(' → ') : 'serve as-is', x + 66, y + 48, 11, '#7a5a2e', 'left', 'normal');
    ctx.fillStyle = '#3a1f10';
    roundRect(ctx, x + 126, y + 12, 26, 22, 6);
    ctx.fill();
    text(ctx, ing.key, x + 139, y + 24, 13, '#ffd34d', 'center');
    text(ctx, ing.blurb, x + 12, y + 82, 10, '#6b5a44', 'left', 'normal');
  });
  // Trash bin
  ctx.fillStyle = '#4a4a4a';
  roundRect(ctx, 1080, 458, 184, 246, 12);
  ctx.fill();
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 2;
  ctx.stroke();
  emoji(ctx, '🗑️', 1172, 540, 64);
  text(ctx, 'BIN', 1172, 600, 20, '#fff', 'center');
  text(ctx, 'Click while holding', 1172, 628, 12, '#ccc', 'center', 'normal');
  text(ctx, 'burned or wrong food', 1172, 646, 12, '#ccc', 'center', 'normal');
  text(ctx, 'or press T', 1172, 668, 12, '#ccc', 'center', 'normal');
}

function drawPlates(ctx, game) {
  game.plates.forEach((plate, i) => {
    const x = 24 + i * 304;
    const y = 330;
    const selected = game.selectedPlate === i;
    const readyOrder = plate.length > 0 ? bestOrderForPlate(game, plate) : null;
    const glow = readyOrder ? 0.6 + 0.4 * Math.sin(game.elapsed * 6) : 0;
    ctx.fillStyle = '#6b4423';
    roundRect(ctx, x, y, 288, 116, 12);
    ctx.fill();
    ctx.strokeStyle = readyOrder ? `rgba(255,211,77,${0.5 + glow * 0.5})` : selected ? '#ff9d2e' : '#d9a05b';
    ctx.lineWidth = readyOrder ? 3 : 2;
    ctx.stroke();
    text(ctx, `🍽️  PLATE ${i + 1}`, x + 14, y + 20, 13, '#ffd34d');
    if (readyOrder) text(ctx, `✓ ${readyOrder.recipe.name} — SERVE!`, x + 96, y + 20, 11, '#7be495');
    // Plate dish
    ctx.fillStyle = '#f4f4f4';
    ctx.beginPath();
    ctx.ellipse(x + 144, y + 72, 118, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9c9c9';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (plate.length === 0) {
      text(ctx, 'Empty plate — click with food to build a dish', x + 144, y + 72, 11, '#8a8a8a', 'center', 'normal');
    } else {
      plate.forEach((item, j) => {
        const ix = x + 84 + j * 42;
        const ing = INGREDIENTS[item.id];
        ctx.fillStyle = item.burned ? '#333' : ing.color;
        ctx.beginPath();
        ctx.arc(ix, y + 72, 20, 0, Math.PI * 2);
        ctx.fill();
        emoji(ctx, item.burned ? '🔥' : ing.emoji, ix, y + 73, 22);
      });
      // Progress against the closest order
      let best = 0;
      for (const o of game.orders) best = Math.max(best, plateProgress(plate, o));
      bar(ctx, x + 30, y + 100, 228, 6, best, '#d8c3a5', best >= 1 ? '#57a83c' : '#ff9d2e', 3);
    }
  });
  // Side panel: recipe book + how to play + live tip
  ctx.fillStyle = '#3a1f10';
  roundRect(ctx, 636, 330, 300, 116, 12);
  ctx.fill();
  ctx.fillStyle = '#ff9d2e';
  roundRect(ctx, 636, 330, 300, 52, 12);
  ctx.fill();
  text(ctx, '📖  RECIPE BOOK  (12 dishes)', 786, 356, 15, '#241610', 'center');
  ctx.fillStyle = '#5a3a1e';
  roundRect(ctx, 636, 392, 300, 52, 12);
  ctx.fill();
  text(ctx, '❓  HOW TO PLAY', 786, 418, 15, '#ffd34d', 'center');
  ctx.fillStyle = '#3a1f10';
  roundRect(ctx, 946, 330, 310, 116, 12);
  ctx.fill();
  const tip = TIPS[Math.floor(game.elapsed / 12) % TIPS.length];
  const tipShown = tip.length > 40 ? tip.slice(0, 40).replace(/\s\S*$/, '') + '…' : tip;
  text(ctx, `💡 ${tipShown}`, 952, 356, 12, '#ffe9c4', 'left', 'normal');
  text(ctx, 'Chop on the board · cook on the', 952, 388, 12, '#d8c3a5', 'left', 'normal');
  text(ctx, 'stove, grill or fryer · build on', 952, 408, 12, '#d8c3a5', 'left', 'normal');
  text(ctx, 'a plate · SPACE serves · P pauses', 952, 428, 12, '#d8c3a5', 'left', 'normal');
}

function drawHeld(ctx, game, mx, my) {
  if (!game.held || game.screen !== 'playing') return;
  const ing = INGREDIENTS[game.held.id];
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = ing.color;
  ctx.beginPath();
  ctx.arc(mx, my - 18, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.stroke();
  emoji(ctx, ing.emoji, mx, my - 17, 26);
  ctx.restore();
  text(ctx, itemLabel(game.held), mx, my + 16, 12, '#fff', 'center');
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  roundRect(ctx, mx - 52, my + 24, 104, 18, 9);
  ctx.fill();
  text(ctx, 'carrying — click a station', mx, my + 34, 10, '#ffd34d', 'center', 'normal');
}

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const f of game.floaters) {
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 0.7));
    text(ctx, f.text, f.x, f.y, 18, f.color, 'center');
  }
  ctx.globalAlpha = 1;
}

function dim(ctx) {
  ctx.fillStyle = 'rgba(20,10,4,.72)';
  ctx.fillRect(0, 0, W, H);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = '#fff8ea';
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = '#ff9d2e';
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawTitle(ctx, game) {
  // Warm kitchen backdrop behind the title card.
  ctx.fillStyle = '#f6e3c2';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8c98f';
  for (let i = 0; i < 8; i++) ctx.fillRect(0, 90 + i * 80, W, 6);
  drawOrders(ctx, game);
  drawServeWindow(ctx, game);
  for (const st of game.stations) drawStation(ctx, game, st);
  drawPlates(ctx, game);
  drawBins(ctx, game);
  dim(ctx);
  panel(ctx, 240, 60, 800, 600);
  text(ctx, '🍳  EMBER & THYME', 640, 120, 46, '#a34a12', 'center');
  text(ctx, 'SIZZLE & SERVE', 640, 168, 30, '#e23b2e', 'center');
  text(ctx, 'The coziest little cooking game on the street — run the lunch rush,', 640, 216, 16, '#5a3a1e', 'center', 'normal');
  text(ctx, 'chop, grill, boil and fry your way through 12 original recipes.', 640, 240, 16, '#5a3a1e', 'center', 'normal');
  const lines = [
    ['1️⃣', 'Grab an ingredient from the bins below'],
    ['2️⃣', 'Chop it on the board · cook it on stove, grill or fryer'],
    ['3️⃣', 'Build the dish on a plate — it glows gold when it matches an order'],
    ['4️⃣', 'Serve at the window before patience runs out · combos pay extra'],
  ];
  lines.forEach(([n, s], i) => {
    text(ctx, `${n}  ${s}`, 640, 292 + i * 34, 16, '#3a1f10', 'center', 'normal');
  });
  text(ctx, `🏆 Best shift so far: $${game.best.score}  ·  3 shifts  ·  12 recipes  ·  8 hungry customers`, 640, 452, 14, '#7a4a12', 'center');
  ctx.fillStyle = '#e23b2e';
  roundRect(ctx, 440, 520, 400, 64, 32);
  ctx.fill();
  ctx.strokeStyle = '#ffd34d';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, '▶  START DAY 1', 640, 553, 24, '#fff', 'center');
  ctx.fillStyle = '#ff9d2e';
  roundRect(ctx, 440, 600, 400, 48, 24);
  ctx.fill();
  text(ctx, '📖  Browse the Recipe Book', 640, 625, 16, '#241610', 'center');
}

function drawHelp(ctx, game) {
  dim(ctx);
  panel(ctx, 180, 60, 920, 600);
  text(ctx, '❓  HOW TO PLAY', 640, 104, 30, '#a34a12', 'center');
  const rows = [
    ['🖱️ Mouse', 'Click a bin to pick up an ingredient. Click a station to use it. Click a plate to add food.'],
    ['⌨️ Keys', '1–0, Q, W grab ingredients · SPACE serves a ready plate · T bins held food · P pauses · M mutes.'],
    ['🔪 Chop', 'Vegetables need 3 clicks on the chopping board before they can be plated or cooked.'],
    ['🍳 Cook', 'Stove boils pasta and soups (6s) · grill cooks patty and salmon (7s) · fryer fries potato and egg (5s).'],
    ['🔥 Burn!', 'Cooked food burns 8 seconds after it is ready. Burned food can only go in the bin.'],
    ['🍽️ Plates', 'A plate glows gold when it exactly matches an open order. Serve it at the window for cash + tip.'],
    ['🔥 Combo', 'Serve dishes back-to-back to build a combo — every combo step adds $10 to the next serve.'],
    ['⏱️ Patience', 'Each ticket drains. Serve the reddest tickets first — a walked-out customer pays nothing.'],
    ['⭐ Stars', 'Beat the shift target for 2 stars, 1.6× the target for 3. Finish all 3 shifts to win the game.'],
  ];
  rows.forEach(([a, b], i) => {
    text(ctx, a, 220, 150 + i * 46, 15, '#a34a12');
    text(ctx, b, 380, 150 + i * 46, 14, '#3a1f10', 'left', 'normal');
  });
  ctx.fillStyle = '#e23b2e';
  roundRect(ctx, 1080, 84, 140, 48, 12);
  ctx.fill();
  text(ctx, '✕ CLOSE', 1150, 109, 15, '#fff', 'center');
  text(ctx, 'Click CLOSE or press ESC to return to the kitchen.', 640, 600, 14, '#7a4a12', 'center', 'normal');
}

function drawBook(ctx, game) {
  dim(ctx);
  panel(ctx, 120, 60, 1040, 600);
  text(ctx, '📖  RECIPE BOOK — 12 DISHES', 640, 104, 30, '#a34a12', 'center');
  text(ctx, 'Every dish, every step. Tap a recipe to see exactly what the plate needs.', 640, 134, 14, '#7a4a12', 'center', 'normal');
  RECIPES.forEach((r, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 150 + col * 340;
    const y = 160 + row * 118;
    ctx.fillStyle = '#fff';
    roundRect(ctx, x, y, 320, 104, 12);
    ctx.fill();
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 2;
    ctx.stroke();
    emoji(ctx, r.emoji, x + 32, y + 30, 34);
    text(ctx, r.name, x + 60, y + 22, 15, '#3a1f10');
    text(ctx, `$${r.price}  ·  ${r.tag}`, x + 60, y + 44, 11, '#7a4a12', 'left', 'normal');
    r.steps.forEach(([id, state], j) => {
      const ing = INGREDIENTS[id];
      ctx.fillStyle = ing.color;
      ctx.beginPath();
      ctx.arc(x + 26 + j * 30, y + 74, 12, 0, Math.PI * 2);
      ctx.fill();
      emoji(ctx, ing.emoji, x + 26 + j * 30, y + 75, 14);
    });
    text(ctx, r.steps.map(([id, state]) => `${state} ${INGREDIENTS[id].name}`).join(' + '), x + 16, y + 96, 10, '#5a3a1e', 'left', 'normal');
  });
  ctx.fillStyle = '#e23b2e';
  roundRect(ctx, 1080, 84, 140, 48, 12);
  ctx.fill();
  text(ctx, '✕ CLOSE', 1150, 109, 15, '#fff', 'center');
}

function drawDayEnd(ctx, game) {
  dim(ctx);
  panel(ctx, 280, 90, 720, 540);
  const shift = SHIFTS[game.dayIndex];
  const stars = starsFor(game.score, shift.target);
  text(ctx, `DAY ${game.dayIndex + 1} COMPLETE!`, 640, 150, 34, '#a34a12', 'center');
  text(ctx, shift.name, 640, 192, 18, '#7a4a12', 'center', 'normal');
  text(ctx, '★'.repeat(stars) + '☆'.repeat(3 - stars), 640, 250, 44, '#ff9d2e', 'center');
  const rows = [
    [`Score`, `$${game.score}  (target $${shift.target})`],
    [`Dishes served`, `${game.served}`],
    [`Customers walked out`, `${game.missed}`],
    [`Best combo`, `x${game.bestCombo}`],
    [`Burned dishes`, `${game.burnedCount}`],
    [`Total so far`, `$${totalScore(game)}`],
  ];
  rows.forEach(([a, b], i) => {
    text(ctx, a, 400, 300 + i * 34, 16, '#5a3a1e', 'left', 'normal');
    text(ctx, b, 880, 300 + i * 34, 16, '#3a1f10', 'right');
  });
  const last = game.dayIndex + 1 >= SHIFTS.length;
  ctx.fillStyle = '#e23b2e';
  roundRect(ctx, 440, 560, 400, 60, 30);
  ctx.fill();
  text(ctx, last ? '🏆  SEE FINAL RESULTS' : `▶  START DAY ${game.dayIndex + 2}`, 640, 591, 20, '#fff', 'center');
  ctx.fillStyle = '#ff9d2e';
  roundRect(ctx, 440, 632, 400, 48, 24);
  ctx.fill();
  text(ctx, '↩  Back to Title', 640, 657, 15, '#241610', 'center');
}

function drawGameOver(ctx, game) {
  dim(ctx);
  panel(ctx, 280, 70, 720, 580);
  const total = totalScore(game);
  text(ctx, '🏆  SERVICE COMPLETE!', 640, 130, 34, '#a34a12', 'center');
  text(ctx, 'Three shifts, one very tired chef, and a full dining room.', 640, 172, 15, '#7a4a12', 'center', 'normal');
  const allStars = game.dayScores.reduce((a, s, i) => a + starsFor(s, SHIFTS[i].target), 0);
  text(ctx, '★'.repeat(allStars) + '☆'.repeat(9 - allStars), 640, 224, 40, '#ff9d2e', 'center');
  text(ctx, `${allStars} / 9 stars`, 640, 268, 16, '#5a3a1e', 'center');
  text(ctx, `TOTAL SCORE  $${total}`, 640, 320, 28, '#e23b2e', 'center');
  text(ctx, game.best.score >= total && game.best.score > 0 ? `Best shift total on this machine: $${game.best.score}` : 'A new best on this machine!', 640, 360, 14, '#7a4a12', 'center', 'normal');
  const verdict = allStars >= 8 ? 'Legendary Chef! The whole street is talking about Ember & Thyme.'
    : allStars >= 6 ? 'Head Chef material — the regulars already booked next Saturday.'
    : allStars >= 3 ? 'A solid service. The kitchen survived — mostly.'
    : 'A rocky first week. The stove forgives you. The customers, less so.';
  text(ctx, verdict, 640, 404, 15, '#3a1f10', 'center', 'normal');
  text(ctx, 'Thanks for playing Ember & Thyme — Sizzle & Serve!', 640, 448, 14, '#7a4a12', 'center', 'normal');
  ctx.fillStyle = '#e23b2e';
  roundRect(ctx, 440, 560, 400, 60, 30);
  ctx.fill();
  text(ctx, '↻  PLAY AGAIN', 640, 591, 20, '#fff', 'center');
  ctx.fillStyle = '#ff9d2e';
  roundRect(ctx, 440, 632, 400, 48, 24);
  ctx.fill();
  text(ctx, '↩  Back to Title', 640, 657, 15, '#241610', 'center');
}

function drawPaused(ctx, game) {
  dim(ctx);
  panel(ctx, 380, 220, 520, 280);
  text(ctx, '⏸  PAUSED', 640, 300, 36, '#a34a12', 'center');
  text(ctx, 'The orders are waiting… but they are not getting colder.', 640, 350, 14, '#7a4a12', 'center', 'normal');
  text(ctx, 'Press P or click ⏸ to resume · ESC for help', 640, 390, 14, '#5a3a1e', 'center', 'normal');
  text(ctx, 'M mutes the kitchen sounds', 640, 424, 14, '#5a3a1e', 'center', 'normal');
}

export function render(ctx, game, mx, my) {
  ctx.save();
  if (game.shake > 0) {
    ctx.translate((game.rng() - 0.5) * game.shake * 24, (game.rng() - 0.5) * game.shake * 24);
  }
  // Kitchen backdrop: warm floor + tiled wall.
  ctx.fillStyle = '#f6e3c2';
  ctx.fillRect(-20, -20, W + 40, H + 40);
  ctx.fillStyle = '#e8c98f';
  for (let i = 0; i < 9; i++) ctx.fillRect(-20, 84 + i * 78, W + 40, 4);
  ctx.fillStyle = '#d9a05b';
  ctx.fillRect(0, 178, W, 6);
  drawHeader(ctx, game);
  drawOrders(ctx, game);
  drawServeWindow(ctx, game);
  for (const st of game.stations) drawStation(ctx, game, st);
  drawPlates(ctx, game);
  drawBins(ctx, game);
  drawParticles(ctx, game);
  // Hint toast
  if (game.hintTimer > 0 && game.screen === 'playing') {
    ctx.fillStyle = 'rgba(36,22,16,.85)';
    roundRect(ctx, 340, 668, 600, 36, 18);
    ctx.fill();
    text(ctx, game.hint, 640, 687, 14, '#ffd34d', 'center', 'normal');
  }
  // Achievement toasts
  game.unlocked.forEach((u, i) => {
    ctx.globalAlpha = Math.min(1, u.life);
    ctx.fillStyle = '#2e7d32';
    roundRect(ctx, 920, 200 + i * 44, 340, 36, 18);
    ctx.fill();
    text(ctx, `🏅 ${u.label}`, 1090, 219 + i * 44, 14, '#fff', 'center');
    ctx.globalAlpha = 1;
  });
  drawHeld(ctx, game, mx, my);
  ctx.restore();

  if (game.screen === 'title') drawTitle(ctx, game);
  else if (game.screen === 'help') drawHelp(ctx, game);
  else if (game.screen === 'book') drawBook(ctx, game);
  else if (game.screen === 'dayEnd') drawDayEnd(ctx, game);
  else if (game.screen === 'gameOver') drawGameOver(ctx, game);
  else if (game.screen === 'paused') drawPaused(ctx, game);
}
