import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';
import firebase from 'firebase/compat/app';

export interface Promotion {
  id?: string;
  type: 'CODE_PROMO' | 'REDUCTION_PRODUIT' | 'OFFRE_LIMITEE';
  nom: string;
  code?: string;
  reduction: number;
  dateDebut: number;
  dateFin: number;
  actif: boolean;
  produitIds?: string[];
  categorieIds?: string[];
  applicationScope: 'PANIER_ENTIER' | 'CATEGORIES' | 'PRODUITS';
  minimumAchat?: number;
  utilisationsMax?: number;
  utilisationsActuelles: number;
  afficherAutomatiquement: boolean;
  createdAt: number;
  updatedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class PromotionService {
  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {}

  private getPromotionsPath(storeId: string): string {
    const userId = this.authService.getCurrentUser()?.uid;
    if (!userId) throw new Error('Utilisateur non connecté');
    return `stores/${userId}/userStores/${storeId}/promotions`;
  }

  // Créer une nouvelle promotion
  createPromotion(storeId: string, promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'>): Observable<string> {
    const promotionData: Promotion = {
      ...promotion,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return from(
      this.firestore
        .collection(this.getPromotionsPath(storeId))
        .add(promotionData)
    ).pipe(
      map(docRef => docRef.id),
      catchError(error => {
        console.error('Erreur lors de la création de la promotion:', error);
        return throwError(() => new Error('Erreur lors de la création de la promotion'));
      })
    );
  }

  // Récupérer toutes les promotions d'une boutique
  getPromotions(storeId: string): Observable<Promotion[]> {
    return this.firestore
      .collection<Promotion>(this.getPromotionsPath(storeId))
      .valueChanges({ idField: 'id' })
      .pipe(
        map(promotions => 
          promotions.sort((a, b) => b.createdAt - a.createdAt)
        ),
        catchError(error => {
          console.error('Erreur lors de la récupération des promotions:', error);
          return throwError(() => new Error('Erreur lors de la récupération des promotions'));
        })
      );
  }

  // Mettre à jour une promotion
  updatePromotion(storeId: string, promotionId: string, updates: Partial<Promotion>): Observable<void> {
    const updateData = {
      ...updates,
      updatedAt: Date.now()
    };

    return from(
      this.firestore
        .collection(this.getPromotionsPath(storeId))
        .doc(promotionId)
        .update(updateData)
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la mise à jour de la promotion:', error);
        return throwError(() => new Error('Erreur lors de la mise à jour de la promotion'));
      })
    );
  }

  // Supprimer une promotion
  deletePromotion(storeId: string, promotionId: string): Observable<void> {
    return from(
      this.firestore
        .collection(this.getPromotionsPath(storeId))
        .doc(promotionId)
        .delete()
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la suppression de la promotion:', error);
        return throwError(() => new Error('Erreur lors de la suppression de la promotion'));
      })
    );
  }

  // Vérifier si un code promo est valide
  validatePromoCode(storeId: string, code: string): Observable<Promotion | null> {
    return this.firestore
      .collection<Promotion>(
        this.getPromotionsPath(storeId),
        ref => ref
          .where('type', '==', 'CODE_PROMO')
          .where('code', '==', code)
          .where('actif', '==', true)
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        map(promotions => {
          const now = Date.now();
          const validPromotion = promotions.find(p => 
            p.dateDebut <= now && 
            p.dateFin >= now &&
            (!p.utilisationsMax || p.utilisationsActuelles < p.utilisationsMax)
          );
          return validPromotion || null;
        }),
        catchError(error => {
          console.error('Erreur lors de la validation du code promo:', error);
          return throwError(() => new Error('Erreur lors de la validation du code promo'));
        })
      );
  }

  // Incrémenter le compteur d'utilisations d'une promotion
  incrementPromotionUsage(storeId: string, promotionId: string): Observable<void> {
    return from(
      this.firestore
        .collection(this.getPromotionsPath(storeId))
        .doc(promotionId)
        .update({
          utilisationsActuelles: firebase.firestore.FieldValue.increment(1),
          updatedAt: Date.now()
        })
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de l\'incrémentation des utilisations:', error);
        return throwError(() => new Error('Erreur lors de l\'incrémentation des utilisations'));
      })
    );
  }
} 