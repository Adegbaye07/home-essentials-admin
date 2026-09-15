import type { Product, QtyTier } from "./types";

export function productPriceRangeKobo(product: Product): { min: number; max: number } | null {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const sv of product.sizes) {
    for (const t of sv.tiers) {
      min = Math.min(min, t.unitPriceKobo);
      max = Math.max(max, t.unitPriceKobo);
    }
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { min, max };
}

export function formatTierRange(tier: QtyTier): string {
  const { minQty, maxQty } = tier;
  if (maxQty != null && maxQty === minQty) {
    return String(minQty);
  }
  if (maxQty != null) {
    return `${minQty}-${maxQty}`;
  }
  return `${minQty}+`;
}

export function productThumbnailUrl(product: Product): string | undefined {
  return product.colorImages?.[0]?.imageUrl;
}
