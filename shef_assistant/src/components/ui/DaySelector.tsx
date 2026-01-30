"use client";

import { DAYS_OF_WEEK, DAY_ABBREVIATIONS, type DayOfWeek } from "@/lib/types";

interface DaySelectorProps {
  selectedDays: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  label?: string;
}

export function DaySelector({
  selectedDays,
  onChange,
  disabled = false,
  size = "md",
  label,
}: DaySelectorProps) {
  const handleDayToggle = (day: DayOfWeek) => {
    if (disabled) return;

    const isSelected = selectedDays.includes(day);
    if (isSelected) {
      onChange(selectedDays.filter((d) => d !== day));
    } else {
      onChange([...selectedDays, day]);
    }
  };

  const sizeClasses = {
    sm: "w-6 h-6 text-[10px]",
    md: "w-8 h-8 text-xs",
  };

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      )}
      <div className="flex items-center gap-1">
        {DAYS_OF_WEEK.map((day) => {
          const isSelected = selectedDays.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => handleDayToggle(day)}
              disabled={disabled}
              className={`
                btn-press rounded-md font-medium transition-all
                ${sizeClasses[size]}
                ${
                  isSelected
                    ? "bg-shef-red text-white shadow-sm"
                    : "bg-gray-100 dark:bg-gray-800 text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-gray-700"
                }
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}
              `}
              aria-label={`${isSelected ? "Remove" : "Add"} ${day}`}
              title={day.charAt(0).toUpperCase() + day.slice(1)}
            >
              {DAY_ABBREVIATIONS[day]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Compact read-only version for displaying selected days
export function DayBadges({
  days,
  size = "sm",
}: {
  days: DayOfWeek[];
  size?: "sm" | "md";
}) {
  if (!days || days.length === 0) return null;

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-xs px-2 py-1",
  };

  return (
    <div className="flex flex-wrap gap-1">
      {days.map((day) => (
        <span
          key={day}
          className={`
            ${sizeClasses[size]}
            rounded bg-gray-100 dark:bg-gray-700
            text-gray-500 dark:text-gray-400
          `}
        >
          {day.slice(0, 3)}
        </span>
      ))}
    </div>
  );
}
