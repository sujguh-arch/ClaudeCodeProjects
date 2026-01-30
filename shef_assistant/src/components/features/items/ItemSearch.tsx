"use client";

import { useState } from "react";

interface SearchResult {
  name: string;
  url: string;
  price?: string;
  chef?: string;
}

interface ItemSearchProps {
  onSelect: (result: SearchResult) => void;
}

export function ItemSearch({ onSelect }: ItemSearchProps) {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showInfo, setShowInfo] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`
      );
      const data = await response.json();

      if (data.success) {
        setResults(data.data?.results || []);
        if (data.message) {
          setError(data.message);
        }
      } else {
        setError(data.error || "Search failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search dishes (e.g., Chicken Tikka)"
          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shef-red focus:border-transparent"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching || !query.trim()}
          className="btn-gradient px-4 py-2 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSearching ? "..." : "Search"}
        </button>
      </div>

      {/* Info toggle */}
      <button
        onClick={() => setShowInfo(!showInfo)}
        className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        {showInfo ? "- Hide info" : "+ How does search work?"}
      </button>

      {showInfo && (
        <div className="text-xs text-[var(--text-secondary)] bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg">
          <p className="mb-2">
            <strong>Note:</strong> Search requires browser automation to work
            with Shef. Run this command in your terminal:
          </p>
          <code className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-[10px] overflow-x-auto">
            npx tsx automation/lib/search.ts &quot;{query || "chicken"}&quot;
          </code>
          <p className="mt-2">
            Alternatively, browse{" "}
            <a
              href="https://shef.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-shef-red hover:underline"
            >
              shef.com
            </a>{" "}
            and copy the dish URL directly.
          </p>
        </div>
      )}

      {/* Error/Info message */}
      {error && error.includes("Browser session conflict") && (
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-700">
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            Browser Session Conflict
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
            Close the Shef browser window, or run in terminal:
          </p>
          <code className="text-xs bg-amber-100 dark:bg-amber-900/40 px-2 py-1 rounded mt-1 block text-amber-800 dark:text-amber-200">
            npm run shef:cleanup
          </code>
        </div>
      )}
      {error && !error.includes("Browser session conflict") && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-secondary)]">
            {results.length} results found
          </p>
          {results.map((result, i) => (
            <div
              key={i}
              className="card-hover flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="flex-1 min-w-0 mr-3">
                <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                  {result.name}
                </p>
                {result.chef && (
                  <p className="text-xs text-[var(--text-secondary)]">
                    Chef {result.chef}
                  </p>
                )}
                {result.price && (
                  <p className="text-xs text-shef-red font-medium">
                    {result.price}
                  </p>
                )}
              </div>
              <button
                onClick={() => onSelect(result)}
                className="btn-press px-3 py-1.5 text-xs font-medium text-shef-red border border-shef-red rounded-md hover:bg-shef-red hover:text-white transition-colors"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
