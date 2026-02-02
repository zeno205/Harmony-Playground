
import React from 'react';
import { Note, Mode, AVAILABLE_KEYS } from '../../utils/musicTheory';
import './PianoKeyboard.css';

interface PianoKeyboardProps {
  activeNotes: number[];
  selectedKey: Note;
  mode: Mode;
}

const START_NOTE = 36; // C2 (Extended visuals for lower bass)
const END_NOTE = 84;   // C6 (Extended visuals for high partials)

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11]; // C, D, E, F, G, A, B

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({
  activeNotes,
  selectedKey,
  mode
}) => {
  const keys: { midi: number; isBlack: boolean; note: string; octave: number }[] = [];
  
  for (let i = START_NOTE; i <= END_NOTE; i++) {
    const noteClass = i % 12;
    keys.push({
      midi: i,
      isBlack: !WHITE_KEYS.includes(noteClass),
      note: NOTE_NAMES[noteClass],
      octave: Math.floor(i / 12)
    });
  }

  const whiteKeys = keys.filter((k) => !k.isBlack);
  const blackKeys = keys.filter((k) => k.isBlack);

  const rootIdx = AVAILABLE_KEYS.indexOf(selectedKey);
  const intervals = mode === 'major' ? [0, 2, 4, 5, 7, 9, 11] : [0, 2, 3, 5, 7, 8, 10];
  const scaleNotes = intervals.map((i) => (rootIdx + i) % 12);

  const getKeyState = (midi: number) => {
    const isPlayed = activeNotes.includes(midi);
    const noteClass = midi % 12;
    const isInScale = scaleNotes.includes(noteClass);
    return { isPlayed, isInScale };
  };

  const getBlackKeyPosition = (midi: number) => {
    const noteClass = midi % 12;
    const octaveStart = Math.floor(midi / 12) * 12;
    const octaveOffset = midi >= START_NOTE ? (octaveStart - START_NOTE) / 12 : 0;
    
    const blackKeyPositions: { [key: number]: number } = {
      1: 0.75,   // C#
      3: 1.75,   // D#
      6: 3.75,   // F#
      8: 4.75,   // G#
      10: 5.75,  // A#
    };
    
    const posInOctave = blackKeyPositions[noteClass] || 0;
    const whiteKeysPerOctave = 7;
    const totalWhiteKeys = whiteKeys.length;
    const keyWidth = 100 / totalWhiteKeys;
    
    return (octaveOffset * whiteKeysPerOctave + posInOctave) * keyWidth;
  };

  return (
    <div className="piano-wrapper">
      <div className="piano-keyboard">
        <div className="white-keys">
          {whiteKeys.map((key) => {
            const { isPlayed, isInScale } = getKeyState(key.midi);
            return (
              <div
                key={key.midi}
                className={`piano-key white ${isPlayed ? 'played' : ''} ${isInScale && !isPlayed ? 'in-scale' : ''}`}
              >
                <span className="key-label">
                  {key.note}
                  {key.octave}
                </span>
              </div>
            );
          })}
        </div>
        <div className="black-keys">
          {blackKeys.map((key) => {
            const { isPlayed, isInScale } = getKeyState(key.midi);
            const left = getBlackKeyPosition(key.midi);
            return (
              <div
                key={key.midi}
                className={`piano-key black ${isPlayed ? 'played' : ''} ${isInScale && !isPlayed ? 'in-scale' : ''}`}
                style={{ left: `${left}%` }}
              >
                <span className="key-label">{key.note}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
