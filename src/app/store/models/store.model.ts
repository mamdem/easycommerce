export interface Store {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  coverImage?: string;
  owner: string;
  url: string;
  categories?: string[];
  createdAt: number;
  updatedAt?: number;
} 