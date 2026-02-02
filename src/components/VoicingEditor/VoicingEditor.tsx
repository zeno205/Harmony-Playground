/**
 * VoicingEditor Component
 * 
 * Allows users to manually select notes for custom chord voicings.
 * Displays a piano keyboard (C2-C6, 49 keys) with clickable note selection.
 * 
 * Features:
 * - Visual piano keyboard with white and black keys
 * - Toggle notes on/off by clicking
 * - Selected notes highlighted
 * - Reset to default voicing button
 * - Displays current chord name
 */

import React from 'react';
import './VoicingEditor.css';

interface VoicingEditorProps {
  chordName: string;              // Display name (e.g., "C maj7")
  selectedNotes: number[];        // Currently selected MIDI notes
  defaultNotes: number[];         // Default voicing for reset
  onNotesChange: (notes: number[]) => void;
  onReset: () => void;
}

// Piano keyboard range: C2 (MIDI 36) to C6 (MIDI 84) = 49 keys
const KEYBOARD_START = 36; // C2
const KEYBOARD_END = 84;   // C6

// Note names for display
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B

/**
 * Get note name with octave from MIDI number
 */
function getMidiNoteName(midi: number): string {
  const noteIndex = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[noteIndex]}${octave}`;
}

/**
 * Check if a MIDI note is a black key
 */
function isBlackKey(midi: number): boolean {
  const noteIndex = midi % 12;
  return !WHITE_KEYS.includes(noteIndex);
}

export default function VoicingEditor({
  chordName,
  selectedNotes,
  defaultNotes,
  onNotesChange,
  onReset
}: VoicingEditorProps) {
  
  const handleNoteToggle = (midi: number) => {
    if (selectedNotes.includes(midi)) {
      // Remove note
      onNotesChange(selectedNotes.filter(n => n !== midi));
    } else {
      // Add note (keep sorted)
      const newNotes = [...selectedNotes, midi].sort((a, b) => a - b);
      onNotesChange(newNotes);
    }
  };
  
  const handleResetToDefault = () => {
    onReset();
  };
  
  // Generate keyboard keys
  const keys: { midi: number; isBlack: boolean; isSelected: boolean; noteName: string; octave: number }[] = [];
  for (let midi = KEYBOARD_START; midi <= KEYBOARD_END; midi++) {
    const isBlack = isBlackKey(midi);
    const isSelected = selectedNotes.includes(midi);
    const noteName = getMidiNoteName(midi);
    const octave = Math.floor(midi / 12) - 1;
    
    keys.push({
      midi,
      isBlack,
      isSelected,
      noteName,
      octave
    });
  }
  
  // Separate white and black keys for layering
  const whiteKeys = keys.filter(k => !k.isBlack);
  const blackKeys = keys.filter(k => k.isBlack);
  const totalWhiteKeys = whiteKeys.length;
  const keyWidthPct = 100 / totalWhiteKeys;
  const blackKeyWidthPct = keyWidthPct * 0.6;
  
  // Calculate black key position (matching PianoKeyboard logic)
  const getBlackKeyPosition = (midi: number) => {
    const noteClass = midi % 12;
    const octaveStart = Math.floor(midi / 12) * 12;
    const octaveOffset = midi >= KEYBOARD_START ? (octaveStart - KEYBOARD_START) / 12 : 0;
    
    // Black keys positioned at boundaries between white keys
    const blackKeyPositions: { [key: number]: number } = {
      1: 1,   // C# (between C and D)
      3: 2,   // D# (between D and E)
      6: 4,   // F# (between F and G)
      8: 5,   // G# (between G and A)
      10: 6,  // A# (between A and B)
    };
    
    const posInOctave = blackKeyPositions[noteClass] || 0;
    const whiteKeysPerOctave = 7;
    return (octaveOffset * whiteKeysPerOctave + posInOctave) * keyWidthPct;
  };
  
  return (
    <div className="voicing-editor">
      <div className="voicing-editor-header">
        <div className="voicing-editor-title">
          <h3>Custom Voicing</h3>
          <span className="voicing-editor-chord-name">{chordName}</span>
        </div>
        <button 
          className="voicing-editor-reset-btn"
          onClick={handleResetToDefault}
          disabled={defaultNotes.length === 0}
        >
          Reset to Default
        </button>
      </div>
      
      <div className="voicing-editor-info">
        <p>Click keys to add/remove notes from voicing</p>
        <div className="voicing-editor-selected-count">
          {selectedNotes.length} note{selectedNotes.length !== 1 ? 's' : ''} selected
        </div>
      </div>
      
      <div className="voicing-editor-keyboard-container">
        <div className="voicing-editor-keyboard">
          {/* White keys layer */}
          <div className="voicing-editor-white-keys">
            {whiteKeys.map(key => (
              <div
                key={key.midi}
                className={`voicing-editor-key voicing-editor-white-key ${key.isSelected ? 'selected' : ''}`}
                onClick={() => handleNoteToggle(key.midi)}
                title={key.noteName}
              >
                <span className="voicing-editor-key-label">
                  {key.noteName}
                </span>
              </div>
            ))}
          </div>
          
          {/* Black keys layer (positioned absolutely) */}
          <div className="voicing-editor-black-keys">
            {blackKeys.map(key => {
              const left = getBlackKeyPosition(key.midi);
              return (
                <div
                  key={key.midi}
                  className={`voicing-editor-key voicing-editor-black-key ${key.isSelected ? 'selected' : ''}`}
                  style={{ left: `${left}%`, width: `${blackKeyWidthPct}%` }}
                  onClick={() => handleNoteToggle(key.midi)}
                  title={key.noteName}
                >
                  <span className="voicing-editor-key-label">{NOTE_NAMES[key.midi % 12]}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      
      <div className="voicing-editor-selected-notes">
        <strong>Selected notes:</strong>{' '}
        {selectedNotes.length > 0 ? (
          selectedNotes.map(getMidiNoteName).join(', ')
        ) : (
          <span className="voicing-editor-empty">No notes selected</span>
        )}
      </div>
    </div>
  );
}
