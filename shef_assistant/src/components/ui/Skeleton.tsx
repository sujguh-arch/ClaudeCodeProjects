"use client";

import { type HTMLAttributes } from "react";

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: "none" | "sm" | "md" | "lg" | "full";
}

const roundedStyles = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  full: "rounded-full",
};

export function Skeleton({
  width,
  height,
  rounded = "md",
  className = "",
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`skeleton ${roundedStyles[rounded]} ${className}`}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        ...style,
      }}
      {...props}
    />
  );
}

// Pre-built skeleton variants for common use cases
export function SkeletonText({
  lines = 1,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 && lines > 1 ? "75%" : "100%"}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`p-4 space-y-3 ${className}`}>
      <Skeleton height={20} width="60%" />
      <SkeletonText lines={2} />
      <div className="flex gap-2 pt-2">
        <Skeleton height={32} width={80} rounded="lg" />
        <Skeleton height={32} width={80} rounded="lg" />
      </div>
    </div>
  );
}

export function SkeletonItemCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 p-3 bg-[var(--foreground)] rounded-lg border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <Skeleton width={48} height={48} rounded="lg" />
      <div className="flex-1 space-y-2">
        <Skeleton height={16} width="70%" />
        <Skeleton height={12} width="40%" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton width={28} height={28} rounded="md" />
        <Skeleton width={24} height={20} rounded="sm" />
        <Skeleton width={28} height={28} rounded="md" />
      </div>
    </div>
  );
}
