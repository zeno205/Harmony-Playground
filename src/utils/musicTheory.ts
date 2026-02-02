
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export type Note = typeof NOTES[number];
export type Mode = 'major' | 'minor';

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10]; // Natural minor

const MAJOR_CHORD_TYPES = ['Maj', 'min', 'min', 'Maj', 'Maj', 'min', 'dim'] as const;
const MINOR_CHORD_TYPES = ['min', 'dim', 'Maj', 'min', 'min', 'Maj', 'Maj'] as const;

const MAJOR_ROMAN = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'] as const;
const MINOR_ROMAN = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'] as const;

export interface ChordInfo {
  degree: number;
  name: string;
  roman: string;
  rootMidi: number;   // Root note as MIDI number
  notes: number[];    // MIDI notes (basic triad for visualization)
  type: 'Maj' | 'min' | 'dim';
  shortcut: string;
}

export function noteToMidi(note: Note, octave: number): number {
  const index = NOTES.indexOf(note);
  if (index === -1) throw new Error(`Invalid note: ${note}`);
  return octave * 12 + index;
}

export function midiToNote(midi: number): { note: Note; octave: number } {
  const octave = Math.floor(midi / 12);
  const note = NOTES[midi % 12];
  return { note, octave };
}

// Generate consistent chord ID for diatonic chords: {NoteName}-{Type}
// Example: "C-Maj", "D-min", "B-dim"
export function getChordId(chord: ChordInfo): string {
  const { note } = midiToNote(chord.rootMidi);
  return `${note}-${chord.type}`;
}

export function getDiatonicChords(root: Note, mode: Mode): ChordInfo[] {
  const rootIndex = NOTES.indexOf(root);
  const intervals = mode === 'major' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
  const chordTypes = mode === 'major' ? MAJOR_CHORD_TYPES : MINOR_CHORD_TYPES;
  const romanNumerals = mode === 'major' ? MAJOR_ROMAN : MINOR_ROMAN;

  return intervals.map((interval, degree) => {
    const noteIndex = (rootIndex + interval) % 12;
    const noteName = NOTES[noteIndex];
    const type = chordTypes[degree] as 'Maj' | 'min' | 'dim';
    const roman = romanNumerals[degree];

    // Root in octave 4 (middle C area) - voicings will adjust per instrument
    const chordRoot = noteToMidi(noteName as Note, 4);
    
    // Basic triad intervals for visualization on piano keyboard
    const third = type === 'min' || type === 'dim' ? 3 : 4;
    const fifth = type === 'dim' ? 6 : 7;
    const visualNotes = [chordRoot, chordRoot + third, chordRoot + fifth];

    return {
      degree,
      name: `${noteName} ${type}`,
      roman,
      rootMidi: chordRoot,
      notes: visualNotes, // Basic triad for keyboard display
      type,
      shortcut: (degree + 1).toString()
    };
  });
}

export const AVAILABLE_KEYS: Note[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

// Return note name variants for a given note index (0-11)
export function getNoteNameVariants(index: number): { sharp: string; flat: string } {
  const sharpNames = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
  const flatNames =  ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B'];
  const i = ((index % 12) + 12) % 12;
  return { sharp: sharpNames[i], flat: flatNames[i] };
}
