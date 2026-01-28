"use client";

import { useState, useEffect, useCallback } from "react";

type Status = "checking" | "logged_in" | "logged_out" | "no_profile" | "error";

interface LoginStatusProps {
  className?: string;
}

export default function LoginStatus({ className = "" }: LoginStatusProps) {
  const [status, setStatus] = useState<Status>("checking");
  const [isLaunching, setIsLaunching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    setStatus("checking");
    setErrorMessage(null);

    try {
      const response = await fetch("/api/login/status");
      const data = await response.json();

      if (data.error) {
        setStatus("error");
        setErrorMessage(data.error);
      } else if (data.loggedIn) {
        setStatus("logged_in");
      } else if (!data.hasProfile) {
        setStatus("no_profile");
      } else {
        setStatus("logged_out");
      }
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to check status");
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleLaunchLogin = async () => {
    setIsLaunching(true);

    try {
      const response = await fetch("/api/login/launch", { method: "POST" });
      const data = await response.json();

      if (!data.success) {
        setErrorMessage(data.message);
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to launch");
    } finally {
      setIsLaunching(false);
    }
  };

  const statusConfig = {
    checking: {
      dot: "bg-gray-400 animate-pulse",
      text: "Checking...",
      textColor: "text-gray-500",
    },
    logged_in: {
      dot: "bg-green-500",
      text: "Logged In",
      textColor: "text-green-600 dark:text-green-400",
    },
    logged_out: {
      dot: "bg-red-500",
      text: "Not Logged In",
      textColor: "text-red-600 dark:text-red-400",
    },
    no_profile: {
      dot: "bg-yellow-500",
      text: "No Session",
      textColor: "text-yellow-600 dark:text-yellow-400",
    },
    error: {
      dot: "bg-red-500",
      text: "Error",
      textColor: "text-red-600 dark:text-red-400",
    },
  };

  const config = statusConfig[status];
  const showLoginButton = status === "logged_out" || status === "no_profile";

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
        <span className={`text-sm font-medium ${config.textColor}`}>
          {config.text}
        </span>
      </div>

      {/* Refresh Button */}
      <button
        onClick={checkStatus}
        disabled={status === "checking"}
        className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 transition-colors"
        title="Refresh status"
      >
        <svg
          className={`w-4 h-4 ${status === "checking" ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>

      {/* Login Button */}
      {showLoginButton && (
        <button
          onClick={handleLaunchLogin}
          disabled={isLaunching}
          className="px-3 py-1 text-xs font-medium bg-shef-red text-white rounded hover:bg-shef-red-dark disabled:opacity-50 transition-colors"
        >
          {isLaunching ? "Opening..." : "Log In"}
        </button>
      )}

      {/* Error Tooltip */}
      {errorMessage && (
        <span className="text-xs text-red-500" title={errorMessage}>
          {errorMessage.length > 20 ? errorMessage.slice(0, 20) + "..." : errorMessage}
        </span>
      )}
    </div>
  );
}
