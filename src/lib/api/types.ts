export type Page<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
};

export type UserProfile = {
  id: number;
  email: string;
  enabled: boolean;
  roles: string[];
};

export type TokenPairResponse = {
  accessToken: string;
  refreshToken: string;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: number | null;
};

export type ProductImage = {
  id: number;
  url: string;
  altText?: string | null;
  position?: number | null;
  sortOrder?: number | null;
};

export type Product = {
  id: number;
  title: string;
  description?: string | null;
  price: number;
  sku: string;
  stock: number;
  enabled: boolean;
  createdAt?: string;
  categoryId?: number | null;
  categoryName?: string | null;
  categorySlug?: string | null;
  images?: ProductImage[];
};

export type ProductListItem = {
  id: number;
  title: string;
  price: number;
  enabled: boolean;
  createdAt?: string;
  categoryId?: number | null;
  categorySlug?: string | null;
  imageUrl?: string | null;
  imageAltText?: string | null;
};

export type CartItem = {
  productId: number;
  title: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type Cart = {
  id: number;
  items: CartItem[];
  subtotal: number;
};

export type OrderItem = {
  productId: number;
  title: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: number;
  status: string;
  subtotalAmount: number;
  shippingAmount: number;
  paymentAmount: number;
  createdAt?: string;
  updatedAt?: string;
  items: OrderItem[];
};

export type Shipment = {
  orderId: number;
  method: string;
  shippingStatus: string;
  orderStatus: string;
  trackingNumber?: string | null;
  shippingCost: number;
  currency: string;
  address?: ShippingAddress | null;
  createdAt?: string;
  updatedAt?: string;
};

export type ShippingAddress = {
  fullName?: string | null;
  line1?: string | null;
  line2?: string | null;
  country?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
};

export type Payment = {
  id: number;
  orderId: number;
  amount: number;
  currency: string;
  status: string;
  provider?: string | null;
  externalPaymentId?: string | null;
  paymentUrl?: string | null;
  clientToken?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Review = {
  id: number;
  productId: number;
  userId: number;
  username: string;
  rating: number;
  title: string;
  body: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminReview = Review & {
  productTitle?: string;
  userEmail?: string;
};

export type RatingSummary = {
  productId: number;
  averageRating: number;
  reviewCount: number;
};

export type ApiProblem = {
  status?: number;
  title?: string;
  detail?: string;
  code?: string;
  message?: string;
  errors?: Array<{ field: string; message: string }>;
};
