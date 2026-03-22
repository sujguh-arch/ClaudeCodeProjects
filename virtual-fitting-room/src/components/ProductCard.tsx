"use client";

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
      className="overflow-hidden card-hover group"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}
    >
      <div
        className="relative aspect-[2/3] overflow-hidden cursor-pointer card-gradient"
        style={{ background: "var(--bg-elevated)" }}
        onClick={onClick}
      >
        {displayImage && (
          <img
            src={displayImage}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover card-image"
            loading="lazy"
          />
        )}
        {hasGenerated && (
          <span
            className="absolute top-2.5 left-2.5 px-2 py-0.5 z-10"
            style={{
              fontSize: "var(--text-caption, 10px)",
              fontWeight: "var(--weight-semibold, 600)",
              borderRadius: "var(--radius-sm)",
              background: "var(--accent-subtle)",
              color: "var(--accent)",
              border: "1px solid var(--accent-border)",
              letterSpacing: "var(--tracking-wider, 0.06em)",
            }}
          >
            Your fit
          </span>
        )}
        {!hasGenerated && (
          <span
            className="absolute top-2.5 left-2.5 px-2 py-0.5 z-10"
            style={{
              fontSize: "var(--text-caption, 10px)",
              fontWeight: "var(--weight-semibold, 600)",
              borderRadius: "var(--radius-sm)",
              background: "var(--overlay-light)",
              color: "var(--text-primary)",
              backdropFilter: "blur(4px)",
              letterSpacing: "var(--tracking-wider, 0.06em)",
              textTransform: "uppercase",
            }}
          >
            {store}
          </span>
        )}
        {(images.length > 1 || (generatedImages && generatedImages.length > 1)) && (
          <span
            className="absolute bottom-2.5 right-2.5 px-2 py-0.5 z-10"
            style={{
              fontSize: "var(--text-caption, 10px)",
              fontWeight: "var(--weight-medium, 500)",
              background: "var(--overlay-medium)",
              backdropFilter: "blur(4px)",
              color: "var(--text-primary)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {hasGenerated ? generatedImages.length : images.length} photos
          </span>
        )}
        {isGenerating && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
            style={{ background: "var(--overlay-heavy)", backdropFilter: "blur(8px)" }}
          >
            <div
              className="w-5 h-5 rounded-full animate-spin"
              style={{ border: "2px solid var(--accent-muted)", borderTopColor: "var(--accent)" }}
            />
            <span style={{ fontSize: "var(--text-xs, 11px)", color: "var(--text-secondary)" }}>
              Creating your look...
            </span>
          </div>
        )}
      </div>
      <div className="p-3.5">
        <p className="mb-0.5" style={{ fontSize: "var(--text-caption, 10px)", color: "var(--text-tertiary)", letterSpacing: "var(--tracking-wider, 0.06em)", textTransform: "uppercase" }}>
          {store}
        </p>
        <h3
          className="line-clamp-2 mb-2"
          style={{ fontSize: "var(--text-sm, 13px)", fontWeight: "var(--weight-medium, 500)", lineHeight: "var(--leading-snug, 1.3)", color: "var(--text-primary)" }}
        >
          {title}
        </h3>
        <div className="flex items-center justify-between">
          {price && (
            <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-base, 15px)", color: "var(--text-primary)" }}>
              ${price}
            </span>
          )}
          {!hasGenerated && !isGenerating && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
              className="px-3 py-1.5"
              style={{
                fontSize: "var(--text-caption, 10px)",
                fontWeight: "var(--weight-medium, 500)",
                background: "var(--accent)",
                color: "var(--bg-base)",
                borderRadius: "var(--radius-md)",
                letterSpacing: "var(--tracking-wider, 0.06em)",
                border: "none",
                cursor: "pointer",
                transition: "var(--transition-fast)",
              }}
            >
              Try On
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
