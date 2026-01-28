"use client";

import type { ShefItem } from "@/lib/types";
import { Modal } from "@/components/ui";

interface CartPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  items: ShefItem[];
  isLoading?: boolean;
}

export default function CartPreview({
  isOpen,
  onClose,
  onConfirm,
  items,
  isLoading = false,
}: CartPreviewProps) {
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Confirm Cart Prefill">
      <div className="space-y-4">
        <p className="text-sm text-[var(--text-secondary)]">
          The following items will be added to your Shef cart:
        </p>

        <div className="max-h-60 overflow-y-auto space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 bg-[var(--background)] rounded-lg"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {item.name}
                </p>
              </div>
              <span className="ml-3 text-sm font-medium text-[var(--text-secondary)]">
                x{item.quantity}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-[var(--text-secondary)]">
            Total items
          </span>
          <span className="text-lg font-semibold text-[var(--text-primary)]">
            {totalItems}
          </span>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-xs text-yellow-700 dark:text-yellow-400">
            The automation will open a browser, add items to your cart, and stop at checkout.
            You will need to complete the order manually.
          </p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 border border-gray-300 dark:border-gray-600 rounded-lg text-[var(--text-primary)] font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 bg-shef-red text-white font-medium rounded-lg hover:bg-shef-red-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Starting..." : "Start Prefill"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
