import { apiFetch, apiForm, apiJson } from "@/lib/api/client";
import type {
  AdminReview,
  Cart,
  Category,
  Order,
  Page,
  Payment,
  Product,
  ProductImage,
  ProductListItem,
  RatingSummary,
  Review,
  Shipment,
  TokenPairResponse,
  UserProfile
} from "@/lib/api/types";

export const authApi = {
  login: (email: string, password: string) => apiJson<TokenPairResponse>("/api/auth/login", { email, password }, { auth: false }),
  register: (email: string, password: string) => apiJson<TokenPairResponse>("/api/auth/register", { email, password }, { auth: false }),
  me: () => apiFetch<UserProfile>("/api/auth/me")
};

export const catalogApi = {
  categories: () => apiFetch<Category[]>("/api/catalog/categories", { auth: false }),
  categoryBySlug: (slug: string) => apiFetch<Category>(`/api/catalog/categories/${encodeURIComponent(slug)}`, { auth: false }),
  products: (params: URLSearchParams) => apiFetch<Page<ProductListItem>>(`/api/catalog/products/search?${params}`, { auth: false }),
  product: (id: number) => apiFetch<Product>(`/api/catalog/products/${id}`, { auth: false }),
  reviews: (productId: number, page = 0, size = 6) =>
    apiFetch<Page<Review>>(`/api/catalog/products/${productId}/reviews?page=${page}&size=${size}`, { auth: false }),
  rating: (productId: number) => apiFetch<RatingSummary>(`/api/catalog/products/${productId}/rating`, { auth: false })
};

export const reviewApi = {
  create: (productId: number, body: { rating: number; title: string; body: string; orderId?: number | null }) =>
    apiJson<Review>(`/api/products/${productId}/reviews`, body),
  update: (reviewId: number, body: { rating: number; title: string; body: string }) =>
    apiJson<Review>(`/api/reviews/${reviewId}`, body, { method: "PUT" }),
  remove: (reviewId: number) => apiFetch<void>(`/api/reviews/${reviewId}`, { method: "DELETE" })
};

export const cartApi = {
  get: () => apiFetch<Cart>("/api/cart"),
  add: (productId: number, quantity: number) => apiJson<Cart>("/api/cart/items", { productId, quantity }),
  setQuantity: (productId: number, quantity: number) => apiJson<Cart>(`/api/cart/items/${productId}`, { productId, quantity }, { method: "PUT" }),
  remove: (productId: number) => apiFetch<Cart>(`/api/cart/items/${productId}`, { method: "DELETE" }),
  clear: () => apiFetch<Cart>("/api/cart", { method: "DELETE" })
};

export const orderApi = {
  checkout: () => apiFetch<Order>("/api/orders/checkout", { method: "POST" }),
  list: () => apiFetch<Order[]>("/api/orders"),
  get: (id: number) => apiFetch<Order>(`/api/orders/${id}`),
  cancel: (id: number) => apiFetch<Order>(`/api/orders/${id}/cancel`, { method: "PATCH" })
};

export const shippingApi = {
  setAddress: (body: Record<string, unknown>) => apiJson<Shipment>("/api/shipping/address", body),
  setMethod: (body: Record<string, unknown>) => apiJson<Shipment>("/api/shipping/method", body),
  get: (orderId: number) => apiFetch<Shipment>(`/api/shipping/${orderId}`)
};

export const paymentApi = {
  create: (orderId: number) => apiJson<Payment>("/api/payments", { orderId }),
  get: (paymentId: number) => apiFetch<Payment>(`/api/payments/${paymentId}`)
};

export const adminApi = {
  users: () => apiFetch<UserProfile[]>("/api/admin/users"),
  products: () => apiFetch<Product[]>("/api/admin/catalog/products"),
  product: (id: number) => apiFetch<Product>(`/api/admin/catalog/products/${id}`),
  orders: () => apiFetch<Order[]>("/api/admin/orders"),
  order: (id: number) => apiFetch<Order>(`/api/admin/orders/${id}`),
  updateOrderStatus: (id: number, status: string) => apiFetch<Order>(`/api/admin/orders/${id}/status?status=${encodeURIComponent(status)}`, { method: "PATCH" }),
  updateShippingStatus: (orderId: number, status: string, trackingNumber?: string) => {
    const params = new URLSearchParams({ status });
    if (trackingNumber) params.set("trackingNumber", trackingNumber);
    return apiFetch<Shipment>(`/api/admin/shipping/${orderId}/status?${params}`, { method: "PATCH" });
  },
  createProduct: (body: Record<string, unknown>) => apiJson<Product>("/api/admin/catalog/products", body),
  updateProduct: (id: number, body: Record<string, unknown>) => apiJson<Product>(`/api/admin/catalog/products/${id}`, body, { method: "PUT" }),
  deleteProduct: (id: number) => apiFetch<void>(`/api/admin/catalog/products/${id}`, { method: "DELETE" }),
  createCategory: (body: Record<string, unknown>) => apiJson<Category>("/api/admin/catalog/categories", body),
  updateCategory: (id: number, body: Record<string, unknown>) => apiJson<Category>(`/api/admin/catalog/categories/${id}`, body, { method: "PUT" }),
  deleteCategory: (id: number) => apiFetch<void>(`/api/admin/catalog/categories/${id}`, { method: "DELETE" }),
  uploadProductImage: (productId: number, file: File, altText?: string, sortOrder?: number) => {
    const form = new FormData();
    form.set("file", file);
    if (altText) form.set("altText", altText);
    if (sortOrder != null) form.set("sortOrder", String(sortOrder));
    return apiForm<ProductImage>(`/api/admin/catalog/products/${productId}/images`, form);
  },
  reviews: (params: URLSearchParams) => apiFetch<Page<AdminReview>>(`/api/admin/reviews?${params}`),
  updateReviewStatus: (reviewId: number, status: string) => apiJson<AdminReview>(`/api/admin/reviews/${reviewId}/status`, { status }, { method: "PATCH" }),
  deleteReview: (reviewId: number) => apiFetch<void>(`/api/admin/reviews/${reviewId}`, { method: "DELETE" })
};
