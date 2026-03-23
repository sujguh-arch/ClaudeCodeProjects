import fs from "fs";
import path from "path";

const DATA_DIR = process.env.VFR_DATA_DIR || path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const RENDERINGS_FILE = path.join(DATA_DIR, "renderings.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const OUTFITS_FILE = path.join(DATA_DIR, "outfits.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface Product {
  id: string;
  url: string;
  title: string;
  price: number | null;
  store: string;
  category: "dress" | "shoes" | "tights" | "bag" | "accessories" | "other";
  lengthInches: number | null;
  images: string[];
  createdAt: string;
  collection?: string;
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

export interface Settings {
  referencePhoto: string | null;
  replicateToken: string;
  model: string;
}

// Products
export function getProducts(): Product[] {
  ensureDir();
  if (!fs.existsSync(PRODUCTS_FILE)) return [];
  return JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf-8"));
}

export function saveProducts(products: Product[]) {
  ensureDir();
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2));
}

export function addProduct(product: Product) {
  const products = getProducts();
  products.push(product);
  saveProducts(products);
}

export function getProduct(id: string): Product | undefined {
  return getProducts().find((p) => p.id === id);
}

export function deleteProduct(id: string) {
  const products = getProducts().filter((p) => p.id !== id);
  saveProducts(products);
}

// Renderings
export function getRenderings(): Rendering[] {
  ensureDir();
  if (!fs.existsSync(RENDERINGS_FILE)) return [];
  return JSON.parse(fs.readFileSync(RENDERINGS_FILE, "utf-8"));
}

export function saveRenderings(renderings: Rendering[]) {
  ensureDir();
  fs.writeFileSync(RENDERINGS_FILE, JSON.stringify(renderings, null, 2));
}

export function getRenderingsForProduct(productId: string): Rendering[] {
  return getRenderings().filter((r) => r.productId === productId);
}

export function upsertRendering(rendering: Rendering) {
  const renderings = getRenderings();
  // Update by ID first (supports multiple renderings per product, e.g. pose variations)
  const idx = renderings.findIndex((r) => r.id === rendering.id);
  if (idx >= 0) {
    renderings[idx] = rendering;
  } else {
    renderings.push(rendering);
  }
  saveRenderings(renderings);
}

// Outfits
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

export function getOutfits(): Outfit[] {
  ensureDir();
  if (!fs.existsSync(OUTFITS_FILE)) return [];
  return JSON.parse(fs.readFileSync(OUTFITS_FILE, "utf-8"));
}

export function saveOutfits(outfits: Outfit[]) {
  ensureDir();
  fs.writeFileSync(OUTFITS_FILE, JSON.stringify(outfits, null, 2));
}

export function getOutfit(id: string): Outfit | undefined {
  return getOutfits().find((o) => o.id === id);
}

export function addOutfit(outfit: Outfit) {
  const outfits = getOutfits();
  outfits.push(outfit);
  saveOutfits(outfits);
}

export function updateOutfit(id: string, updates: Partial<Outfit>) {
  const outfits = getOutfits();
  const idx = outfits.findIndex((o) => o.id === id);
  if (idx >= 0) {
    outfits[idx] = { ...outfits[idx], ...updates, updatedAt: new Date().toISOString() };
    saveOutfits(outfits);
    return outfits[idx];
  }
  return null;
}

export function deleteOutfit(id: string) {
  const outfits = getOutfits().filter((o) => o.id !== id);
  saveOutfits(outfits);
}

// Settings
export function getSettings(): Settings {
  ensureDir();
  if (!fs.existsSync(SETTINGS_FILE)) {
    return {
      referencePhoto: null,
      replicateToken: process.env.REPLICATE_API_TOKEN || "",
      model: "google/nano-banana-pro",
    };
  }
  const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
  if (!settings.replicateToken) {
    settings.replicateToken = process.env.REPLICATE_API_TOKEN || "";
  }
  return settings;
}

export function saveSettings(settings: Settings) {
  ensureDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}
