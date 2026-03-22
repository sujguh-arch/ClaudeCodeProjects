export interface ScrapedProduct {
  title: string;
  price: number | null;
  store: string;
  images: string[];
  handle: string;
  url: string;
  detectedCategory?: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  shoes: ["shoe", "shoes", "heel", "heels", "boot", "boots", "sandal", "sandals", "sneaker", "sneakers", "pump", "pumps", "loafer", "loafers", "mule", "mules", "flat", "flats", "oxford", "oxfords", "slingback", "espadrille", "wedge", "platform shoe", "stiletto", "kitten heel"],
  tights: ["tight", "tights", "hosiery", "stocking", "stockings", "pantyhose", "legging", "leggings", "thigh-high", "knee-high sock"],
  bag: ["bag", "bags", "clutch", "tote", "purse", "handbag", "satchel", "crossbody", "backpack", "shoulder bag", "mini bag", "bucket bag", "chain bag", "evening bag", "pouch"],
  accessories: ["earring", "earrings", "necklace", "bracelet", "ring", "jewelry", "jewellery", "watch", "sunglasses", "scarf", "belt", "hair clip", "headband", "hat", "cap", "glove", "gloves", "brooch", "choker", "pendant", "cuff", "bangle", "anklet"],
  dress: ["dress", "gown", "mini dress", "midi dress", "maxi dress", "bodycon", "slip dress", "wrap dress", "shirt dress", "cocktail dress"],
};

export function detectCategory(url: string, title: string): string {
  const text = `${url} ${title}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => text.includes(kw))) return category;
  }
  return "other";
}

export function parseJsonLd(html: string): { title?: string; price?: number; images?: string[] } | null {
  const matches = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (!matches) return null;

  for (const match of matches) {
    try {
      const jsonStr = match.replace(/<script type="application\/ld\+json">/, "").replace(/<\/script>/, "");
      const data = JSON.parse(jsonStr);

      // Handle arrays of JSON-LD
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Product" || item["@type"]?.includes?.("Product")) {
          const images: string[] = [];
          if (typeof item.image === "string") images.push(item.image);
          else if (Array.isArray(item.image)) {
            for (const img of item.image) {
              if (typeof img === "string") images.push(img);
              else if (img?.url) images.push(img.url);
              else if (img?.contentUrl) images.push(img.contentUrl);
            }
          } else if (item.image?.url) {
            images.push(item.image.url);
          }

          let price: number | undefined;
          if (item.offers) {
            const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
            if (offer?.price) price = parseFloat(offer.price);
            else if (offer?.lowPrice) price = parseFloat(offer.lowPrice);
          }

          return {
            title: item.name,
            price: price && !isNaN(price) ? price : undefined,
            images: images.length > 0 ? images : undefined,
          };
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function scrapeShopifyProduct(
  productUrl: string
): Promise<ScrapedProduct | null> {
  try {
    const url = new URL(productUrl);
    const host = url.origin;
    const handle = url.pathname.split("/products/")[1]?.split("?")[0];
    if (!handle) return null;

    const jsonUrl = `${host}/products/${handle}.json`;
    const resp = await fetch(jsonUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const p = data.product;

    const title = p.title;
    return {
      title,
      price: p.variants?.[0]?.price ? parseFloat(p.variants[0].price) : null,
      store: p.vendor || url.hostname.replace("www.", "").split(".")[0],
      images: (p.images || []).map((i: { src: string }) => i.src),
      handle: p.handle,
      url: `${host}/products/${handle}`,
      detectedCategory: detectCategory(productUrl, title),
    };
  } catch {
    return null;
  }
}

export async function scrapeGenericProduct(
  productUrl: string
): Promise<ScrapedProduct | null> {
  // Try Shopify first
  const shopify = await scrapeShopifyProduct(productUrl);
  if (shopify) return shopify;

  // Fallback: fetch HTML and extract JSON-LD / OG meta tags
  try {
    const resp = await fetch(productUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    const html = await resp.text();

    // Try JSON-LD structured data first (works for Wolford, Net-a-Porter, Nordstrom, etc.)
    const jsonLd = parseJsonLd(html);

    const title =
      jsonLd?.title ||
      html.match(/<meta property="og:title" content="([^"]+)"/)?.[1] ||
      html.match(/<title>([^<]+)/)?.[1] ||
      "Unknown Product";

    const ogImage = html.match(
      /<meta property="og:image" content="([^"]+)"/
    )?.[1];

    const images = jsonLd?.images && jsonLd.images.length > 0
      ? jsonLd.images
      : ogImage ? [ogImage] : [];

    const priceMatch = html.match(
      /<meta property="product:price:amount" content="([^"]+)"/
    );
    const price = jsonLd?.price ?? (priceMatch ? parseFloat(priceMatch[1]) : null);

    const url = new URL(productUrl);

    return {
      title: title.trim(),
      price,
      store: url.hostname.replace("www.", "").split(".")[0],
      images,
      handle: url.pathname.split("/").pop() || "product",
      url: productUrl,
      detectedCategory: detectCategory(productUrl, title),
    };
  } catch {
    return null;
  }
}
