export interface Product {
  id?: string;
  storeId: string;
  name: string;
  description: string;
  category: string;
  brand?: string;
  tags?: string[];
  price: number;
  discountPrice?: number;
  stock: number;
  sku?: string;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
  specifications?: string;
  isActive: boolean;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ProductVariant {
  id?: string;
  name: string;
  sku?: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  options: {
    name: string;
    value: string;
  }[];
} 