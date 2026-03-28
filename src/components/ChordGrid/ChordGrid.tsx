
import React from 'react';
import { ChordInfo, getNoteNameVariants } from '../../utils/musicTheory';
import { ExtendedChordInfo } from '../../utils/chordLibrary';
import './ChordGrid.css';

interface ChordGridProps {
  chords: ChordInfo[];
  activeChord: number | null;
  activeCustomChord: number | null;
  displayMode?: 'sharp' | 'flat' | 'both';
  additionalChords: ExtendedChordInfo[];
  onChordClick: (chord: ChordInfo) => void;
  onChordMouseDown: (chord: ChordInfo) => void;
  onChordMouseUp: () => void;
  onRemoveAdditionalChord: (index: number) => void;
  onAdditionalChordClick: (chord: ExtendedChordInfo) => void;
  keyBindings?: Map<string, string>;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const CHORD_COLORS = [
  { bg: '#14b8a6', surface: 'rgba(20, 184, 166, 0.10)', border: 'rgba(20, 184, 166, 0.44)' },
  { bg: '#3b82f6', surface: 'rgba(59, 130, 246, 0.10)', border: 'rgba(59, 130, 246, 0.44)' },
  { bg: '#06b6d4', surface: 'rgba(6, 182, 212, 0.10)', border: 'rgba(6, 182, 212, 0.44)' },
  { bg: '#10b981', surface: 'rgba(16, 185, 129, 0.10)', border: 'rgba(16, 185, 129, 0.44)' },
  { bg: '#f59e0b', surface: 'rgba(245, 158, 11, 0.10)', border: 'rgba(245, 158, 11, 0.44)' },
  { bg: '#ef4444', surface: 'rgba(239, 68, 68, 0.10)', border: 'rgba(239, 68, 68, 0.44)' },
  { bg: '#ec4899', surface: 'rgba(236, 72, 153, 0.10)', border: 'rgba(236, 72, 153, 0.44)' },
];

// Colors for additional custom chords
const ADDITIONAL_CHORD_COLORS = [
  { bg: '#8b5cf6', surface: 'rgba(139, 92, 246, 0.10)', border: 'rgba(139, 92, 246, 0.44)' },
  { bg: '#14b8a6', surface: 'rgba(20, 184, 166, 0.10)', border: 'rgba(20, 184, 166, 0.44)' },
  { bg: '#f97316', surface: 'rgba(249, 115, 22, 0.10)', border: 'rgba(249, 115, 22, 0.44)' },
  { bg: '#e11d48', surface: 'rgba(225, 29, 72, 0.10)', border: 'rgba(225, 29, 72, 0.44)' },
  { bg: '#0ea5e9', surface: 'rgba(14, 165, 233, 0.10)', border: 'rgba(14, 165, 233, 0.44)' },
];

export const ChordGrid: React.FC<ChordGridProps> = ({
  chords,
  activeChord,
  activeCustomChord,
  displayMode = 'sharp',
  additionalChords,
  onChordClick,
  onChordMouseDown,
  onChordMouseUp,
  onRemoveAdditionalChord,
  onAdditionalChordClick,
  keyBindings = new Map()
}) => {
  return (
    <div className="chord-grid-container">
      {/* Diatonic chords (1-7) */}
      <div className="chord-grid">
        {chords.map((chord, index) => {
          const isActive = activeChord === index;
          const color = CHORD_COLORS[index];
          const slotId = `diatonic-${index}`;
          
          return (
            <button
              key={chord.degree}
              className={`chord-card ${isActive ? 'active' : ''}`}
              style={{
                '--chord-color': color.bg,
                '--chord-surface': color.surface,
                '--chord-border': color.border,
              } as React.CSSProperties}
              onMouseDown={() => onChordMouseDown(chord)}
              onMouseUp={onChordMouseUp}
              onMouseLeave={onChordMouseUp}
              onTouchStart={() => onChordMouseDown(chord)}
              onTouchEnd={onChordMouseUp}
            >
              <div className="chord-degree">{chord.degree + 1}</div>
              <div className="chord-roman">{chord.roman}</div>
              <div className="chord-name">
                {(() => {
                  const rootIndex = chord.rootMidi % 12;
                  const variants = getNoteNameVariants(rootIndex);
                  const typeLabel = chord.type;
                  if (displayMode === 'flat') return `${variants.flat} ${typeLabel}`;
                  if (displayMode === 'both') return `${variants.sharp} / ${variants.flat} ${typeLabel}`;
                  // default sharp
                  return `${variants.sharp} ${typeLabel}`;
                })()}
              </div>
              <div className="chord-notes">
                {chord.notes.map(n => NOTE_NAMES[n % 12]).join(' · ')}
              </div>
              <div className="chord-shortcut">
                <kbd>{keyBindings.get(slotId) || '\u2014'}</kbd>
              </div>
            </button>
          );
        })}
      </div>

      {/* Additional custom chords (8, 9, 0, -, =) */}
      {additionalChords.length > 0 && (
        <div className="additional-chords-section">
          <div className="additional-chords-label">Custom Chords</div>
          <div className="additional-chords-grid">
            {additionalChords.map((chord, index) => {
              const color = ADDITIONAL_CHORD_COLORS[index];
              const isActive = activeCustomChord === index;
              const slotId = `custom-${index}`;
              return (
                <div
                  key={chord.id}
                  className={`chord-card additional-chord ${isActive ? 'active' : ''}`}
                  style={{
                    '--chord-color': color.bg,
                    '--chord-surface': color.surface,
                    '--chord-border': color.border,
                    cursor: 'pointer'
                  } as React.CSSProperties}
                  onMouseDown={() => onAdditionalChordClick(chord)}
                  onMouseUp={onChordMouseUp}
                  onMouseLeave={onChordMouseUp}
                  onTouchStart={() => onAdditionalChordClick(chord)}
                  onTouchEnd={onChordMouseUp}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      onAdditionalChordClick(chord);
                    }
                  }}
                >
                  <button
                    className="remove-custom-chord"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onRemoveAdditionalChord(index);
                    }}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onRemoveAdditionalChord(index);
                    }}
                    onClick={(e) => {
                      // Prevent click bubbling as a safety net
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.stopPropagation();
                        e.preventDefault();
                        onRemoveAdditionalChord(index);
                      }
                    }}
                    title="Remove chord"
                    aria-label={`Remove ${chord.shortName}`}
                  >
                    Remove
                  </button>
                  <div className="chord-name">{chord.shortName}</div>
                  <div className="chord-notes">
                    {chord.intervals.map(i => {
                      const noteIndex = (chord.rootMidi + i) % 12;
                      return NOTE_NAMES[noteIndex];
                    }).join(' · ')}
                  </div>
                  <div className="chord-shortcut">
                    <kbd>{keyBindings.get(slotId) || '\u2014'}</kbd>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
