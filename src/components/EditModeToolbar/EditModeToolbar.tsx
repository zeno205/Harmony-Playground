/**
 * EditModeToolbar - Toggle buttons for edit modes
 * Mobile-friendly alternative to hover-based edit buttons
 */

import React from 'react';
import { Pencil, Keyboard, RotateCcw } from 'lucide-react';
import { useEditMode } from '../../contexts/EditModeContext';
import './EditModeToolbar.css';

export function EditModeToolbar() {
  const { isEditingVoicing, isEditingKeybinding, toggleVoicingMode, toggleKeybindingMode, handleResetSettings } = useEditMode();

  return (
    <div className="edit-mode-toolbar">
      <button
        className={`edit-mode-btn ${isEditingVoicing ? 'active' : ''}`}
        onClick={toggleVoicingMode}
        title={isEditingVoicing ? 'Exit voicing edit mode' : 'Edit chord voicings'}
        aria-label={isEditingVoicing ? 'Exit voicing edit mode' : 'Edit chord voicings'}
      >
        <Pencil size={18} />
        <span>Edit Voicing</span>
      </button>
      
      <button
        className={`edit-mode-btn ${isEditingKeybinding ? 'active' : ''}`}
        onClick={toggleKeybindingMode}
        title={isEditingKeybinding ? 'Exit keybinding edit mode' : 'Edit keyboard shortcuts'}
        aria-label={isEditingKeybinding ? 'Exit keybinding edit mode' : 'Edit keyboard shortcuts'}
      >
        <Keyboard size={18} />
        <span>Edit Keys</span>
      </button>
      
      <button
        className="edit-mode-btn reset-btn"
        onClick={handleResetSettings}
        title="Reset all settings to default"
        aria-label="Reset all settings to default"
      >
        <RotateCcw size={18} />
        <span>Reset All</span>
      </button>
      
      {(isEditingVoicing || isEditingKeybinding) && (
        <div className="edit-mode-hint">
          Click any chord to {isEditingVoicing ? 'edit its voicing' : 'change its keyboard shortcut'}
        </div>
      )}
    </div>
  );
}
