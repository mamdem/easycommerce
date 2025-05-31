import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="product-card">
      <div class="product-image">
        <img [src]="product.images[0] || 'assets/default-product.svg'" 
             [alt]="product.name"
             (error)="onImageError($event)">
        
        <div class="discount-badge" *ngIf="product.discountPrice && product.discountPrice < product.price">
          -{{ getDiscountPercentage() }}%
        </div>
      </div>

      <div class="product-info">
        <h3 class="product-name">{{ product.name }}</h3>
        <p class="product-category">{{ product.category }}</p>
        
        <div class="product-price">
          <span class="current-price" [class.discounted]="product.discountPrice && product.discountPrice < product.price">
            {{ product.price | number:'1.2-2' }}€
          </span>
          <span class="discount-price" *ngIf="product.discountPrice && product.discountPrice < product.price">
            {{ product.discountPrice | number:'1.2-2' }}€
          </span>
        </div>

        <div class="product-stock" [class.out-of-stock]="product.stock === 0">
          <i class="bi" [class.bi-check-circle]="product.stock > 0" [class.bi-x-circle]="product.stock === 0"></i>
          {{ product.stock > 0 ? product.stock + ' en stock' : 'Rupture de stock' }}
        </div>

        <button class="btn btn-primary w-100" 
                (click)="addToCart.emit(product)"
                [disabled]="product.stock === 0">
          <i class="bi bi-cart-plus me-2"></i>
          Ajouter au panier
        </button>
      </div>
    </div>
  `,
  styles: [`
    .product-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .product-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .product-image {
      position: relative;
      aspect-ratio: 1;
      background: #f8f9fa;
    }

    .product-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .discount-badge {
      position: absolute;
      top: 1rem;
      left: 1rem;
      background: #dc3545;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-weight: bold;
    }

    .product-info {
      padding: 1rem;
    }

    .product-name {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0;
      color: #2c3e50;
    }

    .product-category {
      color: #6c757d;
      font-size: 0.9rem;
      margin: 0.5rem 0;
    }

    .product-price {
      margin: 0.5rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .current-price {
      font-weight: 600;
      font-size: 1.2rem;
    }

    .current-price.discounted {
      text-decoration: line-through;
      color: #6c757d;
      font-size: 1rem;
    }

    .discount-price {
      color: #dc3545;
      font-weight: 600;
      font-size: 1.2rem;
    }

    .product-stock {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #198754;
      font-size: 0.9rem;
      margin-bottom: 1rem;
    }

    .product-stock.out-of-stock {
      color: #dc3545;
    }

    .btn {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `]
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Output() addToCart = new EventEmitter<Product>();

  getDiscountPercentage(): number {
    if (!this.product.discountPrice || !this.product.price) return 0;
    return Math.round(((this.product.price - this.product.discountPrice) / this.product.price) * 100);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/default-product.svg';
    }
  }
} 