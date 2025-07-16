export interface OrderItem {
  productId: string;
  product: {
    id: string;
    name: string;
    description?: string;
    price: number;
    imageUrl?: string;
    images?: string[];
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
  latitude?: number | null;
  longitude?: number | null;
}

export type OrderStatus = 'en_cours' | 'valide' | 'rejete';

export interface Order {
  id?: string;
  storeUrl: string;
  storeName: string;
  items: OrderItem[];
  customerInfo: CustomerInfo;
  subtotal: number;
  shippingFee?: number; // Devient optionnel
  total: number;
  status: OrderStatus;
  createdAt: number;
  updatedAt?: number;
  rejectionReason?: string;
  notes?: string;
} 