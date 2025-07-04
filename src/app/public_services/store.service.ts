import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from, of, combineLatest } from 'rxjs';
import { map, switchMap, catchError, take } from 'rxjs/operators';
import { Store } from '../core/models/store.model';
import { Category } from '../core/models/category.model';
import { Product } from '../core/models/product.model';
import { Promotion } from '../core/services/promotion.service';
import { PriceService } from '../core/services/price.service';

interface ProductWithPromotion extends Product {
  originalPrice: number;
  discountedPrice: number | null;
  promotion: Promotion | null;
  promotionId?: string;
  categoryName?: string;
  finalPrice?: number;
  reductionAmount?: number;
  reductionPercentage?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PublicStoreService {
  constructor(
    private firestore: AngularFirestore,
    private priceService: PriceService
  ) {}

  /**
   * Récupère les informations d'une boutique et ses données associées à partir de son URL
   * @param storeUrl L'URL de la boutique (ex: Kalia-Groupe-cphfo)
   */
  getStoreByUrl(storeUrl: string): Observable<Store | null> {
    // 1. Recherche dans la collection 'urls' pour obtenir storeId et userId
    return this.firestore
      .collection('urls')
      .doc(storeUrl)
      .get()
      .pipe(
        switchMap(urlDoc => {
          if (!urlDoc.exists) {
            console.error('URL de boutique non trouvée:', storeUrl);
            return of(null);
          }

          const data = urlDoc.data() as { storeId: string; userId: string };
          
          // 2. Utilise les IDs pour accéder aux informations de la boutique
          return this.firestore
            .collection('stores')
            .doc(data.userId)
            .collection('userStores')
            .doc(data.storeId)
            .get()
            .pipe(
              map(storeDoc => {
                if (!storeDoc.exists) {
                  console.error('Boutique non trouvée:', data);
                  return null;
                }
                return {
                  id: storeDoc.id,
                  ownerId: data.userId,
                  ...storeDoc.data()
                } as Store;
              })
            );
        }),
        catchError(error => {
          console.error('Erreur lors de la récupération de la boutique:', error);
          return of(null);
        })
      );
  }

  /**
   * Récupère toutes les données d'une boutique (store, categories, products, promotions)
   * @param storeUrl L'URL de la boutique
   */
  getStoreData(storeUrl: string): Observable<{
    store: Store;
    categories: Category[];
    products: Product[];
    promotions: Promotion[];
  } | null> {
    return this.getStoreByUrl(storeUrl).pipe(
      switchMap(store => {
        if (!store) {
          console.error('Boutique non trouvée:', storeUrl);
          return of(null);
        }

        const storePath = `stores/${store.ownerId}/userStores/${store.id}`;
        
        return combineLatest([
          of(store),
          this.firestore.collection(`${storePath}/categories`).valueChanges({ idField: 'id' }).pipe(take(1)),
          this.firestore.collection(`${storePath}/products`).valueChanges({ idField: 'id' }).pipe(take(1)),
          this.firestore.collection(`${storePath}/promotions`).valueChanges({ idField: 'id' }).pipe(take(1))
        ]).pipe(
          map(([store, categories, products, promotions]) => {
            // Filtrer les promotions actives
            const now = Date.now();
            const activePromotions = (promotions as Promotion[]).filter(promo => 
              promo.actif && 
              promo.dateDebut <= now && 
              promo.dateFin >= now &&
              (!promo.utilisationsMax || promo.utilisationsActuelles < promo.utilisationsMax)
            );

            return {
              store,
              categories: categories as Category[],
              products: products as Product[],
              promotions: activePromotions
            };
          })
        );
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des données de la boutique:', error);
        return of(null);
      })
    );
  }

  /**
   * Récupère les détails d'un produit spécifique
   * @param storeUrl L'URL de la boutique
   * @param productId L'ID du produit
   */
  getProductDetails(storeUrl: string, productId: string): Observable<Product | null> {
    return this.getStoreByUrl(storeUrl).pipe(
      switchMap(store => {
        if (!store) {
          console.error('Boutique non trouvée:', storeUrl);
          return of(null);
        }

        const storePath = `stores/${store.ownerId}/userStores/${store.id}`;
        
        // Récupérer le produit et sa catégorie en parallèle
        return this.firestore
          .doc(`${storePath}/products/${productId}`)
          .get()
          .pipe(
            switchMap(doc => {
              if (!doc.exists) {
                console.error('Produit non trouvé:', productId);
                return of(null);
              }
              const productData = doc.data() as any;
              const product = {
                id: doc.id,
                ...productData,
                createdAt: productData.createdAt?.toDate() || new Date(),
                updatedAt: productData.updatedAt?.toDate() || new Date()
              } as Product;

              // Si le produit a une catégorie, récupérer ses informations
              if (product.category) {
                return this.firestore
                  .doc(`${storePath}/categories/${product.category}`)
                  .get()
                  .pipe(
                    map(categoryDoc => {
                      if (categoryDoc.exists) {
                        const categoryData = categoryDoc.data() as any;
                        return {
                          ...product,
                          categoryName: categoryData.name
                        };
                      }
                      return {
                        ...product,
                        categoryName: 'Catégorie inconnue'
                      };
                    })
                  );
              }

              return of(product);
            }),
            catchError(error => {
              console.error('Erreur lors de la récupération du produit:', error);
              return of(null);
            })
          );
      })
    );
  }

  /**
   * Récupère les détails d'un produit avec ses promotions actives
   * @param storeUrl L'URL de la boutique
   * @param productId L'ID du produit
   */
  getProductWithPromotions(storeUrl: string, productId: string): Observable<ProductWithPromotion | null> {
    return this.getStoreByUrl(storeUrl).pipe(
      switchMap(store => {
        if (!store) {
          console.error('Boutique non trouvée:', storeUrl);
          return of(null);
        }

        const storePath = `stores/${store.ownerId}/userStores/${store.id}`;
        
        // Récupérer le produit, sa catégorie et les promotions en parallèle
        return combineLatest([
          this.firestore.doc(`${storePath}/products/${productId}`).get(),
          this.firestore.collection(`${storePath}/promotions`).valueChanges({ idField: 'id' }).pipe(take(1))
        ]).pipe(
          switchMap(([productDoc, promotions]) => {
            if (!productDoc.exists) {
              console.error('Produit non trouvé:', productId);
              return of(null);
            }

            const productData = productDoc.data() as any;
            const product = {
              id: productDoc.id,
              ...productData,
              createdAt: productData.createdAt?.toDate() || new Date(),
              updatedAt: productData.updatedAt?.toDate() || new Date()
            } as Product;

            // Filtrer les promotions actives
            const now = Date.now();
            const activePromotions = (promotions as Promotion[]).filter(promo => 
              promo.actif && 
              promo.dateDebut <= now && 
              promo.dateFin >= now &&
              (!promo.utilisationsMax || promo.utilisationsActuelles < promo.utilisationsMax)
            );

            // Trouver la promotion applicable via le PriceService
            const applicablePromotion = this.priceService.getApplicablePromotion(product, activePromotions);
            const productWithPromotion: ProductWithPromotion = {
              ...product,
              originalPrice: product.price,
              discountedPrice: null,
              promotion: null,
              finalPrice: product.price,
              reductionAmount: 0,
              reductionPercentage: 0
            };

            if (applicablePromotion) {
              const discountedPrice = product.price * (1 - applicablePromotion.reduction / 100);
              productWithPromotion.promotion = applicablePromotion;
              productWithPromotion.discountedPrice = discountedPrice;
              productWithPromotion.finalPrice = discountedPrice;
              productWithPromotion.reductionAmount = product.price - discountedPrice;
              productWithPromotion.reductionPercentage = applicablePromotion.reduction;
              productWithPromotion.promotionId = applicablePromotion.id;
            }

            // Si le produit a une catégorie, récupérer son nom
            if (product.category) {
              return this.firestore
                .doc(`${storePath}/categories/${product.category}`)
                .get()
                .pipe(
                  map(categoryDoc => {
                    if (categoryDoc.exists) {
                      const categoryData = categoryDoc.data() as any;
                      return {
                        ...productWithPromotion,
                        categoryName: categoryData.name
                      };
                    }
                    return {
                      ...productWithPromotion,
                      categoryName: 'Catégorie inconnue'
                    };
                  })
                );
            }

            return of(productWithPromotion);
          }),
          catchError(error => {
            console.error('Erreur lors de la récupération du produit:', error);
            return of(null);
          })
        );
      })
    );
  }
} 