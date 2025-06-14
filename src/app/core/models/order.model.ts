export interface OrderItem {
  productId: string;
  product: {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
  };
  quantity: number;
}

export interface CustomerInfo {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  deliveryInstructions?: string;
}

export type OrderStatus = 'en_cours' | 'valide' | 'rejete';

export interface Order {
  id?: string;
  storeUrl: string;
  storeName: string;
  items: OrderItem[];
  customerInfo: CustomerInfo;
  subtotal: number;
  shippingFee: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt?: number;
  rejectionReason?: string;
  notes?: string;
} 