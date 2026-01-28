"use client";

import { ShefItem } from "@/lib/types";
import ItemCard from "./ItemCard";

interface ItemListProps {
  items: ShefItem[];
  onQuantityChange: (id: string, quantity: number) => void;
  onDelete: (id: string) => void;
}

export default function ItemList({ items, onQuantityChange, onDelete }: ItemListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p>No items configured yet.</p>
        <p className="text-sm mt-1">Add items using the form above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onQuantityChange={onQuantityChange}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
