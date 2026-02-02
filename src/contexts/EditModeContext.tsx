/**
 * EditModeContext - Manages edit mode state for chord customization
 * 
 * Provides a mobile-friendly way to edit voicings and key bindings by
 * toggling edit modes instead of using hover-based buttons.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type EditMode = 'none' | 'voicing' | 'keybinding';

interface EditModeContextValue {
  editMode: EditMode;
  setEditMode: (mode: EditMode) => void;
  toggleVoicingMode: () => void;
  toggleKeybindingMode: () => void;
  isEditingVoicing: boolean;
  isEditingKeybinding: boolean;
}

const EditModeContext = createContext<EditModeContextValue | undefined>(undefined);

interface EditModeProviderProps {
  children: ReactNode;
}

export function EditModeProvider({ children }: EditModeProviderProps) {
  const [editMode, setEditMode] = useState<EditMode>('none');

  const toggleVoicingMode = useCallback(() => {
    setEditMode(prev => prev === 'voicing' ? 'none' : 'voicing');
  }, []);

  const toggleKeybindingMode = useCallback(() => {
    setEditMode(prev => prev === 'keybinding' ? 'none' : 'keybinding');
  }, []);

  const value: EditModeContextValue = {
    editMode,
    setEditMode,
    toggleVoicingMode,
    toggleKeybindingMode,
    isEditingVoicing: editMode === 'voicing',
    isEditingKeybinding: editMode === 'keybinding'
  };

  return (
    <EditModeContext.Provider value={value}>
      {children}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error('useEditMode must be used within an EditModeProvider');
  }
  return context;
}
