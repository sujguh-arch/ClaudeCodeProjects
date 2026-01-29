"use client";

import { useState } from "react";
import type { ShefItem, AvailabilityCheckResponse } from "@/lib/types";
import { Modal } from "@/components/ui";

interface CartPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: ShefItem[];
  isLoading?: boolean;
}

type CheckStatus = "idle" | "checking" | "done" | "error";

interface AvailabilityState {
  status: CheckStatus;
  available: ShefItem[];
  unavailable: Array<{ item: ShefItem; reason: string }>;
  error?: string;
}

export default function CartPreview({
  isOpen,
  onClose,
  onConfirm,
  items,
  isLoading = false,
}: CartPreviewProps) {
  const [availability, setAvailability] = useState<AvailabilityState>({
    status: "idle",
    available: [],
    unavailable: [],
  });

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const checkAvailability = async () => {
    setAvailability({ status: "checking", available: [], unavailable: [] });

    try {
      const response = await fetch("/api/prefill/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setAvailability({
          status: "error",
          available: [],
          unavailable: [],
          error: data.error || "Failed to check availability",
        });
        return;
      }

      // Match results back to original items by URL
      const result = data as AvailabilityCheckResponse;
      const availableUrls = new Set(result.available.map((i) => i.url));

      const availableItems = items.filter((item) => availableUrls.has(item.url));
      const unavailableItems = items
        .filter((item) => !availableUrls.has(item.url))
        .map((item) => {
          const match = result.unavailable.find((u) => u.item.url === item.url);
          return { item, reason: match?.reason || "Unavailable" };
        });

      setAvailability({
        status: "done",
        available: availableItems,
        unavailable: unavailableItems,
      });
    } catch (error) {
      setAvailability({
        status: "error",
        available: [],
        unavailable: [],
        error: error instanceof Error ? error.message : "Failed to check availability",
      });
    }
  };

  const handleClose = () => {
    setAvailability({ status: "idle", available: [], unavailable: [] });
    onClose();
  };

  const canPrefill =
    availability.status === "idle" ||
    (availability.status === "done" && availability.available.length > 0);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Confirm Cart Prefill">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          The following items will be added to your Shef cart:
        </p>

        {/* Item list with availability status */}
        <div className="max-h-60 overflow-y-auto space-y-2">
          {items.map((item) => {
            const isUnavailable =
              availability.status === "done" &&
              availability.unavailable.some((u) => u.item.id === item.id);
            const unavailableInfo = availability.unavailable.find(
              (u) => u.item.id === item.id
            );

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  isUnavailable
                    ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                    : "bg-[var(--background)]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-medium truncate ${
                      isUnavailable
                        ? "text-red-700 dark:text-red-400 line-through"
                        : "text-[var(--text-primary)]"
                    }`}
                  >
                    {item.name}
                  </p>
                  {isUnavailable && unavailableInfo && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                      {unavailableInfo.reason}
                    </p>
                  )}
                </div>
                <span
                  className={`ml-3 text-sm font-medium ${
                    isUnavailable
                      ? "text-red-500 dark:text-red-400"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  x{item.quantity}
                </span>
              </div>
            );
          })}
        </div>

        {/* Availability summary */}
        {availability.status === "done" && (
          <div
            className={`rounded-lg p-3 ${
              availability.unavailable.length === 0
                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                : availability.available.length === 0
                ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                : "bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
            }`}
          >
            <div className="flex items-center justify-between text-sm">
              <span
                className={`font-medium ${
                  availability.unavailable.length === 0
                    ? "text-green-700 dark:text-green-400"
                    : availability.available.length === 0
                    ? "text-red-700 dark:text-red-400"
                    : "text-yellow-700 dark:text-yellow-400"
                }`}
              >
                {availability.available.length === items.length
                  ? "All items available"
                  : availability.available.length === 0
                  ? "No items available"
                  : `${availability.available.length} available, ${availability.unavailable.length} unavailable`}
              </span>
            </div>
          </div>
        )}

        {availability.status === "error" && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-xs text-red-700 dark:text-red-400">
              {availability.error}
            </p>
          </div>
        )}

        {/* Total */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-[var(--text-secondary)]">Total items</span>
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            {availability.status === "done"
              ? availability.available.reduce((sum, i) => sum + i.quantity, 0)
              : totalItems}
          </span>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            The automation will open a browser, add items to your cart, and stop at
            checkout. You will need to complete the order manually.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleClose}
            className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-[var(--text-primary)] font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>

          {availability.status === "idle" && (
            <button
              onClick={checkAvailability}
              className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Check Availability
            </button>
          )}

          {availability.status === "checking" && (
            <button
              disabled
              className="flex-1 py-2.5 px-4 bg-blue-600 text-white font-medium rounded-lg opacity-50 cursor-not-allowed"
            >
              <span className="inline-block animate-pulse">Checking...</span>
            </button>
          )}

          {(availability.status === "done" || availability.status === "error") && (
            <button
              onClick={onConfirm}
              disabled={isLoading || !canPrefill}
              className="flex-1 py-2.5 px-4 bg-shef-red text-white font-medium rounded-lg hover:bg-shef-red-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading
                ? "Starting..."
                : !canPrefill
                ? "Cannot Prefill"
                : `Prefill ${availability.available.length} Items`}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
