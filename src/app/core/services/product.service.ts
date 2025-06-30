import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from, forkJoin } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
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
   * Obtient le chemin de la collection des produits publics
   */
  private getPublicProductsPath(storeId: string): string {
    return `public_stores/${storeId}/products`;
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

      // 3. Sauvegarder dans Firestore (collection privée)
      const docRef = await this.firestore
        .collection(this.getProductsPath(product.storeId!))
        .add(productData);

      // 4. Sauvegarder dans la collection publique
      await this.firestore
        .doc(`${this.getPublicProductsPath(product.storeId!)}/${docRef.id}`)
        .set({
          ...productData,
          id: docRef.id
        });

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
    console.log('Fetching products for store:', storeId);
    return this.firestore
      .collection<Product>(`${this.getProductsPath(storeId)}`, ref => 
        ref.orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        tap(products => {
          // Synchroniser avec la collection publique
          products.forEach(product => {
            this.firestore
              .doc(`${this.getPublicProductsPath(storeId)}/${product.id}`)
              .set(product)
              .catch(err => console.error('Error syncing product to public:', err));
          });
        })
      );
  }

  /**
   * Récupère les produits publics d'une boutique
   */
  getPublicStoreProducts(storeId: string): Observable<Product[]> {
    console.log('Fetching public products for store:', storeId);
    return this.firestore
      .collection<Product>(this.getPublicProductsPath(storeId), ref => 
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

      // Mettre à jour dans la collection privée
      await this.firestore
        .doc(`${this.getProductsPath(storeId)}/${productId}`)
        .update(updateData);

      // Mettre à jour dans la collection publique
      await this.firestore
        .doc(`${this.getPublicProductsPath(storeId)}/${productId}`)
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

      // 3. Supprimer le document de la collection privée
      await this.firestore
        .doc(`${this.getProductsPath(storeId)}/${productId}`)
        .delete();

      // 4. Supprimer le document de la collection publique
      await this.firestore
        .doc(`${this.getPublicProductsPath(storeId)}/${productId}`)
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
      .valueChanges({ idField: 'id' })
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
        ref.where('category', '==', categoryId)
        // Le tri sera réactivé une fois l'index créé
        // .orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'id' });
  }

  /**
   * Récupère les produits paginés d'une boutique
   */
  getProductsWithPagination(storeId: string, pageSize: number, lastVisible?: any): Observable<{
    products: Product[];
    lastVisible: any;
    total: number;
  }> {
    const productsPath = this.getProductsPath(storeId);

    // Obtenir le nombre total de produits
    const total$ = this.firestore.collection(productsPath).get().pipe(
      map(snap => snap.size)
    );

    // Construire la requête paginée
    let query = this.firestore.collection<Product>(productsPath, ref => {
      let q = ref.orderBy('createdAt', 'desc').limit(pageSize);
      if (lastVisible) {
        q = q.startAfter(lastVisible);
      }
      return q;
    });

    // Obtenir les produits paginés
    const products$ = query.get().pipe(
      map(snap => ({
        products: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)),
        lastVisible: snap.docs[snap.docs.length - 1]
      }))
    );

    // Combiner les résultats
    return forkJoin({
      pageData: products$,
      total: total$
    }).pipe(
      map(result => ({
        products: result.pageData.products,
        lastVisible: result.pageData.lastVisible,
        total: result.total
      }))
    );
  }

  /**
   * Recherche des produits avec pagination
   */
  searchProductsWithPagination(storeId: string, searchTerm: string, pageSize: number): Observable<{
    products: Product[];
    total: number;
  }> {
    return this.getStoreProducts(storeId).pipe(
      map(products => {
        const searchLower = searchTerm.toLowerCase();
        const filtered = products.filter(product =>
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower)
        );
        return {
          products: filtered.slice(0, pageSize),
          total: filtered.length
        };
      })
    );
  }
}
