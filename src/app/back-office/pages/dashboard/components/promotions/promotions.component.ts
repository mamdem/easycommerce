import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { PromotionService, Promotion } from '../../../../../core/services/promotion.service';
import { StoreService } from '../../../../../core/services/store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { Observable, of, Subject, takeUntil, switchMap, filter } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner.component';
import { Store } from '../../../../../core/models/store.model';

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
export class PromotionsComponent implements OnInit, OnDestroy {
  activePromotions$: Observable<Promotion[]> = of([]);
  expiredPromotions$: Observable<Promotion[]> = of([]);
  upcomingPromotions$: Observable<Promotion[]> = of([]);
  currentStore!: Store;
  loading = true;

  // Pour la gestion de la destruction du composant
  private destroy$ = new Subject<void>();

  constructor(
    private promotionService: PromotionService,
    private storeService: StoreService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // S'abonner aux changements de boutique
    this.storeService.selectedStore$.pipe(
      takeUntil(this.destroy$),
      switchMap(storeId => {
        if (!storeId) {
          return of(null);
        }
        return this.storeService.getSelectedStore();
      }),
      filter(store => !!store) // Ignorer les valeurs null
    ).subscribe({
      next: (store) => {
      if (store) {
          this.currentStore = store;
        this.loadPromotions();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la boutique:', error);
        this.loading = false;
      }
    });
  }

  private loadPromotions(): void {
    this.loading = true;
    this.promotionService.getPromotions(this.currentStore.id!).subscribe({
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
    if (!this.currentStore.id || !promotion.id) return;

    this.promotionService.updatePromotion(this.currentStore.id, promotion.id, { actif: false }).subscribe({
      next: () => {
        this.toastService.success('Promotion désactivée');
        this.loadPromotions(); // Recharger les promotions après la désactivation
      },
      error: (error) => {
        console.error('Erreur lors de la désactivation de la promotion:', error);
        this.toastService.error('Erreur lors de la désactivation de la promotion');
      }
    });
  }

  deletePromotion(id: string | undefined): void {
    if (!id || !this.currentStore.id) return;
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cette promotion ?')) {
      this.promotionService.deletePromotion(this.currentStore.id, id).subscribe({
        next: () => {
          this.toastService.success('Promotion supprimée');
          this.loadPromotions(); // Recharger les promotions après la suppression
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 