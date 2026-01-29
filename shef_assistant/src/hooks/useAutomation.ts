"use client";

import { useState, useCallback, useRef } from "react";

export type AutomationState = "idle" | "running" | "success" | "error";

interface UseAutomationResult {
  state: AutomationState;
  progress: number;
  logs: string[];
  message: string;
  startPrefill: () => void;
  reset: () => void;
}

export function useAutomation(): UseAutomationResult {
  const [state, setState] = useState<AutomationState>("idle");
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  const reset = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setState("idle");
    setProgress(0);
    setLogs([]);
    setMessage("");
  }, []);

  const startPrefill = useCallback(() => {
    // Close any existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // Reset state
    setState("running");
    setProgress(0);
    setLogs([]);
    setMessage("Starting prefill...");

    const eventSource = new EventSource("/api/prefill/stream");
    eventSourceRef.current = eventSource;

    eventSource.addEventListener("log", (event) => {
      try {
        const logMessage = JSON.parse(event.data);
        setLogs((prev) => [...prev, logMessage]);
      } catch (error) {
        console.error("Failed to parse log message:", error);
      }
    });

    eventSource.addEventListener("progress", (event) => {
      try {
        const progressValue = parseInt(JSON.parse(event.data), 10);
        setProgress(progressValue);
      } catch (error) {
        console.error("Failed to parse progress:", error);
      }
    });

    eventSource.addEventListener("complete", (event) => {
      try {
        const result = JSON.parse(event.data);
        if (result === "success") {
          setState("success");
          setMessage("Cart prefilled successfully!");
          setProgress(100);
        } else {
          setState("error");
          setMessage(result.replace("error: ", ""));
        }
      } catch (error) {
        console.error("Failed to parse completion result:", error);
        setState("error");
        setMessage("Failed to parse automation result");
      }
      eventSource.close();
      eventSourceRef.current = null;
    });

    eventSource.onerror = () => {
      setState("error");
      setMessage("Connection lost. Please try again.");
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, []);

  return {
    state,
    progress,
    logs,
    message,
    startPrefill,
    reset,
  };
}
