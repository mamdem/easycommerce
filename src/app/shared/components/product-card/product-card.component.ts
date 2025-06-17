import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../../core/models/product.model';
import { Promotion } from '../../../core/services/promotion.service';

export interface ProductWithPromotion extends Product {
  discountedPrice?: number | null;
  activePromotion?: Promotion | null;
}

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="product-card" [class.out-of-stock]="product.stock === 0">
      <div class="product-image">
        <img [src]="product.images[0] || 'assets/default-product.svg'" 
             [alt]="product.name"
             (error)="onImageError($event)">
        
        <!-- Badge promotion -->
        <div class="product-badges" *ngIf="product.activePromotion">
          <div class="discount-badge">
            <i class="bi bi-tag-fill"></i>
            -{{ getDiscountPercentage() }}%
          </div>
        </div>

        <!-- Actions -->
        <ng-content select="[slot=actions]"></ng-content>
      </div>

      <div class="product-info">
        <div>
          <span class="category-tag" *ngIf="product.category">
            <i class="bi bi-bookmark"></i>
            {{ categoryName }}
          </span>

          <h3 class="product-name">{{ product.name }}</h3>
          
          <div class="product-price">
            <span class="current-price" [class.discounted]="product.discountedPrice">
              {{ product.price | number:'1.0-0' }} FCFA
            </span>
            <span class="discount-price" *ngIf="product.discountedPrice">
              {{ product.discountedPrice | number:'1.0-0' }} FCFA
            </span>
          </div>

          <!-- Description (optionnelle) -->
          <p class="product-description" *ngIf="showDescription">
            {{ product.description }}
          </p>
        </div>

        <div>
          <div class="product-stock" [class.out-of-stock]="product.stock === 0">
            <i class="bi" [ngClass]="product.stock > 0 ? 'bi-check-circle' : 'bi-x-circle'"></i>
            {{ product.stock > 0 ? product.stock + ' en stock' : 'Rupture de stock' }}
          </div>

          <!-- Actions supplémentaires -->
          <ng-content select="[slot=additional-actions]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./product-card.component.scss']
})
export class ProductCardComponent {
  @Input() product!: ProductWithPromotion;
  @Input() categoryName: string = '';
  @Input() showDescription: boolean = false;

  getDiscountPercentage(): number {
    if (!this.product.activePromotion) return 0;
    return this.product.activePromotion.reduction;
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/default-product.svg';
  }
} 