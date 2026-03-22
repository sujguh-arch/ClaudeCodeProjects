"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import dynamic from "next/dynamic";
import Image from "next/image";
const MotionLightbox = dynamic(() => import("@/components/MotionLightbox"), {
  ssr: false,
});
import { useToast } from "@/components/Toast";
import Link from "next/link";
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

type Tab = "outfits" | "closet";
type CategoryFilter = "all" | "dress" | "shoes" | "tights" | "bag" | "accessories";

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "dress", label: "Dresses" },
  { key: "shoes", label: "Shoes" },
  { key: "tights", label: "Tights" },
  { key: "bag", label: "Bags" },
  { key: "accessories", label: "Accessories" },
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
    transition: { type: "spring" as const, stiffness: 260, damping: 25 },
  },
};

const tabContentVariants = {
  enter: { opacity: 0, y: 8 },
  center: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: "easeIn" as const } },
};

/* --- Skeleton components --- */
function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-image" />
      <div className="p-3 flex flex-col gap-2.5">
        <div className="skeleton-text skeleton-text-long" />
        <div className="skeleton-text skeleton-text-short" />
      </div>
    </div>
  );
}

function SkeletonGrid({ count, cols }: { count: number; cols: string }) {
  return (
    <div className={`grid ${cols} gap-3 sm:gap-4`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/* --- Empty state icons (inline SVG, no emoji) --- */
function HangerIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
      <path d="M24 8a4 4 0 0 1 4 4c0 2-2 3-4 4" />
      <path d="M8 32l16-16 16 16" />
      <path d="M8 32h32" />
      <circle cx="24" cy="8" r="2" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
      <path d="M24 4v8M24 36v8M4 24h8M36 24h8" />
      <path d="M10 10l6 6M32 32l6 6M10 38l6-6M32 16l6-6" />
      <circle cx="24" cy="24" r="4" />
    </svg>
  );
}

export default function Home() {
  const { toast } = useToast();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("outfits");
  const [products, setProducts] = useState<Product[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [renderings, setRenderings] = useState<Rendering[]>([]);
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<{
    product: Product;
    images: string[];
    index: number;
  } | null>(null);
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refPhoto, setRefPhoto] = useState<string | null>(null);
  const [showOnboard, setShowOnboard] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 300], [0, -40]);
  const heroOpacity = useTransform(scrollY, [0, 200], [1, 0.6]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

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

  useEffect(() => {
    load();
    const saved = localStorage.getItem("mirror_favs");
    if (saved) setFavorites(new Set(JSON.parse(saved)));
  }, [load]);

  function toggleFav(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("mirror_favs", JSON.stringify([...next]));
      return next;
    });
  }

  function getGenerated(pid: string): string[] {
    return renderings
      .filter((r) => r.productId === pid && r.status === "done")
      .map((r) => r.generatedImage);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!resp.ok) throw new Error("Couldn't find that product");
      const product = await resp.json();
      setUrl("");
      await load();
      toast("Product added to closet!", "success");

      setGenerating((prev) => new Set([...prev, product.id]));
      await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
      await load();
      setGenerating((prev) => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
      toast("Try-on images ready!", "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setLoading(false);
    }
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

  return (
    <main
      className="min-h-screen"
      style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Nav */}
      <motion.nav
        className="sticky top-0 z-40 px-5 py-3 flex items-center justify-between"
        style={{
          background: scrolled ? "var(--bg-frosted)" : "transparent",
          backdropFilter: scrolled ? "blur(16px) saturate(1.4)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(16px) saturate(1.4)" : "none",
          borderBottom: scrolled ? "1px solid var(--border-subtle)" : "1px solid transparent",
          transition: "var(--transition-normal)",
        }}
      >
        <div className="flex items-center gap-3">
          {refPhoto && (
            <Image
              src={refPhoto}
              alt=""
              width={28}
              height={28}
              className="rounded-full object-cover"
              style={{ border: "1px solid var(--accent-muted)", width: 28, height: 28 }}
            />
          )}
          <h1
            className="uppercase"
            style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: "var(--text-primary)", letterSpacing: "var(--tracking-widest)" }}
          >
            mirror
          </h1>
        </div>
        <Link href="/settings">
          <motion.button
            whileHover={{ scale: 1.05, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)", transition: "var(--transition-fast)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
            </svg>
          </motion.button>
        </Link>
      </motion.nav>

      {/* Onboarding Sheet */}
      <AnimatePresence>
        {showOnboard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: "var(--overlay-heavy)", backdropFilter: "blur(12px)" }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-md p-8 sm:p-10"
              style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0", }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-8 sm:hidden" style={{ background: "var(--border-default)" }} />
              <h2
                className="text-center mb-1"
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
                  style={{ borderRadius: "var(--radius-lg)", border: "1px dashed var(--border-default)", background: "var(--bg-elevated)", transition: "var(--transition-normal)" }}
                >
                  <input type="file" name="referencePhoto" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                  <div className="text-3xl mb-3 opacity-40">+</div>
                  <p style={{ fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>Tap to upload your photo</p>
                  <p className="mt-1" style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}>A clear face photo works best</p>
                </motion.div>
                <input type="hidden" name="replicateToken" value="configured" />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={uploading}
                  className="w-full py-3.5 disabled:opacity-40"
                  style={{ borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--bg-base)", fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", letterSpacing: "var(--tracking-wide)", transition: "var(--transition-fast)" }}
                >
                  {uploading ? "Setting up..." : "Get started"}
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero / Input */}
      <motion.header
        ref={heroRef}
        style={{ y: heroY, opacity: heroOpacity }}
        className="px-5 pt-8 pb-6 sm:pt-10 sm:pb-8 max-w-xl mx-auto"
      >
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a product link..."
            className="w-full pl-5 pr-28 py-4"
            style={{ borderRadius: "var(--radius-lg)", background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-primary)", fontSize: "var(--text-sm)", transition: "var(--transition-normal)" }}
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading || !url.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-5 py-2.5 disabled:opacity-30"
            style={{ borderRadius: "var(--radius-md)", background: loading ? "var(--accent-muted)" : "var(--accent)", color: "var(--bg-base)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", letterSpacing: "var(--tracking-wide)", transition: "var(--transition-fast)" }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full animate-spin" style={{ border: "2px solid rgba(10,10,9,0.2)", borderTopColor: "var(--bg-base)" }} />
                Adding
              </span>
            ) : (
              "Add"
            )}
          </motion.button>
        </form>
      </motion.header>

      {/* Tabs */}
      <div className="px-5 max-w-5xl mx-auto mt-2 mb-6">
        <div className="relative flex gap-1 p-1" style={{ background: "var(--bg-surface)", borderRadius: "var(--radius-md)" }}>
          {(["outfits", "closet"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="relative flex-1 py-2 z-10"
              style={{
                color: tab === t ? "var(--text-primary)" : "var(--text-tertiary)",
                fontSize: "var(--text-xs)",
                fontWeight: "var(--weight-medium)",
                letterSpacing: "var(--tracking-wide)",
                transition: "color var(--transition-fast)",
                background: "transparent",
                border: "none",
              }}
            >
              {tab === t && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute inset-0"
                  style={{ background: "var(--bg-elevated)", borderRadius: "var(--radius-sm)" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">
                {t === "outfits" ? `Outfits (${outfits.length})` : `Closet (${products.length})`}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content with AnimatePresence */}
      <AnimatePresence mode="wait">
        {tab === "outfits" && (
          <motion.div
            key="outfits"
            variants={tabContentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="px-4 sm:px-6 max-w-5xl mx-auto"
          >
            {/* Loading skeletons */}
            {initialLoading ? (
              <SkeletonGrid count={4} cols="grid-cols-2 sm:grid-cols-3" />
            ) : (
              <>
                <motion.div
                  variants={gridVariants}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3"
                >
                  {/* New Outfit Card */}
                  <motion.div
                    variants={cardVariants}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCreateOutfit}
                    className="overflow-hidden cursor-pointer aspect-[2/3] flex flex-col items-center justify-center"
                    style={{ border: "1px dashed var(--border-default)", background: "var(--bg-surface)", borderRadius: "var(--radius-lg)", transition: "var(--transition-normal)" }}
                  >
                    <motion.span
                      className="text-2xl"
                      style={{ color: "var(--text-tertiary)", opacity: 0.4 }}
                      whileHover={{ scale: 1.2, opacity: 0.7 }}
                    >
                      +
                    </motion.span>
                    <span className="mt-2" style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", fontWeight: "var(--weight-medium)", letterSpacing: "var(--tracking-wide)" }}>
                      New Outfit
                    </span>
                  </motion.div>

                  {/* Outfit Cards */}
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
                        whileHover={{ scale: 1.02 }}
                        className="overflow-hidden cursor-pointer card-hover group"
                        style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}
                        onClick={() => router.push(`/outfit/${outfit.id}`)}
                      >
                        {/* Preview grid */}
                        <div className="aspect-[2/3] relative overflow-hidden card-gradient" style={{ background: "var(--bg-elevated)" }}>
                          {imgs.length === 0 ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.4 }}>
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <circle cx="8.5" cy="8.5" r="1.5" />
                                <path d="M21 15l-5-5L5 21" />
                              </svg>
                              <span style={{ fontSize: "var(--text-caption)", color: "var(--text-tertiary)", letterSpacing: "var(--tracking-wider)" }}>
                                No items yet
                              </span>
                            </div>
                          ) : imgs.length === 1 ? (
                            <Image src={imgs[0]} alt="" fill sizes="(max-width: 640px) 50vw, 33vw" className="object-cover card-image" loading="lazy" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                          ) : (
                            <div className="grid grid-cols-2 grid-rows-2 absolute inset-0">
                              {imgs.slice(0, 4).map((img, i) => (
                                <div key={i} className="relative overflow-hidden">
                                  <Image src={img} alt="" fill sizes="(max-width: 640px) 25vw, 17vw" className="object-cover card-image" loading="lazy" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Item count badge */}
                          <div
                            className="absolute top-2 left-2 px-2 py-0.5 whitespace-nowrap z-10"
                            style={{ fontSize: "var(--text-caption)", fontWeight: "var(--weight-semibold)", background: "var(--accent)", color: "var(--bg-base)", borderRadius: "var(--radius-sm)", letterSpacing: "var(--tracking-wide)" }}
                          >
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </div>

                          {/* Delete */}
                          <motion.button
                            whileTap={{ scale: 0.9 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteOutfit(outfit.id);
                            }}
                            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-70"
                            style={{ background: "var(--overlay-medium)", backdropFilter: "blur(4px)", color: "var(--text-secondary)", fontSize: "var(--text-xs)", transition: "var(--transition-fast)" }}
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
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-center py-20 px-6"
                  >
                    <div className="flex justify-center mb-5">
                      <SparkleIcon />
                    </div>
                    <p className="mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: "var(--text-secondary)" }}>
                      Style starts here
                    </p>
                    <p className="mb-6" style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", lineHeight: "var(--leading-relaxed)", maxWidth: "280px", margin: "0 auto" }}>
                      Combine a dress, shoes, tights, bag, and accessories into one complete look
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCreateOutfit}
                      className="px-6 py-2.5"
                      style={{ borderRadius: "var(--radius-md)", background: "var(--accent)", color: "var(--bg-base)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", letterSpacing: "var(--tracking-wider)" }}
                    >
                      Create your first outfit
                    </motion.button>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}

        {tab === "closet" && (
          <motion.div
            key="closet"
            variants={tabContentVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="px-4 sm:px-6 max-w-5xl mx-auto"
          >
            {/* Category pills */}
            <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 px-1 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <motion.button
                  key={cat.key}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setCategory(cat.key)}
                  className="px-4 py-2 whitespace-nowrap flex-shrink-0"
                  style={{
                    borderRadius: "var(--radius-md)",
                    background: category === cat.key ? "var(--accent)" : "var(--bg-surface)",
                    color: category === cat.key ? "var(--bg-base)" : "var(--text-secondary)",
                    border: `1px solid ${category === cat.key ? "var(--accent)" : "var(--border-subtle)"}`,
                    fontSize: "var(--text-xs)",
                    fontWeight: "var(--weight-medium)",
                    letterSpacing: "var(--tracking-wide)",
                    transition: "var(--transition-fast)",
                  }}
                >
                  {cat.label}
                </motion.button>
              ))}
            </div>

            {/* Loading skeletons */}
            {initialLoading ? (
              <SkeletonGrid count={6} cols="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4" />
            ) : (
              <>
                {filteredProducts.length > 0 && (
                  <>
                    <div className="flex items-center justify-between mb-4 px-1">
                      <span style={{ fontSize: "var(--text-caption)", letterSpacing: "var(--tracking-widest)", fontWeight: "var(--weight-medium)", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                        {filteredProducts.length} {filteredProducts.length === 1 ? "piece" : "pieces"}
                      </span>
                    </div>

                    <motion.div
                      variants={gridVariants}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
                    >
                      {filteredProducts.map((product) => {
                        const gen = getGenerated(product.id);
                        const isGen = generating.has(product.id);
                        const isFav = favorites.has(product.id);
                        const img = gen.length > 0 ? gen[0] : product.images[0];

                        return (
                          <motion.div
                            key={product.id}
                            variants={cardVariants}
                            className="group overflow-hidden cursor-pointer card-hover"
                            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)" }}
                            onClick={() => openLightbox(product)}
                          >
                            <div className="relative aspect-[2/3] overflow-hidden card-gradient" style={{ background: "var(--bg-elevated)" }}>
                              {img && (
                                <Image src={img} alt={product.title} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover card-image" loading="lazy" placeholder="blur" blurDataURL={BLUR_PLACEHOLDER} />
                              )}
                              <motion.button
                                whileTap={{ scale: 1.1 }}
                                onClick={(e) => { e.stopPropagation(); toggleFav(product.id); }}
                                className="absolute top-2.5 right-2.5 w-9 h-9 flex items-center justify-center rounded-full min-w-[44px] min-h-[44px] z-10"
                                style={{ background: "var(--overlay-light)", backdropFilter: "blur(8px)" }}
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill={isFav ? "var(--accent)" : "none"} stroke={isFav ? "var(--accent)" : "var(--text-primary)"} strokeWidth="2">
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                              </motion.button>

                              {/* Badge */}
                              <div
                                className="absolute top-2.5 left-2.5 px-2 py-0.5 whitespace-nowrap z-10"
                                style={{
                                  fontSize: "var(--text-caption)",
                                  fontWeight: "var(--weight-semibold)",
                                  borderRadius: "var(--radius-sm)",
                                  background: gen.length > 0 ? "var(--accent-subtle)" : "var(--overlay-light)",
                                  color: gen.length > 0 ? "var(--accent)" : "var(--text-primary)",
                                  border: gen.length > 0 ? "1px solid var(--accent-border)" : "none",
                                  backdropFilter: "blur(4px)",
                                  letterSpacing: "var(--tracking-wider)",
                                }}
                              >
                                {gen.length > 0 ? "Your fit" : product.category}
                              </div>

                              {(gen.length > 1 || product.images.length > 1) && (
                                <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 whitespace-nowrap z-10"
                                  style={{ fontSize: "var(--text-caption)", fontWeight: "var(--weight-medium)", background: "var(--overlay-medium)", backdropFilter: "blur(4px)", color: "var(--text-primary)", borderRadius: "var(--radius-sm)" }}>
                                  {gen.length > 0 ? gen.length : product.images.length} photos
                                </div>
                              )}

                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                                className="absolute bottom-2.5 left-2.5 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-70 z-20"
                                style={{ background: "var(--overlay-medium)", backdropFilter: "blur(4px)", color: "var(--text-secondary)", fontSize: "var(--text-xs)", transition: "var(--transition-fast)" }}
                              >
                                ✕
                              </motion.button>

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

                            <div className="p-3.5">
                              <p className="mb-1" style={{ fontSize: "var(--text-caption)", color: "var(--text-tertiary)", letterSpacing: "var(--tracking-wider)", textTransform: "uppercase" }}>
                                {product.store}
                              </p>
                              <h3 className="line-clamp-2 mb-2" style={{ fontSize: "var(--text-sm)", fontWeight: "var(--weight-medium)", lineHeight: "var(--leading-snug)", color: "var(--text-primary)" }}>
                                {product.title}
                              </h3>
                              <div className="flex items-center justify-between">
                                {product.price != null && (
                                  <span style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-base)", color: "var(--text-primary)" }}>
                                    {formatPrice(product.price)}
                                  </span>
                                )}
                                {gen.length > 0 && (
                                  <a
                                    href={product.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-3 py-1"
                                    style={{
                                      fontSize: "var(--text-caption)",
                                      fontWeight: "var(--weight-semibold)",
                                      color: "var(--bg-base)",
                                      background: "var(--accent)",
                                      borderRadius: "var(--radius-md)",
                                      letterSpacing: "var(--tracking-wider)",
                                      textDecoration: "none",
                                      transition: "var(--transition-fast)",
                                    }}
                                  >
                                    Shop
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M7 17L17 7M17 7H7M17 7v10" />
                                    </svg>
                                  </a>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  </>
                )}

                {filteredProducts.length === 0 && !loading && (
                  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-center py-20 px-6">
                    <div className="flex justify-center mb-5">
                      <HangerIcon />
                    </div>
                    <p className="mb-2" style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", color: "var(--text-secondary)" }}>
                      {category === "all" ? "Your closet awaits" : `No ${category === "bag" ? "bags" : category} yet`}
                    </p>
                    <p className="mb-6" style={{ fontSize: "var(--text-sm)", color: "var(--text-tertiary)", lineHeight: "var(--leading-relaxed)", maxWidth: "260px", margin: "0 auto" }}>
                      {category === "all"
                        ? "Find something you love and paste the link above"
                        : `Browse your favorite stores and add a ${category === "bag" ? "bag" : category}`
                      }
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => inputRef.current?.focus()}
                      className="px-6 py-2.5"
                      style={{ borderRadius: "var(--radius-md)", border: "1px solid var(--border-default)", background: "transparent", color: "var(--text-secondary)", fontSize: "var(--text-xs)", fontWeight: "var(--weight-medium)", letterSpacing: "var(--tracking-wider)", transition: "var(--transition-fast)" }}
                    >
                      Add your first piece
                    </motion.button>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
            onClose={() => setLightbox(null)}
            onNext={() => setLightbox((p) => p ? { ...p, index: (p.index + 1) % p.images.length } : null)}
            onPrev={() => setLightbox((p) => p ? { ...p, index: (p.index - 1 + p.images.length) % p.images.length } : null)}
            onGoTo={(i) => setLightbox((p) => (p ? { ...p, index: i } : null))}
          />
        )}
      </AnimatePresence>

      {/* Mobile bottom fade */}
      <div
        className="fixed bottom-0 left-0 right-0 sm:hidden z-30 pointer-events-none"
        style={{
          background: "linear-gradient(to top, var(--bg-base) 60%, transparent)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          height: "80px",
        }}
      />
    </main>
  );
}
