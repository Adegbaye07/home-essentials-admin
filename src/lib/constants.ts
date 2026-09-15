import type { OrderStatus } from "./types";

const CATEGORY_BY_VALUE = {
  foot_mats: "Foot mats",
  door_mats: "Door mats",
  center_mats: "Center mats",
  rugs: "Rugs",
  cleaning_essentials: "Cleaning essentials",
} as const;

export type CategoryValue = keyof typeof CATEGORY_BY_VALUE;

export const PRODUCT_CATEGORIES: { value: CategoryValue; label: string }[] = [
  { value: "foot_mats", label: CATEGORY_BY_VALUE.foot_mats },
  { value: "door_mats", label: CATEGORY_BY_VALUE.door_mats },
  { value: "center_mats", label: CATEGORY_BY_VALUE.center_mats },
  { value: "rugs", label: CATEGORY_BY_VALUE.rugs },
  { value: "cleaning_essentials", label: CATEGORY_BY_VALUE.cleaning_essentials },
];

export const CLEANING_CATEGORY: CategoryValue = "cleaning_essentials";

export function isCleaningCategory(category: string | undefined): boolean {
  return category === CLEANING_CATEGORY;
}

export function categoryLabel(value: string): string {
  if (value in CATEGORY_BY_VALUE) {
    return CATEGORY_BY_VALUE[value as CategoryValue];
  }
  return value;
}

export function categorySelectOptions(current?: string): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = PRODUCT_CATEGORIES.map((c) => ({
    value: c.value,
    label: c.label,
  }));
  if (current && !PRODUCT_CATEGORIES.some((c) => c.value === current)) {
    options.push({ value: current, label: categoryLabel(current) });
  }
  return options;
}

/** All statuses for list filters and labels. */
export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "pending_payment", label: "Pending payment" },
  { value: "abandoned", label: "Abandoned" },
  { value: "paid", label: "Paid" },
  { value: "packing", label: "Packing" },
  { value: "in_transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
];

const LEGACY_STATUS_LABELS: Record<string, string> = {
  processing: "Packing",
  shipped: "In transit",
  cancelled: "Cancelled",
  created: "Created",
  rejected: "Rejected",
};

export function normalizeOrderStatus(status: OrderStatus | string): OrderStatus {
  if (status === "processing") return "packing";
  if (status === "shipped") return "in_transit";
  return status as OrderStatus;
}

export function orderStatusLabel(status: OrderStatus | string): string {
  const legacy = LEGACY_STATUS_LABELS[status];
  if (legacy) return legacy;
  const normalized = normalizeOrderStatus(status);
  return ORDER_STATUSES.find((s) => s.value === normalized)?.label ?? String(status);
}

export function orderStatusColor(status: OrderStatus | string): string {
  const s = normalizeOrderStatus(status);
  switch (s) {
    case "created":
      return "orange";
    case "pending_payment":
      return "gold";
    case "abandoned":
      return "default";
    case "rejected":
      return "red";
    case "paid":
      return "blue";
    case "packing":
      return "cyan";
    case "in_transit":
      return "purple";
    case "delivered":
      return "green";
    default:
      return "default";
  }
}

/** Statuses the admin may select on the order detail page (generic PATCH). */
export function adminNextStatusOptions(
  current: OrderStatus | string,
): { value: OrderStatus; label: string }[] {
  const c = normalizeOrderStatus(current);
  switch (c) {
    case "pending_payment":
      return [{ value: "paid", label: "Paid" }];
    case "abandoned":
    case "created":
    case "rejected":
      return [];
    case "paid":
      return [
        { value: "packing", label: "Packing" },
        { value: "in_transit", label: "In transit" },
        { value: "delivered", label: "Delivered" },
      ];
    case "packing":
      return [
        { value: "in_transit", label: "In transit" },
        { value: "delivered", label: "Delivered" },
      ];
    case "in_transit":
      return [{ value: "delivered", label: "Delivered" }];
    default:
      return [];
  }
}
