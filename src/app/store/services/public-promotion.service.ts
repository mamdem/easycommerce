import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of, from, map, switchMap, catchError } from 'rxjs';
import { Promotion } from '../../core/services/promotion.service';
import { UrlService } from '../../core/services/url.service';

@Injectable({
  providedIn: 'root'
})
export class PublicPromotionService {
  constructor(
    private firestore: AngularFirestore,
    private urlService: UrlService
  ) {}

  getPromotions(storeUrl: string): Observable<Promotion[]> {
    return this.firestore.collection('urls').doc(storeUrl).get().pipe(
      switchMap(urlDoc => {
        if (!urlDoc.exists) {
          console.log('URL de boutique non trouvée:', storeUrl);
          return of([]);
        }

        const urlData = urlDoc.data() as { userId: string, storeId: string };
        console.log('Données URL trouvées:', urlData);

        return this.firestore
          .collection('public_stores')
          .doc(urlData.storeId)
          .collection('promotions')
          .valueChanges({ idField: 'id' })
          .pipe(
            map(promotions => {
              return promotions.map(promotion => ({
                id: promotion['id'],
                type: promotion['type'] || 'REDUCTION_PRODUIT',
                nom: promotion['nom'] || '',
                code: promotion['code'],
                reduction: promotion['reduction'] || 0,
                dateDebut: promotion['dateDebut'] || Date.now(),
                dateFin: promotion['dateFin'] || Date.now(),
                actif: promotion['actif'] ?? true,
                produitIds: promotion['produitIds'] || [],
                categorieIds: promotion['categorieIds'] || [],
                applicationScope: promotion['applicationScope'] || 'PANIER_ENTIER',
                minimumAchat: promotion['minimumAchat'],
                utilisationsMax: promotion['utilisationsMax'],
                utilisationsActuelles: promotion['utilisationsActuelles'] || 0,
                afficherAutomatiquement: promotion['afficherAutomatiquement'] ?? true,
                createdAt: promotion['createdAt'] || Date.now(),
                updatedAt: promotion['updatedAt'] || Date.now()
              })) as Promotion[];
            })
          );
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des promotions:', error);
        return of([]);
      })
    );
  }

  validatePromoCode(storeUrl: string, code: string): Observable<Promotion | null> {
    return this.firestore.collection('urls').doc(storeUrl).get().pipe(
      switchMap(urlDoc => {
        if (!urlDoc.exists) {
          console.log('URL de boutique non trouvée:', storeUrl);
          return of(null);
        }

        const urlData = urlDoc.data() as { userId: string, storeId: string };
        console.log('Données URL trouvées:', urlData);

        return this.firestore
          .collection('public_stores')
          .doc(urlData.storeId)
          .collection('promotions', ref => ref
            .where('type', '==', 'CODE_PROMO')
            .where('code', '==', code)
            .where('actif', '==', true)
          )
          .valueChanges({ idField: 'id' })
          .pipe(
            map(promotions => {
              const now = Date.now();
              const validPromotion = promotions.find(p => 
                p['dateDebut'] <= now && 
                p['dateFin'] >= now &&
                (!p['utilisationsMax'] || p['utilisationsActuelles'] < p['utilisationsMax'])
              );

              if (!validPromotion) return null;

              return {
                id: validPromotion['id'],
                type: validPromotion['type'] || 'CODE_PROMO',
                nom: validPromotion['nom'] || '',
                code: validPromotion['code'],
                reduction: validPromotion['reduction'] || 0,
                dateDebut: validPromotion['dateDebut'] || Date.now(),
                dateFin: validPromotion['dateFin'] || Date.now(),
                actif: validPromotion['actif'] ?? true,
                produitIds: validPromotion['produitIds'] || [],
                categorieIds: validPromotion['categorieIds'] || [],
                applicationScope: validPromotion['applicationScope'] || 'PANIER_ENTIER',
                minimumAchat: validPromotion['minimumAchat'],
                utilisationsMax: validPromotion['utilisationsMax'],
                utilisationsActuelles: validPromotion['utilisationsActuelles'] || 0,
                afficherAutomatiquement: validPromotion['afficherAutomatiquement'] ?? true,
                createdAt: validPromotion['createdAt'] || Date.now(),
                updatedAt: validPromotion['updatedAt'] || Date.now()
              } as Promotion;
            })
          );
      }),
      catchError(error => {
        console.error('Erreur lors de la validation du code promo:', error);
        return of(null);
      })
    );
  }
} 