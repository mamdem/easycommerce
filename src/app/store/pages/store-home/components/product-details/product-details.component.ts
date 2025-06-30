import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Product } from '../../../../../core/models/product.model';
import { CartService } from '../../../../../core/services/cart.service';
import { StoreProductsService } from '../../../../../store/services/store-products.service';
import { PublicCategoryService } from '../../../../../store/services/public-category.service';
import { Observable, Subscription, catchError, map, of, switchMap, tap } from 'rxjs';
import { Promotion } from '../../../../../core/services/promotion.service';
import { PublicPromotionService } from '../../../../../store/services/public-promotion.service';
import { Category } from '../../../../../core/models/category.model';
import { PriceService } from '../../../../../core/services/price.service';

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
  imports: [CommonModule],
  template: `
    <div class="error-message" *ngIf="error">
      {{ error }}
      <button (click)="goBack()">Retour aux produits</button>
    </div>

    <div class="loading-spinner" *ngIf="loading">
      Chargement du produit...
    </div>

    <div class="product-details" *ngIf="product$ | async as product">
      <div class="product-images-section">
        <div class="main-image">
          <img [src]="product.images && product.images[currentImageIndex] || 'assets/default-product.svg'" [alt]="product.name">
          <div class="product-badges" *ngIf="product.promotion">
            <span class="discount-badge">
              <i class="bi bi-tag-fill"></i>
              -{{ product.promotion.reduction }}%
            </span>
          </div>
          
          <!-- Navigation des images -->
          <button class="image-nav prev" 
                  *ngIf="hasMultipleImages(product)"
                  (click)="previousImage()"
                  [class.disabled]="currentImageIndex === 0">
            <i class="bi bi-chevron-left"></i>
          </button>
          <button class="image-nav next" 
                  *ngIf="hasMultipleImages(product)"
                  (click)="nextImage()"
                  [class.disabled]="currentImageIndex === getLastImageIndex(product)">
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>

        <!-- Miniatures -->
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
        <h1 class="product-name">{{ product.name }}</h1>
        
        <div class="category-tag" *ngIf="product.category">
          <i class="bi bi-folder"></i>
          {{ product.categoryName || 'Catégorie inconnue' }}
        </div>

        <div class="product-description">
          <h3>Description</h3>
          <p>{{ product.description }}</p>
        </div>

        <div class="product-details-grid">
          <div class="detail-item">
            <span class="label">Créé le</span>
            <span class="value">{{ product.createdAt | date:'dd/MM/yyyy' }}</span>
          </div>

          <div class="detail-item">
            <span class="label">Dernière mise à jour</span>
            <span class="value">{{ product.updatedAt | date:'dd/MM/yyyy' }}</span>
          </div>
        </div>

        <div class="product-price">
          <div class="price-container">
            <div class="price-wrapper">
              <ng-container *ngIf="product.promotion">
                <span class="original-price">
                  {{ product.originalPrice | number:'1.0-0' }} <span class="currency">FCFA</span>
                </span>
                <span class="promotional-price">
                  {{ product.discountedPrice | number:'1.0-0' }} 
                  <span class="currency">FCFA</span>
                </span>
              </ng-container>
              <span class="current-price" *ngIf="!product.promotion">
                {{ product.price | number:'1.0-0' }} <span class="currency">FCFA</span>
              </span>
            </div>
          </div>
        </div>

        <div class="product-actions">
          <button class="back-btn" (click)="goBack()">
            <i class="bi bi-arrow-left"></i>
            Retour aux produits
          </button>
          
          <button class="add-to-cart-btn" 
                  [class.out-of-stock]="product.stock === 0"
                  [class.in-cart]="isInCart"
                  [disabled]="product.stock === 0 || isInCart"
                  (click)="addToCart(product)">
            <i class="bi" 
               [class.bi-cart-plus]="product.stock > 0 && !isInCart" 
               [class.bi-cart-check]="isInCart"
               [class.bi-x-circle]="product.stock === 0"></i>
            {{ getCartButtonLabel(product) }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      margin-top: 6rem;
      padding: 0 1rem;
    }

    .product-details {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 3rem;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    .product-images-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .main-image {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      background: #f8f9fa;
      aspect-ratio: 1;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .image-nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.8);
        border: none;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
        
        &:hover:not(.disabled) {
          background: white;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        &.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        &.prev {
          left: 1rem;
        }

        &.next {
          right: 1rem;
        }

        i {
          font-size: 1.2rem;
          color: var(--text-primary);
        }
      }
    }

    .image-thumbnails {
      display: flex;
      gap: 0.5rem;
      overflow-x: auto;
      padding: 0.5rem;
      margin: -0.5rem;

      /* Masquer la barre de défilement */
      scrollbar-width: none;
      -ms-overflow-style: none;
      &::-webkit-scrollbar {
        display: none;
      }

      .thumbnail {
        flex: 0 0 80px;
        height: 80px;
        border: 2px solid transparent;
        border-radius: 8px;
        overflow: hidden;
        padding: 0;
        cursor: pointer;
        transition: all 0.2s ease;
        background: none;

        &:hover {
          border-color: var(--store-primary-color);
        }

        &.active {
          border-color: var(--store-primary-color);
        }

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    }

    .product-badges {
      position: absolute;
      top: 1rem;
      left: 1rem;
    }

    .discount-badge {
      background: linear-gradient(45deg, var(--store-primary-color), var(--store-secondary-color));
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
      font-size: 0.9rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .product-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .product-name {
      font-size: 2rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0;
    }

    .category-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      background: rgba(var(--store-primary-rgb), 0.1);
      color: var(--store-primary-color);
      border-radius: 20px;
      font-size: 0.9rem;
      font-weight: 500;
      align-self: flex-start;
    }

    .product-description {
      h3 {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 0.75rem;
      }

      p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin: 0;
      }
    }

    .product-details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      background: #f8f9fa;
      padding: 1.5rem;
      border-radius: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .label {
        font-size: 0.9rem;
        color: var(--text-secondary);
      }

      .value {
        font-weight: 500;
        color: var(--text-primary);
      }
    }

    .product-price {
      margin-top: auto;

      .price-container {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .price-wrapper {
        display: flex;
        align-items: baseline;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .original-price {
        text-decoration: line-through;
        color: var(--text-secondary);
        font-size: 1rem;
        opacity: 0.7;
      }

      .promotional-price {
        font-weight: 700;
        font-size: 1.5rem;
        color: #dc3545;
      }

      .current-price {
        font-weight: 700;
        font-size: 1.5rem;
        color: var(--store-primary-color);
      }

      .currency {
        font-size: 0.9rem;
        font-weight: 500;
        opacity: 0.8;
      }
    }

    .product-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;

      button {
        padding: 1rem;
        border: none;
        border-radius: 12px;
        font-weight: 600;
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          transform: translateY(-2px);
        }

        &:active:not(:disabled) {
          transform: translateY(0);
        }

        i {
          font-size: 1.1rem;
        }
      }

      .back-btn {
        flex: 1;
        background: #f8f9fa;
        color: var(--text-primary);

        &:hover {
          background: #e9ecef;
        }
      }

      .add-to-cart-btn {
        flex: 2;
        background: var(--store-primary-color);
        color: white;

        &:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(var(--store-primary-rgb), 0.2);
        }

        &.out-of-stock {
          background: #dc3545;
          opacity: 0.8;
          cursor: not-allowed;
        }

        &.in-cart {
          background: #6c757d;
          opacity: 0.8;
          cursor: not-allowed;
        }
      }
    }

    .error-message {
      text-align: center;
      padding: 2rem;
      background: #fff3f3;
      border-radius: 12px;
      margin: 2rem auto;
      max-width: 600px;
      color: #dc3545;

      button {
        margin-top: 1rem;
        padding: 0.75rem 1.5rem;
        border: none;
        border-radius: 8px;
        background: #dc3545;
        color: white;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          background: #c82333;
        }
      }
    }

    .loading-spinner {
      text-align: center;
      padding: 4rem;
      color: var(--text-secondary);
    }

    @media (max-width: 768px) {
      .product-details {
        grid-template-columns: 1fr;
        gap: 2rem;
        padding: 1rem;
        margin: 1rem;
      }

      .main-image {
        aspect-ratio: 4/3;
      }

      .image-thumbnails {
        justify-content: center;
      }

      .product-info {
        gap: 1rem;
      }

      .product-name {
        font-size: 1.5rem;
      }

      .product-details-grid {
        grid-template-columns: 1fr;
      }

      .product-actions {
        flex-direction: column;
      }
    }
  `]
})
export class ProductDetailsComponent implements OnInit, OnDestroy {
  product$!: Observable<ProductWithPromotion>;
  storeUrl!: string;
  error: string | null = null;
  loading = true;
  currentImageIndex = 0;
  isInCart = false;
  private cartStateSubscription?: Subscription;
  private promotionsSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: CartService,
    private storeProductsService: StoreProductsService,
    private categoryService: PublicCategoryService,
    private promotionService: PublicPromotionService,
    private priceService: PriceService
  ) {}

  ngOnInit() {
    this.route.parent?.paramMap.pipe(
      map(params => params.get('storeUrl')),
      switchMap(storeUrl => {
        if (!storeUrl) {
          throw new Error('Store URL not found');
        }
        this.storeUrl = storeUrl;
        
        return this.route.paramMap.pipe(
          map(params => params.get('productId')),
          switchMap(productId => {
            if (!productId) {
              throw new Error('Product ID not found');
            }
            
            console.log('Fetching product:', { storeUrl, productId });
            return this.storeProductsService.getProduct(storeUrl, productId).pipe(
              tap(product => {
                // Check if product is in cart when loaded
                if (product.id) {
                  this.isInCart = this.cartService.isProductInCart(product.id, this.storeUrl);
                }
              }),
              switchMap(product => {
                // Get active promotions for the product
                return this.promotionService.getPromotions(product.storeId).pipe(
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
                  // Récupérer le nom de la catégorie
                  return this.categoryService.getCategoryById(product.storeId, product.category).pipe(
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
            ) as Observable<ProductWithPromotion>;
          })
        );
      }),
      catchError(error => {
        this.error = error.message;
        this.loading = false;
        return of(null);
      })
    ).subscribe(product => {
      this.loading = false;
      if (product) {
        this.product$ = of(product);
      }
    });

    // Subscribe to cart state changes
    this.cartStateSubscription = this.cartService.cartState$.subscribe(() => {
      this.product$.subscribe(product => {
        if (product.id) {
          this.isInCart = this.cartService.isProductInCart(product.id, this.storeUrl);
        }
      });
    });
  }

  ngOnDestroy() {
    if (this.cartStateSubscription) {
      this.cartStateSubscription.unsubscribe();
    }
    if (this.promotionsSubscription) {
      this.promotionsSubscription.unsubscribe();
    }
  }

  hasMultipleImages(product: ProductWithPromotion): boolean {
    return product.images && product.images.length > 1;
  }

  getLastImageIndex(product: ProductWithPromotion): number {
    return product.images ? product.images.length - 1 : 0;
  }

  selectImage(index: number): void {
    this.currentImageIndex = index;
  }

  previousImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
    }
  }

  nextImage(): void {
    this.product$.subscribe(product => {
      const lastIndex = this.getLastImageIndex(product);
      if (this.currentImageIndex < lastIndex) {
        this.currentImageIndex++;
      }
    });
  }

  calculateDiscountedPrice(product: ProductWithPromotion): number {
    if (!product.promotion) return product.price;
    return product.price * (1 - product.promotion.reduction / 100);
  }

  getCartButtonLabel(product: ProductWithPromotion): string {
    if (product.stock === 0) {
      return 'Rupture de stock';
    }
    return this.isInCart ? 'Déjà dans le panier' : 'Ajouter au panier';
  }

  addToCart(product: ProductWithPromotion): void {
    if (product.stock > 0 && !this.isInCart) {
      // Use discounted price if available
      const productToAdd = {
        ...product,
        price: product.discountedPrice || product.price
      };
      this.cartService.addToCart(productToAdd, this.storeUrl, product.name);
      this.isInCart = true;
    }
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
} 