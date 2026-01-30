"use client";

import { getTomorrowDate } from "@/lib/types";

export function TomorrowWarning() {
  const tomorrow = getTomorrowDate();
  const dayName = tomorrow.toLocaleDateString("en-US", { weekday: "long" });
  const monthDay = tomorrow.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-4">
      <div className="flex items-start gap-2">
        <span className="text-amber-600 dark:text-amber-400 text-lg">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Orders are for TOMORROW ({dayName}, {monthDay})
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
            Order by tonight to receive food tomorrow
          </p>
        </div>
      </div>
    </div>
  );
}
