import type { OrderStatus, OrderType } from "./types";

const CATEGORY_BY_VALUE = {
  cross_body: "Cross body bags",
  hobo: "Hobo bags",
  duffel: "Duffel bags",
  male_toilet: "Male toilet bags",
  school: "School bags",
  travel: "Traveling bags",
  laptop: "Laptop bags",
  purse: "Purse",
  clutch: "Clutch bags",
  tote: "Tote bags",
  shoulder: "Shoulder bags",
  shopping: "Shopping bags",
  rope: "Rope bags",
  satchel: "Satchels bags",
  jute: "Jute bags",
  lunch_box: "Lunch boxes",
  waist_purse: "Waist purses",
  folder: "Folder bags",
  pencil_case: "Pencil cases",
  hand_bag: "Hand bags",
  flap_bag: "Flap bags",
} as const;

export type CategoryValue = keyof typeof CATEGORY_BY_VALUE;

/** Matches client store tab order: popular bag types first. */
export const PRODUCT_CATEGORIES: { value: CategoryValue; label: string }[] = [
  { value: "hand_bag", label: CATEGORY_BY_VALUE.hand_bag },
  { value: "tote", label: CATEGORY_BY_VALUE.tote },
  { value: "shoulder", label: CATEGORY_BY_VALUE.shoulder },
  { value: "cross_body", label: CATEGORY_BY_VALUE.cross_body },
  { value: "flap_bag", label: CATEGORY_BY_VALUE.flap_bag },
  { value: "satchel", label: CATEGORY_BY_VALUE.satchel },
  { value: "clutch", label: CATEGORY_BY_VALUE.clutch },
  { value: "hobo", label: CATEGORY_BY_VALUE.hobo },
  { value: "purse", label: CATEGORY_BY_VALUE.purse },
  { value: "shopping", label: CATEGORY_BY_VALUE.shopping },
  { value: "travel", label: CATEGORY_BY_VALUE.travel },
  { value: "school", label: CATEGORY_BY_VALUE.school },
  { value: "laptop", label: CATEGORY_BY_VALUE.laptop },
  { value: "duffel", label: CATEGORY_BY_VALUE.duffel },
  { value: "male_toilet", label: CATEGORY_BY_VALUE.male_toilet },
  { value: "rope", label: CATEGORY_BY_VALUE.rope },
  { value: "jute", label: CATEGORY_BY_VALUE.jute },
  { value: "waist_purse", label: CATEGORY_BY_VALUE.waist_purse },
  { value: "lunch_box", label: CATEGORY_BY_VALUE.lunch_box },
  { value: "folder", label: CATEGORY_BY_VALUE.folder },
  { value: "pencil_case", label: CATEGORY_BY_VALUE.pencil_case },
];

const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  mens: "Men's",
};

export function categoryLabel(value: string): string {
  if (value in CATEGORY_BY_VALUE) {
    return CATEGORY_BY_VALUE[value as CategoryValue];
  }
  return LEGACY_CATEGORY_LABELS[value] ?? value;
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

export const SIZE_CODES = ["S", "M", "L", "XL", "XXL"] as const;

export type SizeCode = (typeof SIZE_CODES)[number];

/** All statuses for list filters and labels (includes pre-payment and custom-order states). */
export const ORDER_STATUSES: { value: OrderStatus; label: string }[] = [
  { value: "created", label: "Created" },
  { value: "pending_payment", label: "Pending payment" },
  { value: "abandoned", label: "Abandoned" },
  { value: "rejected", label: "Rejected" },
  { value: "paid", label: "Paid" },
  { value: "packing", label: "Packing" },
  { value: "in_transit", label: "In transit" },
  { value: "delivered", label: "Delivered" },
];

export const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: "shop", label: "Shop" },
  { value: "custom", label: "Custom" },
];

export function orderTypeLabel(type: string | undefined): string {
  if (!type || type === "shop") return "Shop";
  return ORDER_TYPES.find((t) => t.value === type)?.label ?? type;
}

export function orderTypeColor(type: string | undefined): string {
  const t = !type || type === "shop" ? "shop" : type;
  switch (t) {
    case "custom":
      return "magenta";
    case "shop":
    default:
      return "geekblue";
  }
}

export function normalizeOrderType(type: string | undefined): OrderType {
  return type === "custom" ? "custom" : "shop";
}

const LEGACY_STATUS_LABELS: Record<string, string> = {
  processing: "Packing",
  shipped: "In transit",
  cancelled: "Cancelled",
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
    case "created":
      // Custom accept/reject use dedicated actions (Phase 5); not generic status select.
      return [];
    case "pending_payment":
      return [{ value: "paid", label: "Paid" }];
    case "abandoned":
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
