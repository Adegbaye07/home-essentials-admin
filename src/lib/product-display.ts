import { isCleaningCategory } from "./constants";
import type { Product } from "./types";

export function productPriceRangeKobo(product: Product): { min: number; max: number } | null {
  const prices: number[] = [];

  if (isCleaningCategory(product.category) && product.cleaningPricing) {
    prices.push(product.cleaningPricing.piecePriceKobo, product.cleaningPricing.dozenPriceKobo);
  } else {
    for (const sp of product.sizePricings ?? []) {
      prices.push(sp.piecePriceKobo, sp.bundlePriceKobo);
    }
  }

  if (prices.length === 0) return null;
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function productThumbnailUrl(product: Product): string | undefined {
  return product.variantImages?.[0]?.imageUrl;
}

/** Prefer authenticity video for catalogue/store thumbs; else first variant image. */
export function productPrimaryMedia(
  product: Product,
): { kind: "video"; url: string } | { kind: "image"; url: string } | null {
  const video = product.videoUrl?.trim();
  if (video) return { kind: "video", url: video };
  const image = productThumbnailUrl(product)?.trim();
  if (image) return { kind: "image", url: image };
  return null;
}
