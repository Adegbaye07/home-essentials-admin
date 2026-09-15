import { clearToken, getToken, setToken } from "./auth";
import type { LoginResponse, Order, Paginated, Product } from "./types";

function baseURL(): string {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    throw new Error("NEXT_PUBLIC_API_URL is not set");
  }
  return base.replace(/\/$/, "");
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseError(res: Response, path?: string): Promise<string> {
  const text = await res.text();
  if (text) {
    try {
      const data = JSON.parse(text) as { error?: string };
      if (data.error) {
        return data.error;
      }
    } catch {
      // not JSON
    }
  }

  if (res.status === 404 && path?.includes("/uploads")) {
    return "Upload endpoint not found — restart the API from home-essentials-backend (go run . or air)";
  }

  return text.trim() || res.statusText || "Request failed";
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await fetch(`${baseURL()}/api/v1/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    throw new ApiError(await parseError(res, "/api/v1/admin/login"), res.status);
  }

  const data = (await res.json()) as LoginResponse;
  setToken(data.token);
  return data;
}

export function logout(): void {
  clearToken();
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(init.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${baseURL()}${path}`, { ...init, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return res;
}

export async function listProducts(params?: {
  category?: string;
  active?: boolean;
  page?: number;
  page_size?: number;
}): Promise<Paginated<Product>> {
  const search = new URLSearchParams();
  if (params?.category) search.set("category", params.category);
  if (params?.active !== undefined) search.set("active", String(params.active));
  if (params?.page !== undefined) search.set("page", String(params.page));
  if (params?.page_size !== undefined) search.set("page_size", String(params.page_size));

  const qs = search.toString();
  const res = await apiFetch(`/api/v1/admin/products${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as Paginated<Product>;
}

export async function getProduct(id: string): Promise<Product> {
  const res = await apiFetch(`/api/v1/admin/products/${id}`);
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as Product;
}

export async function createProduct(body: unknown): Promise<Product> {
  const res = await apiFetch("/api/v1/admin/products", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as Product;
}

export async function updateProduct(id: string, body: unknown): Promise<Product> {
  const res = await apiFetch(`/api/v1/admin/products/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as Product;
}

export async function deleteProduct(id: string): Promise<void> {
  const res = await apiFetch(`/api/v1/admin/products/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
}

export async function uploadProductImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);

  const res = await apiFetch("/api/v1/admin/uploads", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new ApiError(await parseError(res, "/api/v1/admin/uploads"), res.status);
  }

  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function listOrders(params?: {
  status?: string;
  orderType?: string;
  page?: number;
  page_size?: number;
}): Promise<Paginated<Order>> {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.orderType) search.set("orderType", params.orderType);
  if (params?.page !== undefined) search.set("page", String(params.page));
  if (params?.page_size !== undefined) search.set("page_size", String(params.page_size));

  const qs = search.toString();
  const res = await apiFetch(`/api/v1/admin/orders${qs ? `?${qs}` : ""}`);
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as Paginated<Order>;
}

export async function getOrder(id: string): Promise<Order> {
  const res = await apiFetch(`/api/v1/admin/orders/${id}`);
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as Order;
}

export async function updateOrderStatus(
  id: string,
  body: { status: string; note?: string },
): Promise<Order> {
  const res = await apiFetch(`/api/v1/admin/orders/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as Order;
}

export type CustomPaymentLinkResult = {
  order: Order;
  authorizationUrl: string;
  paystackReference: string;
};

export async function acceptCustomOrder(
  id: string,
  body: { amountKobo: number },
): Promise<CustomPaymentLinkResult> {
  const res = await apiFetch(`/api/v1/admin/orders/${id}/accept`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as CustomPaymentLinkResult;
}

export async function rejectCustomOrder(
  id: string,
  body: { reason: string },
): Promise<Order> {
  const res = await apiFetch(`/api/v1/admin/orders/${id}/reject`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as Order;
}

export async function resendCustomPaymentLink(id: string): Promise<CustomPaymentLinkResult> {
  const res = await apiFetch(`/api/v1/admin/orders/${id}/resend-payment-link`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
  return (await res.json()) as CustomPaymentLinkResult;
}

export async function deleteAbandonedOrder(id: string): Promise<void> {
  const res = await apiFetch(`/api/v1/admin/orders/${id}`, { method: "DELETE" });
  if (!res.ok) {
    throw new ApiError(await parseError(res), res.status);
  }
}
