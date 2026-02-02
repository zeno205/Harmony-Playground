/**
 * Chord Voicings for Different Instruments
 *
 * NOTE: This simplified build currently implements only piano voicings.
 *
 * Each instrument has idiomatic voicings for accompanying singers (extensible):
 * - Piano: Left hand bass (root/5th), right hand close voicing or shell voicings
 * - Electric Piano: Jazz-influenced voicings, rootless voicings common
 * - Acoustic Guitar: Open position voicings mimicking standard guitar shapes
 * - Electric Guitar: Power chords or jazz voicings depending on context
 * - Organ: Wide voicings with sustained bass, often doubling octaves
 * - Strings: Orchestral spread voicings across multiple octaves
 * - Flute: Single melody notes or close harmony (limited polyphony)
 * - Synth Pad: Wide atmospheric voicings with octave spread
 * 
 * Supports 17 extended chord types for comprehensive accompaniment library.
 */

import { InstrumentType } from '../hooks/useAudio';
import type { ExtendedChordType } from './chordLibrary';

export type ChordType = ExtendedChordType;

interface VoicingResult {
  notes: number[];       // MIDI notes to play
  velocities?: number[]; // Optional per-note velocity (0-1)
}

/**
 * Returns idiomatic chord voicing for the given instrument
 *
 * EXTENSION POINT: Add new instrument voicing functions and add a case here.
 * New instruments should be explicitly handled; the default falls back to piano voicing.
 *
 * @param rootMidi - MIDI note number of the chord root (e.g., 60 = C4)
 * @param chordType - Type of chord (Maj, min, dim)
 * @param instrument - The instrument to voice for
 * @returns Array of MIDI note numbers representing the voicing
 */
export function getVoicingForInstrument(
  rootMidi: number,
  chordType: ChordType,
  instrument: InstrumentType
): VoicingResult {
  // Normalize root to octave 3 (C3 = 48) as base, adjust per instrument
  const baseOctave = 3;
  const root = (rootMidi % 12) + (baseOctave * 12);
  
  switch (instrument) {
    case 'piano':
      return getPianoVoicing(root, chordType);
    default:
      // Future instruments should be handled explicitly; fallback to piano voicing
      return getPianoVoicing(root, chordType);
  }
}

/**
 * Piano: Classic accompaniment voicing (left hand bass, right hand close voicing)
 * Implements idiomatic voicings for all 17 chord types.
 * 
 * Voicing strategy:
 * - Bass (LH): Root in octave 2 (C2-B2), sometimes with 5th
 * - Treble (RH): Spread voicing in octaves 4-5 for clarity
 * - Extended chords use shell voicings (omit 5th, keep color tones)
 */
function getPianoVoicing(root: number, chordType: ChordType): VoicingResult {
  // Normalize root to octave 3 as reference (C3 = 48)
  const rootInOctave3 = (root % 12) + 36;
  
  // Bass register (octave 2: C2 = 24)
  const bassRoot = rootInOctave3 - 12;
  
  switch (chordType) {
    // === TRIADS ===
    case 'Maj': {
      // C Major: C2, G2 | E4, G4, C5
      const bass5th = bassRoot + 7;
      const rhThird = rootInOctave3 + 4 + 12;
      const rhFifth = rootInOctave3 + 7 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhThird, rhFifth, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.6, 0.7]
      };
    }
    
    case 'min': {
      // C minor: C2, G2 | Eb4, G4, C5
      const bass5th = bassRoot + 7;
      const rhThird = rootInOctave3 + 3 + 12;
      const rhFifth = rootInOctave3 + 7 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhThird, rhFifth, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.6, 0.7]
      };
    }
    
    case 'dim': {
      // C diminished: C2, Gb2 | Eb4, Gb4, C5
      const bass5th = bassRoot + 6;
      const rhThird = rootInOctave3 + 3 + 12;
      const rhFifth = rootInOctave3 + 6 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhThird, rhFifth, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.6, 0.7]
      };
    }
    
    case 'aug': {
      // C augmented: C2, G#2 | E4, G#4, C5
      const bass5th = bassRoot + 8;
      const rhThird = rootInOctave3 + 4 + 12;
      const rhFifth = rootInOctave3 + 8 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhThird, rhFifth, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.6, 0.7]
      };
    }
    
    // === SEVENTH CHORDS ===
    case '7': {
      // Dominant 7th (C7): C2, G2 | E4, Bb4, C5
      // Shell voicing: 3rd and 7th (omit 5th for clarity)
      const bass5th = bassRoot + 7;
      const rhThird = rootInOctave3 + 4 + 12;
      const rhSeventh = rootInOctave3 + 10 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhThird, rhSeventh, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.75, 0.7]
      };
    }
    
    case 'maj7': {
      // Major 7th (Cmaj7): C2, G2 | E4, B4, C5
      const bass5th = bassRoot + 7;
      const rhThird = rootInOctave3 + 4 + 12;
      const rhSeventh = rootInOctave3 + 11 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhThird, rhSeventh, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.75, 0.7]
      };
    }
    
    case 'min7': {
      // Minor 7th (Cm7): C2, G2 | Eb4, Bb4, C5
      const bass5th = bassRoot + 7;
      const rhThird = rootInOctave3 + 3 + 12;
      const rhSeventh = rootInOctave3 + 10 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhThird, rhSeventh, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.75, 0.7]
      };
    }
    
    case 'dim7': {
      // Diminished 7th (Cdim7): C2 | Eb4, Gb4, A4, C5
      // Symmetrical voicing
      const rhThird = rootInOctave3 + 3 + 12;
      const rhFifth = rootInOctave3 + 6 + 12;
      const rhSeventh = rootInOctave3 + 9 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, rhThird, rhFifth, rhSeventh, rhRoot],
        velocities: [0.7, 0.8, 0.75, 0.75, 0.7]
      };
    }
    
    case 'min7b5': {
      // Half-diminished (Cm7b5): C2, Gb2 | Eb4, Bb4, C5
      const bass5th = bassRoot + 6;
      const rhThird = rootInOctave3 + 3 + 12;
      const rhSeventh = rootInOctave3 + 10 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhThird, rhSeventh, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.75, 0.7]
      };
    }
    
    // === SUSPENDED ===
    case 'sus2': {
      // Suspended 2nd (Csus2): C2, G2 | D4, G4, C5
      const bass5th = bassRoot + 7;
      const rhSecond = rootInOctave3 + 2 + 12;
      const rhFifth = rootInOctave3 + 7 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhSecond, rhFifth, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.6, 0.7]
      };
    }
    
    case 'sus4': {
      // Suspended 4th (Csus4): C2, G2 | F4, G4, C5
      const bass5th = bassRoot + 7;
      const rhFourth = rootInOctave3 + 5 + 12;
      const rhFifth = rootInOctave3 + 7 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhFourth, rhFifth, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.6, 0.7]
      };
    }
    
    case '7sus4': {
      // 7th suspended 4th (C7sus4): C2, G2 | F4, Bb4, C5
      const bass5th = bassRoot + 7;
      const rhFourth = rootInOctave3 + 5 + 12;
      const rhSeventh = rootInOctave3 + 10 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhFourth, rhSeventh, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.75, 0.7]
      };
    }
    
    // === EXTENSIONS ===
    case 'add9': {
      // Add 9 (Cadd9): C2, G2 | D4, E4, G4, C5
      // Include 9th in upper voicing
      const bass5th = bassRoot + 7;
      const rhNinth = rootInOctave3 + 2 + 12;
      const rhThird = rootInOctave3 + 4 + 12;
      const rhFifth = rootInOctave3 + 7 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhNinth, rhThird, rhFifth, rhRoot],
        velocities: [0.7, 0.5, 0.75, 0.8, 0.6, 0.7]
      };
    }
    
    case '6': {
      // Major 6th (C6): C2, G2 | E4, A4, C5
      const bass5th = bassRoot + 7;
      const rhThird = rootInOctave3 + 4 + 12;
      const rhSixth = rootInOctave3 + 9 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhThird, rhSixth, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.75, 0.7]
      };
    }
    
    case 'min6': {
      // Minor 6th (Cm6): C2, G2 | Eb4, A4, C5
      const bass5th = bassRoot + 7;
      const rhThird = rootInOctave3 + 3 + 12;
      const rhSixth = rootInOctave3 + 9 + 12;
      const rhRoot = rootInOctave3 + 24;
      return {
        notes: [bassRoot, bass5th, rhThird, rhSixth, rhRoot],
        velocities: [0.7, 0.5, 0.8, 0.75, 0.7]
      };
    }
    
    case '9': {
      // Dominant 9th (C9): C2, G2 | E4, Bb4, D5
      // Extended voicing with 9th on top
      const bass5th = bassRoot + 7;
      const rhThird = rootInOctave3 + 4 + 12;
      const rhSeventh = rootInOctave3 + 10 + 12;
      const rhNinth = rootInOctave3 + 14 + 12;
      return {
        notes: [bassRoot, bass5th, rhThird, rhSeventh, rhNinth],
        velocities: [0.7, 0.5, 0.8, 0.75, 0.75]
      };
    }
    
    case 'maj9': {
      // Major 9th (Cmaj9): C2, G2 | E4, B4, D5
      const bass5th = bassRoot + 7;
      const rhThird = rootInOctave3 + 4 + 12;
      const rhSeventh = rootInOctave3 + 11 + 12;
      const rhNinth = rootInOctave3 + 14 + 12;
      return {
        notes: [bassRoot, bass5th, rhThird, rhSeventh, rhNinth],
        velocities: [0.7, 0.5, 0.8, 0.75, 0.75]
      };
    }
    
    default:
      // Fallback to simple major triad
      return getDefaultVoicing(rootInOctave3, 'Maj');
  }
}

/**
 * Default fallback voicing: simple close-position triad
 */
function getDefaultVoicing(root: number, chordType: ChordType): VoicingResult {
  const third = chordType === 'min' || chordType === 'dim' || chordType === 'min7' || chordType === 'min7b5' || chordType === 'min6' ? 3 : 4;
  const fifth = chordType === 'dim' || chordType === 'min7b5' || chordType === 'dim7' ? 6 : 7;
  
  return {
    notes: [root, root + third, root + fifth],
    velocities: [0.8, 0.8, 0.8]
  };
}

/**
 * Apply custom voicing if it exists, otherwise use default instrument voicing.
 * 
 * @param chordId - Unique chord identifier (e.g., "C-maj7")
 * @param customVoicings - Map of chord IDs to custom MIDI note arrays
 * @param rootMidi - Root note MIDI number
 * @param chordType - Chord type
 * @param instrument - Instrument for default voicing
 * @returns Voicing result with notes and optional velocities
 */
export function applyCustomVoicing(
  chordId: string,
  customVoicings: Map<string, number[]>,
  rootMidi: number,
  chordType: ChordType,
  instrument: InstrumentType
): VoicingResult {
  // Check if custom voicing exists
  const customNotes = customVoicings.get(chordId);
  if (customNotes && customNotes.length > 0) {
    return {
      notes: customNotes,
      // Generate even velocities for custom voicings
      velocities: customNotes.map(() => 0.75)
    };
  }
  
  // Fall back to default instrument voicing
  return getVoicingForInstrument(rootMidi, chordType, instrument);
}
