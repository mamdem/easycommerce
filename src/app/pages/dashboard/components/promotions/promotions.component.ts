import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PromotionService, Promotion } from '../../../../core/services/promotion.service';
import { StoreService } from '../../../../core/services/store.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './promotions.component.html',
  styleUrls: ['./promotions.component.scss']
})
export class PromotionsComponent implements OnInit {
  activePromotions$: Observable<Promotion[]> = of([]);
  expiredPromotions$: Observable<Promotion[]> = of([]);
  private storeId: string = '';

  constructor(
    private promotionService: PromotionService,
    private storeService: StoreService,
    private toastService: ToastService
  ) {
    this.storeService.getSelectedStore().subscribe(store => {
      if (store) {
        this.storeId = store.id;
        this.initializePromotions();
      }
    });
  }

  ngOnInit(): void {}

  private initializePromotions(): void {
    const now = Date.now();
    
    this.activePromotions$ = this.promotionService.getPromotions(this.storeId).pipe(
      map(promotions => promotions.filter(p => p.actif && p.dateFin >= now))
    );

    this.expiredPromotions$ = this.promotionService.getPromotions(this.storeId).pipe(
      map(promotions => promotions.filter(p => !p.actif || p.dateFin < now))
    );
  }

  loadPromotions(): void {
    if (!this.storeId) return;

    this.promotionService.getPromotions(this.storeId).subscribe({
      next: (promotions) => {
        const now = Date.now();
        this.activePromotions$ = this.promotionService.getPromotions(this.storeId).pipe(
          map(promotions => promotions.filter(p => p.actif && p.dateFin >= now))
        );
        this.expiredPromotions$ = this.promotionService.getPromotions(this.storeId).pipe(
          map(promotions => promotions.filter(p => !p.actif || p.dateFin < now))
        );
      },
      error: (error) => {
        console.error('Erreur lors du chargement des promotions:', error);
        this.toastService.error('Erreur lors du chargement des promotions');
      }
    });
  }

  desactiverPromotion(promotion: Promotion): void {
    if (!this.storeId || !promotion.id) return;

    this.promotionService.updatePromotion(this.storeId, promotion.id, { actif: false }).subscribe({
      next: () => {
        this.toastService.success('Promotion désactivée');
      },
      error: (error) => {
        console.error('Erreur lors de la désactivation de la promotion:', error);
        this.toastService.error('Erreur lors de la désactivation de la promotion');
      }
    });
  }

  deletePromotion(id: string | undefined): void {
    if (!id) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) {
      this.promotionService.deletePromotion(this.storeId, id).subscribe({
        next: () => {
          this.toastService.success('Promotion supprimée');
          this.initializePromotions();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression de la promotion:', error);
          this.toastService.error('Erreur lors de la suppression de la promotion');
        }
      });
    }
  }

  getPromotionTypeLabel(type: string): string {
    switch (type) {
      case 'CODE_PROMO':
        return 'Code promo';
      case 'REDUCTION_PRODUIT':
        return 'Réduction produit';
      case 'OFFRE_LIMITEE':
        return 'Offre limitée';
      default:
        return type;
    }
  }

  getPromotionTypeClass(type: string): string {
    switch (type) {
      case 'CODE_PROMO':
        return 'primary';
      case 'REDUCTION_PRODUIT':
        return 'success';
      case 'OFFRE_LIMITEE':
        return 'warning';
      default:
        return 'secondary';
    }
  }

  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }
} 