// src/services/ProceduralAudio.ts
// Gerador procedural de áudio cinemático para ambientes atmosféricos e SFX via Web Audio API.
// 100% offline, zero dependência de arquivos externos, sem latência e sem erros de formato.

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null;
  private currentAmbienceNode: { stop: () => void; setVolume: (v: number) => void } | null = null;
  private currentMusicNode: { stop: () => void; setVolume: (v: number) => void } | null = null;

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // --- AMBIENCE GENERATORS ---

  startAmbience(type: string, initialVolume = 0.5): void {
    this.stopAmbience();
    const ctx = this.getContext();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, initialVolume)), ctx.currentTime);
    masterGain.connect(ctx.destination);

    let active = true;
    const intervals: any[] = [];
    const activeNodes: (AudioNode | { stop?: () => void })[] = [];

    const cleanup = () => {
      active = false;
      intervals.forEach(clearInterval);
      try {
        masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
        setTimeout(() => {
          activeNodes.forEach(node => {
            try {
              if ('stop' in node && typeof (node as any).stop === 'function') (node as any).stop();
              (node as any).disconnect?.();
            } catch {}
          });
          masterGain.disconnect();
        }, 400);
      } catch {}
    };

    // 1. TEMPESTADE & CHUVA
    if (type === 'rain' || type.includes('rain')) {
      const bufferSize = ctx.sampleRate * 4;
      const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const outL = noiseBuffer.getChannelData(0);
      const outR = noiseBuffer.getChannelData(1);

      let bL = 0, bR = 0;
      for (let i = 0; i < bufferSize; i++) {
        const whiteL = Math.random() * 2 - 1;
        const whiteR = Math.random() * 2 - 1;
        bL = (bL + 0.03 * whiteL) / 1.03;
        bR = (bR + 0.03 * whiteR) / 1.03;
        outL[i] = bL * 3.2;
        outR[i] = bR * 3.2;
      }

      const rainSource = ctx.createBufferSource();
      rainSource.buffer = noiseBuffer;
      rainSource.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'lowpass';
      rainFilter.frequency.value = 1400;

      rainSource.connect(rainFilter);
      rainFilter.connect(masterGain);
      rainSource.start();
      activeNodes.push(rainSource, rainFilter);

      // Trovões ocasionais e estalos de gotas
      const thunderInterval = setInterval(() => {
        if (!active) return;
        if (Math.random() < 0.25) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(55, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 2.0);

          g.gain.setValueAtTime(0.2, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.2);

          osc.connect(g);
          g.connect(masterGain);
          osc.start();
          osc.stop(ctx.currentTime + 2.3);
        }
      }, 3000);
      intervals.push(thunderInterval);

    // 2. TAVERNA & LAREIRA
    } else if (type === 'tavern' || type.includes('tavern') || type === 'fire') {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const outL = noiseBuffer.getChannelData(0);
      const outR = noiseBuffer.getChannelData(1);

      let bL = 0, bR = 0;
      for (let i = 0; i < bufferSize; i++) {
        bL = bL * 0.96 + (Math.random() * 2 - 1) * 0.04;
        bR = bR * 0.96 + (Math.random() * 2 - 1) * 0.04;
        outL[i] = bL * 2.0;
        outR[i] = bR * 2.0;
      }

      const fireSource = ctx.createBufferSource();
      fireSource.buffer = noiseBuffer;
      fireSource.loop = true;

      const fireFilter = ctx.createBiquadFilter();
      fireFilter.type = 'lowpass';
      fireFilter.frequency.value = 450;

      fireSource.connect(fireFilter);
      fireFilter.connect(masterGain);
      fireSource.start();
      activeNodes.push(fireSource, fireFilter);

      // Estalos de madeira nítidos
      const crackleInterval = setInterval(() => {
        if (!active) return;
        if (Math.random() < 0.75) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(900 + Math.random() * 1500, ctx.currentTime);
          g.gain.setValueAtTime(0.12 * Math.random(), ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03);

          osc.connect(g);
          g.connect(masterGain);
          osc.start();
          osc.stop(ctx.currentTime + 0.04);
        }
      }, 90);
      intervals.push(crackleInterval);

    // 3. VENTO GÉLIDO
    } else if (type === 'wind' || type.includes('wind')) {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const outL = noiseBuffer.getChannelData(0);
      const outR = noiseBuffer.getChannelData(1);
      for (let i = 0; i < bufferSize; i++) {
        outL[i] = Math.random() * 2 - 1;
        outR[i] = Math.random() * 2 - 1;
      }

      const windSource = ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;

      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.value = 380;
      bandpass.Q.value = 2.5;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.18; // Rajadas lentas
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 220;
      lfo.connect(lfoGain);
      lfoGain.connect(bandpass.frequency);
      lfo.start();

      windSource.connect(bandpass);
      bandpass.connect(masterGain);
      windSource.start();
      activeNodes.push(windSource, bandpass, lfo, lfoGain);

    // 4. CAVERNA & CRIPTA
    } else if (type === 'cave' || type.includes('cave')) {
      const drone = ctx.createOscillator();
      drone.type = 'sine';
      drone.frequency.value = 48; // Sub-grave ressonante
      const droneGain = ctx.createGain();
      droneGain.gain.value = 0.2;
      drone.connect(droneGain);
      droneGain.connect(masterGain);
      drone.start();
      activeNodes.push(drone, droneGain);

      // Gotas com reverberação de eco
      const dripInterval = setInterval(() => {
        if (!active) return;
        if (Math.random() < 0.45) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          const f = 1400 + Math.random() * 600;
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(f * 0.65, ctx.currentTime + 0.12);

          g.gain.setValueAtTime(0.12, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);

          osc.connect(g);
          g.connect(masterGain);
          osc.start();
          osc.stop(ctx.currentTime + 0.22);
        }
      }, 550);
      intervals.push(dripInterval);

    // 5. TENSÃO DE BATALHA
    } else if (type === 'combat' || type.includes('combat')) {
      const drumInterval = setInterval(() => {
        if (!active) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(110, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.18);

        g.gain.setValueAtTime(0.35, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

        osc.connect(g);
        g.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      }, 600);
      intervals.push(drumInterval);

    // 6. FLORESTA MISTERIOSA
    } else if (type === 'forest' || type.includes('forest')) {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const outL = noiseBuffer.getChannelData(0);
      const outR = noiseBuffer.getChannelData(1);
      let fL = 0, fR = 0;
      for (let i = 0; i < bufferSize; i++) {
        fL = fL * 0.9 + (Math.random() * 2 - 1) * 0.1;
        fR = fR * 0.9 + (Math.random() * 2 - 1) * 0.1;
        outL[i] = fL * 0.3;
        outR[i] = fR * 0.3;
      }
      const breeze = ctx.createBufferSource();
      breeze.buffer = noiseBuffer;
      breeze.loop = true;
      breeze.connect(masterGain);
      breeze.start();
      activeNodes.push(breeze);

      const birdInterval = setInterval(() => {
        if (!active) return;
        if (Math.random() < 0.5) {
          const osc = ctx.createOscillator();
          const g = ctx.createGain();
          osc.type = 'sine';
          const f = 2200 + Math.random() * 800;
          osc.frequency.setValueAtTime(f, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(f + 350, ctx.currentTime + 0.07);
          osc.frequency.linearRampToValueAtTime(f - 150, ctx.currentTime + 0.14);

          g.gain.setValueAtTime(0.06, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);

          osc.connect(g);
          g.connect(masterGain);
          osc.start();
          osc.stop(ctx.currentTime + 0.2);
        }
      }, 700);
      intervals.push(birdInterval);

    // 7. NOITE ESTRELADA / GRILOS
    } else if (type === 'crickets' || type.includes('crickets')) {
      const cricketInterval = setInterval(() => {
        if (!active) return;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 4600 + Math.random() * 250;
        g.gain.setValueAtTime(0.04, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);

        osc.connect(g);
        g.connect(masterGain);
        osc.start();
        osc.stop(ctx.currentTime + 0.06);
      }, 120);
      intervals.push(cricketInterval);

    // 8. RIO & CACHOEIRA
    } else {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate);
      const outL = noiseBuffer.getChannelData(0);
      const outR = noiseBuffer.getChannelData(1);
      let fL = 0, fR = 0;
      for (let i = 0; i < bufferSize; i++) {
        fL = fL * 0.85 + (Math.random() * 2 - 1) * 0.15;
        fR = fR * 0.85 + (Math.random() * 2 - 1) * 0.15;
        outL[i] = fL * 1.5;
        outR[i] = fR * 1.5;
      }
      const water = ctx.createBufferSource();
      water.buffer = noiseBuffer;
      water.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 750;

      water.connect(filter);
      filter.connect(masterGain);
      water.start();
      activeNodes.push(water, filter);
    }

    this.currentAmbienceNode = {
      stop: cleanup,
      setVolume: (v: number) => {
        try {
          masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), ctx.currentTime, 0.1);
        } catch {}
      }
    };
  }

  stopAmbience(): void {
    if (this.currentAmbienceNode) {
      this.currentAmbienceNode.stop();
      this.currentAmbienceNode = null;
    }
  }

  setAmbienceVolume(vol: number): void {
    if (this.currentAmbienceNode) {
      this.currentAmbienceNode.setVolume(vol);
    }
  }

  // --- MUSIC GENERATORS ---

  startMusic(presetId: string, initialVolume = 0.6): void {
    this.stopMusic();
    const ctx = this.getContext();

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, initialVolume)), ctx.currentTime);
    masterGain.connect(ctx.destination);

    let active = true;
    const intervals: any[] = [];

    const chords = presetId === 'medieval_tavern' 
      ? [[220, 277.18, 329.63], [246.94, 293.66, 369.99], [196, 246.94, 293.66], [220, 277.18, 329.63]]
      : [[261.63, 329.63, 392.00, 523.25], [220, 261.63, 329.63, 440], [174.61, 220, 261.63, 349.23], [196, 246.94, 293.66, 392]];

    let chordIdx = 0;
    const playChordStep = () => {
      if (!active) return;
      const notes = chords[chordIdx % chords.length];
      chordIdx++;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = presetId === 'medieval_tavern' ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.15);

        g.gain.setValueAtTime(0.0001, ctx.currentTime + idx * 0.15);
        g.gain.exponentialRampToValueAtTime(0.12 / notes.length, ctx.currentTime + idx * 0.15 + 0.3);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + idx * 0.15 + 2.5);

        osc.connect(g);
        g.connect(masterGain);
        osc.start(ctx.currentTime + idx * 0.15);
        osc.stop(ctx.currentTime + idx * 0.15 + 2.8);
      });
    };

    playChordStep();
    const chordInterval = setInterval(playChordStep, 2600);
    intervals.push(chordInterval);

    this.currentMusicNode = {
      stop: () => {
        active = false;
        intervals.forEach(clearInterval);
        try {
          masterGain.gain.setTargetAtTime(0, ctx.currentTime, 0.4);
          setTimeout(() => masterGain.disconnect(), 500);
        } catch {}
      },
      setVolume: (v: number) => {
        try {
          masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), ctx.currentTime, 0.1);
        } catch {}
      }
    };
  }

  stopMusic(): void {
    if (this.currentMusicNode) {
      this.currentMusicNode.stop();
      this.currentMusicNode = null;
    }
  }

  setMusicVolume(vol: number): void {
    if (this.currentMusicNode) {
      this.currentMusicNode.setVolume(vol);
    }
  }

  // --- SFX GENERATORS ---

  playSFX(type: string, volume = 0.8): void {
    const ctx = this.getContext();
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);
    gainNode.connect(ctx.destination);

    if (type.includes('thunder') || type === 'sfx_thunder') {
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.6));

      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 1.8);

      noise.connect(filter);
      filter.connect(gainNode);
      noise.start();
      noise.stop(ctx.currentTime + 2.0);

    } else if (type.includes('sword') || type === 'sfx_sword') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(2400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.18);

      g.gain.setValueAtTime(0.5, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);

      osc.connect(g);
      g.connect(gainNode);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);

    } else if (type.includes('magic') || type === 'sfx_magic') {
      const freqs = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, ctx.currentTime + i * 0.06);
        g.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.06);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.06 + 0.4);

        osc.connect(g);
        g.connect(gainNode);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.45);
      });

    } else if (type.includes('door') || type === 'sfx_door') {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(350, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.6);

      g.gain.setValueAtTime(0.2, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);

      osc.connect(g);
      g.connect(gainNode);
      osc.start();
      osc.stop(ctx.currentTime + 0.7);

    } else if (type.includes('alarm') || type === 'sfx_alarm') {
      [0, 0.25, 0.5].forEach(t => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(880, ctx.currentTime + t);
        g.gain.setValueAtTime(0.15, ctx.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);

        osc.connect(g);
        g.connect(gainNode);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.18);
      });

    } else if (type.includes('victory') || type === 'sfx_victory') {
      const fanfare = [
        { f: 261.63, t: 0, d: 0.15 },
        { f: 329.63, t: 0.16, d: 0.15 },
        { f: 392.00, t: 0.32, d: 0.2 },
        { f: 523.25, t: 0.54, d: 0.6 }
      ];
      fanfare.forEach(note => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(note.f, ctx.currentTime + note.t);

        g.gain.setValueAtTime(0.25, ctx.currentTime + note.t);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + note.t + note.d);

        osc.connect(g);
        g.connect(gainNode);
        osc.start(ctx.currentTime + note.t);
        osc.stop(ctx.currentTime + note.t + note.d + 0.1);
      });
    }
  }
}

export const proceduralAudio = new ProceduralAudioEngine();
