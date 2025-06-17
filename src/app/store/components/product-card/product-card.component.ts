import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { PriceService } from '../../../core/services/price.service';
import { PromotionService, Promotion } from '../../../core/services/promotion.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent implements OnInit, OnDestroy {
  @Input() product!: Product;
  @Input() storeUrl!: string;
  @Input() storeName!: string;
  @Output() addToCart = new EventEmitter<void>();
  
  isInCart = false;
  discountedPrice: number | null = null;
  activePromotion: Promotion | null = null;
  private cartStateSubscription?: Subscription;
  private promotionsSubscription?: Subscription;

  constructor(
    private cartService: CartService,
    private priceService: PriceService,
    private promotionService: PromotionService
  ) {}

  ngOnInit() {
    this.checkIfInCart();
    this.cartStateSubscription = this.cartService.cartState$.subscribe(() => {
      this.checkIfInCart();
    });

    // Charger les promotions
    this.loadPromotions();
  }

  ngOnDestroy() {
    if (this.cartStateSubscription) {
      this.cartStateSubscription.unsubscribe();
    }
    if (this.promotionsSubscription) {
      this.promotionsSubscription.unsubscribe();
    }
  }

  private loadPromotions(): void {
    if (this.product.storeId) {
      this.promotionsSubscription = this.promotionService
        .getPromotions(this.product.storeId)
        .subscribe(promotions => {
          this.activePromotion = this.priceService.getApplicablePromotion(this.product, promotions);
          this.discountedPrice = this.priceService.calculateDiscountedPrice(this.product, promotions);
        });
    }
  }

  getDiscountPercentage(): number {
    if (!this.activePromotion) return 0;
    return this.activePromotion.reduction;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/default-product.svg';
  }

  checkIfInCart(): void {
    if (this.product.id && this.storeUrl) {
      this.isInCart = this.cartService.isProductInCart(this.product.id, this.storeUrl);
    }
  }

  onAddToCartClick(): void {
    if (!this.isInCart) {
      this.addToCart.emit();
    }
  }
} 