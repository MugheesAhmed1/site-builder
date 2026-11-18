/** The ambient sound a template user can change (content.json "sound"). */
export interface SoundOptions {
  enabled: boolean;
  volume: number;
  mood: 'night' | 'warm' | 'airy';
  wind: number;
}

export const DEFAULT_SOUND: SoundOptions = { enabled: true, volume: 0.36, mood: 'night', wind: 0.35 };

const MOODS: Record<SoundOptions['mood'], number[]> = {
  // D minor 9th / F#m atmospheric voicing
  night: [73.42, 110.0, 146.83, 185.0, 220.0, 277.18, 329.63],
  // D major add 9
  warm: [73.42, 110.0, 146.83, 185.0, 220.0, 329.63, 369.99],
  // open fifths, high and light
  airy: [110.0, 164.81, 220.0, 246.94, 329.63, 440.0, 493.88],
};

export class AudioEngine {
  private o: SoundOptions;
  constructor(options: Partial<SoundOptions> = {}) {
    this.o = { ...DEFAULT_SOUND, ...options };
  }
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private muffleFilter: BiquadFilterNode | null = null;
  private nodes: AudioNode[] = [];
  private oscillators: OscillatorNode[] = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private lfoTimers: number[] = [];

  public isInitialized = false;
  public isMuted = true;
  private isMuffled = false;

  public initAudio(): void {
    if (this.isInitialized) return;
    this.isInitialized = true;
  }

  private ensureGraph(): void {
    if (this.ctx) return;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    this.ctx = ctx;

    const masterGain = ctx.createGain();
    masterGain.gain.value = 0;

    const muffleFilter = ctx.createBiquadFilter();
    muffleFilter.type = 'lowpass';
    muffleFilter.frequency.value = this.isMuffled ? 340 : 9500;
    muffleFilter.Q.value = 0.85;

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 4;

    muffleFilter.connect(compressor);
    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);

    this.masterGain = masterGain;
    this.muffleFilter = muffleFilter;

    // Warm nocturnal harmonic pad (D minor 9th / F#m atmospheric voicing)
    const freqs = MOODS[this.o.mood] || MOODS.night;
    const gains = [0.22, 0.16, 0.14, 0.08, 0.09, 0.045, 0.04];

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx < 2 ? 'sine' : 'triangle';
      osc.frequency.value = freq;

      // Subtle slow pitch drift
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.06 + idx * 0.017;
      lfoGain.gain.value = idx < 2 ? 0.25 : 0.65;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // Voice filter + breathing amplitude LFO
      const voiceFilter = ctx.createBiquadFilter();
      voiceFilter.type = 'lowpass';
      voiceFilter.frequency.value = 450 + idx * 140;

      const voiceGain = ctx.createGain();
      voiceGain.gain.value = gains[idx];

      const ampLfo = ctx.createOscillator();
      const ampLfoGain = ctx.createGain();
      ampLfo.frequency.value = 0.045 + idx * 0.013;
      ampLfoGain.gain.value = gains[idx] * 0.35;
      ampLfo.connect(ampLfoGain);
      ampLfoGain.connect(voiceGain.gain);

      osc.connect(voiceFilter);
      voiceFilter.connect(voiceGain);
      voiceGain.connect(muffleFilter);

      osc.start();
      lfo.start();
      ampLfo.start();

      this.oscillators.push(osc, lfo, ampLfo);
      this.nodes.push(voiceFilter, voiceGain, lfoGain, ampLfoGain);
    });

    // Soft nocturnal breeze (filtered pink-ish noise)
    const bufferSize = ctx.sampleRate * 4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.035;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 420;
    windFilter.Q.value = 0.7;

    const windLfo = ctx.createOscillator();
    const windLfoGain = ctx.createGain();
    windLfo.frequency.value = 0.07;
    windLfoGain.gain.value = 180;
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.value = Math.max(0, Math.min(1, this.o.wind));

    noise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(muffleFilter);

    noise.start();
    windLfo.start();

    this.noiseSource = noise;
    this.oscillators.push(windLfo);
    this.nodes.push(windFilter, windGain, windLfoGain, compressor);
  }

  public toggleMute(): boolean {
    if (!this.isInitialized) return true;
    this.ensureGraph();

    if (!this.ctx || !this.masterGain) return true;

    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }

    this.isMuted = !this.isMuted;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(this.isMuted ? 0 : Math.max(0, Math.min(1, this.o.volume)), now + 0.85);

    return this.isMuted;
  }

  public setMuffled(muffled: boolean): void {
    this.isMuffled = muffled;
    if (!this.ctx || !this.muffleFilter) return;

    const now = this.ctx.currentTime;
    const targetFreq = muffled ? 340 : 9500;
    this.muffleFilter.frequency.cancelScheduledValues(now);
    this.muffleFilter.frequency.setValueAtTime(this.muffleFilter.frequency.value, now);
    this.muffleFilter.frequency.exponentialRampToValueAtTime(targetFreq, now + 0.65);
  }

  public dispose(): void {
    this.lfoTimers.forEach((id) => window.clearInterval(id));
    this.oscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
        this.noiseSource.disconnect();
      } catch {
        // ignore
      }
    }
    this.nodes.forEach((node) => {
      try {
        node.disconnect();
      } catch {
        // ignore
      }
    });
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
