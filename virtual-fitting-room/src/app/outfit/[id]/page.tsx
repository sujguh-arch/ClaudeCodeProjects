"use client";

import { useState, useEffect, useCallback, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useToast } from "@/components/Toast";
import Link from "next/link";

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
}

const SLOTS = [
  { key: "dress", label: "Dress" },
  { key: "shoes", label: "Shoes" },
  { key: "tights", label: "Tights" },
  { key: "bag", label: "Bag" },
  { key: "accessories", label: "Accessories" },
] as const;

export default function OutfitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { toast } = useToast();
  const [outfit, setOutfit] = useState<Outfit | null>(null);
  const [addingSlot, setAddingSlot] = useState<string | null>(null);
  const [slotUrl, setSlotUrl] = useState("");
  const [slotLoading, setSlotLoading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [outfitName, setOutfitName] = useState("");
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);

  const load = useCallback(async () => {
    const [oRes, rRes, pRes] = await Promise.all([
      fetch("/api/outfits"),
      fetch("/api/generate"),
      fetch("/api/products"),
    ]);
    const outfits: Outfit[] = await oRes.json();
    const found = outfits.find((o) => o.id === id);
    if (found) {
      setOutfit(found);
      setOutfitName(found.name);
    }
    const renderings: Rendering[] = await rRes.json();
    setCatalogProducts(await pRes.json());

    // Check if any product in this outfit already has a completed rendering
    if (found) {
      const allItemIds = [
        found.items.dress,
        found.items.shoes,
        found.items.tights,
        found.items.bag,
        ...(found.items.accessories || []),
      ].filter(Boolean);
      const doneRendering = renderings.find(
        (r) => allItemIds.includes(r.productId) && r.status === "done" && r.generatedImage?.startsWith("/api/images/")
      );
      if (doneRendering) {
        setGeneratedImage(doneRendering.generatedImage);
        setShowResult(true);
      }
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  function getProductForSlot(slotKey: string): Product | null {
    if (!outfit?.products || !outfit.items) return null;
    const val =
      slotKey === "accessories"
        ? outfit.items.accessories?.[0] || null
        : (outfit.items as Record<string, string | undefined>)[slotKey];
    if (!val) return null;
    return outfit.products[val] || null;
  }

  async function handlePickFromCloset(slotKey: string, product: Product) {
    if (!outfit) return;
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
    setAddingSlot(null);
    toast("Item added!", "success");
    await load();
  }

  async function handleAddItem(slotKey: string) {
    if (!slotUrl.trim() || !outfit) return;
    setSlotLoading(true);
    try {
      const pRes = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: slotUrl, category: slotKey }),
      });
      if (!pRes.ok) throw new Error("Couldn't find that product");
      const product: Product = await pRes.json();

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
      await load();
    } catch (err) {
      toast(
        err instanceof Error ? err.message : "Something went wrong",
        "error"
      );
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

  async function handleGenerate() {
    if (!outfit || generating) return;
    // Find the first filled product (prefer dress)
    const dressProduct = getProductForSlot("dress");
    const firstFilled = dressProduct || SLOTS.map((s) => getProductForSlot(s.key)).find(Boolean);
    if (!firstFilled) return;

    setGenerating(true);
    try {
      // Collect all filled outfit items for multi-image generation
      const allItems = SLOTS
        .map((s) => getProductForSlot(s.key))
        .filter((p): p is Product => p !== null)
        .map((p) => ({
          id: p.id,
          title: p.title,
          category: p.category,
          images: p.images,
        }));

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: firstFilled.id,
          outfitItems: allItems.length > 1 ? allItems : undefined,
        }),
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      if (data.results && data.results.length > 0 && data.results[0].generatedImage) {
        setGeneratedImage(data.results[0].generatedImage);
        setShowResult(true);
        toast("Look generated!", "success");
      } else if (data.errors > 0) {
        const detail = data.errors_detail?.[0]?.error || "Generation failed";
        throw new Error(detail);
      }
      await load();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (msg.toLowerCase().includes("sensitive") || msg.toLowerCase().includes("flagged")) {
        toast("This image was flagged by the AI model. Try a different dress or angle.", "error");
      } else {
        toast(msg, "error");
      }
      // Keep generated look hidden on error
      setShowResult(false);
      setGeneratedImage(null);
    } finally {
      setGenerating(false);
    }
  }

  function getTotalPrice(): number {
    if (!outfit?.products) return 0;
    return Object.values(outfit.products).reduce(
      (sum, p) => sum + (p?.price || 0),
      0
    );
  }

  function getFilledCount(): number {
    return SLOTS.filter((s) => getProductForSlot(s.key)).length;
  }

  if (!outfit) {
    return (
      <main className="min-h-screen" style={{ background: "var(--bg-base)" }}>
        <nav
          className="sticky top-0 z-40 px-5 py-3 flex items-center justify-between"
          style={{
            background: "var(--bg-frosted)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border-subtle)",
          }}
        >
          <div className="w-9 h-9 rounded-full shimmer" />
          <div className="w-16 h-5 rounded shimmer" />
          <div className="w-9" />
        </nav>
        <div className="px-5 pt-8 pb-2 max-w-4xl mx-auto">
          <div className="w-48 h-7 rounded shimmer mb-2" />
          <div className="w-24 h-4 rounded shimmer" />
        </div>
        <div className="px-4 max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={i === 0 ? "col-span-2 row-span-2" : ""}
                style={{
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-subtle)",
                  overflow: "hidden",
                }}
              >
                <div className="aspect-[2/3] shimmer" />
                <div className="p-3 space-y-2">
                  <div className="w-3/4 h-3 rounded shimmer" />
                  <div className="w-1/2 h-3 rounded shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const filledSlots = SLOTS.filter((s) => getProductForSlot(s.key));
  const totalPrice = getTotalPrice();
  const filledCount = getFilledCount();

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--bg-base)" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-40 px-5 py-3 flex items-center justify-between"
        style={{
          background: "var(--bg-frosted)",
          backdropFilter: "blur(20px) saturate(1.6)",
          WebkitBackdropFilter: "blur(20px) saturate(1.6)",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-default)",
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
          </motion.button>
        </Link>
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
              className="text-2xl bg-transparent border-b-2 outline-none flex-1"
              style={{
                color: "var(--text-primary)",
                borderColor: "var(--accent)",
                fontWeight: "var(--weight-light)",
              }}
            />
          </div>
        ) : (
          <motion.h2
            className="cursor-pointer"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              color: "var(--text-primary)",
            }}
            onClick={() => setEditingName(true)}
            whileHover={{ opacity: 0.7 }}
          >
            {outfit.name}
            <span
              className="ml-2"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--text-tertiary)",
                fontFamily: "var(--font-body)",
              }}
            >
              tap to edit
            </span>
          </motion.h2>
        )}
      </div>

      {/* YOUR ITEMS Section */}
      <div className="px-4 max-w-4xl mx-auto mt-4">
        <p
          className="mb-3 px-1"
          style={{
            fontSize: "var(--text-caption)",
            letterSpacing: "var(--tracking-widest)",
            fontWeight: "var(--weight-semibold)",
            color: "var(--text-tertiary)",
            textTransform: "uppercase",
          }}
        >
          Your items
        </p>

        {/* Row 1: Dress (col-span-2 row-span-2), Shoes, Tights */}
        <div className="grid grid-cols-3 gap-3">
          {/* Dress — large slot */}
          <div className="col-span-2 row-span-2">
            <SlotCard
              slot={SLOTS[0]}
              product={getProductForSlot("dress")}
              onAdd={() => {
                setAddingSlot("dress");
                setSlotUrl("");
              }}
              onRemove={() => handleRemoveItem("dress")}
              large
            />
          </div>
          {/* Shoes */}
          <SlotCard
            slot={SLOTS[1]}
            product={getProductForSlot("shoes")}
            onAdd={() => {
              setAddingSlot("shoes");
              setSlotUrl("");
            }}
            onRemove={() => handleRemoveItem("shoes")}
          />
          {/* Tights */}
          <SlotCard
            slot={SLOTS[2]}
            product={getProductForSlot("tights")}
            onAdd={() => {
              setAddingSlot("tights");
              setSlotUrl("");
            }}
            onRemove={() => handleRemoveItem("tights")}
          />
        </div>

        {/* Row 2: Bag + Accessories centered */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="col-start-1 col-span-1">
            <SlotCard
              slot={SLOTS[3]}
              product={getProductForSlot("bag")}
              onAdd={() => {
                setAddingSlot("bag");
                setSlotUrl("");
              }}
              onRemove={() => handleRemoveItem("bag")}
            />
          </div>
          <div className="col-start-2 col-span-1">
            <SlotCard
              slot={SLOTS[4]}
              product={getProductForSlot("accessories")}
              onAdd={() => {
                setAddingSlot("accessories");
                setSlotUrl("");
              }}
              onRemove={() => handleRemoveItem("accessories")}
            />
          </div>
        </div>

        {/* Outfit Summary Thumbnails */}
        {filledCount > 0 && (
          <div className="mt-5 px-1">
            <div className="flex items-center gap-2">
              {SLOTS.map((slot) => {
                const product = getProductForSlot(slot.key);
                if (!product || !product.images[0]) return null;
                return (
                  <div
                    key={slot.key}
                    className="relative overflow-hidden flex-shrink-0"
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-elevated)",
                    }}
                  >
                    <Image
                      src={product.images[0]}
                      alt={product.title}
                      fill
                      sizes="60px"
                      className="object-cover"
                    />
                  </div>
                );
              })}
            </div>

            {/* Total Price */}
            {totalPrice > 0 && (
              <p
                className="mt-3"
                style={{
                  fontSize: "var(--text-sm)",
                  color: "var(--accent)",
                  fontFamily: "var(--font-display)",
                }}
              >
                Total: {formatPrice(totalPrice)}
              </p>
            )}

            {/* GENERATE MY LOOK button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4"
            >
              <motion.button
                data-testid="generate-button"
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 4px 20px rgba(212,175,97,0.3)",
                }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-4 text-sm disabled:opacity-60"
                style={{
                  borderRadius: "var(--radius-md)",
                  background: "var(--accent)",
                  color: "var(--bg-base)",
                  fontWeight: "var(--weight-semibold)",
                  letterSpacing: "var(--tracking-wider)",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-body)",
                }}
              >
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                      className="w-4 h-4 rounded-full inline-block"
                      style={{
                        border: "2px solid rgba(10,10,9,0.2)",
                        borderTopColor: "var(--bg-base)",
                      }}
                    />
                    Generating...
                  </span>
                ) : (
                  "Generate my look"
                )}
              </motion.button>
            </motion.div>
          </div>
        )}
      </div>

      {/* YOUR GENERATED LOOK Section */}
      <AnimatePresence>
        {showResult && generatedImage && (
          <motion.div
            data-testid="generated-result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="px-4 max-w-4xl mx-auto mt-8"
          >
            <p
              className="mb-3 px-1"
              style={{
                fontSize: "var(--text-caption)",
                letterSpacing: "var(--tracking-widest)",
                fontWeight: "var(--weight-semibold)",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
              }}
            >
              Your generated look
            </p>
            <div
              className="overflow-hidden"
              style={{
                borderRadius: "var(--radius-lg)",
                background: "var(--bg-card)",
                border: "1px solid var(--border-default)",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <Image
                src={generatedImage}
                alt="Generated outfit look"
                width={768}
                height={1024}
                sizes="(max-width: 768px) 100vw, 50vw"
                className="w-full h-auto"
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDER}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SHOP THIS OUTFIT */}
      {filledSlots.length > 0 && (
        <div className="px-4 mt-8 max-w-4xl mx-auto">
          <div
            className="p-5"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <p
              className="mb-3"
              style={{
                fontSize: "var(--text-caption)",
                letterSpacing: "var(--tracking-widest)",
                fontWeight: "var(--weight-semibold)",
                color: "var(--text-tertiary)",
                textTransform: "uppercase",
              }}
            >
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
                    className="flex items-center justify-between py-2.5 px-3.5 group"
                    style={{
                      background: "var(--bg-elevated)",
                      borderRadius: "var(--radius-md)",
                      transition: "var(--transition-fast)",
                      textDecoration: "none",
                    }}
                  >
                    <span
                      className="line-clamp-1 flex-1 mr-3"
                      style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {product.title}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-1 flex-shrink-0"
                      style={{
                        fontSize: "var(--text-caption)",
                        fontWeight: "var(--weight-semibold)",
                        color: "var(--bg-base)",
                        background: "var(--accent)",
                        borderRadius: "var(--radius-sm)",
                        letterSpacing: "var(--tracking-wide)",
                      }}
                    >
                      {product.price ? formatPrice(product.price) : "View"}
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M7 17L17 7M17 7H7M17 7v10" />
                      </svg>
                    </span>
                  </a>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Browse Closet Picker — Bottom Sheet */}
      <AnimatePresence>
        {addingSlot && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
            style={{
              background: "var(--overlay-heavy)",
              backdropFilter: "blur(16px)",
            }}
            onClick={(e) =>
              e.target === e.currentTarget && setAddingSlot(null)
            }
          >
            <motion.div
              data-testid="closet-picker"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-md p-8"
              style={{
                background: "var(--bg-surface)",
                borderRadius:
                  "var(--radius-sheet) var(--radius-sheet) 0 0",
                boxShadow: "var(--shadow-modal)",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                className="w-10 h-1 rounded-full mx-auto mb-6 sm:hidden"
                style={{ background: "var(--border-default)" }}
              />
              <h3
                className="mb-1"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-lg)",
                  color: "var(--text-primary)",
                }}
              >
                Add {SLOTS.find((s) => s.key === addingSlot)?.label}
              </h3>

              <div className="flex-1 overflow-y-auto min-h-0">
                {/* Closet grid */}
                {(() => {
                  const filtered = catalogProducts.filter(
                    (p) => p.category === addingSlot
                  );
                  if (filtered.length === 0) return null;
                  return (
                    <>
                      <div
                        className="grid grid-cols-3 gap-2 mb-4 mt-3"
                      >
                        {filtered.map((p) => (
                          <motion.div
                            key={p.id}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className="cursor-pointer overflow-hidden"
                            style={{
                              borderRadius: "var(--radius-md)",
                              background: "var(--bg-card)",
                              border: "1px solid var(--border-default)",
                            }}
                            onClick={() =>
                              handlePickFromCloset(addingSlot!, p)
                            }
                          >
                            <div
                              className="relative aspect-[2/3] overflow-hidden"
                              style={{ background: "var(--bg-elevated)" }}
                            >
                              {p.images[0] && (
                                <Image
                                  src={p.images[0]}
                                  alt={p.title}
                                  fill
                                  sizes="120px"
                                  className="object-cover"
                                  loading="lazy"
                                  placeholder="blur"
                                  blurDataURL={BLUR_PLACEHOLDER}
                                />
                              )}
                            </div>
                            <div className="p-1.5">
                              <p
                                className="line-clamp-1"
                                style={{
                                  fontSize: "10px",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                {p.title}
                              </p>
                              {p.price != null && (
                                <p
                                  style={{
                                    fontSize: "11px",
                                    fontWeight: "var(--weight-semibold)",
                                    color: "var(--text-primary)",
                                  }}
                                >
                                  {formatPrice(p.price)}
                                </p>
                              )}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mb-4">
                        <div
                          className="flex-1 h-px"
                          style={{ background: "var(--border-subtle)" }}
                        />
                        <span
                          style={{
                            fontSize: "var(--text-xs)",
                            color: "var(--text-tertiary)",
                          }}
                        >
                          or paste a link
                        </span>
                        <div
                          className="flex-1 h-px"
                          style={{ background: "var(--border-subtle)" }}
                        />
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* URL input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddItem(addingSlot);
                }}
              >
                <input
                  type="url"
                  value={slotUrl}
                  onChange={(e) => setSlotUrl(e.target.value)}
                  placeholder={`Paste ${addingSlot} link...`}
                  className="w-full px-4 py-3.5 text-sm mb-4"
                  style={{
                    borderRadius: "var(--radius-md)",
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
                    className="flex-1 py-3 text-sm"
                    style={{
                      borderRadius: "var(--radius-md)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-secondary)",
                      fontWeight: "var(--weight-medium)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{
                      scale: 1.02,
                      boxShadow: "0 4px 20px rgba(212,175,97,0.25)",
                    }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={slotLoading || !slotUrl.trim()}
                    className="flex-1 py-3 text-sm disabled:opacity-40"
                    style={{
                      borderRadius: "var(--radius-md)",
                      background: "var(--accent)",
                      color: "var(--bg-base)",
                      fontWeight: "var(--weight-semibold)",
                      letterSpacing: "var(--tracking-wider)",
                      textTransform: "uppercase",
                    }}
                  >
                    {slotLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full animate-spin"
                          style={{
                            border: "2px solid rgba(10,10,9,0.2)",
                            borderTopColor: "var(--bg-base)",
                          }}
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

/* ─── Slot Card Component ─── */

function SlotCard({
  slot,
  product,
  onAdd,
  onRemove,
  large,
}: {
  slot: (typeof SLOTS)[number];
  product: Product | null;
  onAdd: () => void;
  onRemove: () => void;
  large?: boolean;
}) {
  if (product) {
    return (
      <motion.div
        data-testid={`outfit-slot-${slot.key}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="overflow-hidden h-full"
        style={{
          borderRadius: "var(--radius-lg)",
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div className="relative">
          <div
            className="relative overflow-hidden"
            style={{
              aspectRatio: large ? "2/3" : "2/3",
              background: "var(--bg-elevated)",
            }}
          >
            {product.images[0] && (
              <Image
                src={product.images[0]}
                alt={product.title}
                fill
                sizes={large ? "(max-width: 640px) 66vw, 50vw" : "(max-width: 640px) 33vw, 25vw"}
                className="object-cover"
                loading="lazy"
                placeholder="blur"
                blurDataURL={BLUR_PLACEHOLDER}
              />
            )}
            {/* Category badge */}
            <div
              className="absolute top-2.5 left-2.5 px-2.5 py-1"
              style={{
                fontSize: "var(--text-caption)",
                fontWeight: "var(--weight-bold)",
                background: "var(--accent)",
                color: "var(--bg-base)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              {slot.label}
            </div>
            {/* Remove button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              className="absolute top-2.5 right-2.5 w-7 h-7 flex items-center justify-center rounded-full"
              style={{
                background: "rgba(0,0,0,0.5)",
                backdropFilter: "blur(8px)",
                color: "var(--text-secondary)",
                fontSize: "var(--text-xs)",
              }}
            >
              ✕
            </motion.button>
          </div>
          <div className="p-3">
            <h3
              className="line-clamp-1"
              style={{
                fontSize: "var(--text-sm)",
                fontWeight: "var(--weight-medium)",
                lineHeight: "var(--leading-tight)",
                color: "var(--text-primary)",
              }}
            >
              {product.title}
            </h3>
            <div className="flex items-center justify-between mt-1">
              <span
                style={{
                  fontSize: "var(--text-xs)",
                  color: "var(--text-tertiary)",
                }}
              >
                {product.store}
              </span>
              {product.price != null && (
                <span
                  style={{
                    fontSize: "var(--text-base)",
                    fontWeight: "var(--weight-bold)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-display)",
                  }}
                >
                  {formatPrice(product.price)}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      data-testid={`outfit-slot-${slot.key}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ borderColor: "var(--accent-muted)" }}
      className="flex flex-col items-center justify-center cursor-pointer h-full"
      style={{
        aspectRatio: "2/3",
        borderRadius: "var(--radius-lg)",
        background: "transparent",
        border: "1.5px dashed var(--border-default)",
        transition: "var(--transition-normal)",
      }}
      onClick={onAdd}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
        style={{
          background: "var(--accent-subtle)",
          border: "1px solid var(--accent-border)",
        }}
      >
        <span
          style={{ fontSize: "20px", color: "var(--accent)", lineHeight: 1 }}
        >
          +
        </span>
      </div>
      <span
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--weight-medium)",
          color: "var(--text-secondary)",
        }}
      >
        {slot.label}
      </span>
      <span
        className="mt-0.5"
        style={{ fontSize: "var(--text-xs)", color: "var(--text-tertiary)" }}
      >
        Browse closet
      </span>
    </motion.div>
  );
}
