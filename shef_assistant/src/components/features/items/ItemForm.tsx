"use client";

import { useState } from "react";
import { isValidShefUrl, type DayOfWeek } from "@/lib/types";
import { DaySelector } from "@/components/ui/DaySelector";

interface ItemFormProps {
  onAdd: (
    name: string,
    url: string,
    quantity: number,
    options?: { availableDays?: DayOfWeek[]; preferredPortion?: string }
  ) => void;
}

export default function ItemForm({ onAdd }: ItemFormProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [urlError, setUrlError] = useState("");
  const [availableDays, setAvailableDays] = useState<DayOfWeek[]>([]);
  const [preferredPortion, setPreferredPortion] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    if (!isValidShefUrl(url)) {
      setUrlError("URL must start with https://shef.com/");
      return;
    }

    setUrlError("");
    onAdd(name.trim(), url.trim(), quantity, {
      availableDays: availableDays.length > 0 ? availableDays : undefined,
      preferredPortion: preferredPortion.trim() || undefined,
    });

    // Reset form
    setName("");
    setUrl("");
    setQuantity(1);
    setAvailableDays([]);
    setPreferredPortion("");
    setShowAdvanced(false);
  };

  const handleUrlChange = (value: string) => {
    setUrl(value);
    if (urlError && isValidShefUrl(value)) {
      setUrlError("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="item-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Item Name
        </label>
        <input
          id="item-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Chicken Tikka Masala"
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shef-red focus:border-transparent"
          required
        />
      </div>

      <div>
        <label htmlFor="item-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Shef URL
        </label>
        <input
          id="item-url"
          type="url"
          value={url}
          onChange={(e) => handleUrlChange(e.target.value)}
          placeholder="https://shef.com/order/shef/..."
          className={`w-full px-3 py-2 bg-white dark:bg-gray-800 border rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shef-red focus:border-transparent ${
            urlError ? "border-red-500" : "border-gray-300 dark:border-gray-600"
          }`}
          required
        />
        {urlError && <p className="mt-1 text-sm text-red-500">{urlError}</p>}
      </div>

      <div>
        <label htmlFor="item-quantity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Quantity
        </label>
        <input
          id="item-quantity"
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
          className="w-24 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-shef-red focus:border-transparent"
        />
      </div>

      {/* Advanced options toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        {showAdvanced ? "- Hide options" : "+ More options"}
      </button>

      {/* Advanced options */}
      {showAdvanced && (
        <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Available Days
              <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">
                (leave empty for all days)
              </span>
            </label>
            <DaySelector
              selectedDays={availableDays}
              onChange={setAvailableDays}
              size="sm"
            />
          </div>
          <div>
            <label htmlFor="item-portion" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Preferred Portion
              <span className="font-normal text-gray-500 dark:text-gray-400 ml-1">
                (optional)
              </span>
            </label>
            <input
              id="item-portion"
              type="text"
              value={preferredPortion}
              onChange={(e) => setPreferredPortion(e.target.value)}
              placeholder='e.g., Large (16oz), Small, Family Size'
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-shef-red focus:border-transparent text-sm"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter the portion name as it appears on Shef. If not found, the first option will be selected.
            </p>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="btn-gradient w-full px-4 py-2 text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-shef-red focus:ring-offset-2"
      >
        Add Item
      </button>
    </form>
  );
}
