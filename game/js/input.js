// Ember & Thyme — input: mouse clicks and keyboard shortcuts, translated
// into kitchen actions. One clear job: turn a click into the right verb.

import { INGREDIENTS, CHOP_CLICKS } from './data.js';
import {
  newItem, stationAccepts, servePlate, trashHeld, clearPlate, itemLabel,
} from './state.js';
import { sfx, toggleMute } from './audio.js';

export function canvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * 1280,
    y: ((event.clientY - rect.top) / rect.height) * 720,
  };
}

function pickUpBin(game, id) {
  if (game.held) {
    game.hint = 'Your hands are full — use what you are holding first!';
    game.hintTimer = 2.5;
    sfx.wrong();
    return;
  }
  game.held = newItem(id, 'raw');
  sfx.pick();
}

function useStation(game, station) {
  const st = station;
  // Chopping: an empty-handed click on a raw item on the board chops it.
  if (st.item && st.kind === 'board' && st.item.state === 'raw') {
    if (game.held) {
      game.hint = 'Your hands are full — use what you are holding first!';
      game.hintTimer = 2.5;
      sfx.wrong();
      return;
    }
    st.item.chop += 1;
    sfx.chop();
    if (st.item.chop >= CHOP_CLICKS) {
      st.item.state = 'chopped';
      st.item.chop = CHOP_CLICKS;
      sfx.chopped();
    }
    return;
  }
  // Retrieve a finished / chopped item with empty hands.
  if (!game.held && st.item) {
    game.held = st.item;
    st.item = null;
    sfx.pick();
    return;
  }
  // Place held item onto an empty station.
  if (game.held && !st.item) {
    if (stationAccepts(st, game.held)) {
      st.item = game.held;
      game.held = null;
      sfx.drop();
      if (st.kind !== 'board') sfx.sizzle();
      if (st.kind === 'board') {
        game.hint = 'Click the board 3 times to chop it!';
        game.hintTimer = 3;
      }
    } else {
      game.hint = stationHint(st, game.held);
      game.hintTimer = 2.5;
      sfx.wrong();
    }
    return;
  }
  if (game.held && st.item) {
    game.hint = 'That station is busy — grab its food first, or use another station.';
    game.hintTimer = 2.5;
    sfx.wrong();
  }
}

function stationHint(st, item) {
  const ing = INGREDIENTS[item.id];
  if (item.burned) return 'Burned food goes in the bin, not on a station.';
  if (st.kind === 'board') {
    if (!ing.chop) return `${ing.name} does not need chopping.`;
    if (item.state !== 'raw') return `${ing.name} is already ${item.state}.`;
    return 'The board is for chopping raw vegetables.';
  }
  if (ing.cook !== st.kind) {
    if (!ing.cook) return `${ing.name} is served as it is — no cooking needed.`;
    const where = { stove: 'the stove', grill: 'the grill', fryer: 'the fryer' }[ing.cook];
    return `${ing.name} belongs on ${where}, not here.`;
  }
  if (item.state !== 'raw') return `${ing.name} is already ${item.state}.`;
  return 'That does not go there.';
}

function usePlate(game, index, button) {
  if (button === 2) {
    clearPlate(game, index);
    return;
  }
  game.selectedPlate = index;
  const plate = game.plates[index];
  if (!game.held) {
    // Empty hands + plate with food: take the last item back off.
    if (plate.length > 0) {
      game.held = plate.pop();
      sfx.pick();
    }
    return;
  }
  if (game.held.burned) {
    game.hint = 'Burned food cannot be served — bin it (T or the trash).';
    game.hintTimer = 2.5;
    sfx.wrong();
    return;
  }
  plate.push(game.held);
  game.held = null;
  sfx.plate();
}

export function handleClick(game, zone, button, callbacks) {
  if (!zone) return;
  const { startShift, showHelp, showBook, closeOverlay, nextDay, toTitle, replay } = callbacks;
  switch (game.screen) {
    case 'title':
      if (zone.kind === 'start') startShift(0);
      else if (zone.kind === 'startBook' || zone.kind === 'book') showBook();
      else if (zone.kind === 'help') showHelp();
      return;
    case 'help':
    case 'book':
      if (zone.kind === 'close') closeOverlay();
      return;
    case 'dayEnd':
      if (zone.kind === 'nextDay') nextDay();
      else if (zone.kind === 'title') toTitle();
      return;
    case 'gameOver':
      if (zone.kind === 'replay') replay();
      else if (zone.kind === 'title') toTitle();
      return;
    case 'paused':
      if (zone.kind === 'pause') callbacks.resume();
      return;
    default:
      break;
  }
  if (game.screen !== 'playing') return;
  switch (zone.kind) {
    case 'mute':
      toggleMute();
      break;
    case 'pause':
      callbacks.pause();
      break;
    case 'help':
      showHelp();
      break;
    case 'bin':
      pickUpBin(game, zone.id);
      break;
    case 'station':
      useStation(game, zone.station);
      break;
    case 'plate':
      usePlate(game, zone.index, button);
      break;
    case 'serve': {
      const idx = game.plates.findIndex((p, i) => i === game.selectedPlate && p.length > 0)
        ?? -1;
      const target = idx >= 0 ? idx : game.plates.findIndex((p) => p.length > 0);
      if (target >= 0) servePlate(game, target);
      else {
        game.hint = 'No plate ready — build a dish first!';
        game.hintTimer = 2.5;
        sfx.wrong();
      }
      break;
    }
    case 'trash':
      trashHeld(game);
      break;
    case 'book':
      showBook();
      break;
    case 'howto':
      showHelp();
      break;
    default:
      break;
  }
}

export function handleKey(game, event, callbacks) {
  const k = event.key.toLowerCase();
  if (k === 'm') { toggleMute(); return; }
  if (game.screen === 'title' && (k === 'enter' || k === ' ')) { callbacks.startShift(0); return; }
  if ((game.screen === 'help' || game.screen === 'book') && (k === 'escape' || k === 'enter')) {
    callbacks.closeOverlay();
    return;
  }
  if (k === 'escape' && game.screen === 'playing') { callbacks.showHelp(); return; }
  if (k === 'p' && (game.screen === 'playing' || game.screen === 'paused')) {
    if (game.screen === 'playing') callbacks.pause();
    else callbacks.resume();
    return;
  }
  if (game.screen === 'dayend') return;
  if (game.screen === 'dayEnd' && k === 'enter') { callbacks.nextDay(); return; }
  if (game.screen !== 'playing') return;
  if (k === ' ') {
    event.preventDefault();
    const ready = game.plates.findIndex((p) => p.length > 0);
    if (ready >= 0) servePlate(game, ready);
    return;
  }
  if (k === 't') { trashHeld(game); return; }
  if (k === 'z' || k === 'x') {
    game.selectedPlate = k === 'z' ? 0 : 1;
    return;
  }
  // Ingredient hotkeys.
  const byKey = Object.entries(INGREDIENTS).find(([, v]) => v.key.toLowerCase() === k);
  if (byKey) pickUpBin(game, byKey[0]);
}

export { itemLabel };
