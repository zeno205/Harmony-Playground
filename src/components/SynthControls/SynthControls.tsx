
import React from 'react';
import { Piano } from 'lucide-react';
import { InstrumentType, INSTRUMENT_PRESETS } from '../../hooks/useAudio';
import './SynthControls.css';

interface SynthControlsProps {
  instrument: InstrumentType;
  reverbMix: number;
  volume: number;
  onInstrumentChange: (instrument: InstrumentType) => void;
  onReverbChange: (mix: number) => void;
  onVolumeChange: (volume: number) => void;
  displayMode?: 'sharp' | 'flat' | 'both';
  onDisplayModeChange?: (mode: 'sharp' | 'flat' | 'both') => void;
}

/**
 * Instrument options for the UI.
 * EXTENSION POINT: To add a new instrument, add an entry here and ensure a corresponding
 * preset exists in `src/hooks/useAudio.ts` and a voicing in `src/utils/chordVoicings.ts`.
 */
const INSTRUMENTS: { value: InstrumentType; label: string; icon: React.ReactNode }[] = [
  { value: 'piano', label: 'Piano', icon: <Piano size={18} /> },
];

export const SynthControls: React.FC<SynthControlsProps> = ({
  instrument,
  reverbMix,
  volume,
  onInstrumentChange,
  onReverbChange,
  onVolumeChange,
  displayMode = 'sharp',
  onDisplayModeChange
}) => {
  return (
    <div className="synth-controls">
      <div className="control-group">
        <label>Instrument</label>
        <div className="instrument-buttons">
          {INSTRUMENTS.map(inst => (
            <button
              key={inst.value}
              className={`instrument-btn ${instrument === inst.value ? 'active' : ''}`}
              onClick={() => onInstrumentChange(inst.value)}
              title={INSTRUMENT_PRESETS[inst.value].name}
            >
              <span className="inst-icon">{inst.icon}</span>
              <span className="inst-label">{inst.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="control-group audio-controls">
        <div className="audio-control-item">
          <label>Reverb</label>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="100"
              value={reverbMix * 100}
              onChange={(e) => onReverbChange(parseInt(e.target.value, 10) / 100)}
              className="reverb-slider"
            />
            <span className="slider-value">{Math.round(reverbMix * 100)}%</span>
          </div>
        </div>

        <div className="audio-control-item">
          <label>Volume</label>
          <div className="slider-container">
            <input
              type="range"
              min="0"
              max="150"
              value={volume * 100}
              onChange={(e) => onVolumeChange(parseInt(e.target.value, 10) / 100)}
              className="volume-slider"
            />
            <span className="slider-value">{Math.round(volume * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="control-group">
        <label>Chord Labels</label>
        <div className="display-mode">
          <button
            className={`display-btn ${displayMode === 'sharp' ? 'active' : ''}`}
            onClick={() => onDisplayModeChange && onDisplayModeChange('sharp')}
            title="Show sharp names"
          >
            #
          </button>
          <button
            className={`display-btn ${displayMode === 'flat' ? 'active' : ''}`}
            onClick={() => onDisplayModeChange && onDisplayModeChange('flat')}
            title="Show flat names"
          >
            b
          </button>
          <button
            className={`display-btn ${displayMode === 'both' ? 'active' : ''}`}
            onClick={() => onDisplayModeChange && onDisplayModeChange('both')}
            title="Show both sharp and flat names"
          >
            # / b
          </button>
        </div>
      </div>
    </div>
  );
};
