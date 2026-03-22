"use client";

import { motion } from "framer-motion";

function HangerIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
      <path d="M24 8a4 4 0 0 1 4 4c0 2-2 3-4 4" />
      <path d="M8 32l16-16 16 16" />
      <path d="M8 32h32" />
      <circle cx="24" cy="8" r="2" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
      <path d="M24 4v8M24 36v8M4 24h8M36 24h8" />
      <path d="M10 10l6 6M32 32l6 6M10 38l6-6M32 16l6-6" />
      <circle cx="24" cy="24" r="4" />
    </svg>
  );
}

export function EmptyOutfits({ onCreateOutfit }: { onCreateOutfit: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-center py-20 px-6"
    >
      <div className="flex justify-center mb-5">
        <SparkleIcon />
      </div>
      <p className="mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: "var(--text-secondary)" }}>
        Style starts here
      </p>
      <p className="mb-6" style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", lineHeight: "var(--leading-relaxed)", maxWidth: "280px", margin: "0 auto" }}>
        Combine a dress, shoes, tights, bag, and accessories into one complete look
      </p>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onCreateOutfit}
        className="px-6 py-2.5"
        style={{ borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--bg-base)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", letterSpacing: "var(--tracking-wider)" }}
      >
        Create your first outfit
      </motion.button>
    </motion.div>
  );
}

export function EmptyCloset({
  category,
  onFocusInput,
}: {
  category: string;
  onFocusInput: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center py-20 px-6">
      <div className="flex justify-center mb-5">
        <HangerIcon />
      </div>
      <p className="mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: "var(--text-secondary)" }}>
        {category === "all" ? "Your closet awaits" : `No ${category === "bag" ? "bags" : category} yet`}
      </p>
      <p className="mb-6" style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", lineHeight: "var(--leading-relaxed)", maxWidth: "260px", margin: "0 auto" }}>
        {category === "all"
          ? "Find something you love and paste the link above"
          : `Browse your favorite stores and add a ${category === "bag" ? "bag" : category}`
        }
      </p>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onFocusInput}
        className="px-6 py-2.5"
        style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", letterSpacing: "var(--tracking-wider)", transition: "var(--transition-fast)" }}
      >
        Add your first piece
      </motion.button>
    </motion.div>
  );
}
