// Ember & Thyme — game data: ingredients, recipes, customers, shifts.
// Every dish in the game is defined here, so the kitchen, the order board and
// the recipe book all read from the same single source of truth.

export const INGREDIENTS = {
  tomato:  { name: 'Tomato',   emoji: '🍅', color: '#e23b2e', chop: true,  cook: 'stove',  key: '1', blurb: 'Sweet and sun-ripened.' },
  lettuce: { name: 'Lettuce',  emoji: '🥬', color: '#57a83c', chop: true,  cook: null,     key: '2', blurb: 'Crisp and cool.' },
  onion:   { name: 'Onion',    emoji: '🧅', color: '#c98fd0', chop: true,  cook: 'stove',  key: '3', blurb: 'Chop it, or sweat it down.' },
  carrot:  { name: 'Carrot',   emoji: '🥕', color: '#ef7d1a', chop: true,  cook: 'stove',  key: '4', blurb: 'Sweet crunch, raw or cooked.' },
  bread:   { name: 'Bread',    emoji: '🍞', color: '#d9a05b', chop: false, cook: null,     key: '5', blurb: 'Fresh-baked this morning.' },
  patty:   { name: 'Patty',    emoji: '🥩', color: '#a34a3a', chop: false, cook: 'grill',   key: '6', blurb: 'Hand-pressed. Grill it well.' },
  salmon:  { name: 'Salmon',   emoji: '🐟', color: '#f28c6b', chop: false, cook: 'grill',   key: '7', blurb: 'Line-caught. Grill briefly.' },
  pasta:   { name: 'Pasta',    emoji: '🍝', color: '#f2c14e', chop: false, cook: 'stove',   key: '8', blurb: 'Bronze-cut. Boil al dente.' },
  cheese:  { name: 'Cheese',   emoji: '🧀', color: '#f7c948', chop: false, cook: null,     key: '9', blurb: 'Aged cheddar, crumbled.' },
  egg:     { name: 'Egg',      emoji: '🥚', color: '#fdf3d0', chop: false, cook: 'fryer',   key: '0', blurb: 'Free-range. Fry sunny-side up.' },
  potato:  { name: 'Potato',   emoji: '🥔', color: '#c89b5e', chop: true,  cook: 'fryer',   key: 'Q', blurb: 'Chop, then fry golden.' },
  mushroom:{ name: 'Mushroom', emoji: '🍄', color: '#b08968', chop: true,  cook: 'stove',   key: 'W', blurb: 'Woodland. Chop, then pan-fry.' },
};

export const INGREDIENT_ORDER = [
  'tomato', 'lettuce', 'onion', 'carrot',
  'bread', 'patty', 'salmon', 'pasta',
  'cheese', 'egg', 'potato', 'mushroom',
];

// A recipe step is an ingredient id plus the finished state it must be in
// when it reaches the plate: raw, chopped, boiled, grilled or fried.
export const RECIPES = [
  {
    id: 'garden-salad', name: 'Garden Salad', emoji: '🥗', price: 90, time: 55,
    steps: [['lettuce', 'chopped'], ['tomato', 'chopped'], ['onion', 'chopped']],
    tag: 'Fresh & light', color: '#57a83c',
    desc: 'The house salad. Three chopped garden vegetables on one plate.',
  },
  {
    id: 'tomato-pasta', name: 'Tomato Pasta', emoji: '🍝', price: 140, time: 70,
    steps: [['pasta', 'boiled'], ['tomato', 'chopped'], ['cheese', 'raw']],
    tag: 'House favourite', color: '#e23b2e',
    desc: 'Bronze-cut pasta, fresh tomato and a snowfall of aged cheddar.',
  },
  {
    id: 'classic-burger', name: 'Classic Burger', emoji: '🍔', price: 160, time: 75,
    steps: [['bread', 'raw'], ['patty', 'grilled'], ['lettuce', 'chopped'], ['cheese', 'raw']],
    tag: 'Crowd pleaser', color: '#a34a3a',
    desc: 'Grilled patty, crisp lettuce and cheddar in fresh-baked bread.',
  },
  {
    id: 'salmon-plate', name: 'Salmon Plate', emoji: '🐟', price: 180, time: 80,
    steps: [['salmon', 'grilled'], ['lettuce', 'chopped'], ['carrot', 'chopped']],
    tag: 'Catch of the day', color: '#f28c6b',
    desc: 'Grilled salmon with a crunchy garden slaw on the side.',
  },
  {
    id: 'tomato-soup', name: 'Tomato Soup', emoji: '🍲', price: 110, time: 60,
    steps: [['tomato', 'chopped'], ['onion', 'chopped'], ['mushroom', 'chopped']],
    tag: 'Slow simmered', color: '#d95d28',
    desc: 'Simmered tomato, onion and mushroom. Served steaming hot.',
  },
  {
    id: 'veggie-stirfry', name: 'Veggie Stir-Fry', emoji: '🥘', price: 130, time: 65,
    steps: [['onion', 'chopped'], ['carrot', 'chopped'], ['mushroom', 'chopped']],
    tag: 'Wok-fired', color: '#ef7d1a',
    desc: 'Garden vegetables tossed fast and hot in the wok.',
  },
  {
    id: 'cheese-omelette', name: 'Cheese Omelette', emoji: '🍳', price: 120, time: 60,
    steps: [['egg', 'fried'], ['cheese', 'raw'], ['tomato', 'chopped']],
    tag: 'All-day breakfast', color: '#f7c948',
    desc: 'A fluffy fried egg folded over cheddar and fresh tomato.',
  },
  {
    id: 'crispy-fries', name: 'Crispy Fries', emoji: '🍟', price: 80, time: 50,
    steps: [['potato', 'fried'], ['cheese', 'raw']],
    tag: 'Golden side', color: '#c89b5e',
    desc: 'Hand-cut potato, fried golden, dusted with cheddar snow.',
  },
  {
    id: 'mushroom-pasta', name: 'Mushroom Pasta', emoji: '🍄', price: 150, time: 75,
    steps: [['pasta', 'boiled'], ['mushroom', 'chopped'], ['cheese', 'raw']],
    tag: 'Woodland special', color: '#b08968',
    desc: 'Earthy mushrooms folded through buttery bronze-cut pasta.',
  },
  {
    id: 'sunny-breakfast', name: 'Sunny Breakfast', emoji: '🍳', price: 170, time: 80,
    steps: [['egg', 'fried'], ['bread', 'raw'], ['patty', 'grilled']],
    tag: 'Big appetite', color: '#e8a33d',
    desc: 'Fried egg, grilled patty and warm bread. The full morning plate.',
  },
  {
    id: 'salmon-pasta', name: 'Salmon Pasta', emoji: '🍝', price: 200, time: 85,
    steps: [['pasta', 'boiled'], ['salmon', 'grilled'], ['lettuce', 'chopped']],
    tag: 'Chef’s signature', color: '#f28c6b',
    desc: 'The most expensive plate on the board — and the most loved.',
  },
  {
    id: 'garden-burger', name: 'Garden Burger', emoji: '🥬', price: 150, time: 70,
    steps: [['bread', 'raw'], ['patty', 'grilled'], ['tomato', 'chopped'], ['onion', 'chopped']],
    tag: 'Garden stack', color: '#57a83c',
    desc: 'A tall stack: grilled patty, tomato and onion in fresh bread.',
  },
];

export const RECIPE_BY_ID = Object.fromEntries(RECIPES.map((r) => [r.id, r]));

// Customers who sit at the pass. Each order carries a face and a name so the
// ticket board reads like a dining room, not a spreadsheet.
export const CUSTOMERS = [
  { name: 'Maya',  emoji: '👩', color: '#e8a0b4', note: 'Always in a hurry, tips well when fast.' },
  { name: 'Theo',  emoji: '👨', color: '#7fb3e8', note: 'A regular. Orders the burger, every time.' },
  { name: 'June',  emoji: '👵', color: '#c9a0e8', note: 'Tastes everything twice. Loves the soup.' },
  { name: 'Ravi',  emoji: '👨‍🍳', color: '#e8c97f', note: 'A chef on his day off. Hard to impress.' },
  { name: 'Lena',  emoji: '👧', color: '#9fe8c9', note: 'Only eats food that looks like a rainbow.' },
  { name: 'Omar',  emoji: '🧔', color: '#e8a37f', note: 'Orders for the whole table. Big tickets.' },
  { name: 'Suki',  emoji: '👩‍🎤', color: '#f27f9b', note: 'Photographs every plate before eating.' },
  { name: 'Ben',   emoji: '🧑', color: '#8fd0e8', note: 'First date. Please do not burn anything.' },
];

// Three lunch shifts. Later shifts pay more, wait less patiently and order
// from the harder end of the menu.
export const SHIFTS = [
  {
    day: 1, name: 'First Lunch Rush', seconds: 150, target: 450,
    spawnEvery: 16, patience: 85, maxOrders: 3,
    pool: ['garden-salad', 'tomato-soup', 'crispy-fries', 'cheese-omelette', 'tomato-pasta'],
    intro: 'Your first shift at Ember & Thyme. Five dishes on the board — keep it simple, keep it moving.',
  },
  {
    day: 2, name: 'The Regulars Return', seconds: 165, target: 750,
    spawnEvery: 13, patience: 72, maxOrders: 4,
    pool: ['garden-salad', 'tomato-pasta', 'classic-burger', 'veggie-stirfry', 'mushroom-pasta', 'tomato-soup', 'cheese-omelette'],
    intro: 'Word is out. The regulars are back and the tickets come faster.',
  },
  {
    day: 3, name: 'Saturday Service', seconds: 180, target: 1100,
    spawnEvery: 11, patience: 60, maxOrders: 4,
    pool: ['classic-burger', 'salmon-plate', 'salmon-pasta', 'sunny-breakfast', 'garden-burger', 'mushroom-pasta', 'tomato-pasta', 'veggie-stirfry'],
    intro: 'Saturday night, full house. Every dish on the menu. This is the shift legends are made of.',
  },
];

export const TIPS = [
  'Chop while something cooks — never stand still.',
  'A plate that matches an order glows gold. Serve it fast for a bigger tip.',
  'Serve three dishes in a row without a mistake to build a combo.',
  'Burned food can only go in the bin. Watch the cook bar turn red.',
  'Two pots, one grill, one fryer: plan your route before you grab.',
  'Patience bars turn red under 15 seconds. Serve those tickets first.',
  'Press 1–0, Q, W to grab ingredients without clicking the bins.',
  'Space serves the first finished plate. P pauses the shift.',
];

// Finished states a station produces, and how long each takes (seconds).
export const COOK_TIME = { stove: 6, grill: 7, fryer: 5 };
export const BURN_AFTER = 8; // seconds past done before food burns
export const CHOP_CLICKS = 3;

export function recipeSteps(recipe) {
  return recipe.steps.map(([id, state]) => ({ id, state, done: false }));
}

export function formatClock(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function starsFor(score, target) {
  if (score >= target * 1.6) return 3;
  if (score >= target) return 2;
  if (score >= target * 0.6) return 1;
  return 0;
}
