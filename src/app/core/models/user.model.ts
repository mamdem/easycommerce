export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  isAnonymous: boolean;
  metadata?: {
    creationTime?: string;
    lastSignInTime?: string;
  };
  providerData?: any[];
  refreshToken?: string;
  tenantId?: string | null;
  // Additional properties for our application
  userType?: 'customer' | 'merchant';
  hasStore?: boolean;
} 