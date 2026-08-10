/**
 * Compile-time drift check: hand-written API types (types.ts) vs the schema
 * generated from the backend OpenAPI spec (src/generated/api.d.ts).
 *
 * The generated schema marks every response field optional (springdoc default),
 * so the app keeps the stricter hand-written types for ergonomics and this file
 * proves they still line up. It contains types only — nothing at runtime.
 *
 * When a line here stops compiling, the backend contract moved:
 *   1. start the backend, run `npm run api:generate`
 *   2. update src/lib/api/types.ts to match the new schema
 */
import type { components } from "@/generated/api";
import type {
  AddressInput,
  AdminReview,
  Brand,
  Cart,
  CartItem,
  Category,
  Consent,
  ConsentType,
  Gender,
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistoryEntry,
  Page,
  Payment,
  PaymentStatus,
  Product,
  ProductImage,
  ProductImageUpload,
  ProductInput,
  ProductListItem,
  PromoCode,
  PromoCodeInput,
  PromoType,
  PromoValidation,
  RatingSummary,
  Review,
  ReviewStatus,
  ReviewSummary,
  Shipment,
  ShipmentStatus,
  ShippingAddress,
  ShippingMethod,
  StylistChatResponse,
  StylistHistoryMessage,
  StylistSlot,
  TokenPairResponse,
  UserAddress,
  UserDataExport,
  UserGender,
  UserProfile,
  Variant,
  VariantInput,
  WishlistEntry
} from "@/lib/api/types";

type Gen = components["schemas"];

// A field is compatible when the generated schema has the same key and the value
// types match after stripping null/undefined (springdoc marks nothing nullable or
// required on responses). Object/array values only need to be object/array on both
// sides here — every nested type gets its own Drift<> assertion below.
type ValueCompat<MV, GV> = [NonNullable<MV>] extends [NonNullable<GV>]
  ? true
  : NonNullable<MV> extends readonly unknown[]
    ? NonNullable<GV> extends readonly unknown[]
      ? true
      : false
    : NonNullable<MV> extends object
      ? NonNullable<GV> extends object
        ? true
        : false
      : false;

/** Keys of Manual missing from or incompatible with G — must resolve to `never`. */
type Drift<Manual, G> = {
  [K in keyof Manual]-?: K extends keyof G ? (ValueCompat<Manual[K], G[K]> extends true ? never : K) : K;
}[keyof Manual];

/** Request DTOs: manual keys the backend does not know about — must be `never`. */
type UnknownKeys<Manual, G> = Exclude<keyof Manual, keyof G>;

/** Request DTOs: fields the backend requires but the manual type lacks — must be `never`. */
type RequiredKeys<T> = { [K in keyof T]-?: undefined extends T[K] ? never : K }[keyof T];
type MissingRequired<Manual, G> = Exclude<RequiredKeys<G>, keyof Manual>;

/** Enum unions must contain exactly the same members on both sides. */
type SameUnion<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Expect<T extends never> = T;
type ExpectTrue<T extends true> = T;

// === Responses ==============================================================

export type CheckUserProfile = Expect<Drift<UserProfile, Gen["UserProfile"]>>;
export type CheckTokenPair = Expect<Drift<TokenPairResponse, Gen["TokenPairResponse"]>>;
export type CheckUserAddress = Expect<Drift<UserAddress, Gen["AddressResponse"]>>;
export type CheckWishlistEntry = Expect<Drift<WishlistEntry, Gen["WishlistEntryResponse"]>>;
export type CheckConsent = Expect<Drift<Consent, Gen["ConsentResponse"]>>;
export type CheckUserDataExport = Expect<Drift<UserDataExport, Gen["UserDataExport"]>>;
export type CheckExportedOrder = Expect<Drift<UserDataExport["orders"][number], Gen["ExportedOrder"]>>;
export type CheckExportedReview = Expect<Drift<UserDataExport["reviews"][number], Gen["ExportedReview"]>>;

export type CheckCategory = Expect<Drift<Category, Gen["CategoryResponse"]>>;
export type CheckBrand = Expect<Drift<Brand, Gen["BrandResponse"]>>;
export type CheckProduct = Expect<Drift<Product, Gen["ProductResponse"]>>;
export type CheckProductImage = Expect<Drift<ProductImage, Gen["ProductResponseImage"]>>;
export type CheckProductImageUpload = Expect<Drift<ProductImageUpload, Gen["ProductImageResponse"]>>;
export type CheckVariant = Expect<Drift<Variant, Gen["VariantResponse"]>>;
export type CheckProductListItem = Expect<Drift<ProductListItem, Gen["ProductListItem"]>>;
export type CheckPage = Expect<Drift<Page<ProductListItem>, Gen["PageProductListItem"]>>;

export type CheckCart = Expect<Drift<Cart, Gen["CartResponse"]>>;
export type CheckCartItem = Expect<Drift<CartItem, Gen["CartItemDto"]>>;

export type CheckOrder = Expect<Drift<Order, Gen["OrderDto"]>>;
export type CheckOrderItem = Expect<Drift<OrderItem, Gen["OrderItemDto"]>>;
export type CheckOrderHistory = Expect<Drift<OrderStatusHistoryEntry, Gen["OrderStatusHistoryDto"]>>;

export type CheckPromoValidation = Expect<Drift<PromoValidation, Gen["ValidatePromoResponse"]>>;
export type CheckPromoCode = Expect<Drift<PromoCode, Gen["PromoCodeResponse"]>>;

export type CheckShipment = Expect<Drift<Shipment, Gen["ShipmentDto"]>>;
export type CheckShippingAddress = Expect<Drift<ShippingAddress, Gen["ShippingAddressDto"]>>;

export type CheckPayment = Expect<Drift<Payment, Gen["PaymentResponse"]>>;

export type CheckReview = Expect<Drift<Review, Gen["ReviewResponse"]>>;
export type CheckAdminReview = Expect<Drift<AdminReview, Gen["AdminReviewResponse"]>>;
export type CheckRatingSummary = Expect<Drift<RatingSummary, Gen["ProductRatingSummaryResponse"]>>;
export type CheckReviewSummary = Expect<Drift<ReviewSummary, Gen["ReviewSummaryResponse"]>>;

export type CheckStylistChat = Expect<Drift<StylistChatResponse, Gen["StylistChatResponse"]>>;
export type CheckStylistSlot = Expect<Drift<StylistSlot, Gen["StylistSlot"]>>;
export type CheckStylistMessage = Expect<Drift<StylistHistoryMessage, Gen["HistoryMessage"]>>;

// === Requests ===============================================================

export type CheckAddressInput = Expect<UnknownKeys<AddressInput, Gen["AddressRequest"]>>;
export type CheckAddressInputRequired = Expect<MissingRequired<AddressInput, Gen["AddressRequest"]>>;
export type CheckProductInput = Expect<UnknownKeys<ProductInput, Gen["ProductRequest"]>>;
export type CheckProductInputRequired = Expect<MissingRequired<ProductInput, Gen["ProductRequest"]>>;
export type CheckVariantInput = Expect<UnknownKeys<VariantInput, Gen["VariantRequest"]>>;
export type CheckVariantInputRequired = Expect<MissingRequired<VariantInput, Gen["VariantRequest"]>>;
export type CheckPromoInput = Expect<UnknownKeys<PromoCodeInput, Gen["PromoCodeRequest"]>>;
export type CheckPromoInputRequired = Expect<MissingRequired<PromoCodeInput, Gen["PromoCodeRequest"]>>;

// === Enums (must match member-for-member, both directions) ==================

export type CheckGender = ExpectTrue<SameUnion<Gender, NonNullable<Gen["ProductResponse"]["gender"]>>>;
export type CheckUserGender = ExpectTrue<SameUnion<UserGender, NonNullable<Gen["UserProfile"]["gender"]>>>;
export type CheckOrderStatus = ExpectTrue<SameUnion<OrderStatus, NonNullable<Gen["OrderDto"]["status"]>>>;
export type CheckPaymentStatus = ExpectTrue<SameUnion<PaymentStatus, NonNullable<Gen["PaymentResponse"]["status"]>>>;
export type CheckPromoType = ExpectTrue<SameUnion<PromoType, NonNullable<Gen["PromoCodeResponse"]["promoType"]>>>;
export type CheckReviewStatus = ExpectTrue<SameUnion<ReviewStatus, NonNullable<Gen["ReviewResponse"]["status"]>>>;
export type CheckConsentType = ExpectTrue<SameUnion<ConsentType, NonNullable<Gen["ConsentResponse"]["consentType"]>>>;
export type CheckShippingMethod = ExpectTrue<
  SameUnion<ShippingMethod, NonNullable<Gen["SetShippingMethodRequest"]["method"]>>
>;
export type CheckShipmentStatus = ExpectTrue<
  SameUnion<ShipmentStatus, NonNullable<Gen["ShipmentDto"]["shippingStatus"]>>
>;
