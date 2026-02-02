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

// Black key pattern (true = black key, false = white key)
// Pattern repeats every octave: C, C#, D, D#, E, F, F#, G, G#, A, A#, B
const BLACK_KEY_PATTERN = [false, true, false, true, false, false, true, false, true, false, true, false];

// Note names for display
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

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
  return BLACK_KEY_PATTERN[noteIndex];
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
  const keys = [];
  for (let midi = KEYBOARD_START; midi <= KEYBOARD_END; midi++) {
    const isBlack = isBlackKey(midi);
    const isSelected = selectedNotes.includes(midi);
    const noteName = getMidiNoteName(midi);
    
    keys.push({
      midi,
      isBlack,
      isSelected,
      noteName
    });
  }
  
  // Separate white and black keys for layering
  const whiteKeys = keys.filter(k => !k.isBlack);
  const blackKeys = keys.filter(k => k.isBlack);
  
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
              <button
                key={key.midi}
                className={`voicing-editor-key voicing-editor-white-key ${key.isSelected ? 'selected' : ''}`}
                onClick={() => handleNoteToggle(key.midi)}
                title={key.noteName}
              >
                {/* Show note name on C notes for orientation */}
                {key.noteName.startsWith('C') && (
                  <span className="voicing-editor-key-label">{key.noteName}</span>
                )}
              </button>
            ))}
          </div>
          
          {/* Black keys layer (positioned absolutely) */}
          <div className="voicing-editor-black-keys">
            {blackKeys.map(key => {
              // Calculate position based on white key offset
              const whiteKeyIndex = whiteKeys.findIndex(wk => wk.midi > key.midi) - 1;
              const leftOffset = whiteKeyIndex * (100 / whiteKeys.length);
              
              return (
                <button
                  key={key.midi}
                  className={`voicing-editor-key voicing-editor-black-key ${key.isSelected ? 'selected' : ''}`}
                  style={{ left: `${leftOffset + (100 / whiteKeys.length / 2)}%` }}
                  onClick={() => handleNoteToggle(key.midi)}
                  title={key.noteName}
                />
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
