export interface Customer {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  firstOrderDate: number;
  lastOrderDate: number;
  totalOrders: number;
  totalSpent: number;
  addresses: string[];
  orderIds: string[];
  // Champs pour la déduplication
  possibleDuplicates: string[]; // IDs des clients potentiellement en double
  normalizedName?: string; // Nom normalisé pour la recherche
  nameVariations?: string[]; // Variations du nom trouvées dans les commandes
}

// Interface pour la logique de déduplication
export interface DuplicationCheck {
  score: number;
  reasons: string[];
  customer1: Customer;
  customer2: Customer;
} 