"use client";

import { useState, useEffect, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/Toast";
import Link from "next/link";

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
}

const SLOTS = [
  { key: "dress", label: "Dress", icon: "👗", aspect: "aspect-[4/3] sm:aspect-auto", span: "col-span-2 sm:row-span-2" },
  { key: "shoes", label: "Shoes", icon: "👠", aspect: "aspect-[4/5]", span: "" },
  { key: "tights", label: "Tights", icon: "🦵", aspect: "aspect-[4/5]", span: "" },
  { key: "bag", label: "Bag", icon: "👜", aspect: "aspect-[4/5]", span: "" },
  { key: "accessories", label: "Accessories", icon: "💎", aspect: "aspect-[4/5]", span: "" },
] as const;

export default function OutfitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast } = useToast();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [renderings, setRenderings] = useState<Rendering[]>([]);
  const [addingSlot, setAddingSlot] = useState<string | null>(null);
  const [slotUrl, setSlotUrl] = useState("");
  const [slotLoading, setSlotLoading] = useState(false);
  const [generating, setGenerating] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState(false);
  const [outfitName, setOutfitName] = useState("");

  const load = useCallback(async () => {
    const [oRes, rRes] = await Promise.all([
      fetch("/api/outfits"),
      fetch("/api/generate"),
    ]);
    const outfits: Outfit[] = await oRes.json();
    const found = outfits.find((o) => o.id === id);
    if (found) {
      setOutfit(found);
      setOutfitName(found.name);
    }
    setRenderings(await rRes.json());
  }, [id]);

  useEffect(() => { load(); }, [load]);

  function getProductForSlot(slotKey: string): Product | null {
    if (!outfit?.products || !outfit.items) return null;
    const val = slotKey === "accessories"
      ? (outfit.items.accessories?.[0] || null)
      : (outfit.items as Record<string, string | undefined>)[slotKey];
    if (!val) return null;
    return outfit.products[val] || null;
  }

  function getGenerated(pid: string): string[] {
    return renderings
      .filter((r) => r.productId === pid && r.status === "done")
      .map((r) => r.generatedImage);
  }

  async function handleAddItem(slotKey: string) {
    if (!slotUrl.trim() || !outfit) return;
    setSlotLoading(true);
    try {
      // Add product with category
      const pRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: slotUrl, category: slotKey }),
      });
      if (!pRes.ok) throw new Error("Couldn't find that product");
      const product: Product = await pRes.json();

      // Update outfit items
      const newItems = { ...outfit.items };
      if (slotKey === "accessories") {
        newItems.accessories = [...(newItems.accessories || []), product.id];
      } else {
        (newItems as Record<string, string>)[slotKey] = product.id;
      }

      await fetch("/api/outfits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: outfit.id, items: newItems }),
      });

      setSlotUrl("");
      setAddingSlot(null);
      toast("Item added!", "success");

      // Generate try-on in background
      setGenerating((prev) => new Set([...prev, product.id]));
      await load();
      fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      }).then(async () => {
        await load();
        setGenerating((prev) => {
          const next = new Set(prev);
          next.delete(product.id);
          return next;
        });
        toast("Try-on ready!", "success");
      });
    } catch (err) {
      toast(err instanceof Error ? err.message : "Something went wrong", "error");
    } finally {
      setSlotLoading(false);
    }
  }

  async function handleRemoveItem(slotKey: string) {
    if (!outfit) return;
    const newItems = { ...outfit.items };
    if (slotKey === "accessories") {
      newItems.accessories = [];
    } else {
      delete (newItems as Record<string, string | undefined>)[slotKey];
    }
    await fetch("/api/outfits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: outfit.id, items: newItems }),
    });
    await load();
    toast("Item removed", "info");
  }

  async function handleNameSave() {
    if (!outfit || !outfitName.trim()) return;
    await fetch("/api/outfits", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: outfit.id, name: outfitName.trim() }),
    });
    setEditingName(false);
    await load();
  }

  function getTotalPrice(): number {
    if (!outfit?.products) return 0;
    return Object.values(outfit.products).reduce((sum, p) => sum + (p?.price || 0), 0);
  }

  if (!outfit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-6 h-6 rounded-full animate-spin"
          style={{ border: "2px solid var(--accent-muted)", borderTopColor: "var(--accent)" }}
        />
      </div>
    );
  }

  const filledSlots = SLOTS.filter((s) => getProductForSlot(s.key));
  const totalPrice = getTotalPrice();

  return (
    <main className="min-h-screen pb-24">
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 px-5 py-3 flex items-center justify-between"
        style={{
          background: "rgba(17,17,16,0.85)",
          backdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </motion.button>
        </Link>
        <h1 className="text-sm tracking-[0.25em] uppercase font-extralight" style={{ color: "var(--text-primary)" }}>
          mirror
        </h1>
        <div className="w-9" />
      </nav>

      {/* Outfit Name */}
      <div className="px-5 pt-8 pb-2 max-w-4xl mx-auto">
        {editingName ? (
          <div className="flex items-center gap-2">
            <input
              autoFocus
              value={outfitName}
              onChange={(e) => setOutfitName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNameSave()}
              onBlur={handleNameSave}
              className="text-2xl font-light bg-transparent border-b-2 outline-none flex-1"
              style={{ color: "var(--text-primary)", borderColor: "var(--accent)" }}
            />
          </div>
        ) : (
          <motion.h2
            className="text-2xl font-light cursor-pointer"
            style={{ color: "var(--text-primary)" }}
            onClick={() => setEditingName(true)}
            whileHover={{ opacity: 0.7 }}
          >
            {outfit.name}
            <span className="text-xs ml-2" style={{ color: "var(--text-tertiary)" }}>tap to edit</span>
          </motion.h2>
        )}
        {totalPrice > 0 && (
          <p className="text-sm mt-1" style={{ color: "var(--accent)" }}>
            Total: ${totalPrice.toFixed(0)}
          </p>
        )}
      </div>

      {/* Outfit Grid */}
      <div className="px-4 max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
          {SLOTS.map((slot) => {
            const product = getProductForSlot(slot.key);
            const gen = product ? getGenerated(product.id) : [];
            const isGen = product ? generating.has(product.id) : false;
            const img = gen.length > 0 ? gen[0] : product?.images[0];

            return (
              <motion.div
                key={slot.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-[var(--radius-lg)] overflow-hidden ${slot.span} ${
                  product ? "cursor-pointer card-glow" : ""
                }`}
                style={{
                  background: "var(--bg-surface)",
                  border: product ? "1px solid var(--border-subtle)" : "1.5px dashed var(--border-default)",
                }}
              >
                {product ? (
                  /* Filled slot */
                  <div className="relative">
                    <div className={`relative ${slot.aspect} overflow-hidden`} style={{ background: "var(--bg-elevated)" }}>
                      {img && (
                        <img
                          src={img}
                          alt={product.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      {/* Category label */}
                      <div
                        className="absolute top-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                        style={{ background: "var(--accent)", color: "#0A0A09" }}
                      >
                        {slot.label}
                      </div>
                      {/* Remove button */}
                      <motion.button
                        whileHover={{ opacity: 1, scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleRemoveItem(slot.key)}
                        className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full opacity-70"
                        style={{
                          background: "rgba(0,0,0,0.5)",
                          backdropFilter: "blur(4px)",
                          color: "var(--text-secondary)",
                          fontSize: "10px",
                        }}
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
                            className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                            style={{ background: "rgba(17,17,16,0.7)", backdropFilter: "blur(8px)" }}
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              className="w-5 h-5 rounded-full"
                              style={{ border: "2px solid var(--accent-muted)", borderTopColor: "var(--accent)" }}
                            />
                            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                              Creating look
                            </span>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {gen.length > 0 && (
                        <div
                          className="absolute bottom-2 left-2 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
                          style={{ background: "var(--accent)", color: "#0A0A09" }}
                        >
                          Your fit
                        </div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <h3 className="text-[11px] font-medium leading-snug line-clamp-1" style={{ color: "var(--text-primary)" }}>
                        {product.title}
                      </h3>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>{product.store}</span>
                        {product.price && (
                          <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                            ${product.price}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Empty slot */
                  <motion.div
                    whileHover={{ borderColor: "var(--accent-muted)" }}
                    className={`${slot.aspect} flex flex-col items-center justify-center cursor-pointer p-4`}
                    onClick={() => { setAddingSlot(slot.key); setSlotUrl(""); }}
                  >
                    <span className="text-2xl mb-2 opacity-40">{slot.icon}</span>
                    <span className="text-[11px] font-medium" style={{ color: "var(--text-secondary)" }}>
                      Add {slot.label}
                    </span>
                    <span className="text-[10px] mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      Paste a link
                    </span>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Shop All CTA */}
      {filledSlots.length > 0 && (
        <div className="px-5 mt-8 max-w-4xl mx-auto">
          <div
            className="rounded-[var(--radius-lg)] p-4"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)" }}
          >
            <p className="text-[10px] uppercase tracking-[0.2em] font-semibold mb-3" style={{ color: "var(--text-tertiary)" }}>
              Shop this outfit
            </p>
            <div className="space-y-2">
              {filledSlots.map((slot) => {
                const product = getProductForSlot(slot.key)!;
                return (
                  <a
                    key={slot.key}
                    href={product.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between py-1.5 group"
                  >
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {slot.icon} {product.title}
                    </span>
                    <span className="text-xs font-semibold group-hover:underline" style={{ color: "var(--accent)" }}>
                      {product.price ? `$${product.price}` : "View"} →
                    </span>
                  </a>
                );
              })}
            </div>
            {totalPrice > 0 && (
              <div
                className="flex justify-between mt-3 pt-3"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Total</span>
                <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>${totalPrice.toFixed(0)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Item Sheet */}
      <AnimatePresence>
        {addingSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{ background: "var(--bg-overlay)", backdropFilter: "blur(12px)" }}
            onClick={(e) => e.target === e.currentTarget && setAddingSlot(null)}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-md sm:rounded-[var(--radius-xl)] rounded-t-[28px] p-8"
              style={{ background: "var(--bg-surface)" }}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-6 sm:hidden" style={{ background: "var(--border-default)" }} />
              <h3 className="text-lg font-light mb-1" style={{ color: "var(--text-primary)" }}>
                Add {SLOTS.find((s) => s.key === addingSlot)?.label}
              </h3>
              <p className="text-xs mb-5" style={{ color: "var(--text-tertiary)" }}>
                Paste a product link from any store
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddItem(addingSlot);
                }}
              >
                <input
                  autoFocus
                  type="url"
                  value={slotUrl}
                  onChange={(e) => setSlotUrl(e.target.value)}
                  placeholder={`Paste ${addingSlot} link...`}
                  className="w-full rounded-[var(--radius-md)] px-4 py-3.5 text-sm mb-4"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-default)",
                    color: "var(--text-primary)",
                  }}
                />
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setAddingSlot(null)}
                    className="flex-1 py-3 rounded-[var(--radius-md)] text-sm font-medium"
                    style={{ background: "var(--bg-elevated)", color: "var(--text-secondary)" }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02, boxShadow: "0 4px 20px rgba(201,169,110,0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={slotLoading || !slotUrl.trim()}
                    className="flex-1 py-3 rounded-[var(--radius-md)] text-sm font-semibold tracking-wider uppercase disabled:opacity-40"
                    style={{ background: "var(--accent)", color: "#0A0A09" }}
                  >
                    {slotLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full animate-spin"
                          style={{ border: "2px solid rgba(10,10,9,0.2)", borderTopColor: "#0A0A09" }}
                        />
                        Adding
                      </span>
                    ) : (
                      "Add"
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
