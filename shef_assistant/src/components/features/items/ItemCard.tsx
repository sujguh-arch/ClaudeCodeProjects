"use client";

import { ShefItem } from "@/lib/types";

interface ItemCardProps {
  item: ShefItem;
  onQuantityChange: (id: string, quantity: number) => void;
  onDelete: (id: string) => void;
}

export default function ItemCard({ item, onQuantityChange, onDelete }: ItemCardProps) {
  const handleDecrease = () => {
    if (item.quantity > 1) {
      onQuantityChange(item.id, item.quantity - 1);
    }
  };

  const handleIncrease = () => {
    onQuantityChange(item.id, item.quantity + 1);
  };

  return (
    <div className="card-hover flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex-1 min-w-0 mr-4">
        <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {item.name}
        </h3>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-shef-red hover:underline truncate block mt-0.5"
        >
          View on Shef
        </a>
        {item.availableDays && item.availableDays.length > 0 && (
          <div className="flex gap-1 mt-1.5">
            {item.availableDays.map((day) => (
              <span
                key={day}
                className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
              >
                {day.slice(0, 3)}
              </span>
            ))}
          </div>
        )}
        {item.preferredPortion && (
          <span className="inline-block text-[10px] px-1.5 py-0.5 mt-1.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
            {item.preferredPortion}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={handleDecrease}
            disabled={item.quantity <= 1}
            className="btn-press w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Decrease quantity"
          >
            -
          </button>
          <span className="w-8 text-center text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
            {item.quantity}
          </span>
          <button
            onClick={handleIncrease}
            className="btn-press w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-all"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>

        <button
          onClick={() => onDelete(item.id)}
          className="btn-press p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
          aria-label="Delete item"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
