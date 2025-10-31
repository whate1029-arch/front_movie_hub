import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, X } from 'lucide-react';
import { debounce } from '@/lib/utils';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = "Search for movies...",
  className = "",
}) => {
  const [query, setQuery] = useState('');

  const debouncedSearch = useMemo(
    () =>
      debounce((searchQuery: string) => {
        onSearch(searchQuery);
      }, 200),
    [onSearch]
  );

  useEffect(() => {
    debouncedSearch(query);

    return () => {
      debouncedSearch.cancel();
    };
  }, [query, debouncedSearch]);

  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(event.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    debouncedSearch.cancel();
    onSearch('');
  }, [debouncedSearch, onSearch]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        const trimmedQuery = query.trim();

        debouncedSearch.cancel();

        if (!trimmedQuery) {
          onSearch('');
          return;
        }

        onSearch(trimmedQuery);
      }
    },
    [debouncedSearch, onSearch, query]
  );

  return (
    <div className={`relative w-full max-w-2xl mx-auto ${className}`}>
      <div className="relative flex items-center transition-all duration-200">
        <div className="absolute left-4 z-10">
          <Search className="h-5 w-5 text-gray-400" />
        </div>

        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search for movies"
          className={`
            w-full pl-12 pr-12 py-4 text-lg
            search-input rounded-xl
            text-white placeholder-gray-400
            focus:outline-none focus:ring-2 focus:ring-blue-500
            transition-all duration-200
          `}
        />

        {query && (
          <button
            onClick={handleClear}
            className="absolute right-4 z-10 p-1 hover:bg-white/10 rounded-full transition-colors"
            type="button"
          >
            <X className="h-4 w-4 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;