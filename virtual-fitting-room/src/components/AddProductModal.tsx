"use client";

import { useState } from "react";
import { motion } from "framer-motion";

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
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full p-8 pb-10"
        style={{
          background: "rgba(15,15,15,0.85)",
          backdropFilter: "blur(24px) saturate(1.5)",
          WebkitBackdropFilter: "blur(24px) saturate(1.5)",
          borderRadius: "24px 24px 0 0",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "var(--shadow-modal)",
        }}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: "rgba(255,255,255,0.15)" }} />
        <h2
          className="mb-5"
          style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: "var(--text-primary)" }}
        >
          Add Product
        </h2>

        <form onSubmit={handleSubmit}>
          <label
            className="block mb-1"
            style={{ fontFamily: "var(--font-display)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.15em", textTransform: "uppercase" }}
          >
            Product URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.princesspolly.com/products/..."
            autoFocus
            className="w-full px-4 py-3 text-sm mb-4"
            style={{
              borderRadius: "var(--radius-md)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-primary)",
            }}
            required
          />

          <label
            className="block mb-1"
            style={{ fontFamily: "var(--font-display)", fontSize: "10px", color: "var(--text-tertiary)", letterSpacing: "0.15em", textTransform: "uppercase" }}
          >
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 text-sm mb-4"
            style={{
              borderRadius: "var(--radius-md)",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-primary)",
            }}
          >
            <option value="dress">Dress</option>
            <option value="shoes">Shoes</option>
            <option value="tights">Tights</option>
            <option value="bag">Bag</option>
            <option value="accessories">Accessories</option>
            <option value="other">Other</option>
          </select>

          {error && (
            <p className="mb-3" style={{ fontSize: "var(--text-sm)", color: "var(--error)" }}>{error}</p>
          )}

          <div className="flex gap-3">
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm"
              style={{
                borderRadius: "var(--radius-md)",
                background: "rgba(255,255,255,0.06)",
                color: "var(--text-secondary)",
                fontWeight: "var(--weight-medium)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Cancel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(212,175,97,0.25)" }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="flex-1 py-3 text-sm disabled:opacity-40"
              style={{
                borderRadius: "var(--radius-md)",
                background: "var(--accent)",
                color: "var(--bg-base)",
                fontWeight: "var(--weight-semibold)",
                letterSpacing: "var(--tracking-wider)",
                textTransform: "uppercase",
              }}
            >
              {loading ? "Adding..." : "Add Product"}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
