"use client";

import { useState, useCallback, useEffect } from "react";
import type { ShefItem, ApiResponse, DayOfWeek } from "@/lib/types";

interface AddItemOptions {
  availableDays?: DayOfWeek[];
  preferredPortion?: string;
  tags?: string[];
}

interface UseItemsResult {
  items: ShefItem[];
  isLoading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  addItem: (name: string, url: string, quantity: number, options?: AddItemOptions) => Promise<boolean>;
  updateItem: (id: string, updates: Partial<Omit<ShefItem, "id">>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
}

export function useItems(): UseItemsResult {
  const [items, setItems] = useState<ShefItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/items");
      const data: ApiResponse<ShefItem[]> = await response.json();

      if (data.success && data.data) {
        setItems(data.data);
      } else {
        setError(data.error || "Failed to fetch items");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch items");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addItem = useCallback(
    async (name: string, url: string, quantity: number, options?: AddItemOptions): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch("/api/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, url, quantity, ...options }),
        });

        const data: ApiResponse<ShefItem> = await response.json();

        if (data.success && data.data) {
          setItems((prev) => [...prev, data.data!]);
          return true;
        } else {
          setError(data.error || "Failed to add item");
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add item");
        return false;
      }
    },
    []
  );

  const updateItem = useCallback(
    async (id: string, updates: Partial<Omit<ShefItem, "id">>): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch(`/api/items/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        });

        const data: ApiResponse<ShefItem> = await response.json();

        if (data.success && data.data) {
          setItems((prev) =>
            prev.map((item) => (item.id === id ? data.data! : item))
          );
          return true;
        } else {
          setError(data.error || "Failed to update item");
          return false;
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update item");
        return false;
      }
    },
    []
  );

  const deleteItem = useCallback(async (id: string): Promise<boolean> => {
    setError(null);

    try {
      const response = await fetch(`/api/items/${id}`, {
        method: "DELETE",
      });

      const data: ApiResponse = await response.json();

      if (data.success) {
        setItems((prev) => prev.filter((item) => item.id !== id));
        return true;
      } else {
        setError(data.error || "Failed to delete item");
        return false;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete item");
      return false;
    }
  }, []);

  // Fetch items on mount
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  return {
    items,
    isLoading,
    error,
    fetchItems,
    addItem,
    updateItem,
    deleteItem,
  };
}
