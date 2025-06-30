import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PromotionService, Promotion } from '../../../../../core/services/promotion.service';
import { StoreService } from '../../../../../core/services/store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner.component';

@Component({
  selector: 'app-promotions',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    LoadingSpinnerComponent
  ],
  templateUrl: './promotions.component.html',
  styleUrls: ['./promotions.component.scss']
})
export class PromotionsComponent implements OnInit {
  activePromotions$: Observable<Promotion[]> = of([]);
  expiredPromotions$: Observable<Promotion[]> = of([]);
  upcomingPromotions$: Observable<Promotion[]> = of([]);
  private storeId: string = '';
  loading = true;

  constructor(
    private promotionService: PromotionService,
    private storeService: StoreService,
    private toastService: ToastService
  ) {
    this.initializePromotions();
  }

  ngOnInit(): void {
    // Simuler un chargement
    setTimeout(() => {
      this.loading = false;
    }, 1000);
  }

  private initializePromotions(): void {
    this.loading = true;
    this.storeService.getSelectedStore().subscribe(store => {
      if (store) {
        this.storeId = store.id!;
        this.loadPromotions();
      } else {
        this.loading = false;
      }
    });
  }

  private loadPromotions(): void {
    this.promotionService.getPromotions(this.storeId).subscribe({
      next: (promotions) => {
        const now = new Date().getTime();
        
        // Filtrer les promotions
        this.activePromotions$ = of(promotions.filter(p => 
          p.dateDebut <= now && p.dateFin >= now && p.actif
        ));
        
        this.upcomingPromotions$ = of(promotions.filter(p => 
          p.dateDebut > now && p.actif
        ));
        
        this.expiredPromotions$ = of(promotions.filter(p => 
          p.dateFin < now || !p.actif
        ));
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des promotions:', error);
        this.loading = false;
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