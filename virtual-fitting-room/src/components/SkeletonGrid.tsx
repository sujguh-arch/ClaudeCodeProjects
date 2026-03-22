function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-image" />
      <div className="p-3 flex flex-col gap-2.5">
        <div className="skeleton-text skeleton-text-long" />
        <div className="skeleton-text skeleton-text-short" />
      </div>
    </div>
  );
}

export default function SkeletonGrid({ count, cols }: { count: number; cols: string }) {
  return (
    <div className={`grid ${cols} gap-3 sm:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
