import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StoreProductsService } from '../../services/store-products.service';
import { Product } from '../../../core/models/product.model';
import { ToastService } from '../../../core/services/toast.service';
import { CartService } from '../../../core/services/cart.service';
import { CartComponent } from '../cart/cart.component';

@Component({
  selector: 'app-store-view',
  templateUrl: './store-view.component.html',
  styleUrls: ['./store-view.component.scss']
})
export class StoreViewComponent implements OnInit {
  @ViewChild('cartComponent') cartComponent!: CartComponent;
  
  storeUrl: string = '';
  storeData: any = null;
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
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.storeUrl = params['storeUrl'];
      this.storeName = params['storeName'];
      this.loadStoreProducts();
      this.updateCartCount();
    });

    this.cartService.cartItems$.subscribe(() => {
      this.updateCartCount();
    });
  }

  private updateCartCount() {
    this.cartItemsCount = this.cartService.getCartItemsCount(this.storeUrl);
  }

  private loadStoreProducts() {
    this.loading = true;
    this.error = null;

    this.storeProductsService.getProductsByStoreUrl(this.storeUrl)
      .subscribe({
        next: (products) => {
          this.products = products;
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des produits:', err);
          this.error = 'Une erreur est survenue lors du chargement des produits.';
          this.loading = false;
        }
      });
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
    if (!product.id) {
      this.toastService.error('Produit invalide');
      return;
    }

    const cartProduct = {
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrl
    };
    
    this.cartService.addToCart(cartProduct, this.storeUrl, this.storeName);
    this.toastService.success('Produit ajouté au panier');
  }

  viewCart(): void {
    this.router.navigate(['/panier']);
  }
} 