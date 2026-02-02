/**
 * VoicingEditorModal Component
 * 
 * Modal wrapper for the VoicingEditor component.
 * Allows users to edit chord voicings from anywhere in the app.
 */

import React from 'react';
import { X } from 'lucide-react';
import VoicingEditor from '../VoicingEditor/VoicingEditor';
import './VoicingEditorModal.css';

interface VoicingEditorModalProps {
  isOpen: boolean;
  chordId: string;
  chordName: string;
  currentNotes: number[];
  defaultNotes: number[];
  onSave: (notes: number[]) => void;
  onClose: () => void;
}

export default function VoicingEditorModal({
  isOpen,
  chordId,
  chordName,
  currentNotes,
  defaultNotes,
  onSave,
  onClose
}: VoicingEditorModalProps) {
  if (!isOpen) return null;

  const handleNotesChange = (notes: number[]) => {
    onSave(notes);
  };

  const handleReset = () => {
    onSave([]);  // Empty array means reset to default
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="voicing-editor-modal-overlay" onClick={handleOverlayClick}>
      <div className="voicing-editor-modal-content">
        <div className="voicing-editor-modal-header">
          <h2>Edit Voicing: {chordName}</h2>
          <button 
            className="voicing-editor-modal-close" 
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="voicing-editor-modal-body">
          <VoicingEditor
            chordName={chordName}
            selectedNotes={currentNotes}
            defaultNotes={defaultNotes}
            onNotesChange={handleNotesChange}
            onReset={handleReset}
          />
        </div>
      </div>
    </div>
  );
}
