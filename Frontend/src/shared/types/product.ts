export type Gender = 'WOMEN' | 'MEN' | 'UNISEX' | 'KIDS';

export type ProductSort = 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'rating' | 'popular';

export interface ColorSwatch {
  name: string;
  hex: string;
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
  /** Signed delta on top of the product's base price, in minor units. */
  priceDiff: number;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
}

/** Grid card payload — the lean shape the list endpoint returns. */
export interface ProductCard {
  id: string;
  title: string;
  slug: string;
  brand: string | null;
  gender: Gender;
  /** Minor units (tiyin). Never do arithmetic on a formatted price. */
  price: number;
  oldPrice: number | null;
  currency: string;
  rating: number;
  reviewCount: number;
  sold: number;
  isFeatured: boolean;
  createdAt: string;
  category: CategoryRef;
  images: ProductImage[];
  discountPercent: number;
  colors: ColorSwatch[];
  sizes: string[];
  inStock: boolean;
}

export interface ProductDetail extends Omit<ProductCard, 'images'> {
  description: string;
  isActive: boolean;
  updatedAt: string;
  images: ProductImage[];
  variants: ProductVariant[];
  totalStock: number;
}

export interface ProductFilters {
  q?: string;
  categorySlug?: string;
  categoryId?: string;
  gender?: Gender;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  brands?: string[];
  inStock?: boolean;
  featured?: boolean;
  minRating?: number;
  sort?: ProductSort;
  limit?: number;
}

export interface ProductFacets {
  total: number;
  priceRange: { min: number; max: number };
  colors: ColorSwatch[];
  sizes: string[];
  brands: string[];
}

export interface SearchSuggestions {
  products: Array<{
    id: string;
    title: string;
    slug: string;
    price: number;
    currency: string;
    images: Array<{ url: string; blurHash: string | null }>;
  }>;
  categories: CategoryRef[];
}

export interface Category extends CategoryRef {
  gender: Gender | null;
  imageUrl: string | null;
  sortOrder: number;
  productCount: number;
  children: Category[];
}

export interface CategoryDetail extends Category {
  breadcrumbs: CategoryRef[];
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string;
  mobileImageUrl: string | null;
  link: string | null;
  sortOrder: number;
}
