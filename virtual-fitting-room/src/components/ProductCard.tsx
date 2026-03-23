"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFFMUQxQSIvPjwvc3ZnPg==";

function formatPrice(price: number): string {
  return price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
}

interface ProductCardProps {
  id: string;
  title: string;
  price: number | null;
  store: string;
  category: string;
  images: string[];
  generatedImages?: string[];
  isGenerating?: boolean;
  onClick: () => void;
  onGenerate: () => void;
}

export default function ProductCard({
  title,
  price,
  store,
  images,
  generatedImages,
  isGenerating,
  onClick,
  onGenerate,
}: ProductCardProps) {
  const hasGenerated = generatedImages && generatedImages.length > 0;
  const displayImage = hasGenerated ? generatedImages[0] : images[0];

  return (
    <div
      data-testid="product-card"
      className="overflow-hidden card-hover group"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="relative aspect-[2/3] overflow-hidden cursor-pointer card-gradient"
        style={{ background: "var(--bg-elevated)" }}
        onClick={onClick}
      >
        {displayImage && (
          <Image
            src={displayImage}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover card-image"
            loading="lazy"
            placeholder="blur"
            blurDataURL={BLUR_PLACEHOLDER}
          />
        )}
        {hasGenerated && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 z-10"
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: "var(--weight-semibold)",
              borderRadius: "var(--radius-sm)",
              background: "var(--accent-subtle)",
              color: "var(--accent)",
              border: "1px solid var(--accent-border)",
              letterSpacing: "var(--tracking-wider)",
            }}
          >
            Your fit
          </span>
        )}
        {!hasGenerated && (
          <span
            className="absolute top-3 left-3 px-2.5 py-1 z-10"
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: "var(--weight-semibold)",
              borderRadius: "var(--radius-sm)",
              background: "rgba(0,0,0,0.5)",
              color: "var(--text-primary)",
              backdropFilter: "blur(8px)",
              letterSpacing: "var(--tracking-wider)",
              textTransform: "uppercase",
            }}
          >
            {store}
          </span>
        )}
        {(images.length > 1 || (generatedImages && generatedImages.length > 1)) && (
          <span
            className="absolute bottom-3 right-3 px-2 py-0.5 z-10"
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: "var(--weight-medium)",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {hasGenerated ? generatedImages.length : images.length} photos
          </span>
        )}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center gap-3"
              style={{ background: "var(--overlay-heavy)", backdropFilter: "blur(8px)" }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                className="w-6 h-6 rounded-full"
                style={{ border: "2px solid var(--accent-muted)", borderTopColor: "var(--accent)" }}
              />
              <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", letterSpacing: "var(--tracking-wide)" }}>
                Creating your look...
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="p-3.5">
        <p className="mb-1" style={{ fontSize: "var(--text-caption)", color: "var(--text-tertiary)", letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>
          {store}
        </p>
        <h3
          className="line-clamp-2 mb-2"
          style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", lineHeight: "var(--leading-snug)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {title}
        </h3>
        <div className="flex items-center justify-between">
          {price != null && (
            <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-base)", color: "var(--text-primary)" }}>
              {formatPrice(price)}
            </span>
          )}
          {!hasGenerated && !isGenerating && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              data-testid="tryon-button"
              onClick={(e) => { e.stopPropagation(); onGenerate(); }}
              className="px-3 py-1.5"
              style={{
                fontSize: "var(--text-caption)",
                fontWeight: "var(--weight-semibold)",
                background: "var(--accent)",
                color: "var(--bg-base)",
                borderRadius: "var(--radius-md)",
                letterSpacing: "var(--tracking-wider)",
                border: "none",
                cursor: "pointer",
                transition: "var(--transition-fast)",
              }}
            >
              Try On
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}
