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
