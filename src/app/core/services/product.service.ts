import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from, forkJoin } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { StorageService } from './storage.service';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  constructor(
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private authService: AuthService,
    private toastService: ToastService,
    private storageService: StorageService
  ) {}

  /**
   * Obtient le chemin de la collection des produits
   */
  private getProductsPath(storeId: string): string {
    const userId = this.authService.getCurrentUser()?.uid;
    if (!userId) throw new Error('Utilisateur non connecté');
    return `stores/${userId}/userStores/${storeId}/products`;
  }

  /**
   * Crée un nouveau produit
   */
  async createProduct(product: Partial<Product>, images: File[]): Promise<string> {
    try {
      const userId = this.authService.getCurrentUser()?.uid;
      if (!userId) throw new Error('Utilisateur non connecté');

      // 1. Upload des images
      const imageUrls = await this.uploadProductImages(userId, product.storeId!, images);

      // 2. Créer le document du produit
      const productData: Product = {
        ...product as Product,
        images: imageUrls,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // 3. Sauvegarder dans Firestore
      const docRef = await this.firestore
        .collection(this.getProductsPath(product.storeId!))
        .add(productData);

      return docRef.id;
    } catch (error) {
      console.error('Erreur lors de la création du produit:', error);
      throw error;
    }
  }

  /**
   * Upload les images d'un produit
   */
  private async uploadProductImages(userId: string, storeId: string, files: File[]): Promise<string[]> {
    const uploadPromises = files.map(async file => {
      const path = `stores/${userId}/userStores/${storeId}/products/${Date.now()}_${file.name}`;
      const url = await this.storageService.uploadFile(path, file).toPromise();
      return url || '';
    });

    const results = await Promise.all(uploadPromises);
    return results.filter(url => url !== ''); // Filtrer les URLs vides
  }

  /**
   * Récupère les produits d'une boutique
   */
  getStoreProducts(storeId: string): Observable<Product[]> {
    return this.firestore
      .collection<Product>(`${this.getProductsPath(storeId)}`, ref => 
        ref.orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'id' });
  }

  /**
   * Met à jour un produit
   */
  async updateProduct(storeId: string, productId: string, updates: Partial<Product>, newImages?: File[]): Promise<void> {
    try {
      const userId = this.authService.getCurrentUser()?.uid;
      if (!userId) throw new Error('Utilisateur non connecté');

      const updateData: Partial<Product> = {
        ...updates,
        updatedAt: new Date()
      };

      if (newImages && newImages.length > 0) {
        const newImageUrls = await this.uploadProductImages(userId, storeId, newImages);
        updateData.images = [...(updates.images || []), ...newImageUrls];
      }

      await this.firestore
        .doc(`${this.getProductsPath(storeId)}/${productId}`)
        .update(updateData);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du produit:', error);
      throw error;
    }
  }

  /**
   * Supprime un produit et ses images
   */
  async deleteProduct(storeId: string, productId: string): Promise<void> {
    try {
      const userId = this.authService.getCurrentUser()?.uid;
      if (!userId) throw new Error('Utilisateur non connecté');

      // 1. Récupérer les URLs des images
      const productDoc = await this.firestore
        .doc<Product>(`${this.getProductsPath(storeId)}/${productId}`)
        .get()
        .toPromise();

      const product = productDoc?.data();
      if (product?.images) {
        // 2. Supprimer les images du storage
        await Promise.all(
          product.images.map(async imageUrl => {
            const path = imageUrl.split('/o/')[1]?.split('?')[0];
            if (path) {
              await this.storageService.deleteFile(decodeURIComponent(path));
            }
          })
        );
      }

      // 3. Supprimer le document
      await this.firestore
        .doc(`${this.getProductsPath(storeId)}/${productId}`)
        .delete();
    } catch (error) {
      console.error('Erreur lors de la suppression du produit:', error);
      throw error;
    }
  }

  /**
   * Récupère un produit par son ID
   */
  getProduct(storeId: string, productId: string): Observable<Product | null> {
    return this.firestore
      .doc<Product>(`${this.getProductsPath(storeId)}/${productId}`)
      .valueChanges()
      .pipe(map(product => product || null));
  }

  /**
   * Recherche des produits par nom ou description
   */
  searchProducts(storeId: string, query: string): Observable<Product[]> {
    return this.getStoreProducts(storeId).pipe(
      map(products => {
        const searchLower = query.toLowerCase();
        return products.filter(product =>
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower)
        );
      })
    );
  }

  /**
   * Filtre les produits par catégorie
   */
  getProductsByCategory(storeId: string, categoryId: string): Observable<Product[]> {
    return this.firestore
      .collection<Product>(this.getProductsPath(storeId), ref => 
        ref.where('categoryId', '==', categoryId)
           .orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'id' });
  }
}
