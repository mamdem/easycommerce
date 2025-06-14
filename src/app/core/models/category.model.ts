export interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  productCount?: number;
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
} 