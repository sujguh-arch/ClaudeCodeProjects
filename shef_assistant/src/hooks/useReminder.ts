"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { DayOfWeek } from "@/lib/types";

interface ReminderConfig {
  enabled: boolean;
  time: string;
  days: DayOfWeek[];
  browserNotification: boolean;
  lastTriggered?: string;
  shouldTrigger?: boolean;
  nextReminder?: string | null;
}

interface UseReminderResult {
  config: ReminderConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  updateConfig: (updates: Partial<ReminderConfig>) => Promise<boolean>;
  markTriggered: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
  showNotification: (title: string, body: string) => void;
}

export function useReminder(): UseReminderResult {
  const [config, setConfig] = useState<ReminderConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reminder");
      const data = await response.json();

      if (data.success && data.data) {
        setConfig(data.data);
      } else {
        setError(data.error || "Failed to fetch reminder config");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch reminder config");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConfig = useCallback(
    async (updates: Partial<ReminderConfig>): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch("/api/reminder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        const data = await response.json();

        if (data.success && data.data) {
          setConfig((prev) => (prev ? { ...prev, ...data.data } : data.data));
          return true;
        } else {
          setError(data.error || "Failed to update reminder config");
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update reminder config");
        return false;
      }
    },
    []
  );

  const markTriggered = useCallback(async () => {
    try {
      await fetch("/api/reminder", { method: "POST" });
      // Refresh config to get updated lastTriggered
      await fetchConfig();
    } catch (err) {
      console.error("Failed to mark reminder as triggered:", err);
    }
  }, [fetchConfig]);

  const requestNotificationPermission =
    useCallback(async (): Promise<NotificationPermission> => {
      if (!("Notification" in window)) {
        return "denied";
      }

      if (Notification.permission === "granted") {
        return "granted";
      }

      if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission;
      }

      return Notification.permission;
    }, []);

  const showNotification = useCallback((title: string, body: string) => {
    if (!("Notification" in window)) {
      console.warn("Notifications not supported");
      return;
    }

    if (Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "shef-reminder",
      });
    }
  }, []);

  // Check for reminder trigger periodically
  useEffect(() => {
    const checkReminder = async () => {
      if (!config?.enabled) return;

      const response = await fetch("/api/reminder");
      const data = await response.json();

      if (data.success && data.data?.shouldTrigger) {
        // Show notification
        if (data.data.browserNotification) {
          const permission = await requestNotificationPermission();
          if (permission === "granted") {
            showNotification(
              "Food Reminder",
              "Time to check your Shef orders! Are you running low on food?"
            );
          }
        }

        // Mark as triggered
        await markTriggered();
      }
    };

    // Initial fetch
    fetchConfig();

    // Set up interval check every minute
    checkIntervalRef.current = setInterval(checkReminder, 60000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [
    config?.enabled,
    fetchConfig,
    markTriggered,
    requestNotificationPermission,
    showNotification,
  ]);

  return {
    config,
    isLoading,
    error,
    fetchConfig,
    updateConfig,
    markTriggered,
    requestNotificationPermission,
    showNotification,
  };
}
