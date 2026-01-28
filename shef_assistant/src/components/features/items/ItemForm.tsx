"use client";

import { useState } from "react";
import { isValidShefUrl } from "@/lib/types";

interface ItemFormProps {
  onAdd: (name: string, url: string, quantity: number) => void;
}

export default function ItemForm({ onAdd }: ItemFormProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [urlError, setUrlError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;

    if (!isValidShefUrl(url)) {
      setUrlError("URL must start with https://shef.com/");
      return;
    }

    setUrlError("");
    onAdd(name.trim(), url.trim(), quantity);

    // Reset form
    setName("");
    setUrl("");
    setQuantity(1);
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

      <button
        type="submit"
        className="w-full px-4 py-2 bg-shef-red text-white font-semibold rounded-lg hover:bg-shef-red-dark focus:outline-none focus:ring-2 focus:ring-shef-red focus:ring-offset-2 transition-colors"
      >
        Add Item
      </button>
    </form>
  );
}
