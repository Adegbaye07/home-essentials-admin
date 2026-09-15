export type TierForm = {
  minQty: number;
  maxQty?: number;
  priceNgn: number;
  deliveryDays: number;
};

function tierUpperBound(tier: TierForm): number {
  if (tier.maxQty != null && tier.maxQty >= tier.minQty) {
    return tier.maxQty;
  }
  return tier.minQty;
}

/** Minimum quantity for a new tier appended after `tiers`. */
export function nextTierMinQty(tiers: TierForm[]): number {
  if (tiers.length === 0) {
    return 1;
  }
  return tierUpperBound(tiers[tiers.length - 1]!) + 1;
}

export function defaultNewTier(tiers: TierForm[]): TierForm {
  return {
    minQty: nextTierMinQty(tiers),
    priceNgn: 0,
    deliveryDays: 7,
  };
}

export function applyMinQtyChange(
  tiers: TierForm[],
  index: number,
  newMin: number,
): TierForm[] {
  const next = tiers.map((tier) => ({ ...tier }));
  next[index] = { ...next[index]!, minQty: newMin };
  if (index > 0 && newMin >= 1) {
    next[index - 1] = { ...next[index - 1]!, maxQty: newMin - 1 };
  }
  return next;
}

export function applyMaxQtyChange(
  tiers: TierForm[],
  index: number,
  newMax: number | null | undefined,
): TierForm[] {
  const next = tiers.map((tier) => ({ ...tier }));
  if (newMax == null) {
    next[index] = { ...next[index]!, maxQty: undefined };
    return next;
  }
  next[index] = { ...next[index]!, maxQty: newMax };
  if (index + 1 < next.length && newMax >= 1) {
    next[index + 1] = { ...next[index + 1]!, minQty: newMax + 1 };
  }
  return next;
}

/** Re-chain min quantities after a tier is removed. First tier always starts at 1. */
export function relinkTiersAfterRemove(tiers: TierForm[]): TierForm[] {
  if (tiers.length === 0) {
    return tiers;
  }
  const next = tiers.map((tier) => ({ ...tier }));
  next[0] = { ...next[0]!, minQty: 1 };
  for (let i = 1; i < next.length; i++) {
    next[i] = { ...next[i]!, minQty: tierUpperBound(next[i - 1]!) + 1 };
  }
  return next;
}

export function tierSectionLabel(index: number, total: number): string {
  if (total >= 3 && index === total - 1) {
    return `Tier ${index + 1} (last)`;
  }
  return `Tier ${index + 1}`;
}
