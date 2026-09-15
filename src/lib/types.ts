export type VariantImage = {
  variant: string;
  imageUrl: string;
};

export type SizePricing = {
  size: string;
  piecePriceKobo: number;
  bundlePriceKobo: number;
  piecesPerBundle: number;
};

export type CleaningPricing = {
  piecePriceKobo: number;
  dozenPriceKobo: number;
};

export type Product = {
  id: string;
  title: string;
  description: string;
  category: string;
  variants: string[];
  variantImages: VariantImage[];
  sizePricings?: SizePricing[];
  cleaningPricing?: CleaningPricing | null;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type LoginResponse = {
  token: string;
  expiresAt: string;
  role: string;
  email: string;
};

export type ListMetadata = {
  total_items: number;
  current_items: number;
  current_page: number;
  last_page: number;
  next_page: number | null;
  previous_page: number | null;
  has_next_page: boolean;
  has_previous_page: boolean;
};

export type Paginated<T> = {
  items: T[];
  metadata: ListMetadata;
};

export type OrderStatus =
  | "created"
  | "pending_payment"
  | "abandoned"
  | "rejected"
  | "paid"
  | "packing"
  | "in_transit"
  | "delivered";

export type OrderType = "shop" | "custom";

export type OrderUnit = "piece" | "bundle" | "dozen";

export type OrderItem = {
  productId: string;
  productTitle: string;
  variant: string;
  size?: string;
  unit: OrderUnit;
  piecesPerBundle?: number;
  imageUrl?: string;
  quantity: number;
  unitPriceKobo: number;
  lineTotalKobo: number;
};

export type CustomRequest = {
  title: string;
  description: string;
  sizes: string[];
  colors: string[];
  quantity: number;
  offeredTotalKobo: number;
  sampleImageUrl?: string;
};

export type CustomerInfo = {
  name?: string;
  email: string;
  phone: string;
  deliveryAddress: string;
};

export type StatusHistoryEntry = {
  status: OrderStatus;
  at: string;
  note?: string;
};

export type Order = {
  id: string;
  orderType?: OrderType;
  items: OrderItem[];
  custom?: CustomRequest;
  customer: CustomerInfo;
  status: OrderStatus;
  statusHistory: StatusHistoryEntry[];
  totalAmountKobo: number;
  paystackReference: string;
  trackingNumber?: string;
  createdAt: string;
  updatedAt: string;
};
