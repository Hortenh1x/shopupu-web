export type Page<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

// === Auth / identity ========================================================

// A user's self-selected gender (distinct from the product catalog Gender).
export type UserGender = "MALE" | "FEMALE" | "OTHER";

export type UserProfile = {
  id: number;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  preferredSize?: string | null;
  gender?: UserGender | null;
  enabled: boolean;
  emailVerified: boolean;
  roles: string[];
};

export type TokenPairResponse = {
  accessToken: string;
  refreshToken: string;
};

export type UserAddress = {
  id: number;
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  defaultAddress: boolean;
};

export type AddressInput = {
  fullName: string;
  line1: string;
  line2?: string | null;
  city: string;
  state?: string | null;
  postalCode: string;
  country: string;
  defaultAddress?: boolean;
};

export type WishlistEntry = {
  productId: number;
  title: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  brandName?: string | null;
  available?: boolean | null;
  addedAt?: string;
};

export type ConsentType = "MARKETING_EMAIL" | "COOKIES_ANALYTICS" | "DATA_PROCESSING";

export type Consent = {
  consentType: ConsentType;
  granted: boolean;
  policyVersion: string;
  createdAt?: string;
};

export type UserDataExport = {
  profile: UserProfile;
  addresses: UserAddress[];
  orders: Array<{ orderNumber: string; status: string; paymentAmount: number; createdAt?: string }>;
  reviews: Array<{ productId: number; rating: number; body: string; status: string; createdAt?: string }>;
  exportedAt: string;
};

// === Catalog ================================================================

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: number | null;
};

export type Brand = {
  id: number;
  name: string;
  slug: string;
};

export type Gender = "MEN" | "WOMEN" | "UNISEX" | "KIDS";

export type ProductImage = {
  id: number;
  url: string;
  altText?: string | null;
  position?: number | null;
};

// The admin image-upload endpoint answers with `sortOrder`, not `position`
// (ProductImageResponse vs the ProductResponse.images element in the OpenAPI schema).
export type ProductImageUpload = {
  id: number;
  url: string;
  altText?: string | null;
  sortOrder?: number | null;
};

export type Variant = {
  id: number;
  sku: string;
  size: string;
  color?: string | null;
  price: number;
  oldPrice?: number | null;
  enabled: boolean;
  available?: number | null;
};

export type Product = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  price: number;
  oldPrice?: number | null;
  enabled: boolean;
  gender: Gender;
  season?: string | null;
  material?: string | null;
  careInstructions?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  brandId?: number | null;
  brandName?: string | null;
  createdAt?: string;
  categoryId?: number | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  images: ProductImage[];
  variants: Variant[];
};

export type ProductListItem = {
  id: number;
  title: string;
  slug: string;
  price: number;
  oldPrice?: number | null;
  brandName?: string | null;
  gender?: Gender | null;
  enabled: boolean;
  createdAt?: string;
  categoryId?: number | null;
  categorySlug?: string | null;
  imageUrl?: string | null;
  imageAltText?: string | null;
};

export type ProductInput = {
  categoryId: number;
  title: string;
  slug?: string | null;
  description?: string | null;
  price: number | string;
  oldPrice?: number | string | null;
  brandName?: string | null;
  gender?: Gender | null;
  season?: string | null;
  material?: string | null;
  careInstructions?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  enabled?: boolean | null;
};

export type VariantInput = {
  sku: string;
  size: string;
  color?: string | null;
  price?: number | string | null;
  oldPrice?: number | string | null;
  stock?: number | null;
  enabled?: boolean | null;
};

// === Cart ===================================================================

export type CartItem = {
  variantId: number;
  productId: number;
  title: string;
  sku: string;
  size: string;
  color?: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type Cart = {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
  guestToken?: string | null;
};

// === Orders =================================================================

export type OrderStatus =
  | "CREATED"
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export type OrderItem = {
  id: number;
  productId: number;
  variantId?: number | null;
  title: string;
  sku?: string | null;
  size?: string | null;
  color?: string | null;
  brand?: string | null;
  price: number;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: number;
  orderNumber: string;
  subtotalAmount: number;
  shippingAmount: number;
  discountAmount: number;
  promoCode?: string | null;
  paymentAmount: number;
  status: OrderStatus;
  createdAt?: string;
  updatedAt?: string;
  items: OrderItem[];
};

export type OrderStatusHistoryEntry = {
  fromStatus?: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string;
  createdAt: string;
};

// === Promo ==================================================================

export type PromoType = "PERCENT" | "FIXED" | "FREE_SHIPPING";

export type PromoValidation = {
  code: string;
  promoType: PromoType;
  discount: number;
};

export type PromoCode = {
  id: number;
  code: string;
  promoType: PromoType;
  value: number;
  minOrderAmount?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptions?: number | null;
  perUserLimit: number;
  redemptionCount: number;
  enabled: boolean;
};

export type PromoCodeInput = {
  code: string;
  promoType: PromoType;
  value?: number | string | null;
  minOrderAmount?: number | string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  maxRedemptions?: number | null;
  perUserLimit?: number | null;
  enabled?: boolean | null;
};

// === Shipping ===============================================================

export type ShippingMethod = "DHL" | "STANDARD_POST" | "LOCAL_PICKUP";

export type ShipmentStatus =
  | "PENDING"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "CANCELED";

export type ShippingAddress = {
  fullName?: string | null;
  line1?: string | null;
  line2?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
};

export type Shipment = {
  orderId: number;
  method?: ShippingMethod | null;
  shippingStatus?: ShipmentStatus | null;
  orderStatus: OrderStatus;
  trackingNumber?: string | null;
  shippingCost?: number | null;
  currency?: string | null;
  address?: ShippingAddress | null;
  createdAt?: string;
  updatedAt?: string;
};

// === Payments ===============================================================

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED"
  | "EXPIRED"
  | "REFUNDED";

export type Payment = {
  id: number;
  orderId: number;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider?: string | null;
  externalPaymentId?: string | null;
  paymentUrl?: string | null;
  clientToken?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

// === Reviews ================================================================

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED" | "DELETED";

export type Review = {
  id: number;
  productId: number;
  userId: number;
  username: string;
  rating: number;
  body: string;
  status: ReviewStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminReview = {
  id: number;
  productId: number;
  productTitle?: string | null;
  userId: number;
  userEmail?: string | null;
  rating: number;
  body: string;
  status: ReviewStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type RatingSummary = {
  productId: number;
  averageRating: number;
  reviewCount: number;
};

// === AI (semantic search, recommendations, review summaries) ===============

export type ReviewSummary = {
  productId: number;
  tldr?: string | null;
  pros?: string[] | null;
  cons?: string[] | null;
  sentiment?: string | null;
  basedOnReviews: number;
  generatedAt?: string | null;
};

export type StylistHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type StylistSlot = {
  slot: string;
  products: ProductListItem[];
};

export type StylistChatResponse = {
  reply: string;
  slots: StylistSlot[];
  /** requested garments the shop honestly does not carry */
  unavailable: string[];
  degraded: boolean;
};

// === Errors =================================================================

export type ApiProblem = {
  status?: number;
  title?: string;
  detail?: string;
  code?: string;
  message?: string;
  requestId?: string;
  errors?: Array<{ field: string; message: string }>;
};
