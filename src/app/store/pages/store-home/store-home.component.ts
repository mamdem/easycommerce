import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, BehaviorSubject, Subject, of } from 'rxjs';
import { map, switchMap, tap, take, catchError } from 'rxjs/operators';
import { Store } from '@app/core/models/store.model';
import { Product } from '@app/core/models/product.model';
import { Category } from '@app/core/models/category.model';
import { StoreService } from '@app/core/services/store.service';
import { ProductService } from '@app/core/services/product.service';
import { CartService } from '@app/core/services/cart.service';
import { CategoryService } from '@app/core/services/category.service';
import { StoreNavbarComponent } from '../../components/store-navbar/store-navbar.component';
import { StoreFooterComponent } from '../../components/store-footer/store-footer.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';

@Component({
  selector: 'app-store-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StoreNavbarComponent,
    StoreFooterComponent,
    ProductCardComponent,
    AngularFirestoreModule
  ],
  providers: [CategoryService],
  templateUrl: './store-home.component.html',
  styleUrls: ['./store-home.component.scss']
})
export class StoreHomeComponent implements OnInit, OnDestroy {
  store$!: Observable<Store | null>;
  products$!: Observable<Product[]>;
  categories$!: Observable<Category[]>;
  filteredProducts$!: Observable<Product[]>;
  storeUrl: string = '';
  storeName: string = '';
  loading: boolean = true;
  error: string | null = null;
  searchQuery: string = '';
  sortOption: string = 'name';
  isMobile = window.innerWidth < 768;
  storeStyle: { [key: string]: string } = {};
  selectedCategory: Category | null = null;
  private destroy$ = new Subject<void>();
  private productsSubject = new BehaviorSubject<Product[]>([]);
  minPrice: number = 0;
  maxPrice: number = 1000;
  priceRange: { min: number; max: number } = { min: 0, max: 1000 };

  constructor(
    private storeService: StoreService,
    private productService: ProductService,
    private cartService: CartService,
    private categoryService: CategoryService
  ) {
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  ngOnInit() {
    // Get store URL from current path
    const urlParts = window.location.pathname.split('/');
    const boutiqueIndex = urlParts.indexOf('boutique');
    if (boutiqueIndex !== -1 && urlParts[boutiqueIndex + 1]) {
      this.storeUrl = urlParts[boutiqueIndex + 1];
      this.loadStore();
    }
  }

  private loadStore() {
    if (this.storeUrl) {
      this.loading = true;
      this.error = null;
      this.store$ = this.storeService.getStoreByUrl(this.storeUrl).pipe(
      tap(store => {
        if (store) {
            this.storeName = store.storeName || '';
          this.loading = false;
            this.loadCategories(store.id);
            this.loadProducts(store.id);
        }
      }),
        catchError(err => {
          this.error = 'Une erreur est survenue lors du chargement de la boutique';
        this.loading = false;
          return of(null);
      })
    );
    }
  }

  private loadCategories(storeId: string) {
    this.categories$ = this.categoryService.getStoreCategories(storeId).pipe(
      map((categories: Category[]) => categories.map((category: Category) => ({
        ...category,
        icon: this.getCategoryIcon(category.name)
      })))
    );
    }

  private loadProducts(storeId: string) {
    this.productService.getStoreProducts(storeId).subscribe(products => {
      this.productsSubject.next(products);
      if (products.length > 0) {
        const prices = products.map(p => p.price);
        this.minPrice = Math.floor(Math.min(...prices));
        this.maxPrice = Math.ceil(Math.max(...prices));
        this.priceRange = { min: this.minPrice, max: this.maxPrice };
      }
      this.updateFilteredProducts();
    });
    
    this.products$ = this.productsSubject.asObservable();
    this.updateFilteredProducts();
  }

  private updateFilteredProducts() {
    this.filteredProducts$ = this.products$.pipe(
      map(products => {
        let filtered = [...products];
        
        // Filtre par catégorie
        if (this.selectedCategory) {
          filtered = filtered.filter(product => 
            product.category === this.selectedCategory?.id
          );
        }
        
        // Filtre par recherche
        if (this.searchQuery) {
          const searchLower = this.searchQuery.toLowerCase();
          filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(searchLower) ||
            product.description.toLowerCase().includes(searchLower)
          );
        }

        // Filtre par plage de prix
        filtered = filtered.filter(product => 
          product.price >= this.priceRange.min && 
          product.price <= this.priceRange.max
        );

        // Tri
        const [field, direction] = this.sortOption.startsWith('-') 
          ? [this.sortOption.slice(1), 'desc'] 
          : [this.sortOption, 'asc'];
        
        return filtered.sort((a: any, b: any) => {
          const aValue = a[field];
          const bValue = b[field];
          return direction === 'asc'
            ? aValue > bValue ? 1 : -1
            : aValue < bValue ? 1 : -1;
        });
      })
    );
  }

  selectCategory(category: Category | null) {
    this.selectedCategory = category;
    this.updateFilteredProducts();
  }

  private getCategoryIcon(categoryName: string): string {
    const icons: { [key: string]: string } = {
      'Électronique': 'bi bi-laptop',
      'Mode': 'bi bi-bag',
      'Maison': 'bi bi-house',
      'Sport': 'bi bi-bicycle',
      'Alimentation': 'bi bi-cart4',
      'Beauté': 'bi bi-heart',
      'Livres': 'bi bi-book',
      'Jouets': 'bi bi-controller',
      'Auto': 'bi bi-car-front',
      'Jardin': 'bi bi-flower1'
    };
    
    return icons[categoryName] || 'bi bi-grid';
  }

  onSearch() {
    this.updateFilteredProducts();
  }

  onSort() {
    this.updateFilteredProducts();
  }

  onAddToCart(product: Product) {
    if (product.images && product.images.length > 0) {
      const cartProduct = {
        ...product,
        imageUrl: product.images[0]
      };
      this.cartService.addToCart(cartProduct, this.storeUrl, this.storeName);
    } else {
      this.cartService.addToCart(product, this.storeUrl, this.storeName);
    }
  }

  private updateStoreStyle(store: Store) {
    this.storeStyle = {
      '--store-primary-color': store.primaryColor || '#3498db',
      '--store-secondary-color': store.secondaryColor || '#2ecc71',
      '--store-primary-rgb': this.hexToRgb(store.primaryColor || '#3498db'),
      '--store-secondary-rgb': this.hexToRgb(store.secondaryColor || '#2ecc71'),
      '--store-bg-color': '#ffffff',
      '--store-bg-light': '#f8f9fa',
      '--store-text-color': '#1a1a1a'
    };
  }

  private hexToRgb(hex: string): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
  }

  onPriceRangeChange() {
    this.updateFilteredProducts();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', () => this.checkScreenSize());
  }
} 