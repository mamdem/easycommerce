import { Injectable } from '@angular/core';
import { Product } from '../models/product.model';
import { Promotion } from './promotion.service';

@Injectable({
  providedIn: 'root'
})
export class PriceService {
  constructor() {}

  calculateDiscountedPrice(product: Product, promotions: Promotion[]): number | null {
    if (!promotions?.length) return null;

    const now = Date.now();
    const applicablePromotions = promotions.filter(promo => {
      // Vérifier si la promotion est active et dans la période valide
      if (!promo.actif || promo.dateDebut > now || promo.dateFin < now) {
        return false;
      }

      // Vérifier si la promotion s'applique au produit
      switch (promo.applicationScope) {
        case 'PANIER_ENTIER':
          return true;
        case 'PRODUITS':
          return promo.produitIds?.includes(product.id!);
        case 'CATEGORIES':
          return promo.categorieIds?.includes(product.categoryId);
        default:
          return false;
      }
    });

    if (!applicablePromotions.length) return null;

    // Trouver la meilleure réduction
    const bestPromotion = applicablePromotions.reduce((best, current) => 
      current.reduction > best.reduction ? current : best
    );

    // Calculer le prix réduit
    const discountAmount = (product.price * bestPromotion.reduction) / 100;
    return Math.round(product.price - discountAmount);
  }

  getApplicablePromotion(product: Product, promotions: Promotion[]): Promotion | null {
    if (!promotions?.length) return null;

    const now = Date.now();
    const applicablePromotions = promotions.filter(promo => {
      if (!promo.actif || promo.dateDebut > now || promo.dateFin < now) {
        return false;
      }

      switch (promo.applicationScope) {
        case 'PANIER_ENTIER':
          return true;
        case 'PRODUITS':
          return promo.produitIds?.includes(product.id!);
        case 'CATEGORIES':
          return promo.categorieIds?.includes(product.categoryId);
        default:
          return false;
      }
    });

    if (!applicablePromotions.length) return null;

    // Retourner la promotion avec la plus grande réduction
    return applicablePromotions.reduce((best, current) => 
      current.reduction > best.reduction ? current : best
    );
  }
} 