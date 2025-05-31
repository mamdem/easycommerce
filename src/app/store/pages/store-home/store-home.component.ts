import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, finalize, map, of, switchMap, tap } from 'rxjs';
import { Store } from '../../../core/models/store.model';
import { Product } from '../../../core/models/product.model';
import { StoreService } from '../../../core/services/store.service';
import { ProductService } from '../../../core/services/product.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-store-home',
  templateUrl: './store-home.component.html',
  styles: [`
    .store-container {
      min-height: 100vh;
      background: #f8f9fa;
    }

    .store-header {
      margin-bottom: 2rem;
    }

    .store-banner {
      height: 300px;
      background-size: cover;
      background-position: center;
      position: relative;
      display: flex;
      align-items: flex-end;
      padding: 2rem;
      background-color: #e9ecef;
    }

    .store-banner::before {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50%;
      background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
    }

    .store-info {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: 2rem;
      color: white;
    }

    .store-logo {
      width: 120px;
      height: 120px;
      border-radius: 12px;
      object-fit: cover;
      border: 4px solid white;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .store-details h1 {
      margin: 0;
      font-size: 2.5rem;
      font-weight: 600;
    }

    .store-details p {
      margin: 0.5rem 0 0;
      font-size: 1.1rem;
      opacity: 0.9;
    }

    .store-content {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
    }

    .products-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .products-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .products-count {
      color: #6c757d;
      font-size: 0.9rem;
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .no-products {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .no-products i {
      font-size: 3rem;
      color: #6c757d;
      margin-bottom: 1rem;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
    }

    @media (max-width: 768px) {
      .store-banner {
        height: auto;
        padding: 1rem;
      }

      .store-info {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .store-logo {
        width: 100px;
        height: 100px;
      }

      .store-details h1 {
        font-size: 1.8rem;
      }

      .store-details p {
        font-size: 1rem;
      }
    }
  `]
})
export class StoreHomeComponent implements OnInit {
  store$!: Observable<Store | null>;
  products$!: Observable<Product[]>;
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storeService: StoreService,
    private productService: ProductService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const storeUrl = this.route.snapshot.params['storeUrl'];
    console.log('URL de la boutique:', storeUrl);

    if (!storeUrl) {
      this.error = 'URL de boutique non valide';
      this.loading = false;
      return;
    }

    // Récupérer la boutique
    this.store$ = this.storeService.getStoreByUrl(storeUrl).pipe(
      tap(store => {
        if (store) {
          console.log('Boutique trouvée:', store);
          // Une fois la boutique trouvée, charger les produits
          this.loadProducts(store);
        } else {
          console.log('Aucune boutique trouvée');
          this.error = 'Boutique introuvable';
          this.loading = false;
        }
      }),
      catchError(error => {
        console.error('Erreur lors du chargement de la boutique:', error);
        this.error = 'Erreur lors du chargement de la boutique';
        this.loading = false;
        return of(null);
      })
    );
  }

  private loadProducts(store: Store): void {
    if (!store.id) {
      console.error('ID de boutique manquant');
      this.error = 'Erreur lors du chargement des produits';
      this.loading = false;
      return;
    }

    this.products$ = this.productService.getStoreProducts(store.id).pipe(
      tap(products => {
        console.log('Produits chargés:', products);
        this.loading = false;
      }),
      catchError(error => {
        console.error('Erreur lors du chargement des produits:', error);
        this.error = 'Erreur lors du chargement des produits';
        this.loading = false;
        return of([]);
      })
    );
  }

  onAddToCart(product: Product): void {
    // TODO: Implémenter la logique du panier
    this.toastService.success(`${product.name} ajouté au panier`);
  }
} 