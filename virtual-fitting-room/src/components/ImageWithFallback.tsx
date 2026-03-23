"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

function FallbackPlaceholder({ store }: { store?: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
      style={{
        background: "linear-gradient(135deg, #1C1C1C 0%, #2A2A2A 50%, #1C1C1C 100%)",
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="var(--text-tertiary)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.4 }}
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      {store && (
        <span
          style={{
            fontSize: "var(--text-caption)",
            color: "var(--text-tertiary)",
            letterSpacing: "var(--tracking-wider)",
            textTransform: "uppercase",
            opacity: 0.6,
          }}
        >
          {store}
        </span>
      )}
    </div>
  );
}

interface ImageWithFallbackProps extends Omit<ImageProps, "onError"> {
  store?: string;
}

export default function ImageWithFallback({
  store,
  alt,
  ...props
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <FallbackPlaceholder store={store} />;
  }

  return (
    <Image
      alt={alt}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}
