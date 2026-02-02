
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Note, Mode, AVAILABLE_KEYS } from '../../utils/musicTheory';
import './KeySelector.css';

interface KeySelectorProps {
  selectedKey: Note;
  mode: Mode;
  onKeyChange: (key: Note) => void;
  onModeChange: (mode: Mode) => void;
}

export const KeySelector: React.FC<KeySelectorProps> = ({
  selectedKey,
  mode,
  onKeyChange,
  onModeChange
}) => {
  return (
    <div className="key-selector">
      <div className="selector-group">
        <label>Key</label>
        <div className="key-wheel">
          {AVAILABLE_KEYS.map((key) => (
            <button
              key={key}
              className={`key-btn ${selectedKey === key ? 'active' : ''} ${key.includes('#') ? 'sharp' : ''}`}
              onClick={() => onKeyChange(key)}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      
      <div className="selector-group">
        <label>Mode</label>
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'major' ? 'active' : ''}`}
            onClick={() => onModeChange('major')}
          >
            <Sun className="mode-icon" size={16} />
            Major
          </button>
          <button
            className={`mode-btn ${mode === 'minor' ? 'active' : ''}`}
            onClick={() => onModeChange('minor')}
          >
            <Moon className="mode-icon" size={16} />
            Minor
          </button>
        </div>
      </div>
    </div>
  );
};
