
import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Logging types for audio debugging
 */
interface VoiceSnapshot {
  midiNote: number;
  noteName: string;
  age: number;
  released: boolean;
  presetId: string;
  oscillators: string[];
  gainNodes: number[];
  filterCutoff: number;
  filterQ: number;
  filterEnvelope: number;
  mainGainValue: number;
  extraNodes: string[];
}

interface LogEntry {
  timestamp: number;
  timestampISO: string;
  event: 'NOTE_ON' | 'NOTE_OFF' | 'VOICE_STEAL' | 'VOICE_RELEASE' | 'STOP_ALL';
  activeVoiceCount: number;
  midiNote?: number;
  noteName?: string;
  message?: string;
  immediate: VoiceSnapshot[];
  delayed?: VoiceSnapshot[];
  delayedCaptureTimeoutId?: number;
}

// Helper: Convert MIDI note to name
const midiToNoteName = (midi: number): string => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const noteIndex = midi % 12;
  return `${notes[noteIndex]}${octave}`;
};

// Helper: Calculate frequency from MIDI note
const midiToFrequency = (midi: number): number => {
  return 440 * Math.pow(2, (midi - 69) / 12);
};

/**
 * InstrumentType — currently only 'piano'.
 *
 * EXTENSION POINT: To add a new instrument:
 * 1. Add the instrument key here (for example: 'my-instrument')
 * 2. Add a corresponding preset to `INSTRUMENT_PRESETS` in this file
 * 3. Add a voicing function in `src/utils/chordVoicings.ts` and handle it in `getVoicingForInstrument`
 */
export type InstrumentType = 'piano';

interface Voice {
  sources: AudioScheduledSourceNode[];
  gainNodes: GainNode[];
  extraNodes: AudioNode[];
  mainGain: GainNode;
  filterNode: BiquadFilterNode;
  startTime: number;
  autoStopId?: number;
  cleanupTimeoutId?: number; // timeout for final cleanup after release
  released?: boolean;
  presetId: InstrumentType;
  release: number;
}

interface InstrumentPreset {
  name: string;
  harmonics: number[]; // Relative amplitudes for each harmonic
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  filterCutoff: number;
  filterQ: number;
  filterEnvelope: number; // How much filter opens on attack
  vibratoRate: number;
  vibratoDepth: number;
  detuneSpread: number;
  pluckNoiseLevel?: number;
  pluckNoiseDecay?: number;
  saturationAmount?: number;
  stereoSpread?: number;
}

const _saturationCurveCache = new Map<number, Float32Array>();
const createSaturationCurve = (amount: number) => {
  // Cache curves to avoid allocating large Float32Arrays per note (reduces GC pressure)
  // 8192 samples is plenty for smooth distortion curve
  const key = Math.round(amount * 1000);
  const cached = _saturationCurveCache.get(key);
  if (cached) return cached;

  const k = Math.max(1, amount * 40);
  const curve = new Float32Array(8192);
  for (let i = 0; i < curve.length; i++) {
    const x = (i / curve.length) * 2 - 1;
    curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
  }
  _saturationCurveCache.set(key, curve);
  return curve;
};

// The plucked-string settings borrow damping and excitation ideas from contemporary physical modelling research [dafx.de](https://dafx.de/paper-archive/2024/papers/DAFx24_paper_50.pdf) and practical Karplus-Strong style workflows [realpython.com](https://realpython.com/python-guitar-synthesizer/).

/**
 * INSTRUMENT_PRESETS — only the piano preset is kept in the simplified build.
 * EXTENSION POINT: Add more presets here keyed by `InstrumentType`. Follow the
 * `InstrumentPreset` interface above for parameter details.
 */
const INSTRUMENT_PRESETS: Record<InstrumentType, InstrumentPreset> = {
  piano: {
    name: 'Acoustic Piano',
    harmonics: [1.0, 0.5, 0.35, 0.15, 0.08],
    attack: 0.005,
    decay: 0.8,
    sustain: 0.2,
    release: 1.2,
    filterCutoff: 5000,
    filterQ: 0.7,
    filterEnvelope: 0.6,
    vibratoRate: 0,
    vibratoDepth: 0,
    detuneSpread: 4,
    stereoSpread: 0.25
  }
};

// Maximum concurrent voices to prevent memory/CPU overload
const MAX_POLYPHONY = 24;

export function useAudio() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeVoicesRef = useRef<Map<number, Voice>>(new Map());
  const masterGainRef = useRef<GainNode | null>(null);
  const reverbGainRef = useRef<GainNode | null>(null);
  const dryGainRef = useRef<GainNode | null>(null);
  const convolverRef = useRef<ConvolverNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const instrumentRef = useRef<InstrumentType>('piano');
  const reverbMixRef = useRef(0.2);
  const volumeRef = useRef(1.0);
  
  // Logging infrastructure
  const logsRef = useRef<LogEntry[]>([]);
  const delayedCaptureTimeoutsRef = useRef<Map<number, number>>(new Map());

  const createReverb = useCallback(async (ctx: AudioContext) => {
    const convolver = ctx.createConvolver();
    const sampleRate = ctx.sampleRate;
    // Reduced reverb length from 2 seconds to 1.2 seconds (saves ~40% memory)
    const length = Math.floor(sampleRate * 1.2);
    const impulse = ctx.createBuffer(2, length, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const channelData = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        // Faster decay for shorter tail
        const decay = Math.exp(-4 * t);
        const earlyReflection = i < sampleRate * 0.08 ? Math.sin(i * 0.01) * 0.3 : 0;
        channelData[i] = (Math.random() * 2 - 1) * decay + earlyReflection * decay;
      }
    }
    
    convolver.buffer = impulse;
    return convolver;
  }, []);

  /**
   * Capture detailed voice snapshot for logging
   */
  const captureVoiceSnapshot = useCallback((midiNote: number, voice: Voice, ctx: AudioContext): VoiceSnapshot => {
    const now = ctx.currentTime;
    const age = now - voice.startTime;
    const baseFreq = midiToFrequency(midiNote);
    const preset = INSTRUMENT_PRESETS[voice.presetId];
    
    // Capture oscillator details with frequencies
    const oscillators = voice.sources.map((source, idx) => {
      const harmonic = idx + 1;
      const freq = baseFreq * harmonic;
      const amp = preset.harmonics[idx] || 0;
      return `Osc ${idx}: ${freq.toFixed(2)} Hz (harmonic ${harmonic}, amp ${amp.toFixed(3)})`;
    });

    // Capture gain values
    const gainValues = voice.gainNodes.map((gn, idx) => gn.gain.value);

    // Capture extra node types
    const extraNodeTypes = voice.extraNodes.map((node, idx) => {
      if (node instanceof WaveShaperNode) return `WaveShaper_${idx}`;
      if (node instanceof StereoPannerNode) return `StereoPanner_${idx} (pan: ${(node as any).pan?.value?.toFixed(2) || 'N/A'})`;
      if (node instanceof GainNode) return `Gain_${idx} (${node.gain.value.toFixed(3)})`;
      if (node instanceof OscillatorNode) return `LFO_${idx} (${(node as any).frequency?.value?.toFixed(2) || 'N/A'} Hz)`;
      return `${node.constructor.name}_${idx}`;
    });

    return {
      midiNote,
      noteName: midiToNoteName(midiNote),
      age: parseFloat(age.toFixed(3)),
      released: voice.released || false,
      presetId: voice.presetId,
      oscillators,
      gainNodes: gainValues,
      filterCutoff: voice.filterNode.frequency.value,
      filterQ: voice.filterNode.Q.value,
      filterEnvelope: preset.filterEnvelope,
      mainGainValue: voice.mainGain.gain.value,
      extraNodes: extraNodeTypes
    };
  }, []);

  /**
   * Add log entry with immediate capture and delayed capture (50ms)
   */
  const addLog = useCallback((entry: Omit<LogEntry, 'timestamp' | 'timestampISO' | 'immediate' | 'delayed' | 'activeVoiceCount'>) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    const now = performance.now();
    const immediate: VoiceSnapshot[] = [];
    
    // Capture immediate state of all active voices
    activeVoicesRef.current.forEach((voice, midiNote) => {
      immediate.push(captureVoiceSnapshot(midiNote, voice, ctx));
    });

    const logEntry: LogEntry = {
      ...entry,
      timestamp: now,
      timestampISO: new Date().toISOString(),
      immediate,
      activeVoiceCount: activeVoicesRef.current.size
    };

    // Schedule delayed capture (50ms) to see envelope/filter evolution
    const delayedTimeoutId = window.setTimeout(() => {
      const delayed: VoiceSnapshot[] = [];
      activeVoicesRef.current.forEach((voice, midiNote) => {
        delayed.push(captureVoiceSnapshot(midiNote, voice, ctx));
      });
      logEntry.delayed = delayed;
      
      // Clear from tracking map
      if (logEntry.delayedCaptureTimeoutId !== undefined) {
        delayedCaptureTimeoutsRef.current.delete(logEntry.delayedCaptureTimeoutId);
      }
    }, 50);

    logEntry.delayedCaptureTimeoutId = delayedTimeoutId;
    delayedCaptureTimeoutsRef.current.set(delayedTimeoutId, delayedTimeoutId);

    // Add to log with FIFO rotation (max 1000 entries)
    logsRef.current.push(logEntry);
    if (logsRef.current.length > 1000) {
      const removed = logsRef.current.shift();
      // Clear any pending delayed capture timeout from removed entry
      if (removed?.delayedCaptureTimeoutId !== undefined) {
        window.clearTimeout(removed.delayedCaptureTimeoutId);
        delayedCaptureTimeoutsRef.current.delete(removed.delayedCaptureTimeoutId);
      }
    }
  }, [captureVoiceSnapshot]);

  const initAudio = useCallback(async () => {
    if (!audioContextRef.current) {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = ctx;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 20;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.2;
      compressorRef.current = compressor;

      const masterGain = ctx.createGain();
      masterGain.gain.value = volumeRef.current;
      masterGainRef.current = masterGain;

      const convolver = await createReverb(ctx);
      convolverRef.current = convolver;

      const reverbGain = ctx.createGain();
      reverbGain.gain.value = reverbMixRef.current;
      reverbGainRef.current = reverbGain;

      const dryGain = ctx.createGain();
      // Proper wet/dry crossfade: dry decreases as reverb increases
      dryGain.gain.value = 1 - reverbMixRef.current;
      dryGainRef.current = dryGain;

      masterGain.connect(dryGain);
      masterGain.connect(convolver);
      convolver.connect(reverbGain);
      dryGain.connect(compressor);
      reverbGain.connect(compressor);
      compressor.connect(ctx.destination);


      setIsInitialized(true);
    }
    
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, [createReverb]);

  const releaseVoice = useCallback((midiNote: number, voice: Voice) => {
    if (!audioContextRef.current || voice.released) return;
    const ctx = audioContextRef.current;

    voice.released = true;

    // Log voice release event
    addLog({
      event: 'VOICE_RELEASE',
      midiNote,
      noteName: midiToNoteName(midiNote),
      message: `Releasing voice for ${midiToNoteName(midiNote)} (release time: ${voice.release.toFixed(2)}s)`
    });

    if (voice.autoStopId !== undefined) {
      window.clearTimeout(voice.autoStopId);
      voice.autoStopId = undefined;
    }

    // Clear any pending delayed capture timeouts
    const pendingTimeouts = Array.from(delayedCaptureTimeoutsRef.current.values());
    pendingTimeouts.forEach(timeoutId => {
      window.clearTimeout(timeoutId);
    });

    const { mainGain, filterNode, sources, gainNodes, extraNodes } = voice;
    const now = ctx.currentTime;
    const releaseTime = voice.release;

    mainGain.gain.cancelScheduledValues(now);
    const currentGain = Math.max(mainGain.gain.value, 0.0001);
    mainGain.gain.setValueAtTime(currentGain, now);
    mainGain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

    filterNode.frequency.cancelScheduledValues(now);
    filterNode.frequency.setValueAtTime(Math.max(filterNode.frequency.value, 100), now);
    filterNode.frequency.exponentialRampToValueAtTime(100, now + releaseTime * 0.8);

    const cleanupTime = releaseTime * 1000 + 150;
    const cleanupId = window.setTimeout(() => {
      sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          /* noop */
        }
        try {
          source.disconnect();
        } catch {
          /* noop */
        }
      });
      gainNodes.forEach((gainNode) => {
        try {
          gainNode.disconnect();
        } catch {
          /* noop */
        }
      });
      extraNodes.forEach((node) => {
        try {
          node.disconnect();
        } catch {
          /* noop */
        }
      });
      try {
        mainGain.disconnect();
      } catch {
        /* noop */
      }
      try {
        filterNode.disconnect();
      } catch {
        /* noop */
      }
      if (activeVoicesRef.current.get(midiNote) === voice) {
        activeVoicesRef.current.delete(midiNote);
      }
      // clear reference to cleanup timer
      voice.cleanupTimeoutId = undefined;
    }, cleanupTime);

    // store so we can clear it if we need to cancel cleanup early
    voice.cleanupTimeoutId = cleanupId;
  }, [addLog]);

  const stopNote = useCallback((midiNote: number) => {
    const voice = activeVoicesRef.current.get(midiNote);
    if (!voice) return;

    // Log note off event
    addLog({
      event: 'NOTE_OFF',
      midiNote,
      noteName: midiToNoteName(midiNote),
      message: `Stop note ${midiToNoteName(midiNote)}`
    });
    
    releaseVoice(midiNote, voice);
  }, [releaseVoice, addLog]);

  const playNote = useCallback((midiNote: number, velocity: number = 0.8) => {
    if (!audioContextRef.current || !masterGainRef.current) return;
    
    const existingVoice = activeVoicesRef.current.get(midiNote);
    if (existingVoice) {
      releaseVoice(midiNote, existingVoice);
    }
    
    // Voice stealing: if at max polyphony, release the oldest voice
    if (activeVoicesRef.current.size >= MAX_POLYPHONY) {
      let oldestNote: number | null = null;
      let oldestTime = Infinity;
      activeVoicesRef.current.forEach((voice, note) => {
        if (voice.startTime < oldestTime) {
          oldestTime = voice.startTime;
          oldestNote = note;
        }
      });
      if (oldestNote !== null) {
        const oldVoice = activeVoicesRef.current.get(oldestNote);
        if (oldVoice) {
          addLog({
            event: 'VOICE_STEAL',
            midiNote: oldestNote,
            noteName: midiToNoteName(oldestNote),
            message: `Voice stealing: releasing ${midiToNoteName(oldestNote)} to make room for ${midiToNoteName(midiNote)} (MAX_POLYPHONY=${MAX_POLYPHONY})`
          });
          releaseVoice(oldestNote, oldVoice);
        }
      }
    }

    const ctx = audioContextRef.current;
    const preset = INSTRUMENT_PRESETS[instrumentRef.current];
    const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.Q.value = preset.filterQ;
    
    const filterStart = Math.min(preset.filterCutoff * (1 + preset.filterEnvelope), 15000);
    filter.frequency.setValueAtTime(filterStart, now);
    filter.frequency.exponentialRampToValueAtTime(
      preset.filterCutoff,
      now + preset.attack + preset.decay * 0.5
    );

    const mainGain = ctx.createGain();
    mainGain.gain.value = 0;

    const sources: AudioScheduledSourceNode[] = [];
    const gainNodes: GainNode[] = [];
    const extraNodes: AudioNode[] = [];

    let lastNode: AudioNode = filter;

    if (preset.saturationAmount && preset.saturationAmount > 0) {
      const waveShaper = ctx.createWaveShaper();
      // assign via any cast to avoid a subtle lib mismatch (SharedArrayBuffer vs ArrayBuffer)
      (waveShaper as any).curve = createSaturationCurve(preset.saturationAmount);
      // Ensure audio flows through the waveshaper by connecting the filter to it
      filter.connect(waveShaper);
      lastNode = waveShaper;
      extraNodes.push(waveShaper);
    }

    if (preset.stereoSpread && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime((Math.random() * 2 - 1) * preset.stereoSpread, now);
      lastNode.connect(panner);
      lastNode = panner;
      extraNodes.push(panner);
    }

    lastNode.connect(mainGain);
    mainGain.connect(masterGainRef.current);

    if (preset.pluckNoiseLevel && preset.pluckNoiseLevel > 0) {
      const length = Math.max(0.05, preset.pluckNoiseDecay ?? 0.12);
      const noiseBuffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        const t = i / data.length;
        const envelope = Math.pow(1 - t, 3);
        data[i] = (Math.random() * 2 - 1) * envelope;
      }
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(preset.pluckNoiseLevel, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + length);
      noiseSource.connect(noiseGain);
      noiseGain.connect(filter);
      noiseSource.start(now);
      noiseSource.stop(now + length);
      sources.push(noiseSource);
      extraNodes.push(noiseGain);
    }

    // Create ONE LFO per note (not per harmonic) to reduce CPU load
    let sharedLfo: OscillatorNode | null = null;
    let sharedLfoGain: GainNode | null = null;
    if (preset.vibratoRate > 0 && preset.vibratoDepth > 0) {
      sharedLfo = ctx.createOscillator();
      sharedLfoGain = ctx.createGain();
      sharedLfo.type = 'sine';
      sharedLfo.frequency.value = preset.vibratoRate;
      sharedLfoGain.gain.value = preset.vibratoDepth;
      sharedLfo.connect(sharedLfoGain);
      sharedLfo.start(now);
      sources.push(sharedLfo);
      extraNodes.push(sharedLfoGain);
    }

    preset.harmonics.forEach((amplitude, index) => {
      if (amplitude <= 0) return;
      
      const harmonicNum = index + 1;
      const harmonicFreq = frequency * harmonicNum;
      
      if (harmonicFreq > ctx.sampleRate / 2) return;

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = harmonicFreq;
      
      const detuneOffset = (Math.random() - 0.5) * preset.detuneSpread;
      osc.detune.value = detuneOffset;

      const harmonicGain = ctx.createGain();
      const harmonicDecay = amplitude * Math.pow(0.85, index);
      harmonicGain.gain.value = harmonicDecay * 0.3;

      osc.connect(harmonicGain);
      harmonicGain.connect(filter);
      
      // Connect shared LFO to all oscillators (scaled by harmonic number)
      if (sharedLfoGain) {
        const lfoScaler = ctx.createGain();
        lfoScaler.gain.value = harmonicNum; // Higher harmonics get more vibrato
        sharedLfoGain.connect(lfoScaler);
        lfoScaler.connect(osc.detune);
        extraNodes.push(lfoScaler);
      }

      osc.start(now);
      
      sources.push(osc);
      gainNodes.push(harmonicGain);
    });

    const peakGain = velocity * 0.5;
    const sustainLevel = peakGain * preset.sustain;

    mainGain.gain.setValueAtTime(0.0001, now);
    mainGain.gain.linearRampToValueAtTime(peakGain, now + preset.attack);
    mainGain.gain.setTargetAtTime(sustainLevel, now + preset.attack, preset.decay * 0.3);

    const voice: Voice = {
      sources,
      gainNodes,
      extraNodes,
      mainGain,
      filterNode: filter,
      startTime: now,
      presetId: instrumentRef.current,
      release: preset.release
    };

    activeVoicesRef.current.set(midiNote, voice);

    // Log NOTE_ON event
    addLog({
      event: 'NOTE_ON',
      midiNote,
      noteName: midiToNoteName(midiNote),
      message: `Note ON: ${midiToNoteName(midiNote)} (${frequency.toFixed(2)} Hz), velocity ${velocity.toFixed(2)}, preset ${preset.name}`
    });

    // Shorter auto-release to prevent voice buildup (max 8 seconds)
    const autoReleaseDuration = Math.min(8, Math.max(4, preset.decay * 2 + preset.release * 2 + 1));
    voice.autoStopId = window.setTimeout(() => {
      if (activeVoicesRef.current.get(midiNote) === voice) {
        releaseVoice(midiNote, voice);
      }
    }, autoReleaseDuration * 1000);
  }, [releaseVoice, addLog]);

  const stopAll = useCallback(() => {
    // Log STOP_ALL event
    addLog({
      event: 'STOP_ALL',
      message: `Stopping all voices (count: ${activeVoicesRef.current.size})`
    });

    activeVoicesRef.current.forEach((voice, midiNote) => {
      // clear any pending cleanup timers immediately to avoid accumulating timeouts
      if (voice.cleanupTimeoutId !== undefined) {
        window.clearTimeout(voice.cleanupTimeoutId);
        voice.cleanupTimeoutId = undefined;
      }
      releaseVoice(midiNote, voice);
    });
  }, [releaseVoice, addLog]);

  const setInstrument = useCallback((instrument: InstrumentType) => {
    instrumentRef.current = instrument;
  }, []);

  const setReverbMix = useCallback((mix: number) => {
    reverbMixRef.current = mix;
    if (reverbGainRef.current && dryGainRef.current) {
      // Proper wet/dry crossfade
      reverbGainRef.current.gain.value = mix;
      dryGainRef.current.gain.value = 1 - mix;
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    volumeRef.current = volume;
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
  }, []);

  /**
   * Format logs as structured human-readable text
   */
  const formatLogsForDownload = useCallback((): string => {
    const lines: string[] = [];
    lines.push('='.repeat(80));
    lines.push('AUDIO VOICE DEBUG LOG');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`Total Entries: ${logsRef.current.length}`);
    lines.push('='.repeat(80));
    lines.push('');

    logsRef.current.forEach((entry, index) => {
      lines.push(`=== Entry ${index + 1} ===`);
      lines.push(`Timestamp: ${entry.timestampISO} (${entry.timestamp.toFixed(3)}ms)`);
      lines.push(`Event: ${entry.event}`);
      lines.push(`Active Voices: ${entry.activeVoiceCount}`);
      if (entry.midiNote !== undefined) {
        lines.push(`MIDI Note: ${entry.midiNote} (${entry.noteName})`);
      }
      if (entry.message) {
        lines.push(`Message: ${entry.message}`);
      }
      lines.push('');

      // Immediate state
      lines.push('--- Immediate State (T+0ms) ---');
      if (entry.immediate.length === 0) {
        lines.push('  No active voices');
      } else {
        entry.immediate.forEach((voice, idx) => {
          lines.push(`  Voice ${idx + 1}:`);
          lines.push(`    MIDI: ${voice.midiNote} (${voice.noteName})`);
          lines.push(`    Age: ${voice.age.toFixed(3)}s`);
          lines.push(`    Released: ${voice.released}`);
          lines.push(`    Preset: ${voice.presetId}`);
          lines.push(`    Oscillators:`);
          voice.oscillators.forEach(osc => lines.push(`      ${osc}`));
          lines.push(`    Gain Values: [${voice.gainNodes.map(g => g.toFixed(3)).join(', ')}]`);
          lines.push(`    Filter: ${voice.filterCutoff.toFixed(1)} Hz (Q: ${voice.filterQ.toFixed(2)}, Env: ${voice.filterEnvelope.toFixed(2)})`);
          lines.push(`    Main Gain: ${voice.mainGainValue.toFixed(3)}`);
          lines.push(`    Extra Nodes: [${voice.extraNodes.join(', ')}]`);
          lines.push('');
        });
      }

      // Delayed state (if captured)
      if (entry.delayed && entry.delayed.length > 0) {
        lines.push('--- Delayed State (T+50ms) ---');
        entry.delayed.forEach((voice, idx) => {
          lines.push(`  Voice ${idx + 1}:`);
          lines.push(`    MIDI: ${voice.midiNote} (${voice.noteName})`);
          lines.push(`    Age: ${voice.age.toFixed(3)}s`);
          lines.push(`    Released: ${voice.released}`);
          lines.push(`    Preset: ${voice.presetId}`);
          lines.push(`    Oscillators:`);
          voice.oscillators.forEach(osc => lines.push(`      ${osc}`));
          lines.push(`    Gain Values: [${voice.gainNodes.map(g => g.toFixed(3)).join(', ')}]`);
          lines.push(`    Filter: ${voice.filterCutoff.toFixed(1)} Hz (Q: ${voice.filterQ.toFixed(2)}, Env: ${voice.filterEnvelope.toFixed(2)})`);
          lines.push(`    Main Gain: ${voice.mainGainValue.toFixed(3)}`);
          lines.push(`    Extra Nodes: [${voice.extraNodes.join(', ')}]`);
          lines.push('');
        });
      }

      lines.push('');
    });

    return lines.join('\n');
  }, []);

  /**
   * Download logs as text file
   */
  const downloadLogs = useCallback(() => {
    const logText = formatLogsForDownload();
    const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audio-debug-${new Date().toISOString()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [formatLogsForDownload]);

  /**
   * Clear all logs
   */
  const clearLogs = useCallback(() => {
    // Clear all pending delayed capture timeouts
    delayedCaptureTimeoutsRef.current.forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });
    delayedCaptureTimeoutsRef.current.clear();
    logsRef.current = [];
  }, []);

  // Expose logging functions globally for console access
  useEffect(() => {
    (window as any).downloadAudioLogs = downloadLogs;
    (window as any).clearAudioLogs = clearLogs;
    (window as any).getAudioLogCount = () => logsRef.current.length;

    return () => {
      delete (window as any).downloadAudioLogs;
      delete (window as any).clearAudioLogs;
      delete (window as any).getAudioLogCount;
    };
  }, [downloadLogs, clearLogs]);

  useEffect(() => {
    return () => {
      // Clear all delayed capture timeouts
      delayedCaptureTimeoutsRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      delayedCaptureTimeoutsRef.current.clear();

      // Clear scheduled cleanup timers so they don't accumulate after unmount
      activeVoicesRef.current.forEach((voice) => {
        if (voice.cleanupTimeoutId !== undefined) {
          window.clearTimeout(voice.cleanupTimeoutId);
          voice.cleanupTimeoutId = undefined;
        }
        if (voice.autoStopId !== undefined) {
          window.clearTimeout(voice.autoStopId);
          voice.autoStopId = undefined;
        }
      });

      stopAll();
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, [stopAll]);

  return {
    initAudio,
    playNote,
    stopNote,
    stopAll,
    setInstrument,
    setReverbMix,
    setVolume,
    isInitialized,
  };
}

export { INSTRUMENT_PRESETS };
