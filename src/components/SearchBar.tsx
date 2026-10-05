import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ value, onChange, onClear }) => {
  return (
    <div className="search-wrapper">
      <Search className="search-icon" size={20} />
      <input
        type="search"
        className="search-input"
        placeholder="🔍 Search dishes, tags..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        autoCorrect="off"
        spellCheck="false"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="search-clear"
          aria-label="Clear search"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};
