export interface Store {
  id: string;
  ownerId: string;
  legalName: string;
  storeName: string;
  storeDescription: string;
  storeCategory: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  country: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  taxId: string;
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
  createdAt: number;
  updatedAt: number;
  status?: 'active' | 'inactive' | 'pending';
  openingHours?: {
    [key: string]: string; // Format: "Lundi": "9h00 - 18h00"
  };
} 