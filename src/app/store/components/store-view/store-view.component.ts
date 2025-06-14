import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreProductsService } from '../../services/store-products.service';
import { Product } from '../../../core/models/product.model';
import { ToastService } from '../../../core/services/toast.service';
import { CartService } from '../../../core/services/cart.service';
import { CartComponent } from '../cart/cart.component';
import { Store } from '../../../services/store.service';
import { StoreService } from '../../../services/store.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-store-view',
  templateUrl: './store-view.component.html',
  styleUrls: ['./store-view.component.scss']
})
export class StoreViewComponent implements OnInit {
  @ViewChild('cartComponent') cartComponent!: CartComponent;
  
  storeUrl: string = '';
  storeData: Store | null = null;
  products: Product[] = [];
  loading: boolean = true;
  error: string | null = null;
  cartItemsCount: number = 0;
  storeName: string = '';

  constructor(
    private route: ActivatedRoute,
    private storeProductsService: StoreProductsService,
    private cartService: CartService,
    private toastService: ToastService,
    private router: Router,
    private storeService: StoreService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.storeUrl = params['storeUrl'];
      this.loadStoreData();
    });

    this.cartService.cartItems$.subscribe(() => {
      this.updateCartCount();
    });
  }

  private loadStoreData() {
    this.loading = true;
    this.storeService.getStores(this.storeUrl).pipe(
      map(stores => stores.find(store => store.id === this.storeUrl))
    ).subscribe({
      next: (store: Store | undefined) => {
        if (store) {
          this.storeData = store;
          this.storeName = store.name;
          this.loadProducts();
          this.updateCartCount();
        } else {
          this.error = 'Boutique non trouvée';
          this.loading = false;
        }
      },
      error: (error: Error) => {
        console.error('Erreur lors du chargement de la boutique:', error);
        this.error = 'Erreur lors du chargement de la boutique';
        this.loading = false;
      }
    });
  }

  private loadProducts() {
    this.storeProductsService.getProductsByStoreUrl(this.storeUrl).subscribe({
      next: (products: Product[]) => {
        this.products = products;
        this.loading = false;
      },
      error: (error: Error) => {
        console.error('Erreur lors du chargement des produits:', error);
        this.error = 'Erreur lors du chargement des produits';
        this.loading = false;
      }
    });
  }

  private updateCartCount() {
    this.cartItemsCount = this.cartService.getCartItemsCount(this.storeUrl);
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img.src.includes('default-store-banner.svg')) {
      img.style.display = 'none';
    } else if (img.src.includes('default-store-logo.png')) {
      img.src = 'assets/default-store-logo.png';
    } else {
      img.src = img.src.includes('banner') ? 'assets/default-store-banner.svg' : 'assets/default-store-logo.png';
    }
  }

  onAddToCart(product: Product) {
    this.cartService.addToCart(product, this.storeUrl, this.storeName);
    this.updateCartCount();
    this.toastService.success('Produit ajouté au panier');
  }

  viewCart(): void {
    this.router.navigate(['/panier']);
  }
} 