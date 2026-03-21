import type { Product, Outfit } from "@/lib/db";
import { randomUUID } from "crypto";

const CATEGORIES = ["dress", "shoes", "tights", "bag", "accessories"] as const;

export function makeProduct(category: string, index: number): Product {
  return {
    id: randomUUID(),
    url: `https://test-store.com/${category}/${index}`,
    title: `Test ${category} #${index}`,
    price: 50 + index * 10,
    store: "TestStore",
    category: category as Product["category"],
    lengthInches: null,
    images: [`https://picsum.photos/id/${index + parseInt(category, 36)}/400/600`],
    createdAt: new Date().toISOString(),
  };
}

export function makeOutfit(name: string, items: Outfit["items"] = {}): Outfit {
  return {
    id: randomUUID(),
    name,
    items,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export { CATEGORIES };
