"use client";

import { forwardRef } from "react";
import { motion } from "framer-motion";

interface ProductInputProps {
  url: string;
  loading: boolean;
  onUrlChange: (url: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

const ProductInput = forwardRef<HTMLInputElement, ProductInputProps>(
  function ProductInput({ url, loading, onUrlChange, onSubmit }, ref) {
    return (
      <form onSubmit={onSubmit} className="relative">
        <input
          ref={ref}
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="Paste a product link..."
          className="w-full pl-5 pr-28 py-4"
          style={{ borderRadius: "var(--radius-lg)", background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-sm)", transition: "var(--transition-normal)" }}
        />
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          disabled={loading || !url.trim()}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 px-5 py-2.5 disabled:opacity-30"
          style={{ borderRadius: "var(--radius-md)", background: loading ? "var(--accent-muted)" : "var(--accent)", color: "var(--bg-base)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", letterSpacing: "var(--tracking-wide)", transition: "var(--transition-fast)" }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full animate-spin" style={{ border: "2px solid rgba(10,10,9,0.2)", borderTopColor: "var(--bg-base)" }} />
              Adding
            </span>
          ) : (
            "Add"
          )}
        </motion.button>
      </form>
    );
  }
);

export default ProductInput;
