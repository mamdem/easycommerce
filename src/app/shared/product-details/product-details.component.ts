import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, Subscription, catchError, map, of, switchMap, tap, take } from 'rxjs';
import { trigger, transition, style, animate } from '@angular/animations';

import { Product } from '../../core/models/product.model';
import { ProductService } from '../../core/services/product.service';
import { CategoryService } from '../../core/services/category.service';
import { PromotionService, Promotion } from '../../core/services/promotion.service';
import { PriceService } from '../../core/services/price.service';
import { StoreService } from '../../core/services/store.service';
import { Store } from '../../core/models/store.model';
import { ToastService } from '../../core/services/toast.service';
import { LoadingSpinnerComponent } from '../components/loading-spinner/loading-spinner.component';

interface ProductWithPromotion extends Product {
  originalPrice: number;
  discountedPrice: number | null;
  promotion: Promotion | null;
  promotionId?: string;
  categoryName?: string;
}

@Component({
  selector: 'app-product-details',
  standalone: true,
  imports: [CommonModule, LoadingSpinnerComponent],
  template: `
    <app-loading-spinner *ngIf="loading"
                        text="Chargement du produit..."
                        [showProgress]="true"
                        [fullPage]="true">
    </app-loading-spinner>

    <div class="error-message" *ngIf="error">
      {{ error }}
      <button (click)="goBack()">Retour aux produits</button>
    </div>

    <div class="product-details" *ngIf="product$ | async as product">
      <div class="product-header">
        <h1>{{ product.name }}</h1>
        <button class="back-btn" (click)="goBack()">
          <i class="bi bi-arrow-left"></i>
          Retour aux produits
        </button>
      </div>

      <div class="product-content">
        <div class="product-images">
          <div class="main-image">
            <img [src]="product.images && product.images[currentImageIndex] || 'assets/default-product.svg'" [alt]="product.name">
          </div>
          
          <div class="image-thumbnails" *ngIf="hasMultipleImages(product)">
            <button *ngFor="let image of product.images; let i = index"
                    class="thumbnail"
                    [class.active]="i === currentImageIndex"
                    (click)="selectImage(i)">
              <img [src]="image" [alt]="product.name + ' image ' + (i + 1)">
            </button>
          </div>
        </div>

        <div class="product-info">
          <div class="info-section">
            <h3>Description</h3>
            <p>{{ product.description }}</p>
          </div>

          <div class="info-section">
            <h3>Détails</h3>
            <div class="details-grid">
              <div class="detail-item">
                <span class="label">Catégorie</span>
                <span class="value">{{ product.categoryName || 'Non catégorisé' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Prix</span>
                <div class="price-wrapper">
                  <ng-container *ngIf="product.promotion">
                    <span class="original-price">{{ product.originalPrice | number:'1.0-0' }} FCFA</span>
                    <span class="promotional-price">{{ product.discountedPrice | number:'1.0-0' }} FCFA</span>
                  </ng-container>
                  <span class="current-price" *ngIf="!product.promotion">
                    {{ product.price | number:'1.0-0' }} FCFA
                  </span>
                </div>
              </div>
              <div class="detail-item">
                <span class="label">Stock</span>
                <span class="value" [class.low-stock]="product.stock < 10">{{ product.stock }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Statut</span>
                <span class="value">{{ product.isActive ? 'Actif' : 'Inactif' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Créé le</span>
                <span class="value">{{ product.createdAt | date:'dd/MM/yyyy' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Dernière mise à jour</span>
                <span class="value">{{ product.updatedAt | date:'dd/MM/yyyy' }}</span>
              </div>
            </div>
          </div>

          <div class="info-section" *ngIf="product.promotion">
            <h3>Promotion en cours</h3>
            <div class="promotion-details">
              <div class="promotion-badge">
                -{{ product.promotion.reduction }}%
              </div>
              <div class="promotion-info">
                <p>Valable du {{ product.promotion.dateDebut | date:'dd/MM/yyyy' }} au {{ product.promotion.dateFin | date:'dd/MM/yyyy' }}</p>
                <p *ngIf="product.promotion.utilisationsMax">
                  Utilisations : {{ product.promotion.utilisationsActuelles }}/{{ product.promotion.utilisationsMax }}
                </p>
              </div>
            </div>
          </div>

          <div class="actions">
            <button class="edit-btn" (click)="editProduct(product)" [disabled]="actionLoading">
              <i class="bi" [ngClass]="actionLoading ? 'spinner-border spinner-border-sm' : 'bi-pencil'"></i>
              Modifier
            </button>
            <button class="delete-btn" (click)="deleteProduct(product)" [disabled]="actionLoading">
              <i class="bi" [ngClass]="actionLoading ? 'spinner-border spinner-border-sm' : 'bi-trash'"></i>
              Supprimer
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Popup de confirmation -->
    <div class="simple-popup" *ngIf="showConfirmPopup" [@fadeInOut]>
      <div class="popup-content">
        <button class="close-btn" (click)="closeConfirmPopup()">
          <i class="bi bi-x"></i>
        </button>
        
        <div class="popup-body">
          <h3>{{ confirmTitle }}</h3>
          <p>{{ confirmMessage }}</p>
          
          <div class="popup-actions">
            <button class="btn btn-light" (click)="closeConfirmPopup()">
              {{ confirmCancelText }}
            </button>
            <button [class]="'btn btn-' + confirmType" (click)="confirmAction()">
              {{ confirmActionText }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./product-details.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  product$!: Observable<ProductWithPromotion | null>;
  error: string | null = null;
  loading = true;
  actionLoading = false;
  currentImageIndex = 0;
  private subscriptions: Subscription[] = [];

  // Propriétés pour le popup de confirmation
  showConfirmPopup = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmActionText = '';
  confirmCancelText = 'Annuler';
  confirmType: 'danger' | 'warning' | 'primary' = 'primary';
  private confirmCallback: (() => void) | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private categoryService: CategoryService,
    private promotionService: PromotionService,
    private priceService: PriceService,
    private storeService: StoreService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadProduct();
  }

  private loadProduct() {
    this.loading = true;
    this.product$ = this.storeService.getSelectedStore().pipe(
      switchMap(store => {
        if (!store) {
          this.error = 'Aucune boutique sélectionnée';
          this.loading = false;
          return of(null);
        }

        return this.route.paramMap.pipe(
          map(params => params.get('productId')),
          switchMap(productId => {
            if (!productId) {
              throw new Error('Product ID not found');
            }
            
            return this.productService.getProduct(store.id, productId).pipe(
              switchMap(product => {
                if (!product) {
                  throw new Error('Product not found');
                }

                // Get active promotions for the product
                return this.promotionService.getPromotions(store.id).pipe(
                  map(promotions => {
                    const now = Date.now();
                    const activePromotions = promotions.filter(promo => 
                      promo.actif && 
                      promo.dateDebut <= now && 
                      promo.dateFin >= now &&
                      (!promo.utilisationsMax || promo.utilisationsActuelles < promo.utilisationsMax)
                    );

                    const applicablePromotion = this.priceService.getApplicablePromotion(product, activePromotions);
                    const productWithPromotion: ProductWithPromotion = {
                      ...product,
                      originalPrice: product.price,
                      discountedPrice: null,
                      promotion: null
                    };

                    if (applicablePromotion) {
                      productWithPromotion.promotion = applicablePromotion;
                      productWithPromotion.discountedPrice = product.price * (1 - applicablePromotion.reduction / 100);
                    }

                    return productWithPromotion;
                  })
                );
              }),
              switchMap(product => {
                if (product.category) {
                  // Get category name
                  return this.categoryService.getCategoryById(store.id, product.category).pipe(
                    map(category => ({
                      ...product,
                      categoryName: category.name
                    })),
                    catchError(() => of({
                      ...product,
                      categoryName: 'Catégorie inconnue'
                    }))
                  );
                }
                return of(product);
              })
            );
          })
        );
      }),
      tap(() => this.loading = false),
      catchError(error => {
        this.error = error.message;
        this.loading = false;
        return of(null);
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  hasMultipleImages(product: ProductWithPromotion): boolean {
    return product.images && product.images.length > 1;
  }

  selectImage(index: number): void {
    this.currentImageIndex = index;
  }

  editProduct(product: ProductWithPromotion): void {
    this.actionLoading = true;
    this.router.navigate(['../edit', product.id], { relativeTo: this.route })
      .finally(() => this.actionLoading = false);
  }

  deleteProduct(product: ProductWithPromotion): void {
    this.showConfirmation(
      'Supprimer le produit',
      `Êtes-vous sûr de vouloir supprimer "${product.name}" ? Cette action est irréversible.`,
      'Supprimer',
      'danger',
      async () => {
        this.actionLoading = true;
        try {
          const store = await this.storeService.getSelectedStore().pipe(take(1)).toPromise();
          if (!store || !product.id) {
            throw new Error('Store or product not found');
          }
          await this.productService.deleteProduct(store.id, product.id);
          this.toastService.success('Produit supprimé avec succès');
          this.goBack();
        } catch (error) {
          console.error('Error deleting product:', error);
          this.toastService.error('Erreur lors de la suppression du produit');
        } finally {
          this.actionLoading = false;
        }
      }
    );
  }

  showConfirmation(title: string, message: string, actionText: string, type: 'danger' | 'warning' | 'primary' = 'primary', callback: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmActionText = actionText;
    this.confirmType = type;
    this.confirmCallback = callback;
    this.showConfirmPopup = true;
  }

  confirmAction() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
    this.closeConfirmPopup();
  }

  closeConfirmPopup() {
    this.showConfirmPopup = false;
    this.confirmCallback = null;
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
} 