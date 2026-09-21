import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchService } from '../services/searchService';
import type { SearchResult } from '../types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts?: { uid: string; name: string }[];
  onContactSelect?: (uid: string) => void;
  currentContactUid?: string;
  onMessageSelect?: (messageId: string, contactUid: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onMessageSelect,
  currentContactUid,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((searchQuery: string) => {
      setIsSearching(true);
      const searchResults = searchService.search({
        query: searchQuery,
        contactUid: currentContactUid,
      });
      setResults(searchResults);
      setIsSearching(false);
    }, 300),
    [currentContactUid]
  );

  useEffect(() => {
    if (query.length >= 2) {
      debouncedSearch(query);
    } else {
      setResults([]);
    }
  }, [query, debouncedSearch]);

  // Focus input on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск сообщений (минимум 2 символа)..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={onClose}
              className="px-3 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="Закрыть (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {isSearching && (
            <div className="text-center text-gray-500 py-8">
              Поиск...
            </div>
          )}

          {!isSearching && results.length === 0 && query.length >= 2 && (
            <div className="text-center text-gray-500 py-8">
              Ничего не найдено для "{query}"
            </div>
          )}

          {!isSearching && query.length < 2 && (
            <div className="text-center text-gray-500 py-8">
              Введите минимум 2 символа для поиска
            </div>
          )}

          {!isSearching && results.map((result) => (
            <div
              key={result.message.id}
              onClick={() => {
                onMessageSelect?.(result.message.id, result.contactUid);
                onClose();
              }}
              className="p-4 hover:bg-blue-50 rounded-lg cursor-pointer border-b"
            >
              <div className="font-semibold text-sm text-gray-700 mb-1">
                {result.contactName}
              </div>
              <div className="text-sm text-gray-600">
                {result.snippet}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(result.message.timestamp).toLocaleString()}
              </div>
            </div>
          ))}

          {results.length > 0 && (
            <div className="text-xs text-gray-400 mt-4 text-center">
              Найдено: {results.length} результат(ов)
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Утилита debounce
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
