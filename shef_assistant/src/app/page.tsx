"use client";

import { useItems } from "@/hooks/useItems";
import { useAutomation } from "@/hooks/useAutomation";
import { ItemForm, ItemList } from "@/components/features/items";
import { AutomationPanel } from "@/components/features/automation";
import { LoginStatus } from "@/components/features/auth";

export default function Home() {
  const { items, isLoading, error, addItem, updateItem, deleteItem } = useItems();
  const { state, progress, logs, message, startPrefill, reset } = useAutomation();

  const handleAddItem = async (name: string, url: string, quantity: number) => {
    await addItem(name, url, quantity);
  };

  const handleQuantityChange = async (id: string, quantity: number) => {
    await updateItem(id, { quantity });
  };

  const handleDelete = async (id: string) => {
    await deleteItem(id);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const isPrefilling = state === "running";

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4">
      <main className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Shef Assistant
            </h1>
            <LoginStatus />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">
            Manage your cart items and prefill your Shef order
          </p>
        </header>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Add Item Form */}
        <section className="bg-[var(--foreground)] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            Add New Item
          </h2>
          <ItemForm onAdd={handleAddItem} />
        </section>

        {/* Item List */}
        <section className="bg-[var(--foreground)] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Your Items
            </h2>
            {items.length > 0 && (
              <span className="text-sm text-[var(--text-secondary)]">
                {items.length} {items.length === 1 ? "item" : "items"} ({totalItems} total)
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-[var(--text-secondary)]">
              Loading items...
            </div>
          ) : (
            <ItemList
              items={items}
              onQuantityChange={handleQuantityChange}
              onDelete={handleDelete}
            />
          )}
        </section>

        {/* Prefill Button */}
        <div className="flex gap-3">
          <a
            href="https://shef.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 px-4 text-center border border-gray-300 dark:border-gray-600 rounded-lg text-[var(--text-primary)] font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Open Shef
          </a>
          <button
            onClick={startPrefill}
            disabled={isPrefilling || items.length === 0}
            className="flex-1 py-3 px-4 bg-shef-red text-white font-semibold rounded-lg hover:bg-shef-red-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPrefilling ? "Prefilling..." : "Prefill Cart"}
          </button>
        </div>

        {/* Automation Status Panel */}
        <AutomationPanel
          state={state}
          progress={progress}
          logs={logs}
          message={message}
          onReset={reset}
        />
      </main>
    </div>
  );
}
