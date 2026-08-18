export type Role = 'USER' | 'ADMIN';
export type Gender = 'WOMEN' | 'MEN' | 'UNISEX' | 'KIDS';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH_ON_DELIVERY' | 'CARD';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED';

export interface AdminUser {
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
  user: AdminUser;
}

export interface CustomerRow extends AdminUser {
  isBlocked: boolean;
  _count: { orders: number };
}

// --- Catalog ----------------------------------------------------------------

export interface Category {
  id: string;
  name: string;
  slug: string;
  gender: Gender | null;
  imageUrl: string | null;
  parentId: string | null;
  sortOrder: number;
  productCount: number;
  children: Category[];
}

export interface ProductImage {
  id?: string;
  url: string;
  blurHash: string | null;
  alt: string | null;
  sortOrder?: number;
}

export interface ProductVariant {
  id: string;
  color: string;
  colorHex: string;
  size: string;
  sku: string;
  stock: number;
  priceDiff: number;
}

export interface ProductRow {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  gender: Gender;
  /** Minor units (tiyin). */
  price: number;
  oldPrice: number | null;
  currency: string;
  rating: number;
  reviewCount: number;
  sold: number;
  isFeatured: boolean;
  createdAt: string;
  category: { id: string; name: string; slug: string };
  images: ProductImage[];
  discountPercent: number;
  colors: Array<{ name: string; hex: string }>;
  sizes: string[];
  inStock: boolean;
}

export interface ProductDetail extends ProductRow {
  description: string;
  isActive: boolean;
  updatedAt: string;
  variants: ProductVariant[];
  totalStock: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  link: string | null;
  sortOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
}

// --- Orders -----------------------------------------------------------------

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
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    email: string | null;
  };
}

export interface DashboardStats {
  period: string;
  orders: number;
  revenue: number;
  pendingOrders: number;
  customers: number;
  lowStockVariants: number;
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: OrderStatus;
    total: number;
    currency: string;
    createdAt: string;
    shipFullName: string;
  }>;
}

export interface UploadedImage {
  url: string;
  size: number;
  mimeType: string;
}
