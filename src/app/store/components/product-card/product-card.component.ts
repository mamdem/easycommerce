import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../core/models/product.model';
import { CartService } from '../../../core/services/cart.service';
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
  private cartStateSubscription?: Subscription;

  constructor(private cartService: CartService) {}

  ngOnInit() {
    this.checkIfInCart();
    this.cartStateSubscription = this.cartService.cartState$.subscribe(() => {
      this.checkIfInCart();
    });
  }

  ngOnDestroy() {
    if (this.cartStateSubscription) {
      this.cartStateSubscription.unsubscribe();
    }
  }

  getDiscountPercentage(): number {
    if (this.product.price && this.product.discountPrice) {
      return Math.round(((this.product.price - this.product.discountPrice) / this.product.price) * 100);
    }
    return 0;
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