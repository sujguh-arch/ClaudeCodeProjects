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

const storeColors: Record<string, string> = {
  "Princess Polly": "bg-pink-400",
  Peppermayo: "bg-amber-400",
  "Oh Polly": "bg-teal-400",
  "House of CB": "bg-purple-500",
  Revolve: "bg-red-500",
};

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
  const badgeColor = storeColors[store] || "bg-gray-500";

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group">
      <div
        className="relative aspect-[3/4] bg-stone-100 cursor-pointer overflow-hidden"
        onClick={onClick}
      >
        {displayImage && (
          <img
            src={displayImage}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        )}
        <span
          className={`absolute top-2 left-2 ${badgeColor} text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider`}
        >
          {store}
        </span>
        {(images.length > 1 || (generatedImages && generatedImages.length > 1)) && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full">
            {hasGenerated ? generatedImages.length : images.length} photos
          </span>
        )}
        {hasGenerated && (
          <span className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            YOUR FIT
          </span>
        )}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-xs font-medium leading-tight line-clamp-2">
          {title}
        </h3>
        <div className="flex items-center justify-between mt-2">
          {price && (
            <span className="text-sm font-semibold">${price}</span>
          )}
          {!hasGenerated && !isGenerating && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerate();
              }}
              className="text-[10px] bg-stone-900 text-white px-3 py-1 rounded-full hover:bg-stone-700 transition"
            >
              Try On
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
