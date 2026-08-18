export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: Role;
  isVerified: boolean;
  createdAt: string;
}

export interface Session {
  accessToken: string;
  csrfToken: string;
  user: User;
}

// --- Cart -------------------------------------------------------------------

export interface CartLine {
  id: string;
  variantId: string;
  productId: string;
  title: string;
  slug: string;
  image: string | null;
  blurHash: string | null;
  color: string;
  colorHex: string;
  size: string;
  sku: string;
  unitPrice: number;
  oldUnitPrice: number | null;
  quantity: number;
  lineTotal: number;
  stock: number;
  isAvailable: boolean;
  exceedsStock: boolean;
}

export interface CartSummary {
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  freeDeliveryThreshold: number;
  amountToFreeDelivery: number;
  itemCount: number;
  lineCount: number;
  currency: string;
  hasIssues: boolean;
}

export interface Cart {
  items: CartLine[];
  summary: CartSummary;
}

/** Guest cart line held in localStorage until the shopper signs in. */
export interface GuestCartLine {
  variantId: string;
  quantity: number;
}

// --- Orders -----------------------------------------------------------------

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH_ON_DELIVERY' | 'CARD';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export interface OrderItem {
  id: string;
  productId: string | null;
  variantId: string | null;
  titleSnapshot: string;
  imageSnapshot: string | null;
  color: string;
  size: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  total: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
  currency: string;
  shipFullName: string;
  shipPhone: string;
  shipRegion: string;
  shipCity: string;
  shipStreet: string;
  shipApartment: string | null;
  shipPostalCode: string | null;
  note: string | null;
  cancelledAt: string | null;
  createdAt: string;
  items: OrderItem[];
}

export interface Address {
  id: string;
  fullName: string;
  phone: string;
  region: string;
  city: string;
  street: string;
  apartment: string | null;
  postalCode: string | null;
  isDefault: boolean;
}

export interface AddressInput {
  fullName: string;
  phone: string;
  region: string;
  city: string;
  street: string;
  apartment?: string;
  postalCode?: string;
}

// --- Reviews ----------------------------------------------------------------

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  author: { id: string; name: string; avatarUrl: string | null };
}
