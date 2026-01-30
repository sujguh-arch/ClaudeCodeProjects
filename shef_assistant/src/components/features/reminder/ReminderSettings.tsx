"use client";

import { useState, useSyncExternalStore, useCallback } from "react";
import { useReminder } from "@/hooks/useReminder";
import { DAYS_OF_WEEK, DAY_ABBREVIATIONS, type DayOfWeek } from "@/lib/types";

// Get notification permission safely for SSR
function getNotificationPermission(): NotificationPermission {
  if (typeof window !== "undefined" && "Notification" in window) {
    return Notification.permission;
  }
  return "default";
}

function subscribeToNothing() {
  return () => {};
}

export function ReminderSettings() {
  const {
    config,
    isLoading,
    error,
    updateConfig,
    requestNotificationPermission,
  } = useReminder();

  const [isSaving, setIsSaving] = useState(false);
  const [localNotifPermission, setLocalNotifPermission] = useState<NotificationPermission>("default");

  // Use useSyncExternalStore to get notification permission safely
  const notifPermission = useSyncExternalStore(
    subscribeToNothing,
    getNotificationPermission,
    () => "default" as NotificationPermission
  );

  // Use actual permission or local state (for updates after requesting)
  const currentPermission = localNotifPermission !== "default" ? localNotifPermission : notifPermission;

  // Derive values from config with defaults
  const enabled = config?.enabled ?? false;
  const time = config?.time ?? "09:00";
  const days = config?.days ?? [];
  const browserNotification = config?.browserNotification ?? true;

  const handleToggle = useCallback(async () => {
    setIsSaving(true);
    await updateConfig({ enabled: !enabled });
    setIsSaving(false);
  }, [enabled, updateConfig]);

  const handleTimeChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setIsSaving(true);
    await updateConfig({ time: newTime });
    setIsSaving(false);
  }, [updateConfig]);

  const handleDayToggle = useCallback(async (day: DayOfWeek) => {
    const newDays = days.includes(day)
      ? days.filter((d) => d !== day)
      : [...days, day];
    setIsSaving(true);
    await updateConfig({ days: newDays });
    setIsSaving(false);
  }, [days, updateConfig]);

  const handleNotifToggle = useCallback(async () => {
    const newNotif = !browserNotification;

    // If enabling, request permission
    if (newNotif && currentPermission !== "granted") {
      const permission = await requestNotificationPermission();
      setLocalNotifPermission(permission);
      if (permission !== "granted") {
        return;
      }
    }

    setIsSaving(true);
    await updateConfig({ browserNotification: newNotif });
    setIsSaving(false);
  }, [browserNotification, currentPermission, updateConfig, requestNotificationPermission]);

  if (isLoading) {
    return (
      <div className="bg-[var(--foreground)] rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <section className="bg-[var(--foreground)] rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-[var(--text-primary)]">
          Food Reminder
        </h2>
        <button
          onClick={handleToggle}
          disabled={isSaving}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            enabled ? "bg-shef-red" : "bg-gray-300 dark:bg-gray-600"
          } ${isSaving ? "opacity-50" : ""}`}
          aria-label={enabled ? "Disable reminder" : "Enable reminder"}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {error && (
        <div className="mb-4 text-sm text-red-500 dark:text-red-400">
          {error}
        </div>
      )}

      <div
        className={`space-y-4 transition-opacity ${
          enabled ? "opacity-100" : "opacity-50 pointer-events-none"
        }`}
      >
        {/* Time picker */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-[var(--text-secondary)] whitespace-nowrap">
            Check at:
          </label>
          <input
            type="time"
            value={time}
            onChange={handleTimeChange}
            disabled={!enabled || isSaving}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-[var(--background)] text-[var(--text-primary)] text-sm"
          />
        </div>

        {/* Day selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[var(--text-secondary)]">on:</span>
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              onClick={() => handleDayToggle(day)}
              disabled={!enabled || isSaving}
              className={`w-8 h-8 rounded-md text-xs font-medium transition-colors ${
                days.includes(day)
                  ? "bg-shef-red text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-[var(--text-secondary)] hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
              aria-label={`${days.includes(day) ? "Disable" : "Enable"} ${day}`}
              title={day.charAt(0).toUpperCase() + day.slice(1)}
            >
              {DAY_ABBREVIATIONS[day]}
            </button>
          ))}
        </div>

        {/* Browser notification toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="browser-notif"
            checked={browserNotification}
            onChange={handleNotifToggle}
            disabled={!enabled || isSaving}
            className="w-4 h-4 rounded border-gray-300 text-shef-red focus:ring-shef-red"
          />
          <label
            htmlFor="browser-notif"
            className="text-sm text-[var(--text-secondary)]"
          >
            Browser notification
          </label>
          {currentPermission === "denied" && browserNotification && (
            <span className="text-xs text-amber-500">
              (permission blocked)
            </span>
          )}
        </div>

        {/* Next reminder info */}
        {config?.nextReminder && enabled && (
          <div className="text-xs text-[var(--text-secondary)] pt-2 border-t border-gray-200 dark:border-gray-700">
            Next reminder:{" "}
            {new Date(config.nextReminder).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </section>
  );
}
