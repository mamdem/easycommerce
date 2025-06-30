import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest } from 'rxjs';
import { map, take } from 'rxjs/operators';

import { ProductService } from '../../../../../core/services/product.service';
import { StoreService } from '../../../../../core/services/store.service';
import { CategoryService } from '../../../../../core/services/category.service';
import { CartService } from '../../../../../core/services/cart.service';
import { PriceService } from '../../../../../core/services/price.service';
import { PromotionService, Promotion } from '../../../../../core/services/promotion.service';
import { ProductCardComponent, ProductWithPromotion } from '../../../../../shared/components/product-card/product-card.component';

@Component({
  selector: 'app-store-home',
  templateUrl: './store-home.component.html',
  styleUrls: ['./store-home.component.scss'],
  standalone: true,
  imports: [CommonModule, ProductCardComponent]
})
export class StoreHomeComponent implements OnInit {
  products$!: Observable<ProductWithPromotion[]>;
  categoryMap: Map<string, string> = new Map();
  loading = true;

  constructor(
    private productService: ProductService,
    private storeService: StoreService,
    private categoryService: CategoryService,
    private cartService: CartService,
    private promotionService: PromotionService,
    private priceService: PriceService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadCategories();
  }

  private loadProducts(): void {
    this.loading = true;
    this.storeService.getSelectedStore().pipe(take(1)).subscribe({
      next: (store) => {
        if (!store) return;
        
        // Charger les promotions et les produits
        const promotions$ = this.promotionService.getPromotions(store.id!);
        const products$ = this.productService.getStoreProducts(store.id!);

        // Combiner les produits avec leurs promotions
        this.products$ = combineLatest([products$, promotions$]).pipe(
          map(([products, promotions]) => {
            return products.map(product => ({
              ...product,
              discountedPrice: this.priceService.calculateDiscountedPrice(product, promotions),
              activePromotion: this.priceService.getApplicablePromotion(product, promotions)
            }));
          })
        );

        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des produits:', error);
        this.loading = false;
      }
    });
  }

  private loadCategories(): void {
    this.storeService.getSelectedStore().pipe(take(1)).subscribe({
      next: (store) => {
        if (!store) return;
        
        this.categoryService.getStoreCategories(store.id!).pipe(take(1)).subscribe({
          next: (categories) => {
            this.categoryMap.clear();
            categories.forEach(cat => this.categoryMap.set(cat.id, cat.name));
          },
          error: (error) => {
            console.error('Erreur lors du chargement des catégories:', error);
          }
        });
      },
      error: (error) => {
        console.error('Erreur lors du chargement du store:', error);
      }
    });
  }

  getCategoryName(categoryId: string): string {
    return this.categoryMap.get(categoryId) || 'Non catégorisé';
  }

  addToCart(product: ProductWithPromotion): void {
    this.storeService.getSelectedStore().pipe(take(1)).subscribe({
      next: (store) => {
        if (!store) return;
        
        this.cartService.addToCart(
          product,
          store.id,
          store.storeName,
          1 // quantité par défaut
        );
      },
      error: (error: Error) => {
        console.error('Erreur lors de l\'ajout au panier:', error);
      }
    });
  }
} 