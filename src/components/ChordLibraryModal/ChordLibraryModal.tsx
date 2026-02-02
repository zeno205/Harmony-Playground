/**
 * ChordLibraryModal Component
 * 
 * Full-screen modal for browsing and selecting chords from library.
 * Features:
 * - Search bar for filtering chords
 * - Toggle between "All Chords" and "In Key" filter
 * - Categorized chord display (Triads, Sevenths, Extended, Suspended)
 * - Integrated voicing editor for customization
 * - Add selected chord to active grid
 */

import React, { useState, useMemo } from 'react';
import { 
  ExtendedChordInfo, 
  generateChordLibrary, 
  searchChords, 
  isChordInKey,
  CHORD_TYPE_DEFINITIONS
} from '../../utils/chordLibrary';
import type { Note, Mode } from '../../utils/musicTheory';
import { getVoicingForInstrument } from '../../utils/chordVoicings';
import type { InstrumentType } from '../../hooks/useAudio';
import VoicingEditor from '../VoicingEditor/VoicingEditor';
import './ChordLibraryModal.css';

interface ChordLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentKey: Note;
  currentMode: Mode;
  currentInstrument: InstrumentType;
  customVoicings: Map<string, number[]>;
  additionalChords: ExtendedChordInfo[];
  onCustomVoicingChange: (chordId: string, notes: number[]) => void;
  onChordSelect: (chord: ExtendedChordInfo, customVoicing?: number[]) => void;
  onAddToGrid: (chord: ExtendedChordInfo) => void;
}

export default function ChordLibraryModal({
  isOpen,
  onClose,
  currentKey,
  currentMode,
  currentInstrument,
  customVoicings,
  additionalChords,
  onCustomVoicingChange,
  onChordSelect,
  onAddToGrid
}: ChordLibraryModalProps) {
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'inKey'>('all');
  const [selectedChord, setSelectedChord] = useState<ExtendedChordInfo | null>(null);
  const [editingVoicing, setEditingVoicing] = useState<number[]>([]);
  
  // Generate full chord library (204 chords)
  const fullLibrary = useMemo(() => generateChordLibrary(), []);
  
  // Apply filters (search + in-key)
  const filteredLibrary = useMemo(() => {
    let filtered = fullLibrary;
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = searchChords(filtered, searchQuery);
    }
    
    // Apply in-key filter
    if (filterMode === 'inKey') {
      filtered = filtered.filter(chord => 
        isChordInKey(chord.root, currentKey, currentMode)
      );
    }
    
    return filtered;
  }, [fullLibrary, searchQuery, filterMode, currentKey, currentMode]);
  
  // Group chords by category
  const chordsByCategory = useMemo(() => {
    const categories = {
      triad: [] as ExtendedChordInfo[],
      seventh: [] as ExtendedChordInfo[],
      extended: [] as ExtendedChordInfo[],
      suspended: [] as ExtendedChordInfo[]
    };
    
    filteredLibrary.forEach(chord => {
      categories[chord.category].push(chord);
    });
    
    return categories;
  }, [filteredLibrary]);
  
  // Handle chord click
  const handleChordClick = (chord: ExtendedChordInfo) => {
    setSelectedChord(chord);
    
    // Load custom voicing if exists, otherwise load default
    const customNotes = customVoicings.get(chord.id);
    if (customNotes) {
      setEditingVoicing([...customNotes]);
    } else {
      const defaultVoicing = getVoicingForInstrument(
        chord.rootMidi,
        chord.type,
        currentInstrument
      );
      setEditingVoicing(defaultVoicing.notes);
    }
  };
  
  // Handle voicing note changes
  const handleVoicingNotesChange = (notes: number[]) => {
    setEditingVoicing(notes);
    
    // Save to custom voicings
    if (selectedChord) {
      onCustomVoicingChange(selectedChord.id, notes);
    }
  };
  
  // Reset to default voicing
  const handleResetVoicing = () => {
    if (selectedChord) {
      const defaultVoicing = getVoicingForInstrument(
        selectedChord.rootMidi,
        selectedChord.type,
        currentInstrument
      );
      setEditingVoicing(defaultVoicing.notes);
      
      // Remove custom voicing
      onCustomVoicingChange(selectedChord.id, []);
    }
  };
  
  // Add chord with current voicing
  const handleAddChord = () => {
    if (selectedChord) {
      const voicing = editingVoicing.length > 0 ? editingVoicing : undefined;
      onChordSelect(selectedChord, voicing);
      onClose();
    }
  };
  
  // Render chord button
  const renderChordButton = (chord: ExtendedChordInfo) => {
    const isSelected = selectedChord?.id === chord.id;
    const hasCustomVoicing = customVoicings.has(chord.id);
    
    return (
      <button
        key={chord.id}
        className={`chord-library-item ${isSelected ? 'selected' : ''} ${hasCustomVoicing ? 'custom' : ''}`}
        onClick={() => handleChordClick(chord)}
      >
        <span className="chord-library-item-name">{chord.shortName}</span>
        {hasCustomVoicing && (
          <span className="chord-library-item-badge">★</span>
        )}
      </button>
    );
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="chord-library-modal-overlay" onClick={onClose}>
      <div className="chord-library-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="chord-library-header">
          <div className="chord-library-header-top">
            <h2>Chord Library</h2>
            <button className="chord-library-close-btn" onClick={onClose}>
              ×
            </button>
          </div>
          
          <div className="chord-library-controls">
            {/* Search bar */}
            <input
              type="search"
              className="chord-library-search"
              placeholder="Search chords... (e.g., Cmaj7, minor, sus)"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            
            {/* Filter toggle */}
            <div className="chord-library-filter-toggle">
              <button
                className={filterMode === 'all' ? 'active' : ''}
                onClick={() => setFilterMode('all')}
              >
                All Chords
              </button>
              <button
                className={filterMode === 'inKey' ? 'active' : ''}
                onClick={() => setFilterMode('inKey')}
              >
                In Key ({currentKey} {currentMode})
              </button>
            </div>
          </div>
          
          <div className="chord-library-stats">
            Showing {filteredLibrary.length} chord{filteredLibrary.length !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Main content */}
        <div className="chord-library-content">
          {/* Chord grid */}
          <div className="chord-library-grid-container">
            {filteredLibrary.length === 0 ? (
              <div className="chord-library-empty">
                No chords found matching your search.
              </div>
            ) : (
              <>
                {/* Triads */}
                {chordsByCategory.triad.length > 0 && (
                  <div className="chord-library-category">
                    <h3>Triads</h3>
                    <div className="chord-library-grid">
                      {chordsByCategory.triad.map(renderChordButton)}
                    </div>
                  </div>
                )}
                
                {/* Seventh chords */}
                {chordsByCategory.seventh.length > 0 && (
                  <div className="chord-library-category">
                    <h3>Seventh Chords</h3>
                    <div className="chord-library-grid">
                      {chordsByCategory.seventh.map(renderChordButton)}
                    </div>
                  </div>
                )}
                
                {/* Extended chords */}
                {chordsByCategory.extended.length > 0 && (
                  <div className="chord-library-category">
                    <h3>Extended Chords</h3>
                    <div className="chord-library-grid">
                      {chordsByCategory.extended.map(renderChordButton)}
                    </div>
                  </div>
                )}
                
                {/* Suspended chords */}
                {chordsByCategory.suspended.length > 0 && (
                  <div className="chord-library-category">
                    <h3>Suspended Chords</h3>
                    <div className="chord-library-grid">
                      {chordsByCategory.suspended.map(renderChordButton)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Voicing editor panel */}
          {selectedChord && (
            <div className="chord-library-voicing-panel">
              <VoicingEditor
                chordName={selectedChord.name}
                selectedNotes={editingVoicing}
                defaultNotes={
                  getVoicingForInstrument(
                    selectedChord.rootMidi,
                    selectedChord.type,
                    currentInstrument
                  ).notes
                }
                onNotesChange={handleVoicingNotesChange}
                onReset={handleResetVoicing}
              />
              
              <div className="chord-library-voicing-actions">
                <button
                  className="chord-library-add-btn"
                  onClick={handleAddChord}
                  disabled={editingVoicing.length === 0}
                >
                  Play This Chord
                </button>
                
                {(() => {
                  const isAlreadyAdded = additionalChords.some(c => c.id === selectedChord.id);
                  const isFull = additionalChords.length >= 5;
                  
                  return (
                    <button
                      className={`chord-library-grid-btn ${isAlreadyAdded ? 'added' : ''}`}
                      onClick={() => onAddToGrid(selectedChord)}
                      disabled={isAlreadyAdded || isFull}
                      title={
                        isAlreadyAdded 
                          ? 'Already added to grid' 
                          : isFull 
                            ? 'Grid is full (max 5 custom chords)'
                            : 'Add to custom chord grid'
                      }
                    >
                      {isAlreadyAdded ? '✓ Added to Grid' : isFull ? 'Grid Full' : '+ Add to Grid'}
                    </button>
                  );
                })()}
                
                <p className="add-to-grid-hint">
                  Custom chords use keys: <kbd>8</kbd> <kbd>9</kbd> <kbd>0</kbd> <kbd>-</kbd> <kbd>=</kbd>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}