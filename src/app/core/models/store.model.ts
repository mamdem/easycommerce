export interface Store {
  id: string;
  name: string;
  description: string;
  logoUrl?: string;
  bannerUrl?: string;
  ownerId: string;
  email: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  country?: string;
  zipCode?: string;
  createdAt: any;
  updatedAt: any;
  status?: 'active' | 'inactive' | 'pending';
  primaryColor?: string;
  secondaryColor?: string;
  latitude?: number;
  longitude?: number;
} 