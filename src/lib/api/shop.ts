import { apiFetch, apiForm, apiJson } from "@/lib/api/client";
import { getCartToken, setCartToken } from "@/lib/auth/session";
import type {
  AddressInput,
  AdminReview,
  Brand,
  Cart,
  Category,
  Consent,
  ConsentType,
  Order,
  OrderStatusHistoryEntry,
  Page,
  Payment,
  Product,
  ProductImageUpload,
  ProductInput,
  ProductListItem,
  PromoCode,
  PromoCodeInput,
  PromoValidation,
  RatingSummary,
  Review,
  ReviewSummary,
  Shipment,
  ShippingMethod,
  StylistChatResponse,
  StylistHistoryMessage,
  TokenPairResponse,
  UserAddress,
  UserDataExport,
  UserGender,
  UserProfile,
  Variant,
  VariantInput,
  WishlistEntry
} from "@/lib/api/types";

const v1 = "/api/v1";

// === Auth ===================================================================

export const authApi = {
  // the guest cart token rides along so the backend merges the cart (CART-02)
  login: (email: string, password: string) =>
    apiJson<TokenPairResponse>(`${v1}/auth/login`, { email, password }, { auth: false, cartToken: true }),
  register: (email: string, password: string, passwordConfirm: string) =>
    apiJson<TokenPairResponse>(
      `${v1}/auth/register`,
      { email, password, passwordConfirm },
      { auth: false, cartToken: true }
    ),
  // exchanges a Google ID token (from Google Identity Services) for our session tokens
  googleLogin: (idToken: string) =>
    apiJson<TokenPairResponse>(`${v1}/auth/google`, { idToken }, { auth: false, cartToken: true }),
  logout: (refreshToken: string) => apiJson<void>(`${v1}/auth/logout`, { refreshToken }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiJson<void>(`${v1}/auth/change-password`, { currentPassword, newPassword }),
  forgotPassword: (email: string) => apiJson<void>(`${v1}/auth/forgot-password`, { email }, { auth: false }),
  resetPassword: (token: string, newPassword: string) =>
    apiJson<void>(`${v1}/auth/reset-password`, { token, newPassword }, { auth: false }),
  verifyEmail: (token: string) => apiJson<void>(`${v1}/auth/verify-email`, { token }, { auth: false }),
  resendVerification: () => apiFetch<void>(`${v1}/auth/resend-verification`, { method: "POST" }),
  me: () => apiFetch<UserProfile>(`${v1}/auth/me`)
};

// === Catalog ================================================================

export type CatalogFilters = {
  q?: string;
  categoryId?: number;
  brandId?: number;
  gender?: string;
  size?: string;
  color?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  inStock?: boolean;
  page?: number;
  pageSize?: number;
  sort?: string;
};

function searchParams(filters: CatalogFilters) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.categoryId != null) params.set("categoryId", String(filters.categoryId));
  if (filters.brandId != null) params.set("brandId", String(filters.brandId));
  if (filters.gender) params.set("gender", filters.gender);
  // clothing size rides on `variantSize`; plain `size` is Spring's page-size param (set below)
  if (filters.size) params.set("variantSize", filters.size);
  if (filters.color) params.set("color", filters.color);
  if (filters.minPrice != null && filters.minPrice !== "") params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice != null && filters.maxPrice !== "") params.set("maxPrice", String(filters.maxPrice));
  if (filters.inStock) params.set("inStock", "true");
  params.set("page", String(filters.page ?? 0));
  params.set("size", String(filters.pageSize ?? 12));
  if (filters.sort) params.set("sort", filters.sort);
  return params;
}

export const catalogApi = {
  categories: () => apiFetch<Category[]>(`${v1}/catalog/categories`, { auth: false }),
  categoryBySlug: (slug: string) =>
    apiFetch<Category>(`${v1}/catalog/categories/${encodeURIComponent(slug)}`, { auth: false }),
  brands: () => apiFetch<Brand[]>(`${v1}/catalog/brands`, { auth: false }),
  products: (page = 0, size = 12) =>
    apiFetch<Page<ProductListItem>>(`${v1}/catalog/products?page=${page}&size=${size}`, { auth: false }),
  productsByCategory: (slug: string, page = 0, size = 12) =>
    apiFetch<Page<ProductListItem>>(
      `${v1}/catalog/categories/${encodeURIComponent(slug)}/products?page=${page}&size=${size}`,
      { auth: false }
    ),
  search: (filters: CatalogFilters) =>
    apiFetch<Page<ProductListItem>>(`${v1}/catalog/products/search?${searchParams(filters)}`, { auth: false }),
  product: (id: number) => apiFetch<Product>(`${v1}/catalog/products/${id}`, { auth: false }),
  reviews: (productId: number, page = 0, size = 6) =>
    apiFetch<Page<Review>>(`${v1}/catalog/products/${productId}/reviews?page=${page}&size=${size}`, { auth: false }),
  rating: (productId: number) => apiFetch<RatingSummary>(`${v1}/catalog/products/${productId}/rating`, { auth: false })
};

// === AI-assisted catalog (degrades to keyword/non-AI behaviour server-side) =

export const aiApi = {
  semanticSearch: (q: string, limit = 20) =>
    apiFetch<ProductListItem[]>(
      `${v1}/catalog/products/semantic-search?q=${encodeURIComponent(q)}&limit=${limit}`,
      { auth: false }
    ),
  nlSearch: (q: string, page = 0, size = 20) =>
    apiFetch<Page<ProductListItem>>(
      `${v1}/catalog/products/nl-search?q=${encodeURIComponent(q)}&page=${page}&size=${size}`,
      { auth: false }
    ),
  similar: (productId: number, limit = 8) =>
    apiFetch<ProductListItem[]>(`${v1}/catalog/products/${productId}/similar?limit=${limit}`, { auth: false }),
  boughtTogether: (productId: number, limit = 8) =>
    apiFetch<ProductListItem[]>(`${v1}/catalog/products/${productId}/bought-together?limit=${limit}`, { auth: false }),
  /** 404 while a summary has not been generated yet — treat it as "nothing to show" */
  reviewSummary: (productId: number) =>
    apiFetch<ReviewSummary>(`${v1}/catalog/products/${productId}/review-summary`, { auth: false }),
  stylistChat: (message: string, history: StylistHistoryMessage[]) =>
    apiJson<StylistChatResponse>(`${v1}/catalog/stylist/chat`, { message, history }, { auth: false })
};

// === Reviews ================================================================

export const reviewApi = {
  create: (productId: number, body: { rating: number; body: string; orderId?: number | null }) =>
    apiJson<Review>(`${v1}/products/${productId}/reviews`, body),
  update: (reviewId: number, body: { rating: number; body: string }) =>
    apiJson<Review>(`${v1}/reviews/${reviewId}`, body, { method: "PUT" }),
  remove: (reviewId: number) => apiFetch<void>(`${v1}/reviews/${reviewId}`, { method: "DELETE" })
};

// === Cart (works for guests via X-Cart-Token) ===============================

function rememberGuestToken(cart: Cart) {
  if (cart.guestToken) {
    setCartToken(cart.guestToken);
  }
  return cart;
}

export const cartApi = {
  get: () => apiFetch<Cart>(`${v1}/cart`, { cartToken: true }).then(rememberGuestToken),
  add: (variantId: number, quantity: number) =>
    apiJson<Cart>(`${v1}/cart/items`, { variantId, quantity }, { cartToken: true }).then(rememberGuestToken),
  setQuantity: (variantId: number, quantity: number) =>
    apiJson<Cart>(`${v1}/cart/items/${variantId}`, { variantId, quantity }, { method: "PUT", cartToken: true }).then(
      rememberGuestToken
    ),
  remove: (variantId: number) =>
    apiFetch<Cart>(`${v1}/cart/items/${variantId}`, { method: "DELETE", cartToken: true }).then(rememberGuestToken),
  clear: () => apiFetch<Cart>(`${v1}/cart`, { method: "DELETE", cartToken: true }).then(rememberGuestToken),
  /** after a login merge the guest token is spent */
  forgetGuestToken: () => setCartToken(null),
  hasGuestToken: () => Boolean(getCartToken())
};

// === Promo ==================================================================

export const promoApi = {
  validate: (code: string) => apiJson<PromoValidation>(`${v1}/promo/validate`, { code })
};

// === Orders =================================================================

export const orderApi = {
  checkout: (options: { promoCode?: string | null; idempotencyKey?: string } = {}) =>
    apiJson<Order>(
      `${v1}/orders/checkout`,
      { promoCode: options.promoCode || null },
      { idempotencyKey: options.idempotencyKey }
    ),
  list: (page = 0, size = 10, status?: string) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set("status", status);
    return apiFetch<Page<Order>>(`${v1}/orders?${params}`);
  },
  get: (id: number) => apiFetch<Order>(`${v1}/orders/${id}`),
  cancel: (id: number) => apiFetch<Order>(`${v1}/orders/${id}/cancel`, { method: "PATCH" })
};

// === Shipping ===============================================================

export const shippingApi = {
  setAddress: (body: { orderId: number } & Record<string, unknown>) =>
    apiJson<Shipment>(`${v1}/shipping/address`, body),
  setMethod: (orderId: number, method: ShippingMethod) =>
    apiJson<Shipment>(`${v1}/shipping/method`, { orderId, method }),
  get: (orderId: number) => apiFetch<Shipment>(`${v1}/shipping/${orderId}`)
};

// === Payments ===============================================================

export const paymentApi = {
  create: (orderId: number, idempotencyKey?: string) =>
    apiJson<Payment>(`${v1}/payments`, { orderId }, { idempotencyKey }),
  get: (paymentId: number) => apiFetch<Payment>(`${v1}/payments/${paymentId}`)
};

// === Current user self-service =============================================

export const userApi = {
  profile: () => apiFetch<UserProfile>(`${v1}/users/me/profile`),
  updateProfile: (body: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    preferredSize?: string | null;
    gender?: UserGender | null;
  }) => apiJson<UserProfile>(`${v1}/users/me/profile`, body, { method: "PUT" }),

  addresses: () => apiFetch<UserAddress[]>(`${v1}/users/me/addresses`),
  addAddress: (body: AddressInput) => apiJson<UserAddress>(`${v1}/users/me/addresses`, body),
  updateAddress: (id: number, body: AddressInput) =>
    apiJson<UserAddress>(`${v1}/users/me/addresses/${id}`, body, { method: "PUT" }),
  setDefaultAddress: (id: number) =>
    apiFetch<UserAddress>(`${v1}/users/me/addresses/${id}/default`, { method: "POST" }),
  deleteAddress: (id: number) => apiFetch<void>(`${v1}/users/me/addresses/${id}`, { method: "DELETE" }),

  wishlist: (page = 0, size = 20) => apiFetch<Page<WishlistEntry>>(`${v1}/users/me/wishlist?page=${page}&size=${size}`),
  addToWishlist: (productId: number) => apiFetch<void>(`${v1}/users/me/wishlist/${productId}`, { method: "POST" }),
  removeFromWishlist: (productId: number) =>
    apiFetch<void>(`${v1}/users/me/wishlist/${productId}`, { method: "DELETE" }),

  consents: () => apiFetch<Consent[]>(`${v1}/users/me/consents`),
  updateConsent: (consentType: ConsentType, granted: boolean, policyVersion: string) =>
    apiJson<Consent>(`${v1}/users/me/consents`, { consentType, granted, policyVersion }, { method: "PUT" }),

  exportData: () => apiFetch<UserDataExport>(`${v1}/users/me/export`),
  deleteAccount: () => apiFetch<void>(`${v1}/users/me`, { method: "DELETE" })
};

// === Admin ==================================================================

export const adminApi = {
  users: (page = 0, size = 20) => apiFetch<Page<UserProfile>>(`${v1}/admin/users?page=${page}&size=${size}`),

  products: (page = 0, size = 20) =>
    apiFetch<Page<Product>>(`${v1}/admin/catalog/products?page=${page}&size=${size}`),
  product: (id: number) => apiFetch<Product>(`${v1}/admin/catalog/products/${id}`),
  createProduct: (body: ProductInput) => apiJson<Product>(`${v1}/admin/catalog/products`, body),
  updateProduct: (id: number, body: ProductInput) =>
    apiJson<Product>(`${v1}/admin/catalog/products/${id}`, body, { method: "PUT" }),
  deleteProduct: (id: number) => apiFetch<void>(`${v1}/admin/catalog/products/${id}`, { method: "DELETE" }),

  variants: (productId: number) => apiFetch<Variant[]>(`${v1}/admin/catalog/products/${productId}/variants`),
  addVariant: (productId: number, body: VariantInput) =>
    apiJson<Variant>(`${v1}/admin/catalog/products/${productId}/variants`, body),
  updateVariant: (variantId: number, body: VariantInput) =>
    apiJson<Variant>(`${v1}/admin/catalog/variants/${variantId}`, body, { method: "PUT" }),
  deleteVariant: (variantId: number) => apiFetch<void>(`${v1}/admin/catalog/variants/${variantId}`, { method: "DELETE" }),

  createCategory: (body: Record<string, unknown>) => apiJson<Category>(`${v1}/admin/catalog/categories`, body),
  updateCategory: (id: number, body: Record<string, unknown>) =>
    apiJson<Category>(`${v1}/admin/catalog/categories/${id}`, body, { method: "PUT" }),
  deleteCategory: (id: number) => apiFetch<void>(`${v1}/admin/catalog/categories/${id}`, { method: "DELETE" }),

  uploadProductImage: (productId: number, file: File, altText?: string, sortOrder?: number) => {
    const form = new FormData();
    form.set("file", file);
    if (altText) form.set("altText", altText);
    if (sortOrder != null) form.set("sortOrder", String(sortOrder));
    return apiForm<ProductImageUpload>(`${v1}/admin/catalog/products/${productId}/images`, form);
  },
  deleteProductImage: (productId: number, imageId: number) =>
    apiFetch<void>(`${v1}/admin/catalog/products/${productId}/images/${imageId}`, { method: "DELETE" }),

  orders: (page = 0, size = 20, status?: string) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (status) params.set("status", status);
    return apiFetch<Page<Order>>(`${v1}/admin/orders?${params}`);
  },
  order: (id: number) => apiFetch<Order>(`${v1}/admin/orders/${id}`),
  orderHistory: (id: number) => apiFetch<OrderStatusHistoryEntry[]>(`${v1}/admin/orders/${id}/history`),
  updateOrderStatus: (id: number, status: string) =>
    apiJson<Order>(`${v1}/admin/orders/${id}/status`, { status }, { method: "PATCH" }),

  updateShippingStatus: (orderId: number, status: string, trackingNumber?: string) => {
    const params = new URLSearchParams({ status });
    if (trackingNumber) params.set("trackingNumber", trackingNumber);
    return apiFetch<Shipment>(`${v1}/admin/shipping/${orderId}/status?${params}`, { method: "PATCH" });
  },

  refundPayment: (paymentId: number) => apiFetch<Payment>(`${v1}/admin/payments/${paymentId}/refund`, { method: "POST" }),

  reviews: (params: URLSearchParams) => apiFetch<Page<AdminReview>>(`${v1}/admin/reviews?${params}`),
  updateReviewStatus: (reviewId: number, status: string) =>
    apiJson<AdminReview>(`${v1}/admin/reviews/${reviewId}/status`, { status }, { method: "PATCH" }),
  deleteReview: (reviewId: number) => apiFetch<void>(`${v1}/admin/reviews/${reviewId}`, { method: "DELETE" }),

  promos: (page = 0, size = 20) => apiFetch<Page<PromoCode>>(`${v1}/admin/promo?page=${page}&size=${size}`),
  createPromo: (body: PromoCodeInput) => apiJson<PromoCode>(`${v1}/admin/promo`, body),
  setPromoEnabled: (id: number, enabled: boolean) =>
    apiFetch<PromoCode>(`${v1}/admin/promo/${id}/enabled?enabled=${enabled}`, { method: "PATCH" }),

  // AI maintenance triggers — async jobs, the backend answers 202 immediately
  backfillEmbeddings: () => apiFetch<void>(`${v1}/admin/ai/embeddings/backfill`, { method: "POST" }),
  recomputeRecommendations: () => apiFetch<void>(`${v1}/admin/ai/recommendations/recompute`, { method: "POST" }),
  refreshReviewSummaries: () => apiFetch<void>(`${v1}/admin/ai/review-summaries/refresh`, { method: "POST" })
};
