"use client";

import { useEffect, useCallback } from "react";

interface LightboxProps {
  title: string;
  store: string;
  price: number | null;
  url: string;
  images: string[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onGoTo: (index: number) => void;
}

export default function Lightbox({
  title,
  store,
  price,
  url,
  images,
  currentIndex,
  onClose,
  onNext,
  onPrev,
  onGoTo,
}: LightboxProps) {
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "Escape") onClose();
    },
    [onNext, onPrev, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [handleKey]);

  return (
    <div
      className="fixed inset-0 bg-black/92 z-50 flex items-center justify-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <button
        onClick={onClose}
        className="absolute top-5 right-6 text-white text-3xl opacity-70 hover:opacity-100 z-10"
      >
        &times;
      </button>

      <div className="flex max-w-[1200px] w-[95%] max-h-[90vh] gap-6">
        <div className="flex-1 flex items-center justify-center relative">
          <button
            onClick={onPrev}
            className="absolute left-3 text-white text-4xl opacity-60 hover:opacity-100 select-none"
          >
            &lsaquo;
          </button>
          <img
            src={images[currentIndex]}
            alt={title}
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
          />
          <button
            onClick={onNext}
            className="absolute right-3 text-white text-4xl opacity-60 hover:opacity-100 select-none"
          >
            &rsaquo;
          </button>
        </div>

        <div className="w-72 text-white overflow-y-auto py-4 hidden md:block">
          <h2 className="text-lg font-medium mb-1">{title}</h2>
          <p className="text-sm opacity-60 mb-2">{store}</p>
          {price && <p className="text-xl font-semibold mb-4">${price}</p>}

          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {images.map((img, i) => (
              <img
                key={i}
                src={img}
                className={`w-full aspect-[3/4] object-cover rounded cursor-pointer border-2 transition ${
                  i === currentIndex
                    ? "opacity-100 border-white"
                    : "opacity-40 border-transparent hover:opacity-60"
                }`}
                onClick={() => onGoTo(i)}
              />
            ))}
          </div>

          <p className="text-center text-sm opacity-40">
            {currentIndex + 1} / {images.length}
          </p>

          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 bg-white text-stone-900 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-stone-100 transition"
            >
              Shop this look &rarr;
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
