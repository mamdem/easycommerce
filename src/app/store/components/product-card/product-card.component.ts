import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
import { PriceService } from '../../../core/services/price.service';
import { PromotionService, Promotion } from '../../../core/services/promotion.service';
import { Subscription } from 'rxjs';

export interface ProductWithPromotion extends Product {
  originalPrice: number;
  discountedPrice: number | null;
  promotion: Promotion | null;
  promotionId?: string;
}

@Component({
  selector: 'product-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-card.component.html',
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent implements OnInit, OnDestroy {
  @Input() product!: ProductWithPromotion;
  @Input() storeUrl!: string;
  @Input() storeName!: string;
  @Input() categoryName: string = '';
  @Output() addToCart = new EventEmitter<void>();
  
  isInCart = false;
  private cartStateSubscription?: Subscription;

  constructor(
    private router: Router,
    private cartService: CartService,
    private priceService: PriceService,
    private promotionService: PromotionService
  ) {}

  ngOnInit() {
    this.checkIfInCart();
  }

  formatPrice(price: number | null): string {
    if (price === null) return '0';
    return new Intl.NumberFormat('fr-FR').format(Math.round(price));
  }

  getDiscountPercentage(): number {
    if (!this.product.promotion) return 0;
    return this.product.promotion.reduction;
  }

  onAddToCartClick(event: Event): void {
    event.stopPropagation(); // Prevent navigation when clicking the cart button
    if (!this.isInCart && this.product.stock > 0) {
      this.addToCart.emit();
      this.checkIfInCart();
    }
  }

  onCardClick(): void {
    this.router.navigate(['/boutique', this.storeUrl, this.product.id]);
  }

  checkIfInCart(): void {
    if (this.product.id && this.storeUrl) {
      this.isInCart = this.cartService.isProductInCart(this.product.id, this.storeUrl);
    }
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/default-product.svg';
  }

  ngOnDestroy() {
    if (this.cartStateSubscription) {
      this.cartStateSubscription.unsubscribe();
    }
  }
} 