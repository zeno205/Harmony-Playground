/**
 * Chord Library System
 * 
 * Provides extended chord definitions beyond diatonic triads.
 * Supports 17 chord types across 12 roots (204 total chords).
 * 
 * Architecture:
 * - ExtendedChordType: Union of all supported chord types
 * - ChordTypeDefinition: Interval and metadata for each type
 * - ExtendedChordInfo: Full chord specification with root, type, intervals
 * - generateChordLibrary(): Creates all 204 chord variants
 */

import type { Note } from './musicTheory';
import { noteToMidi } from './musicTheory';

const NOTES: Note[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Extended chord types (17 total)
export type ExtendedChordType =
  // Triads
  | 'Maj' | 'min' | 'dim' | 'aug'
  // Seventh chords
  | '7' | 'maj7' | 'min7' | 'dim7' | 'min7b5'
  // Suspended
  | 'sus2' | 'sus4' | '7sus4'
  // Extensions & additions
  | 'add9' | '6' | 'min6' | '9' | 'maj9';

// Chord type definition with intervals and display info
export interface ChordTypeDefinition {
  type: ExtendedChordType;
  name: string;              // Full name (e.g., "Major Seventh")
  shortName: string;         // Compact name (e.g., "maj7")
  intervals: number[];       // Semitone intervals from root
  category: 'triad' | 'seventh' | 'extended' | 'suspended';
}

// Complete chord information for library
export interface ExtendedChordInfo {
  id: string;                // Unique identifier (e.g., "C-maj7")
  root: Note;
  rootMidi: number;          // Root note at octave 4 (middle C = 60)
  type: ExtendedChordType;
  name: string;              // Full display name (e.g., "C maj7")
  shortName: string;         // Compact name for UI (e.g., "Cmaj7")
  intervals: number[];       // Semitone intervals from root
  category: 'triad' | 'seventh' | 'extended' | 'suspended';
}

// Chord type definitions with intervals
export const CHORD_TYPE_DEFINITIONS: Record<ExtendedChordType, ChordTypeDefinition> = {
  // Triads
  'Maj': {
    type: 'Maj',
    name: 'Major',
    shortName: '',
    intervals: [0, 4, 7],
    category: 'triad'
  },
  'min': {
    type: 'min',
    name: 'Minor',
    shortName: 'm',
    intervals: [0, 3, 7],
    category: 'triad'
  },
  'dim': {
    type: 'dim',
    name: 'Diminished',
    shortName: 'dim',
    intervals: [0, 3, 6],
    category: 'triad'
  },
  'aug': {
    type: 'aug',
    name: 'Augmented',
    shortName: 'aug',
    intervals: [0, 4, 8],
    category: 'triad'
  },

  // Seventh chords
  '7': {
    type: '7',
    name: 'Dominant Seventh',
    shortName: '7',
    intervals: [0, 4, 7, 10],
    category: 'seventh'
  },
  'maj7': {
    type: 'maj7',
    name: 'Major Seventh',
    shortName: 'maj7',
    intervals: [0, 4, 7, 11],
    category: 'seventh'
  },
  'min7': {
    type: 'min7',
    name: 'Minor Seventh',
    shortName: 'm7',
    intervals: [0, 3, 7, 10],
    category: 'seventh'
  },
  'dim7': {
    type: 'dim7',
    name: 'Diminished Seventh',
    shortName: 'dim7',
    intervals: [0, 3, 6, 9],
    category: 'seventh'
  },
  'min7b5': {
    type: 'min7b5',
    name: 'Half-Diminished Seventh',
    shortName: 'm7b5',
    intervals: [0, 3, 6, 10],
    category: 'seventh'
  },

  // Suspended
  'sus2': {
    type: 'sus2',
    name: 'Suspended 2nd',
    shortName: 'sus2',
    intervals: [0, 2, 7],
    category: 'suspended'
  },
  'sus4': {
    type: 'sus4',
    name: 'Suspended 4th',
    shortName: 'sus4',
    intervals: [0, 5, 7],
    category: 'suspended'
  },
  '7sus4': {
    type: '7sus4',
    name: 'Seventh Suspended 4th',
    shortName: '7sus4',
    intervals: [0, 5, 7, 10],
    category: 'suspended'
  },

  // Extensions & additions
  'add9': {
    type: 'add9',
    name: 'Add 9',
    shortName: 'add9',
    intervals: [0, 4, 7, 14],  // 14 = 9th in next octave
    category: 'extended'
  },
  '6': {
    type: '6',
    name: 'Major Sixth',
    shortName: '6',
    intervals: [0, 4, 7, 9],
    category: 'extended'
  },
  'min6': {
    type: 'min6',
    name: 'Minor Sixth',
    shortName: 'm6',
    intervals: [0, 3, 7, 9],
    category: 'extended'
  },
  '9': {
    type: '9',
    name: 'Dominant Ninth',
    shortName: '9',
    intervals: [0, 4, 7, 10, 14],
    category: 'extended'
  },
  'maj9': {
    type: 'maj9',
    name: 'Major Ninth',
    shortName: 'maj9',
    intervals: [0, 4, 7, 11, 14],
    category: 'extended'
  }
};

/**
 * Generate complete chord library with all roots and types.
 * Creates 204 chords (12 roots × 17 types).
 * 
 * @returns Array of all chord definitions
 */
export function generateChordLibrary(): ExtendedChordInfo[] {
  const library: ExtendedChordInfo[] = [];
  
  for (const root of NOTES) {
    const rootMidi = noteToMidi(root, 4); // Middle C octave
    
    for (const [typeKey, definition] of Object.entries(CHORD_TYPE_DEFINITIONS)) {
      const type = typeKey as ExtendedChordType;
      const id = `${root}-${type}`;
      const shortName = `${root}${definition.shortName}`;
      const name = `${root} ${definition.name}`;
      
      library.push({
        id,
        root,
        rootMidi,
        type,
        name,
        shortName,
        intervals: definition.intervals,
        category: definition.category
      });
    }
  }
  
  return library;
}

/**
 * Get all chord types in a specific category.
 */
export function getChordTypesByCategory(category: ChordTypeDefinition['category']): ExtendedChordType[] {
  return Object.values(CHORD_TYPE_DEFINITIONS)
    .filter(def => def.category === category)
    .map(def => def.type);
}

/**
 * Check if a chord is in the given key/mode.
 * Uses root-in-scale approach: chord shows if root is in scale degrees.
 * 
 * @param chordRoot - Root note of the chord
 * @param keyRoot - Root note of the key
 * @param mode - Major or minor scale
 * @returns true if chord root is in the scale
 */
export function isChordInKey(chordRoot: Note, keyRoot: Note, mode: 'major' | 'minor'): boolean {
  const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
  const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];
  
  const intervals = mode === 'major' ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
  const keyRootIndex = NOTES.indexOf(keyRoot);
  const chordRootIndex = NOTES.indexOf(chordRoot);
  
  // Calculate semitone distance from key root
  const distance = (chordRootIndex - keyRootIndex + 12) % 12;
  
  return intervals.includes(distance);
}

/**
 * Filter chord library by search query.
 * Searches in chord name and short name (case-insensitive).
 * 
 * @param library - Full chord library
 * @param query - Search string
 * @returns Filtered chord array
 */
export function searchChords(library: ExtendedChordInfo[], query: string): ExtendedChordInfo[] {
  if (!query.trim()) return library;
  
  const lowerQuery = query.toLowerCase().trim();
  
  return library.filter(chord =>
    chord.name.toLowerCase().includes(lowerQuery) ||
    chord.shortName.toLowerCase().includes(lowerQuery) ||
    chord.root.toLowerCase().includes(lowerQuery)
  );
}
