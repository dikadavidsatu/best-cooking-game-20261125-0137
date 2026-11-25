// Ember & Thyme — tiny WebAudio sound kit. All sounds are synthesized with
// oscillators and noise buffers, so the game ships no audio files at all.

let ctx = null;
let muted = false;

export function isMuted() { return muted; }
export function toggleMute() {
  muted = !muted;
  return muted;
}

function audioCtx() {
  if (!ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
    } catch {
      ctx = null;
    }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type = 'sine', vol = 0.12, when = 0, slideTo = null) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol = 0.08, when = 0, filterFreq = 1800) {
  if (muted) return;
  const ac = audioCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFreq;
  const gain = ac.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

export const sfx = {
  pick() { tone(520, 0.07, 'triangle', 0.08); },
  drop() { tone(340, 0.08, 'triangle', 0.08); },
  chop() { noiseBurst(0.09, 0.14, 0, 2400); tone(180, 0.06, 'square', 0.05); },
  chopped() { tone(660, 0.09, 'triangle', 0.1); tone(880, 0.12, 'triangle', 0.1, 0.08); },
  sizzle() { noiseBurst(0.35, 0.05, 0, 4200); },
  cooked() { tone(740, 0.1, 'sine', 0.1); tone(988, 0.14, 'sine', 0.1, 0.09); },
  burn() { tone(220, 0.3, 'sawtooth', 0.07, 0, 110); },
  plate() { tone(440, 0.08, 'triangle', 0.09); tone(554, 0.1, 'triangle', 0.09, 0.07); },
  serve() {
    tone(523, 0.1, 'triangle', 0.11);
    tone(659, 0.1, 'triangle', 0.11, 0.09);
    tone(784, 0.16, 'triangle', 0.12, 0.18);
  },
  combo(n) {
    const base = 500 + Math.min(n, 8) * 60;
    tone(base, 0.09, 'square', 0.06);
    tone(base * 1.25, 0.12, 'square', 0.06, 0.07);
  },
  wrong() { tone(196, 0.16, 'sawtooth', 0.07); tone(155, 0.22, 'sawtooth', 0.07, 0.12); },
  trash() { noiseBurst(0.16, 0.1, 0, 900); },
  tick() { tone(880, 0.05, 'square', 0.045); },
  order() { tone(392, 0.09, 'triangle', 0.09); tone(523, 0.12, 'triangle', 0.09, 0.08); },
  dayStart() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.1, i * 0.1));
  },
  dayEnd() {
    [784, 659, 523, 392].forEach((f, i) => tone(f, 0.16, 'triangle', 0.1, i * 0.11));
  },
  star() { tone(1046, 0.12, 'sine', 0.11); tone(1318, 0.2, 'sine', 0.11, 0.1); },
};
