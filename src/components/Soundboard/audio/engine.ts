/* ============================================================
   ARCANUM — Motor de Áudio Procedural (Web Audio API)
   Núcleo do "Player Engine": síntese em tempo real de ambientes,
   músicas e SFX. Zero arquivos de áudio — tudo é gerado ao vivo,
   permitindo camadas ilimitadas, fades suaves e loop infinito.
   ============================================================ */

export interface PlayOpts {
  volume: number; // 0..100
  loop: boolean;
  fadeIn?: number; // ms
  onEnded?: () => void;
}

export interface Voice {
  setVolume(v: number): void;
  fadeOutAndStop(ms: number): void;
  stop(): void;
}

export interface SynthMeta {
  id: string;
  label: string;
  group: "Ambiente" | "Música" | "SFX";
  oneShot: boolean;
}

type Builder = (
  ctx: AudioContext,
  out: GainNode
) => { cleanup: () => void; duration?: number };

/* ---------- kit de construção por voz ---------- */
function makeKit(ctx: AudioContext, out: GainNode) {
  const live: AudioScheduledSourceNode[] = [];
  const timers: number[] = [];
  const stopFns: (() => void)[] = [];

  const add = <T extends AudioScheduledSourceNode>(n: T): T => {
    live.push(n);
    return n;
  };
  const later = (fn: () => void, ms: number) => {
    timers.push(window.setTimeout(fn, ms));
  };
  const every = (fn: () => void, ms: number) => {
    timers.push(window.setInterval(fn, ms));
  };
  const repeat = (fn: () => void, minMs: number, maxMs: number, firstDelay = 0) => {
    let dead = false;
    const loop = () => {
      if (dead) return;
      fn();
      timers.push(window.setTimeout(loop, minMs + Math.random() * (maxMs - minMs)));
    };
    timers.push(window.setTimeout(loop, firstDelay + Math.random() * (maxMs - minMs)));
    stopFns.push(() => {
      dead = true;
    });
  };
  /** scheduler musical com lookahead */
  const pattern = (bpm: number, steps: number, fn: (step: number, when: number, bar: number) => void) => {
    const stepDur = 60 / bpm / 2;
    let step = 0;
    let nextTime = ctx.currentTime + 0.08;
    every(() => {
      while (nextTime < ctx.currentTime + 0.22) {
        fn(step % steps, nextTime, Math.floor(step / steps));
        nextTime += stepDur;
        step++;
      }
    }, 50);
  };
  const cleanup = () => {
    stopFns.forEach((f) => f());
    timers.forEach((t) => {
      clearTimeout(t);
      clearInterval(t);
    });
    live.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* já parado */
      }
    });
  };

  /* --- blocos sonoros --- */
  const osc = (type: OscillatorType, freq: number, when = ctx.currentTime) => {
    const o = add(ctx.createOscillator());
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    return o;
  };
  const gain = (v: number, when = ctx.currentTime) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, when);
    return g;
  };
  const filt = (type: BiquadFilterType, freq: number, q = 1) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    return f;
  };
  const noiseSrc = (kind: "white" | "brown") => {
    const s = add(ctx.createBufferSource());
    s.buffer = noiseBuffer(ctx, kind);
    s.loop = true;
    return s;
  };
  /** camada de ruído em loop com filtro + LFOs opcionais */
  const noiseLayer = (
    kind: "white" | "brown",
    fType: BiquadFilterType,
    fFreq: number,
    vol: number,
    opts: { q?: number; ampLfo?: [rate: number, depth: number]; fLfo?: [rate: number, depth: number] } = {}
  ) => {
    const s = noiseSrc(kind);
    const f = filt(fType, fFreq, opts.q ?? 1);
    const g = gain(vol);
    s.connect(f);
    f.connect(g);
    g.connect(out);
    s.start();
    if (opts.ampLfo) {
      const l = osc("sine", opts.ampLfo[0]);
      const lg = gain(opts.ampLfo[1] * vol);
      l.connect(lg);
      lg.connect(g.gain);
      l.start();
    }
    if (opts.fLfo) {
      const l = osc("sine", opts.fLfo[0]);
      const lg = gain(opts.fLfo[1]);
      l.connect(lg);
      lg.connect(f.frequency);
      l.start();
    }
    return { filter: f, gain: g };
  };
  /** pluck melódico */
  const pluck = (
    freq: number,
    when: number,
    dur = 1.2,
    vol = 0.4,
    type: OscillatorType = "triangle",
    lp = 3600
  ) => {
    const o = osc(type, freq, when);
    const f = filt("lowpass", lp, 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(f);
    f.connect(g);
    g.connect(out);
    o.start(when);
    o.stop(when + dur + 0.05);
  };
  /** sino com parciais inarmônicos */
  const bell = (freq: number, when: number, dur = 6, vol = 0.35) => {
    const parts: [number, number][] = [
      [1, 1],
      [2.76, 0.4],
      [5.4, 0.16],
      [8.93, 0.07],
    ];
    parts.forEach(([r, a]) => {
      const o = osc("sine", freq * r, when);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, when);
      g.gain.exponentialRampToValueAtTime(vol * a, when + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
      o.connect(g);
      g.connect(out);
      o.start(when);
      o.stop(when + dur + 0.1);
    });
  };
  /** bumbo */
  const kick = (when: number, vol = 0.85) => {
    const o = osc("sine", 130, when);
    o.frequency.exponentialRampToValueAtTime(42, when + 0.13);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
    o.connect(g);
    g.connect(out);
    o.start(when);
    o.stop(when + 0.4);
  };
  /** rajada de ruído com envelope */
  const burst = (
    when: number,
    dur: number,
    vol: number,
    fType: BiquadFilterType,
    fFreq: number,
    opts: { q?: number; sweepTo?: number } = {}
  ) => {
    const s = noiseSrc("white");
    s.loop = true;
    const f = filt(fType, fFreq, opts.q ?? 1);
    if (opts.sweepTo) f.frequency.exponentialRampToValueAtTime(opts.sweepTo, when + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    s.connect(f);
    f.connect(g);
    g.connect(out);
    s.start(when);
    s.stop(when + dur + 0.06);
  };
  const pan = () => {
    const p = ctx.createStereoPanner();
    p.pan.value = Math.random() * 1.6 - 0.8;
    p.connect(out);
    return p;
  };

  return {
    ctx, out, add, later, every, repeat, pattern, cleanup,
    osc, gain, filt, noiseSrc, noiseLayer, pluck, bell, kick, burst, pan,
  };
}

/* ---------- buffers de ruído (cache) ---------- */
const noiseCache = new WeakMap<AudioContext, { white: AudioBuffer; brown: AudioBuffer }>();
function noiseBuffer(ctx: AudioContext, kind: "white" | "brown"): AudioBuffer {
  let c = noiseCache.get(ctx);
  if (!c) {
    const len = ctx.sampleRate * 2;
    const white = ctx.createBuffer(1, len, ctx.sampleRate);
    const wd = white.getChannelData(0);
    for (let i = 0; i < len; i++) wd[i] = Math.random() * 2 - 1;
    const brown = ctx.createBuffer(1, len, ctx.sampleRate);
    const bd = brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      bd[i] = last * 3.2;
    }
    c = { white, brown };
    noiseCache.set(ctx, c);
  }
  return c[kind];
}

/* ============================================================
   RECEITAS — cada som do soundboard mapeia para uma receita
   ============================================================ */
const RECIPES: Record<string, Builder> = {
  /* ---------- AMBIENTES ---------- */
  rain: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.noiseLayer("white", "highpass", 500, 0.22, { ampLfo: [0.23, 0.3] });
    k.noiseLayer("white", "bandpass", 2100, 0.1, { q: 0.7, ampLfo: [0.31, 0.4] });
    return { cleanup: k.cleanup };
  },
  storm: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.noiseLayer("white", "highpass", 450, 0.2, { ampLfo: [0.2, 0.35] });
    k.noiseLayer("brown", "lowpass", 300, 0.2, { ampLfo: [0.13, 0.4] });
    const thunder = () => {
      const t = ctx.currentTime + 0.05;
      k.burst(t, 2.6, 0.6, "lowpass", 620, { sweepTo: 80 });
      k.burst(t, 0.35, 0.3, "bandpass", 240, { q: 0.8 });
      const o = k.osc("sine", 55, t);
      o.frequency.exponentialRampToValueAtTime(30, t + 1.6);
      const g = k.gain(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 2.4);
    };
    k.repeat(thunder, 5000, 11000, 2500);
    return { cleanup: k.cleanup };
  },
  fire: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.noiseLayer("brown", "lowpass", 680, 0.42, { ampLfo: [0.8, 0.15] });
    k.repeat(
      () => k.burst(ctx.currentTime + 0.02, 0.06, 0.1 + Math.random() * 0.18, "bandpass", 2400 + Math.random() * 900, { q: 2 }),
      70, 280
    );
    return { cleanup: k.cleanup };
  },
  wind: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.noiseLayer("white", "bandpass", 320, 0.3, { q: 0.8, ampLfo: [0.11, 0.5], fLfo: [0.06, 170] });
    return { cleanup: k.cleanup };
  },
  windIce: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.noiseLayer("white", "bandpass", 950, 0.14, { q: 9, fLfo: [0.05, 420], ampLfo: [0.09, 0.5] });
    const o1 = k.osc("sine", 1174);
    const o2 = k.osc("sine", 1181);
    const g = k.gain(0.028);
    const lfo = k.osc("sine", 0.07);
    const lg = k.gain(0.022);
    lfo.connect(lg); lg.connect(g.gain);
    o1.connect(g); o2.connect(g); g.connect(out);
    o1.start(); o2.start(); lfo.start();
    return { cleanup: k.cleanup };
  },
  windDesert: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.noiseLayer("brown", "bandpass", 190, 0.42, { q: 0.6, ampLfo: [0.07, 0.75], fLfo: [0.045, 90] });
    k.noiseLayer("white", "bandpass", 700, 0.05, { q: 1.4, ampLfo: [0.1, 0.6] });
    return { cleanup: k.cleanup };
  },
  sea: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.noiseLayer("brown", "lowpass", 320, 0.5, { ampLfo: [0.075, 0.75] });
    k.noiseLayer("white", "highpass", 1300, 0.06, { ampLfo: [0.075, 0.9] });
    return { cleanup: k.cleanup };
  },
  tavern: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.noiseLayer("white", "bandpass", 420, 0.13, { q: 0.8, ampLfo: [0.4, 0.5] });
    k.noiseLayer("white", "bandpass", 900, 0.1, { q: 0.9, ampLfo: [0.55, 0.5] });
    k.noiseLayer("white", "bandpass", 1500, 0.06, { q: 1, ampLfo: [0.7, 0.5] });
    k.noiseLayer("brown", "lowpass", 250, 0.12, { ampLfo: [0.3, 0.3] });
    k.repeat(() => {
      const t = ctx.currentTime + 0.03;
      const o = k.osc("sine", 2100 + Math.random() * 500, t);
      const g = k.gain(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.07, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(k.pan()); o.start(t); o.stop(t + 0.3);
    }, 2600, 6500, 1800);
    return { cleanup: k.cleanup };
  },
  crowd: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.noiseLayer("white", "bandpass", 300, 0.15, { q: 0.7, ampLfo: [0.5, 0.45] });
    k.noiseLayer("white", "bandpass", 680, 0.12, { q: 0.8, ampLfo: [0.65, 0.45] });
    k.noiseLayer("white", "bandpass", 1150, 0.08, { q: 0.9, ampLfo: [0.8, 0.45] });
    k.noiseLayer("brown", "lowpass", 220, 0.16, { ampLfo: [0.25, 0.3] });
    return { cleanup: k.cleanup };
  },
  crickets: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.repeat(() => {
      const t = ctx.currentTime + 0.03;
      const p = k.pan();
      for (let i = 0; i < 4; i++) {
        const o = k.osc("sine", 4300, t + i * 0.055);
        const g = k.gain(0.0001, t + i * 0.055);
        g.gain.exponentialRampToValueAtTime(0.085, t + i * 0.055 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.055 + 0.045);
        o.connect(g); g.connect(p); o.start(t + i * 0.055); o.stop(t + i * 0.055 + 0.06);
      }
    }, 650, 1600, 400);
    return { cleanup: k.cleanup };
  },
  birds: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.repeat(() => {
      const t = ctx.currentTime + 0.03;
      const p = k.pan();
      const n = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) {
        const st = t + i * (0.12 + Math.random() * 0.1);
        const o = k.osc("sine", 2000 + Math.random() * 900, st);
        o.frequency.exponentialRampToValueAtTime(2600 + Math.random() * 900, st + 0.09);
        const g = k.gain(0.0001, st);
        g.gain.exponentialRampToValueAtTime(0.08, st + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.14);
        o.connect(g); g.connect(p); o.start(st); o.stop(st + 0.2);
      }
    }, 900, 3600, 600);
    return { cleanup: k.cleanup };
  },
  jungle: (ctx, out) => {
    const sub = RECIPES.crickets(ctx, out);
    const k = makeKit(ctx, out);
    k.noiseLayer("brown", "lowpass", 210, 0.22, { ampLfo: [0.12, 0.4] });
    k.repeat(() => {
      const t = ctx.currentTime + 0.03;
      const o = k.osc("sine", 1850, t);
      o.frequency.exponentialRampToValueAtTime(2700, t + 0.16);
      o.frequency.exponentialRampToValueAtTime(2050, t + 0.3);
      const g = k.gain(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.075, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(g); g.connect(k.pan()); o.start(t); o.stop(t + 0.4);
    }, 2200, 6200, 1500);
    return { cleanup: () => { k.cleanup(); sub.cleanup(); } };
  },
  forest: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.noiseLayer("white", "bandpass", 420, 0.13, { q: 0.8, ampLfo: [0.09, 0.5], fLfo: [0.05, 130] });
    k.repeat(() => {
      const t = ctx.currentTime + 0.03;
      for (let i = 0; i < 3; i++) {
        const o = k.osc("sine", 4250, t + i * 0.06);
        const g = k.gain(0.0001, t + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.05, t + i * 0.06 + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.05);
        o.connect(g); g.connect(k.pan()); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.07);
      }
    }, 1600, 4200, 900);
    k.repeat(() => {
      const t = ctx.currentTime + 0.03;
      const o = k.osc("sine", 2400, t);
      o.frequency.exponentialRampToValueAtTime(3000, t + 0.12);
      const g = k.gain(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.045, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(k.pan()); o.start(t); o.stop(t + 0.25);
    }, 5000, 12000, 3000);
    return { cleanup: k.cleanup };
  },
  droneDark: (ctx, out) => {
    const k = makeKit(ctx, out);
    const o1 = k.osc("sawtooth", 55);
    const o2 = k.osc("sawtooth", 55.8);
    const f = k.filt("lowpass", 270, 0.8);
    const g = k.gain(0.24);
    const lfo = k.osc("sine", 0.05);
    const lg = k.gain(0.08);
    lfo.connect(lg); lg.connect(g.gain);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(out);
    o1.start(); o2.start(); lfo.start();
    k.repeat(() => {
      const t = ctx.currentTime + 0.05;
      const o = k.osc("sine", 622, t);
      const gg = k.gain(0.0001, t);
      gg.gain.exponentialRampToValueAtTime(0.05, t + 1.6);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
      o.connect(gg); gg.connect(out); o.start(t); o.stop(t + 4.4);
    }, 9000, 16000, 6000);
    return { cleanup: k.cleanup };
  },
  droneDeep: (ctx, out) => {
    const k = makeKit(ctx, out);
    const o1 = k.osc("sine", 41.2);
    const o2 = k.osc("sine", 61.9);
    const o3 = k.osc("triangle", 82.6);
    const f = k.filt("lowpass", 210);
    const g = k.gain(0.3);
    const lfo = k.osc("sine", 0.06);
    const lg = k.gain(0.09);
    lfo.connect(lg); lg.connect(g.gain);
    o1.connect(f); o2.connect(f); o3.connect(f); f.connect(g); g.connect(out);
    o1.start(); o2.start(); o3.start(); lfo.start();
    return { cleanup: k.cleanup };
  },
  chant: (ctx, out) => {
    const k = makeKit(ctx, out);
    [110, 164.8, 220].forEach((fr, i) => {
      const o = k.osc("triangle", fr * (1 + (i - 1) * 0.002));
      const f = k.filt("lowpass", 720);
      const g = k.gain(0.075);
      const lfo = k.osc("sine", 0.045 + i * 0.008);
      const lg = k.gain(0.04);
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(f); f.connect(g); g.connect(out);
      o.start(); lfo.start();
    });
    const o1 = k.osc("sine", 55);
    const g1 = k.gain(0.18);
    o1.connect(g1); g1.connect(out); o1.start();
    k.repeat(() => k.bell(392, ctx.currentTime + 0.05, 5, 0.12), 7000, 13000, 4000);
    return { cleanup: k.cleanup };
  },
  humSci: (ctx, out) => {
    const k = makeKit(ctx, out);
    const o1 = k.osc("sawtooth", 92);
    const o2 = k.osc("sawtooth", 92.7);
    const f = k.filt("lowpass", 720, 1.2);
    const g = k.gain(0.11);
    const lfo = k.osc("sine", 0.18);
    const lg = k.gain(380);
    lfo.connect(lg); lg.connect(f.frequency);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(out);
    o1.start(); o2.start(); lfo.start();
    const sub = k.osc("sine", 46);
    const sg = k.gain(0.17);
    sub.connect(sg); sg.connect(out); sub.start();
    k.repeat(() => {
      const t = ctx.currentTime + 0.03;
      const o = k.osc("square", Math.random() > 0.5 ? 1318 : 880, t);
      const gg = k.gain(0.0001, t);
      gg.gain.exponentialRampToValueAtTime(0.035, t + 0.008);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(gg); gg.connect(out); o.start(t); o.stop(t + 0.1);
    }, 1300, 4400, 2000);
    return { cleanup: k.cleanup };
  },
  shipHum: (ctx, out) => {
    const k = makeKit(ctx, out);
    const o1 = k.osc("sawtooth", 60);
    const o2 = k.osc("sawtooth", 60.5);
    const f = k.filt("lowpass", 480);
    const g = k.gain(0.12);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(out);
    o1.start(); o2.start();
    const sub = k.osc("sine", 30);
    const sg = k.gain(0.16);
    sub.connect(sg); sg.connect(out); sub.start();
    k.repeat(() => {
      const t = ctx.currentTime + 0.05;
      const o = k.osc("sine", 220, t);
      o.frequency.exponentialRampToValueAtTime(880, t + 1.4);
      o.frequency.exponentialRampToValueAtTime(220, t + 2.8);
      const gg = k.gain(0.0001, t);
      gg.gain.exponentialRampToValueAtTime(0.04, t + 1.2);
      gg.gain.exponentialRampToValueAtTime(0.0001, t + 3);
      o.connect(gg); gg.connect(out); o.start(t); o.stop(t + 3.2);
    }, 8000, 15000, 5000);
    return { cleanup: k.cleanup };
  },
  neonCity: (ctx, out) => {
    const k = makeKit(ctx, out);
    [110, 164.8, 220].forEach((fr) => {
      const o = k.osc("sawtooth", fr);
      const f = k.filt("lowpass", 850);
      const g = k.gain(0.045);
      const lfo = k.osc("sine", 0.1 + Math.random() * 0.05);
      const lg = k.gain(0.02);
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(f); f.connect(g); g.connect(out);
      o.start(); lfo.start();
    });
    const scale = [220, 261.6, 329.6, 440, 523.3, 440, 329.6, 261.6];
    k.pattern(100, 16, (step, when) => {
      if (step % 2 === 0 && Math.random() > 0.25) {
        k.pluck(scale[(step / 2) % 8], when, 0.5, 0.075, "square", 2300);
      }
      if (step % 4 === 2) k.burst(when, 0.035, 0.028, "highpass", 6500);
      if (step === 0 || step === 8) k.pluck(110, when, 1, 0.14, "triangle", 900);
    });
    return { cleanup: k.cleanup };
  },
  bells: (ctx, out) => {
    const k = makeKit(ctx, out);
    [261.6, 329.6].forEach((fr, i) => {
      const o = k.osc("triangle", fr * (i ? 1.003 : 0.997));
      const f = k.filt("lowpass", 1200);
      const g = k.gain(0.055);
      const lfo = k.osc("sine", 0.05 + i * 0.011);
      const lg = k.gain(0.03);
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(f); f.connect(g); g.connect(out);
      o.start(); lfo.start();
    });
    k.repeat(() => {
      const freq = Math.random() > 0.5 ? 523.3 : 392;
      k.bell(freq, ctx.currentTime + 0.05, 6.5, 0.16);
    }, 3600, 7800, 2000);
    return { cleanup: k.cleanup };
  },

  /* ---------- MÚSICAS ---------- */
  harp: (ctx, out) => {
    const k = makeKit(ctx, out);
    const scale = [293.7, 329.6, 370, 440, 493.9, 587.3, 493.9, 440];
    k.pattern(84, 16, (step, when) => {
      if (Math.random() < 0.72) k.pluck(scale[step % 8], when, 1.7, 0.19, "triangle", 4200);
      if (step === 0) k.pluck(146.8, when, 2.4, 0.2, "triangle", 1200);
      if (step === 8) k.pluck(185, when, 2.2, 0.16, "triangle", 1200);
    });
    return { cleanup: k.cleanup };
  },
  saloon: (ctx, out) => {
    const k = makeKit(ctx, out);
    const bass = [110, 110, 146.8, 146.8];
    k.pattern(132, 16, (step, when, bar) => {
      if (step % 4 === 0) k.pluck(bass[(step / 4 + bar) % 4], when, 0.34, 0.22, "triangle", 900);
      if ([0, 3, 4, 7, 8, 11, 12, 15].includes(step)) {
        const ch = bar % 2 ? [196, 246.9] : [220, 277.2];
        ch.forEach((fr) => k.pluck(fr, when, 0.24, 0.07, "sawtooth", 2400));
      }
      if (step % 2 === 0 && Math.random() > 0.55) {
        const mel = [440, 523.3, 587.3, 659.3];
        k.pluck(mel[Math.floor(Math.random() * 4)], when, 0.3, 0.075, "square", 3000);
      }
    });
    return { cleanup: k.cleanup };
  },
  lute: (ctx, out) => {
    const k = makeKit(ctx, out);
    const mel = [220, 261.6, 329.6, 440, 493.9, 440, 329.6, 261.6, 220, 196, 220, 246.9];
    k.pattern(152, 32, (step, when, bar) => {
      if (step % 2 === 0) {
        k.pluck(mel[(step / 2 + (bar % 2 ? 4 : 0)) % 12], when, 1.15, 0.16, "triangle", 3400);
      }
      if (step % 8 === 0) {
        k.pluck(mel[(step / 2) % 12] / 2, when, 1.7, 0.15, "triangle", 1400);
      }
      if (step % 32 === 20) k.pluck(659.3, when, 1.3, 0.07, "sine", 3800);
    });
    return { cleanup: k.cleanup };
  },
  waltz: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.pattern(150, 12, (step, when, bar) => {
      const s = step % 6; // 3/4: 6 colcheias por compasso
      if (s === 0) k.pluck(bar % 2 ? 196 : 130.8, when, 1.4, 0.2, "triangle", 950);
      if (s === 2 || s === 4) {
        const ch = bar % 2 ? [196, 233.1, 293.7] : [164.8, 207.7, 261.6];
        ch.forEach((f) => k.pluck(f, when, 0.45, 0.055, "triangle", 2500));
      }
      if (s === 0 && bar % 2 === 1) k.pluck(523.3, when + 0.42, 1.5, 0.065, "sine", 3200);
    });
    return { cleanup: k.cleanup };
  },
  jig: (ctx, out) => {
    const k = makeKit(ctx, out);
    const seq = [523.3, 587.3, 659.3, 784, 880, 784, 659.3, 587.3, 523.3, 659.3, 880, 1046.5, 880, 659.3, 587.3, 784, 659.3, 523.3];
    k.pattern(170, 18, (step, when, bar) => {
      const acc = step % 6 === 0;
      k.pluck(seq[(step + bar * 5) % 18], when, acc ? 0.3 : 0.2, acc ? 0.1 : 0.07, "square", 2800);
      if (acc) k.kick(when, 0.4);
      if (step % 6 === 3) k.burst(when, 0.04, 0.1, "bandpass", 2100, { q: 1 });
    });
    return { cleanup: k.cleanup };
  },
  synthwave: (ctx, out) => {
    const k = makeKit(ctx, out);
    const chords = [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [164.8, 196, 246.9]];
    const arp = [880, 1046.5, 1318.5, 1046.5];
    k.pattern(110, 32, (step, when) => {
      const pos = step % 32;
      if (pos % 8 === 0) {
        const ch = chords[Math.floor(pos / 8)];
        ch.forEach((f) => {
          k.pluck(f, when, 3.1, 0.05, "sawtooth", 1500);
          k.pluck(f * 1.007, when, 3.1, 0.04, "sawtooth", 1500);
        });
      }
      if (step % 2 === 0) k.pluck(55, when, 0.2, 0.19, "sawtooth", 700);
      if (step % 2 === 1) k.pluck(arp[Math.floor((step % 8) / 2)], when, 0.15, 0.05, "square", 3600);
      if (pos % 8 === 0) k.kick(when, 0.5);
      if (pos % 8 === 4) k.burst(when, 0.09, 0.11, "highpass", 1900);
    });
    return { cleanup: k.cleanup };
  },
  fiddle: (ctx, out) => {
    const k = makeKit(ctx, out);
    const mel = [440, 523.3, 587.3, 659.3, 587.3, 523.3, 440, 392, 440, 523.3, 659.3, 784, 659.3, 523.3, 587.3, 440];
    k.pattern(140, 32, (step, when, bar) => {
      if (Math.random() < 0.82) k.pluck(mel[(step + bar * 3) % 16], when, 0.22, 0.075, "square", 2400);
      if (step % 4 === 0) k.kick(when, 0.45);
      if (step % 8 === 4) k.burst(when, 0.05, 0.15, "bandpass", 1700, { q: 0.9 });
      if (step % 8 === 0) k.pluck(110, when, 0.5, 0.15, "triangle", 850);
    });
    return { cleanup: k.cleanup };
  },
  orchestra: (ctx, out) => {
    const k = makeKit(ctx, out);
    [55, 82.4, 110].forEach((f) => {
      const o = k.osc("sawtooth", f);
      const fl = k.filt("lowpass", 320);
      const g = k.gain(0.085);
      o.connect(fl); fl.connect(g); g.connect(out); o.start();
    });
    const stabs = [[349.2, 440, 523.3], [329.6, 392, 493.9], [293.7, 349.2, 440]];
    k.pattern(100, 32, (step, when, bar) => {
      const pos = step % 32;
      if ([0, 3, 6, 8, 11, 14, 16, 19, 22, 24, 27, 30].includes(pos)) k.kick(when, bar % 2 ? 0.6 : 0.8);
      if (pos === 0 || pos === 16) {
        stabs[Math.floor(pos / 16) % 3].forEach((f) => k.pluck(f, when, 0.9, 0.09, "sawtooth", 2200));
      }
      if (pos === 24) k.bell(349.2, when, 4, 0.09);
    });
    return { cleanup: k.cleanup };
  },
  funeral: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.pattern(70, 16, (step, when, bar) => {
      const pos = step % 16;
      if (pos === 0) [110, 130.8, 164.8].forEach((f) => k.pluck(f, when, 2.6, 0.11, "triangle", 1500));
      if (pos === 8) k.pluck(82.4, when, 2.8, 0.15, "triangle", 750);
      if (pos === 0 && bar % 2 === 1) k.bell(220, when + 0.1, 5, 0.11);
      if (pos === 4 || pos === 12) {
        const o = k.osc("sine", 52, when);
        o.frequency.exponentialRampToValueAtTime(40, when + 0.2);
        const g = k.gain(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.2, when + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
        o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.4);
      }
    });
    return { cleanup: k.cleanup };
  },
  morricone: (ctx, out) => {
    const k = makeKit(ctx, out);
    const mel = [659.3, 784, 659.3, 587.3, 523.3, 587.3, 659.3, 493.9];
    k.pattern(92, 32, (step, when, bar) => {
      if (step % 2 === 0) {
        const idx = (Math.floor(step / 2) + bar * 3) % 8;
        if (!(bar % 2 === 1 && idx > 5)) {
          const n = mel[idx];
          const o = k.osc("sine", n * 0.97, when);
          o.frequency.linearRampToValueAtTime(n, when + 0.07);
          const g = k.gain(0.0001, when);
          g.gain.exponentialRampToValueAtTime(0.085, when + 0.035);
          g.gain.exponentialRampToValueAtTime(0.0001, when + 0.55);
          o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.6);
        }
      }
      if (step % 4 === 2) k.pluck([164.8, 196, 246.9, 196][Math.floor(step / 4) % 4], when, 0.4, 0.09, "triangle", 1900);
      if (step % 8 === 0) k.pluck(82.4, when, 0.9, 0.12, "triangle", 750);
      if (step % 32 === 12) k.burst(when, 0.09, 0.18, "bandpass", 2300, { q: 0.7 });
    });
    return { cleanup: k.cleanup };
  },
  lullaby: (ctx, out) => {
    const k = makeKit(ctx, out);
    const mel = [659.3, 0, 784, 0, 880, 0, 784, 659.3, 0, 0, 587.3, 0, 523.3, 0, 0, 0];
    k.pattern(63, 16, (step, when, bar) => {
      const n = mel[(step + bar * 2) % 16];
      if (n) k.pluck(n, when, 2.4, 0.09, "sine", 3800);
      if (step % 16 === 0) k.pluck(130.8, when, 3.2, 0.09, "triangle", 850);
      if (step % 16 === 8) k.pluck(196, when, 3, 0.065, "triangle", 850);
    });
    return { cleanup: k.cleanup };
  },
  warDrums: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.pattern(104, 16, (step, when, bar) => {
      if (step % 4 === 0) k.kick(when, 0.8);
      if (step === 4 || step === 12) k.burst(when, 0.14, 0.26, "bandpass", 1900, { q: 0.8 });
      if (step === 6 || step === 14) {
        const o = k.osc("sine", 190, when);
        o.frequency.exponentialRampToValueAtTime(95, when + 0.16);
        const g = k.gain(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.32, when + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
        o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.26);
      }
      if (bar % 4 === 3 && step >= 13) {
        const o = k.osc("sine", 210 - (step - 13) * 30, when);
        o.frequency.exponentialRampToValueAtTime(90, when + 0.12);
        const g = k.gain(0.0001, when);
        g.gain.exponentialRampToValueAtTime(0.3, when + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.16);
        o.connect(g); g.connect(out); o.start(when); o.stop(when + 0.2);
      }
    });
    return { cleanup: k.cleanup };
  },

  /* ---------- AMBIENTES / SFX cíclicos ---------- */
  heartbeat: (ctx, out) => {
    const k = makeKit(ctx, out);
    const thump = (t: number, vol: number) => {
      const o = k.osc("sine", 58, t);
      o.frequency.exponentialRampToValueAtTime(38, t + 0.14);
      const g = k.gain(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3);
    };
    k.repeat(() => {
      const t = ctx.currentTime + 0.03;
      thump(t, 0.6);
      thump(t + 0.3, 0.38);
    }, 950, 1250, 100);
    return { cleanup: k.cleanup };
  },
  drip: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.noiseLayer("brown", "lowpass", 240, 0.1, {});
    k.repeat(() => {
      const t = ctx.currentTime + 0.03;
      const p = k.pan();
      [[0, 0.18], [0.17, 0.06], [0.34, 0.025]].forEach(([dt, v]) => {
        const o = k.osc("sine", 950, t + dt);
        o.frequency.exponentialRampToValueAtTime(320, t + dt + 0.08);
        const g = k.gain(0.0001, t + dt);
        g.gain.exponentialRampToValueAtTime(v, t + dt + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.11);
        o.connect(g); g.connect(p); o.start(t + dt); o.stop(t + dt + 0.14);
      });
    }, 1300, 3800, 700);
    return { cleanup: k.cleanup };
  },
  ghost: (ctx, out) => {
    const k = makeKit(ctx, out);
    const o = k.osc("sine", 310);
    const f = k.filt("bandpass", 900, 3);
    const g = k.gain(0.1);
    const vib = k.osc("sine", 5.2);
    const vg = k.gain(7);
    vib.connect(vg); vg.connect(o.frequency);
    const glide = k.osc("sine", 0.13);
    const gg = k.gain(38);
    glide.connect(gg); gg.connect(o.frequency);
    const amp = k.osc("sine", 0.11);
    const ag = k.gain(0.06);
    amp.connect(ag); ag.connect(g.gain);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(); vib.start(); glide.start(); amp.start();
    return { cleanup: k.cleanup };
  },

  /* ---------- SFX one-shot ---------- */
  thunder: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    k.burst(t, 2.6, 0.7, "lowpass", 620, { sweepTo: 80 });
    k.burst(t, 0.3, 0.32, "bandpass", 250);
    const o = k.osc("sine", 55, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.6);
    const g = k.gain(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 2.5);
    return { cleanup: k.cleanup, duration: 3 };
  },
  bellToll: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.bell(392, ctx.currentTime + 0.02, 6.5, 0.5);
    return { cleanup: k.cleanup, duration: 7 };
  },
  sword: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    k.burst(t, 0.22, 0.3, "highpass", 2800);
    k.burst(t, 0.18, 0.2, "bandpass", 500, { q: 1.4, sweepTo: 2600 });
    [2600, 3920].forEach((fr, i) => {
      const o = k.osc("sine", fr, t + 0.05);
      const g = k.gain(0.0001, t + 0.05);
      g.gain.exponentialRampToValueAtTime(i ? 0.06 : 0.11, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g); g.connect(out); o.start(t + 0.05); o.stop(t + 0.8);
    });
    return { cleanup: k.cleanup, duration: 1 };
  },
  arrow: (ctx, out) => {
    const k = makeKit(ctx, out);
    k.burst(ctx.currentTime + 0.02, 0.34, 0.32, "bandpass", 520, { q: 3, sweepTo: 3400 });
    return { cleanup: k.cleanup, duration: 0.5 };
  },
  roar: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    const o1 = k.osc("sawtooth", 82, t);
    const o2 = k.osc("sawtooth", 123.5, t);
    o1.frequency.exponentialRampToValueAtTime(62, t + 1.3);
    o2.frequency.exponentialRampToValueAtTime(90, t + 1.3);
    const f = k.filt("lowpass", 540, 1.1);
    const g = k.gain(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.55, t + 0.22);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(out);
    o1.start(t); o2.start(t); o1.stop(t + 1.6); o2.stop(t + 1.6);
    return { cleanup: k.cleanup, duration: 1.7 };
  },
  laser: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    const o = k.osc("square", 1900, t);
    o.frequency.exponentialRampToValueAtTime(170, t + 0.22);
    const g = k.gain(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    o.connect(g); g.connect(out); o.start(t); o.stop(t + 0.3);
    return { cleanup: k.cleanup, duration: 0.4 };
  },
  howl: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    [1, 1.006].forEach((det) => {
      const o = k.osc("sine", 340 * det, t);
      o.frequency.exponentialRampToValueAtTime(590 * det, t + 0.9);
      o.frequency.setValueAtTime(590 * det, t + 1.7);
      o.frequency.exponentialRampToValueAtTime(270 * det, t + 2.5);
      const g = k.gain(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.14, t + 0.35);
      g.gain.setValueAtTime(0.14, t + 1.7);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
      o.connect(g); g.connect(out); o.start(t); o.stop(t + 2.7);
    });
    return { cleanup: k.cleanup, duration: 2.8 };
  },
  doorCreak: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    const o = k.osc("sawtooth", 165, t);
    o.frequency.linearRampToValueAtTime(235, t + 0.85);
    const jit = k.osc("sine", 9, t);
    const jg = k.gain(26, t);
    jit.connect(jg); jg.connect(o.frequency);
    const f = k.filt("bandpass", 720, 5);
    const g = k.gain(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(t); jit.start(t); o.stop(t + 1); jit.stop(t + 1);
    return { cleanup: k.cleanup, duration: 1.1 };
  },
  coin: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    [[1750, 0, 0.16, 0.16], [2280, 0.05, 0.22, 0.1]].forEach(([fr, dt, dur, v]) => {
      const o = k.osc("sine", fr, t + dt);
      const g = k.gain(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(v, t + dt + 0.006);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + dur);
      o.connect(g); g.connect(out); o.start(t + dt); o.stop(t + dt + dur + 0.05);
    });
    return { cleanup: k.cleanup, duration: 0.5 };
  },
  horn: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    [174.6, 261.6].forEach((fr) => {
      const o = k.osc("sawtooth", fr, t);
      const f = k.filt("lowpass", 1050, 0.9);
      const g = k.gain(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.35);
      g.gain.setValueAtTime(0.22, t + 1.15);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
      o.connect(f); f.connect(g); g.connect(out);
      o.start(t); o.stop(t + 2);
    });
    return { cleanup: k.cleanup, duration: 2.1 };
  },

  /* ---------- NOVOS SONS TEMÁTICOS DE RPG (A.2) ---------- */
  magicMissile: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.01;
    [0, 0.08, 0.16].forEach((dt, idx) => {
      const o1 = k.osc("sine", 320 + idx * 90, t + dt);
      o1.frequency.exponentialRampToValueAtTime(1400 + idx * 250, t + dt + 0.45);
      const o2 = k.osc("triangle", 640 + idx * 180, t + dt);
      o2.frequency.exponentialRampToValueAtTime(2200 + idx * 300, t + dt + 0.45);
      const f = k.filt("bandpass", 1200 + idx * 200, 3, t + dt);
      const g = k.gain(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.18, t + dt + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.52);
      o1.connect(f); o2.connect(f); f.connect(g); g.connect(out);
      o1.start(t + dt); o2.start(t + dt);
      o1.stop(t + dt + 0.55); o2.stop(t + dt + 0.55);
    });
    return { cleanup: k.cleanup, duration: 0.75 };
  },

  divineHeal: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const dt = idx * 0.07;
      const o = k.osc("sine", freq, t + dt);
      const sub = k.osc("triangle", freq * 0.5, t + dt);
      const f = k.filt("lowpass", 3500, 1.2, t + dt);
      const g = k.gain(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.16, t + dt + 0.25);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 2.1);
      o.connect(f); sub.connect(f); f.connect(g); g.connect(out);
      o.start(t + dt); sub.start(t + dt);
      o.stop(t + dt + 2.2); sub.stop(t + dt + 2.2);
    });
    return { cleanup: k.cleanup, duration: 2.4 };
  },

  fireball: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.01;
    // Impacto sub-grave
    const sub = k.osc("sine", 160, t);
    sub.frequency.exponentialRampToValueAtTime(32, t + 0.9);
    const subG = k.gain(0.0001, t);
    subG.gain.exponentialRampToValueAtTime(0.35, t + 0.04);
    subG.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    sub.connect(subG); subG.connect(out);
    sub.start(t); sub.stop(t + 1.3);

    // Ruído da explosão de fogo
    const n = k.noise("pink");
    const f = k.filt("lowpass", 950, 4.5, t);
    f.frequency.exponentialRampToValueAtTime(65, t + 1.6);
    const g = k.gain(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.38, t + 0.06);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.75);
    n.connect(f); f.connect(g); g.connect(out);
    n.start(t); n.stop(t + 1.8);
    return { cleanup: k.cleanup, duration: 1.8 };
  },

  teleport: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.01;
    const o = k.osc("sine", 180, t);
    o.frequency.exponentialRampToValueAtTime(2600, t + 0.85);
    const lfo = k.osc("sine", 24, t);
    const lfoG = k.gain(120, t);
    lfo.connect(lfoG); lfoG.connect(o.frequency);
    const f = k.filt("bandpass", 1600, 2.5, t);
    const g = k.gain(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.15);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(t); lfo.start(t);
    o.stop(t + 1.2); lfo.stop(t + 1.2);
    return { cleanup: k.cleanup, duration: 1.2 };
  },

  criticalHit: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.01;
    // Impacto cortante metálico
    const o = k.osc("sawtooth", 920, t);
    o.frequency.exponentialRampToValueAtTime(120, t + 0.35);
    const f = k.filt("bandpass", 2800, 4, t);
    const g = k.gain(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
    o.connect(f); f.connect(g); g.connect(out);
    o.start(t); o.stop(t + 0.7);

    // Boom épico grave
    const sub = k.osc("triangle", 180, t);
    sub.frequency.exponentialRampToValueAtTime(35, t + 0.8);
    const subG = k.gain(0.0001, t);
    subG.gain.exponentialRampToValueAtTime(0.38, t + 0.03);
    subG.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    sub.connect(subG); subG.connect(out);
    sub.start(t); sub.stop(t + 1.35);
    return { cleanup: k.cleanup, duration: 1.4 };
  },

  shieldHit: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.01;
    [360, 540, 820].forEach((freq, idx) => {
      const o = k.osc("triangle", freq, t);
      const g = k.gain(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22 / (idx + 1), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(g); g.connect(out);
      o.start(t); o.stop(t + 0.5);
    });
    // Impacto de madeira/metal
    const n = k.noise("white");
    const f = k.filt("lowpass", 700, 2, t);
    const ng = k.gain(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.26, t + 0.01);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    n.connect(f); f.connect(ng); ng.connect(out);
    n.start(t); n.stop(t + 0.3);
    return { cleanup: k.cleanup, duration: 0.55 };
  },

  trapSpring: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.01;
    // Clique mecânico inicial
    const oClick = k.osc("square", 1850, t);
    const gClick = k.gain(0.0001, t);
    gClick.gain.exponentialRampToValueAtTime(0.28, t + 0.005);
    gClick.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    oClick.connect(gClick); gClick.connect(out);
    oClick.start(t); oClick.stop(t + 0.08);

    // Disparo rápido de lâmina/mola
    const n = k.noise("white");
    const f = k.filt("bandpass", 2400, 3, t + 0.04);
    f.frequency.exponentialRampToValueAtTime(450, t + 0.35);
    const g = k.gain(0.0001, t + 0.04);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.07);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    n.connect(f); f.connect(g); g.connect(out);
    n.start(t + 0.04); n.stop(t + 0.55);
    return { cleanup: k.cleanup, duration: 0.6 };
  },

  stoneDoor: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    const n = k.noise("brown");
    const f = k.filt("lowpass", 260, 3.5, t);
    const lfo = k.osc("sine", 6, t);
    const lfoG = k.gain(75, t);
    lfo.connect(lfoG); lfoG.connect(f.frequency);
    const g = k.gain(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.3, t + 0.3);
    g.gain.setValueAtTime(0.3, t + 1.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.5);
    n.connect(f); f.connect(g); g.connect(out);
    n.start(t); lfo.start(t);
    n.stop(t + 2.6); lfo.stop(t + 2.6);
    return { cleanup: k.cleanup, duration: 2.6 };
  },

  chestOpen: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    // Trinco mecânico
    const c1 = k.osc("triangle", 620, t);
    const cg1 = k.gain(0.0001, t);
    cg1.gain.exponentialRampToValueAtTime(0.24, t + 0.01);
    cg1.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    c1.connect(cg1); cg1.connect(out);
    c1.start(t); c1.stop(t + 0.15);

    // Ranger de dobradiça
    const c2 = k.osc("sawtooth", 220, t + 0.15);
    c2.frequency.linearRampToValueAtTime(390, t + 0.6);
    const cg2 = k.gain(0.0001, t + 0.15);
    cg2.gain.exponentialRampToValueAtTime(0.15, t + 0.25);
    cg2.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
    c2.connect(cg2); cg2.connect(out);
    c2.start(t + 0.15); c2.stop(t + 0.75);

    // Tilintar de moedas
    [1950, 2400, 2900].forEach((freq, idx) => {
      const dt = 0.45 + idx * 0.08;
      const coin = k.osc("sine", freq, t + dt);
      const coing = k.gain(0.0001, t + dt);
      coing.gain.exponentialRampToValueAtTime(0.12, t + dt + 0.008);
      coing.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.22);
      coin.connect(coing); coing.connect(out);
      coin.start(t + dt); coin.stop(t + dt + 0.25);
    });
    return { cleanup: k.cleanup, duration: 1.1 };
  },

  dragonRoar: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    // Rugido cavernoso profundo
    const o = k.osc("sawtooth", 75, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 2.2);
    const lfo = k.osc("sine", 14, t);
    const lfoG = k.gain(22, t);
    lfo.connect(lfoG); lfoG.connect(o.frequency);

    const f1 = k.filt("bandpass", 320, 2.5, t);
    const f2 = k.filt("lowpass", 700, 2, t);
    const g = k.gain(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42, t + 0.4);
    g.gain.setValueAtTime(0.42, t + 1.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.7);

    o.connect(f1); f1.connect(f2); f2.connect(g); g.connect(out);
    o.start(t); lfo.start(t);
    o.stop(t + 2.8); lfo.stop(t + 2.8);
    return { cleanup: k.cleanup, duration: 2.8 };
  },

  victorySting: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    // Acorde triunfal em Ré Maior (D4, F#4, A4, D5)
    [293.66, 369.99, 440.00, 587.33].forEach((freq) => {
      const o = k.osc("sawtooth", freq, t);
      const f = k.filt("lowpass", 1600, 1.2, t);
      const g = k.gain(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.15);
      g.gain.setValueAtTime(0.18, t + 1.2);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.1);
      o.connect(f); f.connect(g); g.connect(out);
      o.start(t); o.stop(t + 2.2);
    });
    return { cleanup: k.cleanup, duration: 2.2 };
  },

  tensionSting: (ctx, out) => {
    const k = makeKit(ctx, out);
    const t = ctx.currentTime + 0.02;
    // Acorde dissonante de suspense (C3, F#3, C#4)
    [130.81, 185.00, 277.18].forEach((freq) => {
      const o = k.osc("sawtooth", freq, t);
      const lfo = k.osc("sine", 5, t);
      const lfoG = k.gain(6, t);
      lfo.connect(lfoG); lfoG.connect(o.frequency);
      const f = k.filt("lowpass", 750, 3, t);
      const g = k.gain(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.2);
      g.gain.setValueAtTime(0.22, t + 1.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 2.3);
      o.connect(f); f.connect(g); g.connect(out);
      o.start(t); lfo.start(t);
      o.stop(t + 2.4); lfo.stop(t + 2.4);
    });
    return { cleanup: k.cleanup, duration: 2.4 };
  },
};

/* ---------- catálogo p/ UI ---------- */
export const SYNTHS: SynthMeta[] = [
  { id: "rain", label: "Chuva", group: "Ambiente", oneShot: false },
  { id: "storm", label: "Tempestade", group: "Ambiente", oneShot: false },
  { id: "fire", label: "Fogueira", group: "Ambiente", oneShot: false },
  { id: "wind", label: "Vento", group: "Ambiente", oneShot: false },
  { id: "windIce", label: "Vento Ártico", group: "Ambiente", oneShot: false },
  { id: "windDesert", label: "Vento do Deserto", group: "Ambiente", oneShot: false },
  { id: "sea", label: "Oceano / Rio", group: "Ambiente", oneShot: false },
  { id: "tavern", label: "Taverna", group: "Ambiente", oneShot: false },
  { id: "crowd", label: "Multidão", group: "Ambiente", oneShot: false },
  { id: "crickets", label: "Grilos Noturnos", group: "Ambiente", oneShot: false },
  { id: "birds", label: "Pássaros", group: "Ambiente", oneShot: false },
  { id: "jungle", label: "Selva", group: "Ambiente", oneShot: false },
  { id: "forest", label: "Floresta", group: "Ambiente", oneShot: false },
  { id: "droneDark", label: "Drone Sombrio", group: "Ambiente", oneShot: false },
  { id: "droneDeep", label: "Drone Profundo", group: "Ambiente", oneShot: false },
  { id: "chant", label: "Canto Ritual", group: "Ambiente", oneShot: false },
  { id: "humSci", label: "Hum Sci-Fi", group: "Ambiente", oneShot: false },
  { id: "shipHum", label: "Motor de Nave", group: "Ambiente", oneShot: false },
  { id: "neonCity", label: "Cidade Neon", group: "Música", oneShot: false },
  { id: "bells", label: "Sinos Sagrados", group: "Música", oneShot: false },
  { id: "harp", label: "Harpa Élfica", group: "Música", oneShot: false },
  { id: "saloon", label: "Piano de Saloon", group: "Música", oneShot: false },
  { id: "warDrums", label: "Tambores de Guerra", group: "Música", oneShot: false },
  { id: "lute", label: "Alaúde do Bardo", group: "Música", oneShot: false },
  { id: "waltz", label: "Valsa da Corte", group: "Música", oneShot: false },
  { id: "jig", label: "Giga da Lareira", group: "Música", oneShot: false },
  { id: "synthwave", label: "Synthwave Neon", group: "Música", oneShot: false },
  { id: "fiddle", label: "Fiddle Folk", group: "Música", oneShot: false },
  { id: "orchestra", label: "Orquestra Épica", group: "Música", oneShot: false },
  { id: "funeral", label: "Marcha Fúnebre", group: "Música", oneShot: false },
  { id: "morricone", label: "Duelo Western", group: "Música", oneShot: false },
  { id: "lullaby", label: "Canção de Ninar", group: "Música", oneShot: false },
  { id: "heartbeat", label: "Batimento Cardíaco", group: "Ambiente", oneShot: false },
  { id: "drip", label: "Caverna Gotejante", group: "Ambiente", oneShot: false },
  { id: "ghost", label: "Assombração", group: "Ambiente", oneShot: false },
  { id: "thunder", label: "Trovão", group: "SFX", oneShot: true },
  { id: "bellToll", label: "Badalada de Sino", group: "SFX", oneShot: true },
  { id: "sword", label: "Espada", group: "SFX", oneShot: true },
  { id: "arrow", label: "Flecha", group: "SFX", oneShot: true },
  { id: "roar", label: "Rugido de Monstro", group: "SFX", oneShot: true },
  { id: "laser", label: "Laser", group: "SFX", oneShot: true },
  { id: "howl", label: "Uivo", group: "SFX", oneShot: true },
  { id: "doorCreak", label: "Porta Rangendo", group: "SFX", oneShot: true },
  { id: "coin", label: "Moedas", group: "SFX", oneShot: true },
  { id: "horn", label: "Trombeta de Guerra", group: "SFX", oneShot: true },
  { id: "magicMissile", label: "Mísseis Mágicos", group: "SFX", oneShot: true },
  { id: "divineHeal", label: "Cura Divina", group: "SFX", oneShot: true },
  { id: "fireball", label: "Bola de Fogo / Explosão", group: "SFX", oneShot: true },
  { id: "teleport", label: "Teletransporte / Portal", group: "SFX", oneShot: true },
  { id: "criticalHit", label: "Golpe Crítico", group: "SFX", oneShot: true },
  { id: "shieldHit", label: "Bloqueio de Escudo", group: "SFX", oneShot: true },
  { id: "trapSpring", label: "Armadilha Ativada", group: "SFX", oneShot: true },
  { id: "stoneDoor", label: "Porta de Pedra", group: "SFX", oneShot: true },
  { id: "chestOpen", label: "Baú de Tesouro", group: "SFX", oneShot: true },
  { id: "dragonRoar", label: "Rugido de Dragão", group: "SFX", oneShot: true },
  { id: "victorySting", label: "Vitória Triunfal", group: "SFX", oneShot: true },
  { id: "tensionSting", label: "Tensão / Pânico", group: "SFX", oneShot: true },
];

/* ============================================================
   ENGINE — singleton global do player
   ============================================================ */
const mapVol = (v: number) => Math.pow(Math.max(0, Math.min(100, v)) / 100, 1.6);

interface InternalVoice extends Voice {
  gain: GainNode;
  cleanup: () => void;
  endTimer?: number;
}

class ArcanumEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private voices = new Map<string, InternalVoice>();
  private fileBuffers = new Map<string, AudioBuffer>();
  private masterVol = 0.8;

  private ensure(): AudioContext {
    if (this.ctx) {
      if (this.ctx.state === "suspended") void this.ctx.resume();
      return this.ctx;
    }
    const AC: typeof AudioContext =
      window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const master = ctx.createGain();
    master.gain.value = this.masterVol;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.ratio.value = 6;
    const an = ctx.createAnalyser();
    an.fftSize = 256;
    an.smoothingTimeConstant = 0.82;
    master.connect(comp);
    comp.connect(an);
    an.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    this.analyser = an;
    return ctx;
  }

  setMaster(v: number) {
    this.masterVol = mapVol(v);
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.masterVol, this.ctx.currentTime, 0.04);
    }
  }

  hasVoice(id: string) {
    return this.voices.has(id);
  }
  get voiceCount() {
    return this.voices.size;
  }

  play(id: string, synth: string, opts: PlayOpts): boolean {
    const builder = RECIPES[synth];
    if (!builder) return false;
    const ctx = this.ensure();
    this.killVoice(id, 0);
    const g = ctx.createGain();
    const target = mapVol(opts.volume);
    const fi = Math.max(15, opts.fadeIn ?? 40) / 1000;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, target), ctx.currentTime + fi);
    g.connect(this.master as GainNode);
    const built = builder(ctx, g);
    const voice: InternalVoice = {
      gain: g,
      cleanup: built.cleanup,
      setVolume: (v) => {
        if (this.ctx) g.gain.setTargetAtTime(Math.max(0.0002, mapVol(v)), this.ctx.currentTime, 0.035);
      },
      stop: () => this.killVoice(id, 0),
      fadeOutAndStop: (ms) => this.killVoice(id, ms),
    };
    if (built.duration) {
      voice.endTimer = window.setTimeout(() => {
        this.killVoice(id, 80);
        opts.onEnded?.();
      }, built.duration * 1000 + 120);
    }
    this.voices.set(id, voice);
    return true;
  }

  async playFile(id: string, url: string, opts: PlayOpts): Promise<boolean> {
    const ctx = this.ensure();
    let buf = this.fileBuffers.get(url);
    if (!buf) {
      try {
        const res = await fetch(url);
        const ab = await res.arrayBuffer();
        buf = await ctx.decodeAudioData(ab);
        this.fileBuffers.set(url, buf);
      } catch {
        return false;
      }
    }
    this.killVoice(id, 0);
    const g = ctx.createGain();
    const target = mapVol(opts.volume);
    const fi = Math.max(15, opts.fadeIn ?? 40) / 1000;
    g.gain.setValueAtTime(0.0001, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, target), ctx.currentTime + fi);
    g.connect(this.master as GainNode);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = opts.loop;
    src.connect(g);
    src.start();
    const voice: InternalVoice = {
      gain: g,
      cleanup: () => {
        try {
          src.stop();
        } catch {
          /* ok */
        }
      },
      setVolume: (v) => {
        if (this.ctx) g.gain.setTargetAtTime(Math.max(0.0002, mapVol(v)), this.ctx.currentTime, 0.035);
      },
      stop: () => this.killVoice(id, 0),
      fadeOutAndStop: (ms) => this.killVoice(id, ms),
    };
    if (!opts.loop) {
      src.onended = () => {
        this.killVoice(id, 0);
        opts.onEnded?.();
      };
    }
    this.voices.set(id, voice);
    return true;
  }

  fileDuration(url: string): number | null {
    return this.fileBuffers.get(url)?.duration ?? null;
  }

  private killVoice(id: string, fadeMs: number) {
    const v = this.voices.get(id);
    if (!v) return;
    this.voices.delete(id);
    if (v.endTimer) clearTimeout(v.endTimer);
    if (this.ctx && fadeMs > 0) {
      const t = this.ctx.currentTime;
      v.gain.gain.cancelScheduledValues(t);
      v.gain.gain.setTargetAtTime(0.0001, t, Math.max(0.01, fadeMs / 1000 / 3));
      window.setTimeout(() => {
        v.cleanup();
        try {
          v.gain.disconnect();
        } catch {
          /* ok */
        }
      }, fadeMs + 120);
    } else {
      v.cleanup();
      try {
        v.gain.disconnect();
      } catch {
        /* ok */
      }
    }
  }

  stopVoice(id: string, fadeMs = 0) {
    this.killVoice(id, fadeMs);
  }

  stopAll(fadeMs = 0) {
    [...this.voices.keys()].forEach((id) => this.killVoice(id, fadeMs));
  }

  setVoiceVolume(id: string, v: number) {
    this.voices.get(id)?.setVolume(v);
  }

  fadeVoice(id: string, ms: number) {
    this.killVoice(id, ms);
  }

  suspend() {
    if (this.ctx && this.ctx.state === "running") void this.ctx.suspend();
  }
  resume() {
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  /** níveis p/ VU meter — n bandas normalizadas 0..1 */
  getLevels(n: number): number[] {
    if (!this.analyser) return new Array(n).fill(0);
    const bins = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(bins);
    const out: number[] = [];
    const per = Math.floor(bins.length / n);
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j < per; j++) sum += bins[i * per + j];
      out.push(Math.pow(sum / per / 255, 0.72));
    }
    return out;
  }
}

export const engine = new ArcanumEngine();
