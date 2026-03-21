"use client";

import { useState } from "react";

interface AddProductModalProps {
  onClose: () => void;
  onAdded: () => void;
}

export default function AddProductModal({
  onClose,
  onAdded,
}: AddProductModalProps) {
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState("dress");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const resp = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, category }),
      });

      if (!resp.ok) {
        const data = await resp.json();
        throw new Error(data.error || "Failed to add product");
      }

      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl p-8 max-w-md w-[90%] shadow-2xl">
        <h2 className="text-lg font-medium mb-4">Add Product</h2>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-stone-600 mb-1">
            Product URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.princesspolly.com/products/..."
            className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-stone-400"
            required
          />

          <label className="block text-sm text-stone-600 mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-4 py-2.5 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-stone-400"
          >
            <option value="dress">Dress</option>
            <option value="shoes">Shoes</option>
            <option value="tights">Tights</option>
            <option value="hair">Hair</option>
            <option value="other">Other</option>
          </select>

          {error && (
            <p className="text-red-500 text-sm mb-3">{error}</p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-stone-300 rounded-lg py-2.5 text-sm hover:bg-stone-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-stone-900 text-white rounded-lg py-2.5 text-sm hover:bg-stone-700 transition disabled:opacity-50"
            >
              {loading ? "Scraping..." : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
