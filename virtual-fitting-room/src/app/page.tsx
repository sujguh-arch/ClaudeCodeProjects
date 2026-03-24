"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
import ImageWithFallback from "@/components/ImageWithFallback";
const MotionLightbox = dynamic(() => import("@/components/MotionLightbox"), {
  ssr: false,
});
import { useToast } from "@/components/Toast";
import SkeletonGrid from "@/components/SkeletonGrid";
import { EmptyOutfits, EmptyCloset } from "@/components/EmptyState";
import AddProductModal from "@/components/AddProductModal";
import { useRouter } from "next/navigation";

const BLUR_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iIzFFMUQxQSIvPjwvc3ZnPg==";

function formatPrice(price: number): string {
  return price % 1 === 0 ? `$${price}` : `$${price.toFixed(2)}`;
}

interface Product {
  id: string;
  url: string;
  title: string;
  price: number | null;
  store: string;
  category: string;
  images: string[];
}

interface Rendering {
  productId: string;
  originalImage: string;
  generatedImage: string;
  status: string;
}

interface Outfit {
  id: string;
  name: string;
  items: {
    dress?: string;
    shoes?: string;
    tights?: string;
    bag?: string;
    accessories?: string[];
  };
  products?: Record<string, Product>;
  createdAt: string;
}

type Tab = "closet" | "outfits" | "settings";
type CategoryFilter = "all" | "dress" | "shoes" | "tights" | "bag" | "accessories";

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "dress", label: "Dresses" },
  { key: "shoes", label: "Shoes" },
  { key: "tights", label: "Tights" },
  { key: "bag", label: "Bags" },
  { key: "accessories", label: "Accessories" },
];

/* --- Icons --- */
function ClosetIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--accent)" : "var(--text-secondary)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function OutfitsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--accent)" : "var(--text-secondary)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" />
      <rect x="14" y="3" width="7" height="5" rx="1" />
      <rect x="14" y="12" width="7" height="9" rx="1" />
      <rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? "var(--accent)" : "var(--text-secondary)"} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const TAB_ITEMS: { key: Tab; label: string; Icon: React.FC<{ active: boolean }> }[] = [
  { key: "closet", label: "Closet", Icon: ClosetIcon },
  { key: "outfits", label: "Outfits", Icon: OutfitsIcon },
  { key: "settings", label: "Settings", Icon: SettingsIcon },
];

/* --- Animation variants --- */
const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
};

const TAB_ORDER: Tab[] = ["closet", "outfits", "settings"];

const tabContentVariants = {
  enter: () => ({ opacity: 0, y: 8 }),
  center: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit: () => ({ opacity: 0, y: -4, transition: { duration: 0.15, ease: "easeIn" as const } }),
};

export default function Home() {
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTabRaw] = useState<Tab>("closet");
  const [tabDirection, setTabDirection] = useState(0);
  const setTab = (next: Tab) => {
    const from = TAB_ORDER.indexOf(tab);
    const to = TAB_ORDER.indexOf(next);
    setTabDirection(to > from ? 1 : -1);
    setTabRaw(next);
    if (typeof window !== "undefined") {
      const hash = next === "closet" ? "" : `#${next}`;
      window.history.replaceState(null, "", hash || window.location.pathname);
    }
  };
  const [products, setProducts] = useState<Product[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [renderings, setRenderings] = useState<Rendering[]>([]);
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{
    product: Product;
    images: string[];
    index: number;
  } | null>(null);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refPhoto, setRefPhoto] = useState<string | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [visibleCount, setVisibleCount] = useState(20);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Settings state
  const [settingsUploading, setSettingsUploading] = useState(false);

  // Serve uploaded reference photos through API route to avoid 404 in production
  const refPhotoSrc = refPhoto?.startsWith("/uploads/") ? "/api/reference-photo" : refPhoto;

  const load = useCallback(async () => {
    const [pRes, rRes, sRes, oRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/generate"),
      fetch("/api/settings"),
      fetch("/api/outfits"),
    ]);
    setProducts(await pRes.json());
    setRenderings(await rRes.json());
    const settings = await sRes.json();
    setRefPhoto(settings.referencePhoto);
    if (!settings.referencePhoto) setShowOnboard(true);
    setOutfits(await oRes.json());
    setInitialLoading(false);
  }, []);

  // Restore tab from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") as Tab;
    if (TAB_ORDER.includes(hash)) {
      setTabRaw(hash);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reset visible count when category changes
  useEffect(() => {
    setVisibleCount(20);
  }, [category]);

  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => prev + 20);
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function getGenerated(pid: string): string[] {
    return renderings
      .filter((r) => r.productId === pid && r.status === "done")
      .map((r) => r.generatedImage);
  }


  async function handleCreateOutfit() {
    try {
      const resp = await fetch("/api/outfits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "New Outfit" }),
      });
      const outfit = await resp.json();
      router.push(`/outfit/${outfit.id}`);
    } catch {
      toast("Failed to create outfit", "error");
    }
  }

  async function handleDeleteOutfit(outfitId: string) {
    try {
      await fetch("/api/outfits", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: outfitId }),
      });
      await load();
      toast("Outfit deleted", "info");
    } catch {
      toast("Failed to delete", "error");
    }
  }

  async function handleDelete(productId: string) {
    try {
      await fetch("/api/products", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: productId }),
      });
      await load();
      toast("Product removed", "info");
    } catch {
      toast("Failed to delete", "error");
    }
  }

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    setUploading(true);
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    await fetch("/api/settings", { method: "POST", body: formData });
    await load();
    setShowOnboard(false);
    setUploading(false);
    toast("You're all set!", "success");
  }

  function openLightbox(product: Product) {
    const gen = getGenerated(product.id);
    setLightbox({ product, images: gen.length > 0 ? gen : product.images, index: 0 });
    window.history.pushState({ lightbox: true }, "");
  }

  function closeLightbox() {
    setLightbox(null);
  }

  // Close lightbox on browser back
  useEffect(() => {
    function handlePopState() {
      if (lightbox) {
        setLightbox(null);
      }
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [lightbox]);


  // Settings handlers
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSettingsUploading(true);
    const formData = new FormData();
    formData.append("referencePhoto", file);
    try {
      await fetch("/api/settings", { method: "POST", body: formData });
      const s = await (await fetch("/api/settings")).json();
      setRefPhoto(s.referencePhoto);
      toast("Reference photo updated", "success");
    } catch {
      toast("Failed to upload photo", "error");
    } finally {
      setSettingsUploading(false);
    }
  }

  function getOutfitPreviewImages(outfit: Outfit): string[] {
    if (!outfit.products) return [];
    const imgs: string[] = [];
    for (const slot of ["dress", "shoes", "tights", "bag"] as const) {
      const pid = outfit.items[slot];
      if (pid && outfit.products[pid]) {
        const gen = getGenerated(pid);
        imgs.push(gen[0] || outfit.products[pid]!.images[0]);
      }
    }
    if (outfit.items.accessories?.length) {
      const pid = outfit.items.accessories[0];
      if (outfit.products[pid]) {
        const gen = getGenerated(pid);
        imgs.push(gen[0] || outfit.products[pid]!.images[0]);
      }
    }
    return imgs;
  }

  function getOutfitPrice(outfit: Outfit): number {
    if (!outfit.products) return 0;
    return Object.values(outfit.products).reduce((s, p) => s + (p?.price || 0), 0);
  }

  const filteredProducts = category === "all"
    ? products
    : products.filter((p) => p.category === category);
  const paginatedProducts = filteredProducts.slice(0, visibleCount);
  const hasMore = paginatedProducts.length < filteredProducts.length;

  return (
    <main className="min-h-screen relative">
      {/* ===== SPLASH SCREEN ===== */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            style={{ background: "var(--bg-base)" }}
          >
            {/* Logo */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "48px",
                color: "var(--accent)",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                marginBottom: "8px",
              }}
            >
              mirror
            </motion.h1>

            {/* Tagline */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              style={{
                fontFamily: "var(--font-body)",
                fontSize: "14px",
                color: "var(--text-tertiary)",
                letterSpacing: "var(--tracking-wide)",
              }}
            >
              See yourself in anything
            </motion.p>

            {/* Shimmer divider */}
            <motion.div
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
              className="my-8"
              style={{
                width: "60px",
                height: "1px",
                background: "linear-gradient(90deg, transparent, var(--accent-muted), transparent)",
              }}
            />

            {/* Reference photo circle */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.9, type: "spring", stiffness: 200, damping: 20 }}
              className="mb-10"
            >
              {refPhoto ? (
                <div
                  className="relative overflow-hidden rounded-full"
                  style={{
                    width: "200px",
                    height: "200px",
                    border: "2px solid var(--accent-muted)",
                    boxShadow: "0 0 40px rgba(212,175,97,0.1)",
                  }}
                >
                  <Image
                    src={refPhotoSrc!}
                    alt=""
                    width={200}
                    height={200}
                    className="object-cover w-full h-full"
                    priority
                  />
                </div>
              ) : (
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: "200px",
                    height: "200px",
                    border: "2px dashed var(--border-default)",
                    background: "var(--bg-surface)",
                  }}
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                    <circle cx="12" cy="8" r="5" />
                    <path d="M20 21a8 8 0 0 0-16 0" />
                  </svg>
                </div>
              )}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2, ease: "easeOut" }}
              className="flex flex-col gap-3 w-full px-10"
              style={{ maxWidth: "320px" }}
            >
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(212,175,97,0.25)" }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowSplash(false); setTab("closet"); }}
                className="w-full py-3.5"
                style={{
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent)",
                  color: "var(--bg-base)",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-semibold)",
                  letterSpacing: "var(--tracking-wider)",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                My Closet
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => { setShowSplash(false); setTab("outfits"); handleCreateOutfit(); }}
                className="w-full py-3.5"
                style={{
                  borderRadius: "var(--radius-md)",
                  background: "transparent",
                  color: "var(--accent)",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--weight-semibold)",
                  letterSpacing: "var(--tracking-wider)",
                  border: "1.5px solid var(--accent-muted)",
                  cursor: "pointer",
                }}
              >
                Create Outfit
              </motion.button>
            </motion.div>

            {/* Bottom counter */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.5 }}
              className="absolute bottom-8"
              style={{
                fontSize: "var(--text-caption)",
                color: "var(--text-tertiary)",
                letterSpacing: "var(--tracking-wider)",
              }}
            >
              {products.length > 0 ? `${products.length} pieces from ${new Set(products.map(p => p.store)).size} stores` : ""}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top header bar */}
      {!showSplash && <header
        className="sticky top-0 z-40 px-5 py-3 flex items-center justify-between"
        style={{
          background: "var(--bg-frosted)",
          backdropFilter: "blur(20px) saturate(1.4)",
          WebkitBackdropFilter: "blur(20px) saturate(1.4)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <div className="flex items-center gap-3">
          {refPhoto && (
            <div className="relative w-8 h-8 rounded-full overflow-hidden flex-shrink-0" style={{ border: "1.5px solid var(--accent-muted)" }}>
              <Image
                src={refPhotoSrc!}
                alt=""
                width={32}
                height={32}
                className="object-cover w-full h-full"
              />
            </div>
          )}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-lg)",
              color: "var(--text-primary)",
              letterSpacing: "var(--tracking-widest)",
              textTransform: "uppercase",
            }}
          >
            mirror
          </h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          data-testid="add-button"
          className="w-9 h-9 flex items-center justify-center rounded-full"
          style={{ background: "var(--accent)", color: "var(--bg-base)", border: "none", cursor: "pointer" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </motion.button>
      </header>}

      {/* Add Product Modal */}
      <AnimatePresence>
        {showAddModal && (
          <AddProductModal onClose={() => setShowAddModal(false)} onAdded={load} />
        )}
      </AnimatePresence>

      {/* Onboarding Sheet */}
      <AnimatePresence>
        {showOnboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: "var(--overlay-heavy)", backdropFilter: "blur(16px)" }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-md p-8 sm:p-10"
              style={{
                background: "rgba(15,15,15,0.85)",
                backdropFilter: "blur(24px) saturate(1.5)",
                WebkitBackdropFilter: "blur(24px) saturate(1.5)",
                borderRadius: "24px 24px 0 0",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                boxShadow: "var(--shadow-modal)",
              }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-8 sm:hidden" style={{ background: "var(--border-default)" }} />
              <h2
                className="text-center mb-2"
                style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: "var(--text-primary)" }}
              >
                mirror
              </h2>
              <p className="text-center mb-8" style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", lineHeight: "var(--leading-relaxed)" }}>
                Upload a photo to see yourself in anything
              </p>
              <form onSubmit={handleOnboard}>
                <motion.div
                  whileHover={{ borderColor: "var(--accent-muted)" }}
                  className="p-10 text-center mb-6 cursor-pointer relative"
                  style={{
                    borderRadius: "var(--radius-lg)",
                    border: "1.5px dashed var(--border-default)",
                    background: "var(--bg-elevated)",
                    transition: "var(--transition-normal)",
                  }}
                >
                  <input type="file" name="referencePhoto" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                  <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--accent-subtle)", border: "1px solid var(--accent-border)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="5" />
                      <path d="M20 21a8 8 0 0 0-16 0" />
                    </svg>
                  </div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)", fontWeight: "var(--weight-medium)" }}>Tap to upload your photo</p>
                  <p className="mt-1" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>A clear face photo works best</p>
                </motion.div>
                <input type="hidden" name="replicateToken" value="configured" />
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(212,175,97,0.25)" }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={uploading}
                  className="w-full py-3.5 disabled:opacity-40"
                  style={{
                    borderRadius: "var(--radius-md)",
                    background: "var(--accent)",
                    color: "var(--bg-base)",
                    fontSize: "var(--text-sm)",
                    fontWeight: "var(--weight-semibold)",
                    letterSpacing: "var(--tracking-wide)",
                    transition: "var(--transition-fast)",
                  }}
                >
                  {uploading ? "Setting up..." : "Get started"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      {!showSplash && <div style={{ paddingBottom: "calc(var(--tab-bar-height) + env(safe-area-inset-bottom, 0px) + 16px)" }}>
        <AnimatePresence mode="wait" custom={tabDirection}>
          {/* ===== CLOSET TAB ===== */}
          {tab === "closet" && (
            <motion.div
              key="closet"
              custom={tabDirection}
              variants={tabContentVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              {/* Category filter chips */}
              <div className="px-4 pt-5 max-w-5xl mx-auto">
                <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 no-scrollbar" data-testid="category-tab">
                  {CATEGORIES.map((cat) => {
                    const count = cat.key === "all"
                      ? products.length
                      : products.filter((p) => p.category === cat.key).length;
                    return (
                      <motion.button
                        key={cat.key}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setCategory(cat.key)}
                        className="px-3 py-1.5 whitespace-nowrap flex-shrink-0"
                        data-testid={`category-${cat.key}`}
                        data-category={cat.key}
                        style={{
                          borderRadius: "var(--radius-full)",
                          background: category === cat.key ? "var(--accent)" : "transparent",
                          color: category === cat.key ? "var(--bg-base)" : "var(--text-secondary)",
                          border: `1px solid ${category === cat.key ? "var(--accent)" : "var(--border-default)"}`,
                          fontSize: "12px",
                          fontWeight: "var(--weight-medium)",
                          letterSpacing: "var(--tracking-wide)",
                          transition: "var(--transition-fast)",
                        }}
                      >
                        {cat.label} ({count})
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Product grid */}
              <div className="px-4 sm:px-6 max-w-5xl mx-auto">
                {initialLoading ? (
                  <SkeletonGrid count={6} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
                ) : (
                  <>
                    {filteredProducts.length > 0 && (
                      <>
                        <div className="flex items-center justify-between mb-3 px-1">
                          <span style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "10px",
                            letterSpacing: "0.15em",
                            fontWeight: "var(--weight-medium)",
                            color: "var(--text-tertiary)",
                            textTransform: "uppercase",
                          }}>
                            {filteredProducts.length} {filteredProducts.length === 1 ? "piece" : "pieces"}
                          </span>
                        </div>

                        <motion.div
                          variants={gridVariants}
                          initial="hidden"
                          animate="visible"
                          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
                        >
                          {paginatedProducts.map((product, idx) => {
                            const gen = getGenerated(product.id);
                            const isGen = generating.has(product.id);
                            const img = gen.length > 0 ? gen[0] : product.images[0];

                            return (
                              <motion.div
                                key={product.id}
                                variants={cardVariants}
                                whileHover={{ y: -2 }}
                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                data-testid="product-card"
                                className="group overflow-hidden cursor-pointer card-hover"
                                style={{
                                  background: "rgba(255,255,255,0.03)",
                                  border: "none",
                                  borderRadius: "12px",
                                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                                }}
                                onClick={() => openLightbox(product)}
                              >
                                <div className="relative aspect-[3/4] overflow-hidden" style={{ background: "var(--bg-elevated)", borderRadius: "12px 12px 0 0" }}>
                                  {img && (
                                    <ImageWithFallback store={product.store} src={img} alt={product.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover card-image" {...(idx < 4 ? { priority: true } : { loading: "lazy" as const })} placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                                  )}

                                  {/* Delete button */}
                                  <motion.button
                                    whileTap={{ scale: 0.9 }}
                                    aria-label={`Remove ${product.title}`}
                                    onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-80 z-20"
                                    style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", color: "var(--text-secondary)", fontSize: "var(--text-xs)", transition: "var(--transition-fast)" }}
                                  >
                                    ✕
                                  </motion.button>

                                  {/* Generating overlay */}
                                  <AnimatePresence>
                                    {isGen && (
                                      <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute inset-0 flex flex-col items-center justify-center gap-3"
                                        style={{ background: "var(--overlay-heavy)", backdropFilter: "blur(8px)" }}
                                      >
                                        <motion.div
                                          animate={{ rotate: 360 }}
                                          transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                                          className="w-6 h-6 rounded-full"
                                          style={{ border: "2px solid var(--accent-muted)", borderTopColor: "var(--accent)" }}
                                        />
                                        <span style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", letterSpacing: "var(--tracking-wide)" }}>Creating your look...</span>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                <div className="px-2 pt-2.5 pb-3">
                                  <h3 className="line-clamp-1" style={{ fontSize: "13px", fontWeight: 500, lineHeight: 1.3, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {product.title}
                                  </h3>
                                  {product.price != null && (
                                    <span style={{ fontSize: "14px", fontWeight: 700, color: "var(--text-primary)", display: "block", marginTop: "2px" }}>
                                      {formatPrice(product.price)}
                                    </span>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </motion.div>

                        {/* Infinite scroll sentinel */}
                        {hasMore && (
                          <div
                            ref={loadMoreRef}
                            className="flex items-center justify-center py-6"
                          >
                            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)", letterSpacing: "var(--tracking-wide)" }}>
                              Loading more...
                            </span>
                          </div>
                        )}
                        {!hasMore && filteredProducts.length > 20 && (
                          <div ref={loadMoreRef} />
                        )}
                      </>
                    )}

                    {filteredProducts.length === 0 && (
                      <EmptyCloset category={category} onFocusInput={() => setShowAddModal(true)} />
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* ===== OUTFITS TAB ===== */}
          {tab === "outfits" && (
            <motion.div
              key="outfits"
              custom={tabDirection}
              variants={tabContentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="px-4 sm:px-6 max-w-5xl mx-auto pt-6"
            >
              <div className="flex items-center justify-between mb-6 px-1">
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: "var(--text-primary)" }}>
                  Your Outfits
                </h2>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleCreateOutfit}
                  className="px-4 py-2"
                  data-testid="add-button"
                  style={{
                    borderRadius: "var(--radius-md)",
                    background: "var(--accent)",
                    color: "var(--bg-base)",
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-semibold)",
                    letterSpacing: "var(--tracking-wider)",
                  }}
                >
                  + New Outfit
                </motion.button>
              </div>

              {initialLoading ? (
                <SkeletonGrid count={4} cols="grid-cols-2 sm:grid-cols-3" />
              ) : (
                <>
                  <motion.div
                    variants={gridVariants}
                    initial="hidden"
                    animate="visible"
                    className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
                  >
                    {outfits.map((outfit) => {
                      const imgs = getOutfitPreviewImages(outfit);
                      const price = getOutfitPrice(outfit);
                      const itemCount = Object.values(outfit.items).filter((v) =>
                        Array.isArray(v) ? v.length > 0 : !!v
                      ).length;

                      return (
                        <motion.div
                          key={outfit.id}
                          variants={cardVariants}
                          whileHover={{ y: -2 }}
                          transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          className="overflow-hidden cursor-pointer card-hover group"
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            border: "none",
                            borderRadius: "12px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                          }}
                          onClick={() => router.push(`/outfit/${outfit.id}`)}
                        >
                          <div className="aspect-[2/3] relative overflow-hidden card-gradient" style={{ background: "var(--bg-elevated)" }}>
                            {imgs.length === 0 ? (
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.3 }}>
                                  <rect x="3" y="3" width="7" height="9" rx="1" />
                                  <rect x="14" y="3" width="7" height="5" rx="1" />
                                  <rect x="14" y="12" width="7" height="9" rx="1" />
                                  <rect x="3" y="16" width="7" height="5" rx="1" />
                                </svg>
                                <span style={{ fontSize: "var(--text-caption)", color: "var(--text-tertiary)", letterSpacing: "var(--tracking-wider)" }}>
                                  No items yet
                                </span>
                              </div>
                            ) : imgs.length === 1 ? (
                              <Image src={imgs[0]} alt={`${outfit.name} preview`} fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover card-image" loading="lazy" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                            ) : (
                              <div className="grid grid-cols-2 grid-rows-2 absolute inset-0">
                                {imgs.slice(0, 4).map((img, i) => (
                                  <div key={i} className="relative overflow-hidden">
                                    <Image src={img} alt={`${outfit.name} item ${i + 1}`} fill sizes="(max-width: 640px) 25vw, 17vw" className="object-cover card-image" loading="lazy" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Item count badge */}
                            <div
                              className="absolute top-3 left-3 px-2.5 py-1 z-10"
                              style={{
                                fontSize: "var(--text-caption)",
                                fontWeight: "var(--weight-semibold)",
                                background: "var(--accent)",
                                color: "var(--bg-base)",
                                borderRadius: "var(--radius-sm)",
                                letterSpacing: "var(--tracking-wide)",
                              }}
                            >
                              {itemCount} {itemCount === 1 ? "item" : "items"}
                            </div>

                            {/* Delete */}
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              aria-label={`Delete outfit ${outfit.name}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteOutfit(outfit.id);
                              }}
                              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-80"
                              style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", color: "var(--text-secondary)", fontSize: "var(--text-xs)", transition: "var(--transition-fast)" }}
                            >
                              ✕
                            </motion.button>
                          </div>

                          <div className="p-3.5">
                            <h3 className="line-clamp-1 mb-1" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", color: "var(--text-primary)", lineHeight: "var(--leading-tight)" }}>
                              {outfit.name}
                            </h3>
                            {price > 0 && (
                              <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-semibold)", color: "var(--accent)" }}>
                                {formatPrice(price)}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>

                  {outfits.length === 0 && (
                    <EmptyOutfits onCreateOutfit={handleCreateOutfit} />
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ===== SETTINGS TAB ===== */}
          {tab === "settings" && (
            <motion.div
              key="settings"
              custom={tabDirection}
              variants={tabContentVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="max-w-lg mx-auto px-5 pt-6"
            >
              <h2 className="mb-6" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", color: "var(--text-primary)" }}>
                Settings
              </h2>

              <div className="space-y-5">
                {/* Reference Photo */}
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="p-5"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "none",
                    borderRadius: "12px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  <h3
                    className="mb-4"
                    style={{ fontFamily: "var(--font-display)", fontSize: "10px", letterSpacing: "0.15em", fontWeight: "var(--weight-semibold)", color: "var(--text-tertiary)", textTransform: "uppercase" }}
                  >
                    Reference Photo
                  </h3>
                  <div className="flex items-center gap-5">
                    {refPhoto ? (
                      <div className="relative w-20 h-20 rounded-full overflow-hidden flex-shrink-0" style={{ border: "2px solid var(--accent-muted)" }}>
                        <Image src={refPhotoSrc!} alt="Reference" width={80} height={80} className="object-cover w-full h-full" />
                      </div>
                    ) : (
                      <div
                        className="w-20 h-20 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: "var(--bg-elevated)", border: "2px dashed var(--border-default)" }}
                      >
                        <span style={{ fontSize: "24px", opacity: 0.3, color: "var(--text-tertiary)" }}>+</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="mb-2" style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
                        {refPhoto ? "Update your reference photo" : "Upload a clear face photo"}
                      </p>
                      <label>
                        <motion.span
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          className="inline-block px-4 py-2 cursor-pointer"
                          style={{
                            borderRadius: "var(--radius-md)",
                            fontSize: "var(--text-xs)",
                            fontWeight: "var(--weight-semibold)",
                            background: "var(--bg-elevated)",
                            color: "var(--text-primary)",
                            border: "1px solid var(--border-default)",
                          }}
                        >
                          {settingsUploading ? "Uploading..." : "Choose Photo"}
                        </motion.span>
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={settingsUploading} />
                      </label>
                    </div>
                  </div>
                </motion.section>

                {/* App info */}
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="text-center py-4"
                >
                  <p style={{ fontSize: "var(--text-caption)", color: "var(--text-tertiary)", letterSpacing: "var(--tracking-wider)" }}>
                    mirror -- Virtual Fitting Room
                  </p>
                </motion.section>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <MotionLightbox
            title={lightbox.product.title}
            store={lightbox.product.store}
            price={lightbox.product.price}
            url={lightbox.product.url}
            images={lightbox.images}
            currentIndex={lightbox.index}
            onClose={() => { window.history.back(); }}
            onNext={() => setLightbox((p) => p ? { ...p, index: (p.index + 1) % p.images.length } : null)}
            onPrev={() => setLightbox((p) => p ? { ...p, index: (p.index - 1 + p.images.length) % p.images.length } : null)}
            onGoTo={(i) => setLightbox((p) => (p ? { ...p, index: i } : null))}
          />
        )}
      </AnimatePresence>

      {/* ===== BOTTOM TAB BAR ===== */}
      {!showSplash && <nav
        className="fixed bottom-0 z-50"
        style={{
          left: "50%",
          transform: "translateX(-50%)",
          width: "100%",
          maxWidth: "430px",
          background: "var(--bg-frosted)",
          backdropFilter: "blur(24px) saturate(1.6)",
          WebkitBackdropFilter: "blur(24px) saturate(1.6)",
          borderTop: "1px solid var(--border-subtle)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div className="flex items-stretch justify-around max-w-lg mx-auto" style={{ height: "var(--tab-bar-height)" }}>
          {TAB_ITEMS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                className="flex flex-col items-center justify-center flex-1 gap-1 relative"
                style={{ background: "none", border: "none" }}
              >
                {active && (
                  <motion.div
                    layoutId="tab-pill"
                    className="absolute top-1.5"
                    style={{
                      width: 20,
                      height: 3,
                      borderRadius: "var(--radius-full)",
                      background: "var(--accent)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon active={active} />
                <span
                  style={{
                    fontSize: "var(--text-caption)",
                    fontWeight: active ? "var(--weight-semibold)" : "var(--weight-regular)",
                    color: active ? "var(--accent)" : "var(--text-secondary)",
                    letterSpacing: "var(--tracking-wide)",
                    transition: "var(--transition-fast)",
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>}
    </main>
  );
}
