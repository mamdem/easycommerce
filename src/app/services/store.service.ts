import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Store {
  id: string;
  name: string;
  description: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  userId: string;
  currency: string;
  language: string;
  address?: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id?: string;
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
  storeId: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  selectedStore: Store | null = null;

  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage
  ) {
    // Try to load the selected store from localStorage
    const storedStore = localStorage.getItem('selectedStore');
    if (storedStore) {
      this.selectedStore = JSON.parse(storedStore);
    }
  }

  // Store Management
  getStores(userId: string): Observable<Store[]> {
    return this.firestore
      .collection<Store>('stores', ref => ref.where('userId', '==', userId))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as Store;
          const id = a.payload.doc.id;
          return { ...data, id };
        }))
      );
  }

  async createStore(storeData: Partial<Store>): Promise<void> {
    const store = {
      ...storeData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.firestore.collection('stores').add(store);
  }

  async updateStore(storeId: string, storeData: Partial<Store>): Promise<void> {
    const store = {
      ...storeData,
      updatedAt: new Date()
    };
    await this.firestore.doc(`stores/${storeId}`).update(store);
  }

  async deleteStore(storeId: string): Promise<void> {
    await this.firestore.doc(`stores/${storeId}`).delete();
  }

  setSelectedStore(store: Store): void {
    this.selectedStore = store;
    localStorage.setItem('selectedStore', JSON.stringify(store));
  }

  // Product Management
  getProducts(storeId: string): Observable<Product[]> {
    return this.firestore
      .collection<Product>('products', ref => ref.where('storeId', '==', storeId))
      .snapshotChanges()
      .pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as Product;
          const id = a.payload.doc.id;
          return { ...data, id };
        }))
      );
  }

  async createProduct(productData: Product): Promise<void> {
    await this.firestore.collection('products').add(productData);
  }

  async updateProduct(productId: string, productData: Partial<Product>): Promise<void> {
    const product = {
      ...productData,
      updatedAt: new Date()
    };
    await this.firestore.doc(`products/${productId}`).update(product);
  }

  async deleteProduct(productId: string): Promise<void> {
    await this.firestore.doc(`products/${productId}`).delete();
  }

  // Image Upload
  async uploadProductImage(file: File): Promise<string> {
    const path = `products/${Date.now()}_${file.name}`;
    const ref = this.storage.ref(path);
    await ref.put(file);
    return await ref.getDownloadURL().toPromise();
  }

  async uploadStoreLogo(file: File): Promise<string> {
    const path = `stores/${Date.now()}_${file.name}`;
    const ref = this.storage.ref(path);
    await ref.put(file);
    return await ref.getDownloadURL().toPromise();
  }
} 