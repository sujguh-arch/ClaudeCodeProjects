"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import MotionLightbox from "@/components/MotionLightbox";
import { useToast } from "@/components/Toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
        className="sticky top-0 z-40 px-5 py-3 flex items-center justify-between transition-all duration-300"
        style={{
          background: scrolled ? "rgba(17,17,16,0.75)" : "transparent",
          backdropFilter: scrolled ? "blur(20px) saturate(180%)" : "none",
          borderBottom: scrolled ? "1px solid var(--border-subtle)" : "1px solid transparent",
        }}
      >
        <div className="flex items-center gap-3">
          {refPhoto && (
            <motion.img
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              src={refPhoto}
              alt=""
              className="w-7 h-7 rounded-full object-cover"
              style={{ border: "1.5px solid var(--accent-muted)" }}
            />
          )}
          <h1 className="text-sm tracking-[0.25em] uppercase font-extralight" style={{ color: "var(--text-primary)" }}>
            mirror
          </h1>
        </div>
        <Link href="/settings">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
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
            style={{ background: "var(--bg-overlay)", backdropFilter: "blur(12px)" }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-md sm:rounded-[var(--radius-xl)] rounded-t-[28px] p-8 sm:p-10"
              style={{ background: "var(--bg-surface)" }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-8 sm:hidden" style={{ background: "var(--border-default)" }} />
              <h2 className="text-2xl font-extralight tracking-wide text-center mb-1" style={{ color: "var(--text-primary)" }}>
                mirror
              </h2>
              <p className="text-sm text-center mb-8 font-light" style={{ color: "var(--text-tertiary)" }}>
                Upload a photo to see yourself in anything
              </p>
              <form onSubmit={handleOnboard}>
                <motion.div
                  whileHover={{ borderColor: "var(--accent-muted)" }}
                  className="rounded-[var(--radius-lg)] p-10 text-center mb-6 transition-colors cursor-pointer relative"
                  style={{ border: "1.5px dashed var(--border-default)", background: "var(--bg-elevated)" }}
                >
                  <input type="file" name="referencePhoto" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" required />
                  <div className="text-3xl mb-3 opacity-60">+</div>
                  <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Tap to upload your photo</p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>A clear face photo works best</p>
                </motion.div>
                <input type="hidden" name="replicateToken" value="configured" />
                <motion.button
                  whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(201,169,110,0.3)" }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={uploading}
                  className="w-full py-3.5 rounded-[var(--radius-md)] text-sm font-semibold tracking-wider uppercase transition-all disabled:opacity-40"
                  style={{ background: "var(--accent)", color: "#0A0A09" }}
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
        className="px-5 pt-8 pb-2 sm:pt-12 sm:pb-4 max-w-lg mx-auto"
      >
        <form onSubmit={handleSubmit} className="relative">
          <motion.input
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            ref={inputRef}
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a product link..."
            className="w-full rounded-[var(--radius-lg)] pl-5 pr-32 py-4 text-sm transition-all"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}
          />
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 2px 12px rgba(201,169,110,0.3)" }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={loading || !url.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-[var(--radius-md)] text-xs font-semibold tracking-wider uppercase transition-all disabled:opacity-30"
            style={{ background: loading ? "var(--accent-muted)" : "var(--accent)", color: "#0A0A09" }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full animate-spin" style={{ border: "2px solid rgba(10,10,9,0.2)", borderTopColor: "#0A0A09" }} />
                Adding
              </span>
            ) : (
              "Add"
            )}
          </motion.button>
        </form>
      </motion.header>

      {/* Tabs */}
      <div className="px-5 max-w-5xl mx-auto mt-2 mb-4">
        <div className="flex gap-1 p-1 rounded-[var(--radius-md)]" style={{ background: "var(--bg-surface)" }}>
          {(["outfits", "closet"] as Tab[]).map((t) => (
            <motion.button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-[var(--radius-sm)] text-xs font-semibold uppercase tracking-wider transition-all"
              style={{
                background: tab === t ? "var(--bg-elevated)" : "transparent",
                color: tab === t ? "var(--text-primary)" : "var(--text-tertiary)",
              }}
              whileTap={{ scale: 0.98 }}
            >
              {t === "outfits" ? `Outfits (${outfits.length})` : `Closet (${products.length})`}
            </motion.button>
          ))}
        </div>
      </div>

      {/* OUTFITS TAB */}
      {tab === "outfits" && (
        <div className="px-4 sm:px-6 max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {/* New Outfit Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -3, borderColor: "rgba(201,169,110,0.3)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateOutfit}
              className="rounded-[var(--radius-lg)] overflow-hidden cursor-pointer aspect-[3/4] flex flex-col items-center justify-center"
              style={{ border: "1.5px dashed var(--border-default)", background: "var(--bg-surface)" }}
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
              >
                <span className="text-3xl opacity-30">+</span>
              </motion.div>
              <span className="text-xs font-medium mt-2" style={{ color: "var(--text-secondary)" }}>
                New Outfit
              </span>
            </motion.div>

            {/* Outfit Cards */}
            {outfits.map((outfit, idx) => {
              const imgs = getOutfitPreviewImages(outfit);
              const price = getOutfitPrice(outfit);
              const itemCount = Object.values(outfit.items).filter((v) =>
                Array.isArray(v) ? v.length > 0 : !!v
              ).length;

              return (
                <motion.div
                  key={outfit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (idx + 1) * 0.05 }}
                  whileHover={{ y: -3 }}
                  className="rounded-[var(--radius-lg)] overflow-hidden cursor-pointer card-glow group"
                  style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                  onClick={() => router.push(`/outfit/${outfit.id}`)}
                >
                  {/* Preview grid */}
                  <div className="aspect-[3/4] relative overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                    {imgs.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>No items yet</span>
                      </div>
                    ) : imgs.length === 1 ? (
                      <img src={imgs[0]} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="grid grid-cols-2 grid-rows-2 absolute inset-0">
                        {imgs.slice(0, 4).map((img, i) => (
                          <img key={i} src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ))}
                      </div>
                    )}

                    {/* Item count badge */}
                    <div
                      className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "var(--accent)", color: "#0A0A09" }}
                    >
                      {itemCount} {itemCount === 1 ? "item" : "items"}
                    </div>

                    {/* Delete */}
                    <motion.button
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1, scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteOutfit(outfit.id);
                      }}
                      className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-70 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", color: "var(--text-secondary)", fontSize: "10px" }}
                    >
                      ✕
                    </motion.button>
                  </div>

                  <div className="p-3">
                    <h3 className="text-[11px] font-medium leading-snug line-clamp-1 mb-1" style={{ color: "var(--text-primary)" }}>
                      {outfit.name}
                    </h3>
                    {price > 0 && (
                      <span className="text-xs font-semibold" style={{ color: "var(--accent)" }}>
                        ${price.toFixed(0)}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {outfits.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-sm font-light" style={{ color: "var(--text-tertiary)" }}>
                Create your first outfit
              </p>
              <p className="text-xs font-light mt-1" style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>
                Mix dresses, shoes, tights, bags & accessories
              </p>
            </motion.div>
          )}
        </div>
      )}

      {/* CLOSET TAB */}
      {tab === "closet" && (
        <div className="px-4 sm:px-6 max-w-5xl mx-auto">
          {/* Category pills */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 px-1 no-scrollbar">
            {CATEGORIES.map((cat) => (
              <motion.button
                key={cat.key}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCategory(cat.key)}
                className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap flex-shrink-0"
                style={{
                  background: category === cat.key ? "var(--accent)" : "var(--bg-surface)",
                  color: category === cat.key ? "#0A0A09" : "var(--text-secondary)",
                  border: `1px solid ${category === cat.key ? "var(--accent)" : "var(--border-subtle)"}`,
                }}
              >
                {cat.label}
              </motion.button>
            ))}
          </div>

          {filteredProducts.length > 0 && (
            <>
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[10px] uppercase tracking-[0.2em] font-semibold" style={{ color: "var(--text-tertiary)" }}>
                  {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {filteredProducts.map((product, idx) => {
                  const gen = getGenerated(product.id);
                  const isGen = generating.has(product.id);
                  const isFav = favorites.has(product.id);
                  const img = gen.length > 0 ? gen[0] : product.images[0];

                  return (
                    <motion.div
                      key={product.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                      whileHover={{ y: -3, transition: { duration: 0.2 } }}
                      className="group rounded-[var(--radius-lg)] overflow-hidden cursor-pointer card-glow"
                      style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
                      onClick={() => openLightbox(product)}
                    >
                      <div className="relative aspect-[3/4] overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                        {img && (
                          <img src={img} alt={product.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                        )}
                        <motion.button
                          whileTap={{ scale: 1.4 }}
                          transition={{ type: "spring", stiffness: 600, damping: 10 }}
                          onClick={(e) => { e.stopPropagation(); toggleFav(product.id); }}
                          className="absolute top-2.5 right-2.5 w-9 h-9 flex items-center justify-center rounded-full min-w-[44px] min-h-[44px]"
                          style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(8px)" }}
                        >
                          <motion.span animate={isFav ? { scale: [1, 1.3, 1] } : {}} transition={{ duration: 0.3 }} className="text-sm">
                            {isFav ? "\u2764\ufe0f" : "\U0001f90d"}
                          </motion.span>
                        </motion.button>

                        {/* Category badge */}
                        <div
                          className="absolute top-2.5 left-2.5 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                          style={{ background: gen.length > 0 ? "var(--accent)" : "var(--bg-elevated)", color: gen.length > 0 ? "#0A0A09" : "var(--text-secondary)" }}
                        >
                          {gen.length > 0 ? "Your fit" : product.category}
                        </div>

                        {(gen.length > 1 || product.images.length > 1) && (
                          <div className="absolute bottom-2.5 left-2.5 text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", color: "var(--text-primary)" }}>
                            {gen.length > 0 ? gen.length : product.images.length} photos
                          </div>
                        )}

                        <motion.button
                          initial={{ opacity: 0 }}
                          whileHover={{ opacity: 1, scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); handleDelete(product.id); }}
                          className="absolute bottom-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-70 transition-opacity"
                          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", color: "var(--text-secondary)", fontSize: "10px" }}
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
                              style={{ background: "rgba(17,17,16,0.7)", backdropFilter: "blur(8px)" }}
                            >
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                                className="w-6 h-6 rounded-full"
                                style={{ border: "2px solid var(--accent-muted)", borderTopColor: "var(--accent)" }}
                              />
                              <span className="text-[11px] font-light" style={{ color: "var(--text-secondary)" }}>Creating your look</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      <div className="p-3">
                        <h3 className="text-[11px] font-medium leading-snug line-clamp-2 mb-2" style={{ color: "var(--text-primary)" }}>
                          {product.title}
                        </h3>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {product.price && (
                              <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                                ${product.price}
                              </span>
                            )}
                            <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{product.store}</span>
                          </div>
                          {gen.length > 0 && (
                            <a href={product.url} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-semibold" style={{ color: "var(--accent)" }}>
                              Shop &rarr;
                            </a>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </>
          )}

          {filteredProducts.length === 0 && !loading && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 px-6">
              <p className="text-sm font-light mb-2" style={{ color: "var(--text-tertiary)" }}>
                {category === "all" ? "Your closet is empty" : `No ${category} items yet`}
              </p>
              <p className="text-xs font-light" style={{ color: "var(--text-tertiary)", opacity: 0.6 }}>
                Paste a product link above to add items
              </p>
            </motion.div>
          )}
        </div>
      )}

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
