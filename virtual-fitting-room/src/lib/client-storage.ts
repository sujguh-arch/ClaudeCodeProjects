// Client-side localStorage persistence for outfits, renderings, and settings.
// Products remain server-side (read-only catalog).

export interface Product {
  id: string;
  url: string;
  title: string;
  price: number | null;
  store: string;
  category: string;
  images: string[];
}

export interface Rendering {
  id: string;
  productId: string;
  originalImage: string;
  generatedImage: string;
  status: "pending" | "generating" | "done" | "error";
  error?: string;
  createdAt: string;
}

export interface Outfit {
  id: string;
  name: string;
  items: {
    dress?: string;
    shoes?: string;
    tights?: string;
    bag?: string;
    accessories?: string[];
  };
  createdAt: string;
  updatedAt: string;
}

const KEYS = {
  outfits: "vfr:outfits",
  renderings: "vfr:renderings",
} as const;

function isClient(): boolean {
  return typeof window !== "undefined";
}

function read<T>(key: string, fallback: T): T {
  if (!isClient()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

// --------------- Outfits ---------------

export function getOutfits(): Outfit[] {
  return read<Outfit[]>(KEYS.outfits, []);
}

export function getOutfit(id: string): Outfit | undefined {
  return getOutfits().find((o) => o.id === id);
}

export function createOutfit(name: string = "New Outfit"): Outfit {
  const outfit: Outfit = {
    id: crypto.randomUUID(),
    name,
    items: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const outfits = getOutfits();
  outfits.push(outfit);
  write(KEYS.outfits, outfits);
  return outfit;
}

export function updateOutfit(id: string, updates: Partial<Omit<Outfit, "id" | "createdAt">>): Outfit | null {
  const outfits = getOutfits();
  const idx = outfits.findIndex((o) => o.id === id);
  if (idx < 0) return null;
  outfits[idx] = { ...outfits[idx], ...updates, updatedAt: new Date().toISOString() };
  write(KEYS.outfits, outfits);
  return outfits[idx];
}

export function deleteOutfit(id: string): void {
  const outfits = getOutfits().filter((o) => o.id !== id);
  write(KEYS.outfits, outfits);
}

// --------------- Renderings ---------------

export function getRenderings(): Rendering[] {
  return read<Rendering[]>(KEYS.renderings, []);
}

export function addRendering(rendering: Rendering): void {
  const renderings = getRenderings();
  // Deduplicate by (productId + originalImage)
  const idx = renderings.findIndex(
    (r) => r.productId === rendering.productId && r.originalImage === rendering.originalImage
  );
  if (idx >= 0) {
    renderings[idx] = rendering;
  } else {
    renderings.push(rendering);
  }
  write(KEYS.renderings, renderings);
}

export function addRenderings(newRenderings: Rendering[]): void {
  const renderings = getRenderings();
  for (const rendering of newRenderings) {
    const idx = renderings.findIndex(
      (r) => r.productId === rendering.productId && r.originalImage === rendering.originalImage
    );
    if (idx >= 0) {
      renderings[idx] = rendering;
    } else {
      renderings.push(rendering);
    }
  }
  write(KEYS.renderings, renderings);
}
