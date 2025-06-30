import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of, from, map, switchMap, catchError, throwError } from 'rxjs';
import { Product } from '../../core/models/product.model';
import { UrlService } from '../../core/services/url.service';

@Injectable({
  providedIn: 'root'
})
export class StoreProductsService {
  constructor(
    private firestore: AngularFirestore,
    private urlService: UrlService
  ) {}

  getProductsByStoreUrl(storeUrl: string): Observable<Product[]> {
    console.log('Recherche des produits pour l\'URL:', storeUrl);
    
    // 1. D'abord, chercher dans la collection urls pour obtenir userId et storeId
    return this.firestore.collection('urls').doc(storeUrl).get().pipe(
      switchMap(urlDoc => {
        if (!urlDoc.exists) {
          console.log('URL de boutique non trouvée:', storeUrl);
          return of([]);
        }

        const urlData = urlDoc.data() as { userId: string, storeId: string };
        console.log('Données URL trouvées:', urlData);

        // 2. Chercher les produits dans la collection publique
        return this.firestore
          .collection('public_stores')
          .doc(urlData.storeId)
          .collection('products')
          .valueChanges({ idField: 'id' })
          .pipe(
            map(products => {
              console.log('Produits trouvés:', products);
              return products.map(product => ({
                id: product['id'],
                name: product['name'] || '',
                description: product['description'] || '',
                price: product['price'] || 0,
                category: product['category'] || '',
                stock: product['stock'] || 0,
                images: product['images'] || [],
                isActive: product['isActive'] ?? true,
                storeId: urlData.storeId,
                createdAt: product['createdAt']?.toDate() || new Date(),
                updatedAt: product['updatedAt']?.toDate() || new Date()
              })) as Product[];
            }),
            catchError(error => {
              console.error('Erreur lors de la récupération des produits:', error);
              return of([]);
            })
          );
      }),
      catchError(error => {
        console.error('Erreur lors de la recherche de l\'URL:', error);
        return of([]);
      })
    );
  }

  getProducts(storeUrl: string): Observable<Product[]> {
    return this.urlService.getStoreIdFromUrl(storeUrl).pipe(
      switchMap(storeId => {
        if (!storeId) {
          throw new Error('Store not found');
        }
        return this.firestore
          .collection(`stores/${storeId}/products`)
          .valueChanges({ idField: 'id' }) as Observable<Product[]>;
      })
    );
  }

  getProduct(storeUrl: string, productId: string): Observable<Product> {
    if (!storeUrl || !productId) {
      return throwError(() => new Error('Store URL and Product ID are required'));
    }

    console.log('Recherche du produit:', { storeUrl, productId });

    // 1. D'abord, chercher dans la collection urls pour obtenir userId et storeId
    return this.firestore.collection('urls').doc(storeUrl).get().pipe(
      switchMap(urlDoc => {
        if (!urlDoc.exists) {
          console.log('URL de boutique non trouvée:', storeUrl);
          return throwError(() => new Error('Store not found'));
        }

        const urlData = urlDoc.data() as { userId: string, storeId: string };
        console.log('Données URL trouvées:', urlData);

        // 2. Chercher le produit dans la collection publique
        return this.firestore
          .collection('public_stores')
          .doc(urlData.storeId)
          .collection('products')
          .doc(productId)
          .get()
          .pipe(
            map(productDoc => {
              if (!productDoc.exists) {
                throw new Error('Product not found');
              }
              const productData = productDoc.data() || {};
              return {
                id: productDoc.id,
                name: productData['name'] || '',
                description: productData['description'] || '',
                price: productData['price'] || 0,
                category: productData['category'] || '',
                stock: productData['stock'] || 0,
                images: productData['images'] || [],
                isActive: productData['isActive'] ?? true,
                storeId: urlData.storeId,
                createdAt: productData['createdAt']?.toDate() || new Date(),
                updatedAt: productData['updatedAt']?.toDate() || new Date()
              } as Product;
            })
          );
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération du produit:', error);
        return throwError(() => error);
      })
    );
  }
} 