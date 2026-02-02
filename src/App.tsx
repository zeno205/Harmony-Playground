
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Library } from 'lucide-react';
import { Note, Mode, ChordInfo, getDiatonicChords, AVAILABLE_KEYS, getChordId } from './utils/musicTheory';
import { useAudio, InstrumentType } from './hooks/useAudio';
import { getVoicingForInstrument, ChordType, applyCustomVoicing } from './utils/chordVoicings';
import { ExtendedChordInfo } from './utils/chordLibrary';
import { PianoKeyboard } from './components/PianoKeyboard/PianoKeyboard';
import { ChordGrid } from './components/ChordGrid/ChordGrid';
import { KeySelector } from './components/KeySelector/KeySelector';
import { SynthControls } from './components/SynthControls/SynthControls';
import ChordLibraryModal from './components/ChordLibraryModal/ChordLibraryModal';
import VoicingEditorModal from './components/VoicingEditorModal/VoicingEditorModal';
import { EditModeToolbar } from './components/EditModeToolbar/EditModeToolbar';
import { EditModeProvider, useEditMode } from './contexts/EditModeContext';
import { persistence } from './utils/persistence';
import './App.css';

const STORAGE_KEY = 'chordAppSettings';

interface AppSettings {
  key: Note;
  mode: Mode;
  instrument: InstrumentType;
  reverbMix: number;
  volume: number;
  customVoicings?: Record<string, number[]>; // Map serialized as object
  additionalChords?: ExtendedChordInfo[]; // Extra custom chords (slots 8, 9, 0, etc.)
  keyBindings?: Record<string, string>; // Map of slotId -> key (e.g., "diatonic-0" -> "1")
}

// Generate default key bindings based on slot positions (not chord IDs)
function generateDefaultKeyBindings(): Map<string, string> {
  const bindings = new Map<string, string>();
  
  // Diatonic slots 0-6: keys 1-7
  for (let i = 0; i < 7; i++) {
    bindings.set(`diatonic-${i}`, (i + 1).toString());
  }
  
  // Custom chord slots: keys 8, 9, 0, -, =
  const additionalKeys = ['8', '9', '0', '-', '='];
  additionalKeys.forEach((key, index) => {
    bindings.set(`custom-${index}`, key);
  });
  
  return bindings;
}

function AppContent() {
  const { isEditingVoicing, isEditingKeybinding, setEditMode } = useEditMode();
  const [selectedKey, setSelectedKey] = useState<Note>('C');
  const [mode, setMode] = useState<Mode>('major');
  const [chords, setChords] = useState<ChordInfo[]>([]);
  const [activeChord, setActiveChord] = useState<number | null>(null);
  const [activeCustomChord, setActiveCustomChord] = useState<number | null>(null);
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  const [instrument, setInstrument] = useState<InstrumentType>('piano');
  const [reverbMix, setReverbMix] = useState(0.2);
  const [volume, setVolume] = useState(1.0);
  const [isLoaded, setIsLoaded] = useState(false);
  // Chord label display mode: 'sharp' | 'flat' | 'both'
  const [chordLabelMode, setChordLabelMode] = useState<'sharp'|'flat'|'both'>('sharp');
  
  // Chord library modal state
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [customVoicings, setCustomVoicings] = useState<Map<string, number[]>>(new Map());
  // Additional custom chords (up to 5 extra slots: keys 8, 9, 0, -, =)
  const [additionalChords, setAdditionalChords] = useState<ExtendedChordInfo[]>([]);
  
  // Keybinding state: maps chord ID to keyboard key
  const [keyBindings, setKeyBindings] = useState<Map<string, string>>(new Map());
  // Rebinding state: which chord is currently being rebound
  const [rebindingChordId, setRebindingChordId] = useState<string | null>(null);
  // Voicing editor state: which chord is currently being edited
  const [editingVoicingChordId, setEditingVoicingChordId] = useState<string | null>(null);
  const [editingVoicingData, setEditingVoicingData] = useState<{
    chordName: string;
    currentNotes: number[];
    defaultNotes: number[];
  } | null>(null);

  const {
    initAudio,
    playNote,
    stopNote,
    stopAll,
    setInstrument: setAudioInstrument,
    setReverbMix: setAudioReverbMix,
    setVolume: setAudioVolume,
    isInitialized
  } = useAudio();

  const activeChordRef = useRef<ChordInfo | null>(null);
  const playingNotesRef = useRef<number[]>([]); // Actual notes being played (instrument voicing)
  const isPlayingRef = useRef(false);
  const playTimeoutsRef = useRef<number[]>([]);
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const clearPendingTimeouts = useCallback(() => {
    playTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
    playTimeoutsRef.current = [];
  }, []);

  // Load saved settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const saved = await persistence.getItem(STORAGE_KEY);
        if (saved) {
          const settings: AppSettings = JSON.parse(saved);
          if (AVAILABLE_KEYS.includes(settings.key)) {
            setSelectedKey(settings.key);
          }
          if (['major', 'minor'].includes(settings.mode)) {
            setMode(settings.mode as Mode);
          }
          if (settings.instrument) {
            setInstrument(settings.instrument);
          }
          if (settings.reverbMix !== undefined) {
            setReverbMix(settings.reverbMix);
          }
          if (settings.volume !== undefined) {
            setVolume(settings.volume);
          }
          if (settings.customVoicings) {
            // Deserialize custom voicings from object to Map
            const voicingsMap = new Map<string, number[]>(
              Object.entries(settings.customVoicings)
            );
            setCustomVoicings(voicingsMap);
          }
          if (settings.additionalChords && Array.isArray(settings.additionalChords)) {
            setAdditionalChords(settings.additionalChords);
          }
          if (settings.keyBindings) {
            // Deserialize key bindings from object to Map
            const bindingsMap = new Map<string, string>(
              Object.entries(settings.keyBindings)
            );
            // Check if bindings are in new slot-based format (e.g., "diatonic-0")
            // Old format used chord IDs like "C-Maj" which won't work anymore
            const hasSlotBasedBindings = Array.from(bindingsMap.keys()).some(
              key => key.startsWith('diatonic-') || key.startsWith('custom-')
            );
            if (hasSlotBasedBindings) {
              setKeyBindings(bindingsMap);
            } else {
              // Old format detected - regenerate defaults
              console.log('Migrating key bindings to slot-based format');
              setKeyBindings(generateDefaultKeyBindings());
            }
          } else {
            // No saved bindings - use defaults
            setKeyBindings(generateDefaultKeyBindings());
          }
        }
      } catch (e) {
        console.error('Failed to load settings:', e);
      }
      setIsLoaded(true);
    };
    loadSettings();
  }, []);

  // Save settings on change
  useEffect(() => {
    if (!isLoaded) return;
    const saveSettings = async () => {
      try {
        // Serialize custom voicings Map to object
        const voicingsObject = Object.fromEntries(customVoicings);
        // Serialize key bindings Map to object
        const bindingsObject = Object.fromEntries(keyBindings);
        
        await persistence.setItem(
          STORAGE_KEY,
          JSON.stringify({
            key: selectedKey,
            mode: mode,
            instrument: instrument,
            reverbMix: reverbMix,
            volume: volume,
            customVoicings: voicingsObject,
            additionalChords: additionalChords,
            keyBindings: bindingsObject
          } as AppSettings)
        );
      } catch (e) {
        console.error('Failed to save settings:', e);
      }
    };
    saveSettings();
  }, [selectedKey, mode, instrument, reverbMix, volume, customVoicings, additionalChords, keyBindings, isLoaded]);

  // Update chords when key/mode changes
  useEffect(() => {
    clearPendingTimeouts();
    const newChords = getDiatonicChords(selectedKey, mode);
    setChords(newChords);
    setActiveChord(null);
    setActiveNotes([]);
    activeChordRef.current = null;
    playingNotesRef.current = [];
    isPlayingRef.current = false;
    stopAll();
  }, [selectedKey, mode, stopAll, clearPendingTimeouts]);

  useEffect(() => {
    return () => {
      clearPendingTimeouts();
    };
  }, [clearPendingTimeouts]);

  // Handle instrument change
  useEffect(() => {
    setAudioInstrument(instrument);
  }, [instrument, setAudioInstrument]);

  // Handle reverb change
  useEffect(() => {
    setAudioReverbMix(reverbMix);
  }, [reverbMix, setAudioReverbMix]);

  // Handle volume change
  useEffect(() => {
    setAudioVolume(volume);
  }, [volume, setAudioVolume]);
  
  // Rebinding handlers (uses slot IDs like "diatonic-0" or "custom-1")
  const handleStartRebind = useCallback((slotId: string) => {
    setRebindingChordId(slotId);
  }, []);
  
  const handleCancelRebind = useCallback(() => {
    setRebindingChordId(null);
  }, []);
  
  const handleCaptureKey = useCallback((event: KeyboardEvent) => {
    if (!rebindingChordId) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const key = event.key;
    
    // Allow Escape to cancel
    if (key === 'Escape') {
      handleCancelRebind();
      return;
    }
    
    // Only allow single-character keys (alphanumeric and punctuation)
    if (key.length !== 1) {
      return;
    }
    
    // Check for duplicate bindings (rebindingChordId is now a slotId like "diatonic-0" or "custom-1")
    const existingSlotId = Array.from(keyBindings.entries()).find(
      ([slotId, boundKey]) => boundKey === key && slotId !== rebindingChordId
    )?.[0];
    
    if (existingSlotId) {
      // Find the slot name for display
      let conflictName = existingSlotId;
      if (existingSlotId.startsWith('diatonic-')) {
        const slotIndex = parseInt(existingSlotId.replace('diatonic-', ''));
        conflictName = chords[slotIndex]?.name || `Diatonic slot ${slotIndex + 1}`;
      } else if (existingSlotId.startsWith('custom-')) {
        const slotIndex = parseInt(existingSlotId.replace('custom-', ''));
        conflictName = additionalChords[slotIndex]?.shortName || `Custom slot ${slotIndex + 1}`;
      }
      
      alert(`Key "${key}" is already bound to ${conflictName}`);
      return;
    }
    
    // Update binding
    setKeyBindings(prev => {
      const newMap = new Map(prev);
      newMap.set(rebindingChordId, key);
      return newMap;
    });
    
    setRebindingChordId(null);
  }, [rebindingChordId, keyBindings, chords, additionalChords, handleCancelRebind]);
  
  // Voicing editor handlers
  const handleOpenVoicingEditor = useCallback((chordId: string, isCustom: boolean, index: number) => {
    // Find the chord
    const diatonicChord = chords.find(c => getChordId(c) === chordId);
    const additionalChord = additionalChords.find(c => c.id === chordId);
    
    const chord = diatonicChord || additionalChord;
    if (!chord) return;
    
    const chordName = diatonicChord ? chord.name : (additionalChord as ExtendedChordInfo).shortName;
    const rootMidi = diatonicChord ? chord.rootMidi : (additionalChord as ExtendedChordInfo).rootMidi;
    const chordType = diatonicChord ? chord.type as ChordType : (additionalChord as ExtendedChordInfo).type as ChordType;
    
    // Get current voicing (custom or default)
    const currentVoicing = applyCustomVoicing(
      chordId,
      customVoicings,
      rootMidi,
      chordType,
      instrument
    );
    
    // Get default voicing (force default by passing empty custom voicings)
    const defaultVoicing = applyCustomVoicing(
      chordId,
      new Map(),
      rootMidi,
      chordType,
      instrument
    );
    
    setEditingVoicingChordId(chordId);
    setEditingVoicingData({
      chordName,
      currentNotes: currentVoicing.notes,
      defaultNotes: defaultVoicing.notes
    });
  }, [chords, additionalChords, customVoicings, instrument]);
  
  const handleSaveVoicing = useCallback((chordId: string, notes: number[]) => {
    setCustomVoicings(prev => {
      const newMap = new Map(prev);
      if (notes.length === 0) {
        newMap.delete(chordId);  // Reset to default
      } else {
        newMap.set(chordId, notes);
      }
      return newMap;
    });
  }, []);
  
  const handleCloseVoicingEditor = useCallback(() => {
    setEditingVoicingChordId(null);
    setEditingVoicingData(null);
  }, []);

  /**
   * Play a chord using the current instrument voicing.
   * Notes are played immediately (no staggered strum) — keep velocity variation for human feel.
   */
  const playChord = useCallback(
    (chord: ChordInfo) => {
      initAudio();

      clearPendingTimeouts();

      // Get instrument voicing (with custom voicing support)
      // For diatonic chords from ChordInfo, create a chord ID
      const chordId = `${chord.name.split(' ')[0]}-${chord.type}`;
      const voicing = applyCustomVoicing(
        chordId,
        customVoicings,
        chord.rootMidi,
        chord.type as ChordType,
        instrument
      );
      const newPlayingNotes = voicing.notes;
      const velocities = voicing.velocities || newPlayingNotes.map(() => 0.8);

      // Diff-based approach: only stop notes that are leaving, only start notes that are new
      const previousNotes = playingNotesRef.current;
      
      // Notes to stop: in previous but not in new
      const notesToStop = previousNotes.filter((note) => !newPlayingNotes.includes(note));
      // Notes to start: in new but not in previous
      const notesToStart = newPlayingNotes.filter((note) => !previousNotes.includes(note));

      // Stop only the notes that are no longer needed
      notesToStop.forEach((note) => stopNote(note));

      isPlayingRef.current = true;

      // Play all notes immediately (no strum). Keep slight velocity variation for human feel.
      notesToStart.forEach((note) => {
        const noteIndex = newPlayingNotes.indexOf(note);
        const velocity = velocities[noteIndex] ?? 0.8;
        // Play the note directly without staggered strum delay
        playNote(note, velocity * (0.9 + Math.random() * 0.2));
      });

      // Update playing notes ref
      playingNotesRef.current = newPlayingNotes;

      // Update visualization (show actual voicing on keyboard)
      setActiveNotes(newPlayingNotes);
      setActiveChord(chord.degree);
      setActiveCustomChord(null);
      activeChordRef.current = chord;
    },
    [initAudio, playNote, stopNote, clearPendingTimeouts, instrument, customVoicings]
  );

  const stopChord = useCallback(() => {
    clearPendingTimeouts();

    // Stop all actual playing notes (from instrument voicing)
    playingNotesRef.current.forEach((note) => stopNote(note));

    isPlayingRef.current = false;

    // Clear all visual state and refs
    setActiveNotes([]);
    setActiveChord(null);
    setActiveCustomChord(null);
    activeChordRef.current = null;
    playingNotesRef.current = [];
  }, [stopNote, clearPendingTimeouts]);


  const handleLibraryChordSelect = (chord: ExtendedChordInfo, customVoicing?: number[]) => {
    // Handle edit modes
    if (isEditingVoicing) {
      const chordIndex = additionalChords.findIndex(c => c.id === chord.id);
      handleOpenVoicingEditor(chord.id, true, chordIndex);
      setEditMode('none');
      return;
    }
    if (isEditingKeybinding) {
      // Use slot-based ID for key bindings
      const chordIndex = additionalChords.findIndex(c => c.id === chord.id);
      if (chordIndex >= 0) {
        const slotId = `custom-${chordIndex}`;
        handleStartRebind(slotId);
      }
      setEditMode('none');
      return;
    }
    
    // Normal play
    if (!isInitialized) {
      initAudio();
    }

    clearPendingTimeouts();

    // Stop current notes
    playingNotesRef.current.forEach((note) => stopNote(note));

    // Create a ChordInfo-like object for compatibility
    const chordInfo: ChordInfo = {
      degree: 0,
      name: chord.name,
      roman: '',
      rootMidi: chord.rootMidi,
      notes: chord.intervals.map(interval => chord.rootMidi + interval),
      type: chord.type === 'Maj' ? 'Maj' : chord.type === 'min' ? 'min' : 'dim',
      shortcut: ''
    };

    // Use custom voicing if provided, otherwise use default
    let voicing;
    if (customVoicing && customVoicing.length > 0) {
      voicing = { notes: customVoicing, velocities: customVoicing.map(() => 0.75) };
    } else {
      voicing = applyCustomVoicing(
        chord.id,
        customVoicings,
        chord.rootMidi,
        chord.type,
        instrument
      );
    }

    const newPlayingNotes = voicing.notes;
    const velocities = voicing.velocities || newPlayingNotes.map(() => 0.7);

    isPlayingRef.current = true;

    // Play notes
    newPlayingNotes.forEach((note, index) => {
      const velocity = velocities[index] || 0.7;
      playNote(note, velocity * (0.9 + Math.random() * 0.2));
    });

    // Update playing notes ref
    playingNotesRef.current = newPlayingNotes;

    // Update visualization
    setActiveNotes(newPlayingNotes);
    setActiveChord(null); // No degree for library chords
    // Find custom chord index if it's in additionalChords
    const customIndex = additionalChords.findIndex(c => c.id === chord.id);
    setActiveCustomChord(customIndex >= 0 ? customIndex : null);
    activeChordRef.current = chordInfo;
  };

  // Keyboard handling
  useEffect(() => {
    // Build reverse lookup: key -> slotId
    const keyToSlotMap = new Map<string, string>();
    keyBindings.forEach((key, slotId) => {
      keyToSlotMap.set(key, slotId);
      keyToSlotMap.set(key.toLowerCase(), slotId); // Also add lowercase version
    });
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // If in rebinding mode, capture the key
      if (rebindingChordId) {
        handleCaptureKey(e);
        return;
      }
      
      if (e.repeat) return;

      const key = e.key;
      const normalizedKey = key.toLowerCase();
      
      // Try to find slot by key binding (check both original and normalized)
      const slotId = keyToSlotMap.get(key) || keyToSlotMap.get(normalizedKey);
      
      if (slotId) {
        // Parse the slot to find the actual chord
        if (slotId.startsWith('diatonic-')) {
          const slotIndex = parseInt(slotId.replace('diatonic-', ''));
          const chord = chords[slotIndex];
          if (chord) {
            pressedKeysRef.current.add(normalizedKey);
            playChord(chord);
            return;
          }
        } else if (slotId.startsWith('custom-')) {
          const slotIndex = parseInt(slotId.replace('custom-', ''));
          const chord = additionalChords[slotIndex];
          if (chord) {
            pressedKeysRef.current.add(normalizedKey);
            handleLibraryChordSelect(chord);
            return;
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const normalizedKey = e.key.toLowerCase();
      const slotId = keyToSlotMap.get(e.key) || keyToSlotMap.get(normalizedKey);
      
      if (slotId) {
        // Remove this key from pressed keys
        pressedKeysRef.current.delete(e.key);
        pressedKeysRef.current.delete(normalizedKey);
        
        // Only stop the chord if no chord keys are pressed anymore
        if (pressedKeysRef.current.size === 0) {
          stopChord();
        }
      }
    };

    const handleWindowBlur = () => {
      // clear pressed keys and stop any chord when the window loses focus
      pressedKeysRef.current.clear();
      stopChord();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pressedKeysRef.current.clear();
        stopChord();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [chords, playChord, stopChord, additionalChords, handleLibraryChordSelect, keyBindings, rebindingChordId, handleCaptureKey]);

  const handleChordMouseDown = (chord: ChordInfo) => {
    // Handle edit modes
    if (isEditingVoicing) {
      const chordId = getChordId(chord);
      handleOpenVoicingEditor(chordId, false, chord.degree);
      setEditMode('none');
      return;
    }
    if (isEditingKeybinding) {
      // Use slot-based ID for key bindings
      const slotId = `diatonic-${chord.degree}`;
      handleStartRebind(slotId);
      setEditMode('none');
      return;
    }
    
    // Normal play
    playChord(chord);
  };

  const handleChordMouseUp = () => {
    stopChord();
  };

  const handleKeyChange = (key: Note) => {
    // Flexible key selection keeps the app aligned with performer comfort ranges highlighted by the community [music.stackexchange.com](https://music.stackexchange.com/questions/15221/whats-the-point-of-keys-other-than-c-and-am).
    setSelectedKey(key);
  };

  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
  };

  const handleInstrumentChange = (newInstrument: InstrumentType) => {
    setInstrument(newInstrument);
  };

  const handleOpenLibrary = () => {
    setIsLibraryOpen(true);
  };

  const handleCloseLibrary = () => {
    setIsLibraryOpen(false);
  };

  const handleCustomVoicingChange = (chordId: string, notes: number[]) => {
    setCustomVoicings(prev => {
      const newMap = new Map(prev);
      if (notes.length === 0) {
        newMap.delete(chordId);
      } else {
        newMap.set(chordId, notes);
      }
      return newMap;
    });
  };

  // Add a chord to additional slots (max 5)
  const handleAddChordToGrid = (chord: ExtendedChordInfo) => {
    setAdditionalChords(prev => {
      // Check if chord already exists
      if (prev.some(c => c.id === chord.id)) {
        return prev; // Already added
      }
      if (prev.length >= 5) {
        return prev; // Max 5 additional chords
      }
      return [...prev, chord];
    });
  };

  // Remove a chord from additional slots
  const handleRemoveAdditionalChord = (index: number) => {
    setAdditionalChords(prev => prev.filter((_, i) => i !== index));
  };


  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-icon">♪</div>
            <div className="logo-text">
              <h1>Harmony Playground</h1>
              <p className="tagline">Interactive harmony playground</p>
            </div>
          </div>
          <div className="quick-help">
            <span className="help-item">
              <kbd>1-7</kbd> Diatonic
            </span>
            <span className="help-item">
              <kbd>8-0</kbd> Custom
            </span>
          </div>
        </div>
      </header>

      <main className="app-main">
        <section className="controls-panel">
          <KeySelector selectedKey={selectedKey} mode={mode} onKeyChange={handleKeyChange} onModeChange={handleModeChange} />

          <div className="panel-divider" />

          <SynthControls
            instrument={instrument}
            reverbMix={reverbMix}
            volume={volume}
            onInstrumentChange={handleInstrumentChange}
            onReverbChange={setReverbMix}
            onVolumeChange={setVolume}
            displayMode={chordLabelMode}
            onDisplayModeChange={setChordLabelMode}
          />

          <div className="panel-divider" />
          
          <div className="library-control">
            <button className="library-btn" onClick={handleOpenLibrary}>
              <Library className="library-btn-icon" size={24} />
              <span>Chord Library</span>
              <span className="library-btn-count">
                {additionalChords.length > 0 
                  ? `${additionalChords.length} added` 
                  : '204 chords'}
              </span>
            </button>
          </div>
        </section>

        <section className="chords-panel">
          <div className="panel-header">
            <h2>
              <span className="key-badge">{selectedKey}</span>
              <span className="mode-badge">{mode}</span>
              Diatonic Triads
            </h2>
          </div>
          <EditModeToolbar />
          <ChordGrid
            chords={chords}
            activeChord={activeChord}
            activeCustomChord={activeCustomChord}
            displayMode={chordLabelMode}
            additionalChords={additionalChords}
            onChordClick={playChord}
            onChordMouseDown={handleChordMouseDown}
            onChordMouseUp={handleChordMouseUp}
            onRemoveAdditionalChord={handleRemoveAdditionalChord}
            onAdditionalChordClick={handleLibraryChordSelect}
            keyBindings={keyBindings}
          />
        </section>

        <section className="keyboard-panel">
          <div className="panel-header">
            <h2>Keyboard Visualizer</h2>
            <div className="legend-inline">
              <span className="legend-item">
                <span className="legend-dot played"></span>
                Active
              </span>
              <span className="legend-item">
                <span className="legend-dot scale"></span>
                Scale tone
              </span>
            </div>
          </div>
          <PianoKeyboard activeNotes={activeNotes} selectedKey={selectedKey} mode={mode} />
        </section>

        <section className="info-panel">
          <div className="info-card shortcuts-card">
            <h3>Keyboard Shortcuts</h3>
            <div className="shortcuts-grid">
              <div className="shortcut-row">
                <div className="keys">
                  <kbd>1</kbd>
                  <kbd>2</kbd>
                  <kbd>3</kbd>
                  <kbd>4</kbd>
                  <kbd>5</kbd>
                  <kbd>6</kbd>
                  <kbd>7</kbd>
                </div>
                <span>Play diatonic chords I–vii°</span>
              </div>
              <div className="shortcut-row">
                <div className="keys">
                  <kbd>Q</kbd>
                  <kbd>W</kbd>
                  <kbd>E</kbd>
                  <kbd>R</kbd>
                  <kbd>T</kbd>
                  <kbd>Y</kbd>
                  <kbd>U</kbd>
                </div>
                <span>Alternative chord keys</span>
              </div>
            </div>
          </div>

          <div className="info-card theory-card">
            <h3>About This Key</h3>
            <p className="scale-notes">
              <strong>
                {selectedKey} {mode}
              </strong>{' '}
              scale:{' '}
              {mode === 'major'
                ? (() => {
                    const offsets = [0, 2, 4, 5, 7, 9, 11];
                    const rootIdx = AVAILABLE_KEYS.indexOf(selectedKey);
                    return offsets.map((o) => AVAILABLE_KEYS[(rootIdx + o) % 12]).join(' – ');
                  })()
                : (() => {
                    const offsets = [0, 2, 3, 5, 7, 8, 10];
                    const rootIdx = AVAILABLE_KEYS.indexOf(selectedKey);
                    return offsets.map((o) => AVAILABLE_KEYS[(rootIdx + o) % 12]).join(' – ');
                  })()}
            </p>
            <p className="theory-hint">
              {mode === 'major'
                ? 'Major keys typically sound bright and happy. The diatonic chords follow the pattern: Maj–min–min–Maj–Maj–min–dim.'
                : 'Minor keys typically sound darker or melancholic. The diatonic chords follow the pattern: min–dim–Maj–min–min–Maj–Maj.'}
            </p>
          </div>
        </section>
      </main>

      <footer className="app-footer">
        <p>Harmony Playground • Interactive harmony tool • Web Audio Synthesizer</p>
      </footer>
      
      {/* Chord Library Modal */}
      <ChordLibraryModal
        isOpen={isLibraryOpen}
        onClose={handleCloseLibrary}
        currentKey={selectedKey}
        currentMode={mode}
        currentInstrument={instrument}
        customVoicings={customVoicings}
        additionalChords={additionalChords}
        onCustomVoicingChange={handleCustomVoicingChange}
        onChordSelect={handleLibraryChordSelect}
        onAddToGrid={handleAddChordToGrid}
      />
      
      {/* Voicing Editor Modal */}
      {editingVoicingChordId && editingVoicingData && (
        <VoicingEditorModal
          isOpen={true}
          chordId={editingVoicingChordId}
          chordName={editingVoicingData.chordName}
          currentNotes={editingVoicingData.currentNotes}
          defaultNotes={editingVoicingData.defaultNotes}
          onSave={(notes) => handleSaveVoicing(editingVoicingChordId, notes)}
          onClose={handleCloseVoicingEditor}
        />
      )}
      
      {/* Key Capture Overlay for Rebinding */}
      {rebindingChordId && (() => {
        // rebindingChordId is now a slotId like "diatonic-0" or "custom-1"
        let chordName = rebindingChordId;
        if (rebindingChordId.startsWith('diatonic-')) {
          const slotIndex = parseInt(rebindingChordId.replace('diatonic-', ''));
          chordName = chords[slotIndex]?.name || `Diatonic slot ${slotIndex + 1}`;
        } else if (rebindingChordId.startsWith('custom-')) {
          const slotIndex = parseInt(rebindingChordId.replace('custom-', ''));
          chordName = additionalChords[slotIndex]?.shortName || `Custom slot ${slotIndex + 1}`;
        }
        const currentKey = keyBindings.get(rebindingChordId) || '—';
        
        return (
          <div className="key-capture-overlay" onClick={handleCancelRebind}>
            <div className="key-capture-content" onClick={(e) => e.stopPropagation()}>
              <h2>Rebind Keyboard Shortcut</h2>
              <div className="key-capture-info">
                <p className="chord-name-display">{chordName}</p>
                <p className="current-key-display">Currently: <kbd>{currentKey}</kbd></p>
                <p className="instruction">Press a key to bind to this chord</p>
                <p className="instruction secondary">Press <kbd>Escape</kbd> to cancel</p>
              </div>
              <button className="cancel-rebind-btn" onClick={handleCancelRebind}>
                Cancel
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function App() {
  return (
    <EditModeProvider>
      <AppContent />
    </EditModeProvider>
  );
}

export default App;
