"use client";

import { useEffect, useRef } from "react";
import type { AutomationState } from "@/hooks/useAutomation";

interface AutomationPanelProps {
  state: AutomationState;
  progress: number;
  logs: string[];
  message: string;
  onReset?: () => void;
}

export default function AutomationPanel({
  state,
  progress,
  logs,
  message,
  onReset,
}: AutomationPanelProps) {
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  if (state === "idle") {
    return null;
  }

  const stateColors = {
    running: "text-blue-600 dark:text-blue-400",
    success: "text-green-600 dark:text-green-400",
    error: "text-red-600 dark:text-red-400",
  };

  const progressBgColors = {
    running: "bg-blue-600",
    success: "bg-green-600",
    error: "bg-red-600",
  };

  return (
    <div className="bg-[var(--foreground)] rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {state === "running" && (
            <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse" />
          )}
          {state === "success" && (
            <div className="w-3 h-3 rounded-full bg-green-500" />
          )}
          {state === "error" && (
            <div className="w-3 h-3 rounded-full bg-red-500" />
          )}
          <span className={`font-medium ${stateColors[state]}`}>
            {state === "running" && "Prefilling Cart..."}
            {state === "success" && "Prefill Complete"}
            {state === "error" && "Prefill Failed"}
          </span>
        </div>
        {(state === "success" || state === "error") && onReset && (
          <button
            onClick={onReset}
            className="text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>

      {/* Progress Bar */}
      {state === "running" && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`${progressBgColors[state]} h-2 rounded-full transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Status Message */}
      {message && (
        <p className="text-sm text-[var(--text-primary)]">{message}</p>
      )}

      {/* Log Output */}
      {logs.length > 0 && (
        <div className="mt-2">
          <details open={state === "running"}>
            <summary className="text-xs text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]">
              Automation logs ({logs.length} lines)
            </summary>
            <div className="mt-2 p-3 bg-[var(--background)] rounded-lg max-h-48 overflow-y-auto font-mono text-xs">
              {logs.map((log, index) => (
                <div
                  key={index}
                  className="text-[var(--text-secondary)] py-0.5 break-all"
                >
                  {log}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
