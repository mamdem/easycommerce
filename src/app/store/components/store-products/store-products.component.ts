import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { ProductCardComponent } from '../product-card/product-card.component';
import { Product } from '../../../core/models/product.model';

@Component({
  selector: 'app-store-products',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, MatButtonModule, ProductCardComponent],
  template: `
    <div class="store-products">
      <div *ngIf="loading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Chargement des produits...</p>
      </div>

      <div *ngIf="!loading" class="products-grid">
        <div *ngIf="products.length === 0" class="no-products">
          <p>Aucun produit disponible dans cette boutique.</p>
        </div>

        <div *ngFor="let product of products" class="product-card-container">
          <app-product-card
            [product]="mapToProductCard(product)"
            (addToCart)="onAddToCart($event)">
          </app-product-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .store-products {
      padding: 2rem;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      gap: 1rem;

      p {
        color: #666;
        font-size: 1.1rem;
      }
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 2rem;
      padding: 1rem;
    }

    .no-products {
      text-align: center;
      grid-column: 1 / -1;
      padding: 2rem;
      
      p {
        color: #666;
        font-size: 1.2rem;
        margin: 0;
      }
    }

    .product-card-container {
      width: 100%;
    }
  `]
})
export class StoreProductsComponent implements OnInit {
  @Input() storeId!: string;
  @Input() products: Product[] = [];
  @Input() loading: boolean = true;

  ngOnInit() {
    // Le loading sera géré par le composant parent
  }

  mapToProductCard(product: Product): Product {
    return {
      ...product,
      images: product.images?.length ? product.images : ['/assets/images/placeholder.png']
    };
  }

  onAddToCart(product: Product) {
    // TODO: Implémenter la logique du panier
    console.log('Produit ajouté au panier:', product);
  }
} 