/**
 * Effective per-piece price when buying a multi-piece unit (bundle or dozen).
 * Floor-divides kobo so display stays consistent with integer kobo amounts.
 */
export function effectivePiecePriceKobo(
  totalKobo: number,
  pieceCount: number,
): number | null {
  if (!Number.isFinite(totalKobo) || totalKobo <= 0) return null;
  if (!Number.isFinite(pieceCount) || pieceCount < 1) return null;
  return Math.floor(totalKobo / pieceCount);
}
