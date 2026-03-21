import { describe, it, expect, vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

describe("detectCategory", () => {
  async function loadDetectCategory() {
    const mod = await import("@/lib/scraper");
    return mod.detectCategory;
  }

  it("detects tights from URL and title", async () => {
    const detect = await loadDetectCategory();
    expect(detect("https://wolford.com/fatal-15-tights", "Fatal 15 Tights")).toBe("tights");
  });

  it("detects shoes from title keywords", async () => {
    const detect = await loadDetectCategory();
    expect(detect("https://store.com/products/pump", "Jimmy Choo Pump Heels")).toBe("shoes");
  });

  it("detects bag from URL keywords", async () => {
    const detect = await loadDetectCategory();
    expect(detect("https://store.com/handbag/clutch-gold", "Evening Clutch")).toBe("bag");
  });

  it("detects accessories from title keywords", async () => {
    const detect = await loadDetectCategory();
    expect(detect("https://store.com/jewelry", "Gold Hoop Earrings")).toBe("accessories");
  });

  it("defaults to dress for generic product", async () => {
    const detect = await loadDetectCategory();
    expect(detect("https://store.com/products/silk-mini", "Silk Mini Dress")).toBe("dress");
  });

  it("defaults to dress for unknown items", async () => {
    const detect = await loadDetectCategory();
    expect(detect("https://store.com/product/thing", "Some Random Thing")).toBe("dress");
  });
});

describe("parseJsonLd", () => {
  async function loadParseJsonLd() {
    const mod = await import("@/lib/scraper");
    return (mod as any).parseJsonLd as (html: string) => { title?: string; price?: number; images?: string[] } | null;
  }

  it("extracts title, price, images from standard Product schema", async () => {
    const parse = await loadParseJsonLd();
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Fatal 15 Tights","image":["https://img.wolford.com/tights.jpg"],"offers":{"price":"35.00"}}</script>`;
    const result = parse(html);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Fatal 15 Tights");
    expect(result!.price).toBe(35);
    expect(result!.images).toEqual(["https://img.wolford.com/tights.jpg"]);
  });

  it("handles array of JSON-LD blocks", async () => {
    const parse = await loadParseJsonLd();
    const html = `
      <script type="application/ld+json">[{"@type":"BreadcrumbList"},{"@type":"Product","name":"Shoes","image":"https://img.com/shoe.jpg","offers":{"price":"120"}}]</script>
    `;
    const result = parse(html);
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Shoes");
  });

  it("handles nested offers with lowPrice", async () => {
    const parse = await loadParseJsonLd();
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Bag","image":{"url":"https://img.com/bag.jpg"},"offers":{"lowPrice":"89.99"}}</script>`;
    const result = parse(html);
    expect(result!.price).toBe(89.99);
    expect(result!.images).toEqual(["https://img.com/bag.jpg"]);
  });

  it("handles image as object with url field", async () => {
    const parse = await loadParseJsonLd();
    const html = `<script type="application/ld+json">{"@type":"Product","name":"Ring","image":{"url":"https://img.com/ring.jpg"},"offers":{"price":"45"}}</script>`;
    const result = parse(html);
    expect(result!.images).toEqual(["https://img.com/ring.jpg"]);
  });

  it("returns null for non-Product schemas", async () => {
    const parse = await loadParseJsonLd();
    const html = `<script type="application/ld+json">{"@type":"Organization","name":"Acme"}</script>`;
    expect(parse(html)).toBeNull();
  });

  it("handles malformed JSON gracefully", async () => {
    const parse = await loadParseJsonLd();
    const html = `<script type="application/ld+json">{broken json here</script>`;
    expect(parse(html)).toBeNull();
  });
});
