import { Component, OnInit, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { Store } from '../../../core/models/store.model';
import { Product } from '../../../core/models/product.model';
import { StoreService } from '../../../core/services/store.service';
import { ProductService } from '../../../core/services/product.service';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { ToastService } from '../../../core/services/toast.service';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';

@Component({
  selector: 'app-store-home',
  templateUrl: './store-home.component.html',
  styleUrls: ['./store-home.component.scss'],
  standalone: false
})
export class StoreHomeComponent implements OnInit {
  isMobile: boolean = false;
  isMenuOpen: boolean = false;
  store$!: Observable<Store | null>;
  products$!: Observable<Product[]>;
  categories$!: Observable<string[]>;
  loading = true;
  error: string | null = null;
  cartItemsCount = 0;
  storeUrl: string = '';
  storeName: string = '';
  storeStyle: SafeStyle | null = null;

  // Filtres et tri
  searchQuery = '';
  sortOption = 'name';
  selectedCategory: string | null = null;
  private searchSubject = new BehaviorSubject<string>('');
  private sortSubject = new BehaviorSubject<string>('name');
  private categorySubject = new BehaviorSubject<string | null>(null);

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private storeService: StoreService,
    private productService: ProductService,
    private cartService: CartService,
    private toastService: ToastService,
    private sanitizer: DomSanitizer
  ) {
    this.checkScreenSize();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScreenSize();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.isMenuOpen = false;
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.storeUrl = params['storeUrl'];
      this.updateCartCount();
    });

    const storeUrl = this.route.snapshot.params['storeUrl'];

    if (!storeUrl) {
      this.error = 'URL de boutique non valide';
      this.loading = false;
      return;
    }

    // Récupérer la boutique
    this.store$ = this.storeService.getStoreByUrl(storeUrl).pipe(
      tap(store => {
        if (store) {
          this.storeName = store.storeName;
          this.loadProducts(store);
          this.loadCategories(store);
          this.updateStoreStyle(store);
        } else {
          this.error = 'Boutique introuvable';
          this.loading = false;
        }
      }),
      catchError(error => {
        console.error('Erreur lors du chargement de la boutique:', error);
        this.error = 'Erreur lors du chargement de la boutique';
        this.loading = false;
        return [];
      })
    );
  }

  private loadProducts(store: Store): void {
    if (!store.id) {
      this.error = 'Erreur lors du chargement des produits';
      this.loading = false;
      return;
    }

    // Combiner les filtres et le tri
    this.products$ = combineLatest([
      this.productService.getStoreProducts(store.id),
      this.searchSubject,
      this.sortSubject,
      this.categorySubject
    ]).pipe(
      map(([products, search, sort, category]) => {
        let filtered = products;

        // Filtrer par recherche
        if (search) {
          const searchLower = search.toLowerCase();
          filtered = filtered.filter(product =>
            product.name.toLowerCase().includes(searchLower) ||
            product.description.toLowerCase().includes(searchLower)
          );
        }

        // Filtrer par catégorie
        if (category) {
          filtered = filtered.filter(product => product.category === category);
        }

        // Trier les produits
        const [field, direction] = sort.startsWith('-') ? [sort.slice(1), 'desc'] : [sort, 'asc'];
        filtered.sort((a: any, b: any) => {
          const aValue = a[field];
          const bValue = b[field];
          return direction === 'asc'
            ? aValue > bValue ? 1 : -1
            : aValue < bValue ? 1 : -1;
        });

        return filtered;
      }),
      tap(() => this.loading = false)
    );
  }

  private loadCategories(store: Store): void {
    if (!store.id) return;

    this.categories$ = this.productService.getStoreProducts(store.id).pipe(
      map(products => {
        const categories = new Set(products.map(p => p.category));
        return Array.from(categories).sort();
      })
    );
  }

  private updateCartCount(): void {
    this.cartItemsCount = this.cartService.getCartItemsCount(this.storeUrl);
  }

  // Actions utilisateur
  onSearch(): void {
    this.searchSubject.next(this.searchQuery);
  }

  onSort(): void {
    this.sortSubject.next(this.sortOption);
  }

  filterByCategory(category: string): void {
    this.selectedCategory = this.selectedCategory === category ? null : category;
    this.categorySubject.next(this.selectedCategory);
  }

  onAddToCart(product: Product): void {
    if (!product.id) {
      this.toastService.error('Produit invalide');
      return;
    }

    const cartProduct: Product = {
      id: product.id,
      name: product.name,
      price: product.price,
      description: product.description,
      category: product.category,
      stock: product.stock,
      images: product.images,
      storeId: product.storeId,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt
    };
    
    this.cartService.addToCart(cartProduct, this.storeUrl, this.storeName);
    this.toastService.success('Produit ajouté au panier');
    this.updateCartCount();
  }

  viewCart(): void {
    this.router.navigate(['cart'], { 
      relativeTo: this.route
    });
  }

  getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Électronique': 'bi-laptop',
      'Mode': 'bi-bag',
      'Maison': 'bi-house',
      'Sport': 'bi-bicycle',
      'Alimentation': 'bi-cup-hot',
      'Beauté': 'bi-heart',
      'Livres': 'bi-book',
      'Jeux': 'bi-controller',
      'Auto': 'bi-car-front',
      'Jardin': 'bi-flower1'
    };
    return icons[category] || 'bi-tag';
  }

  private updateStoreStyle(store: Store): void {
    if (store.primaryColor && store.secondaryColor) {
      const primaryRgb = this.hexToRgb(store.primaryColor);
      const secondaryRgb = this.hexToRgb(store.secondaryColor);

      this.storeStyle = this.sanitizer.bypassSecurityTrustStyle(
        `--primary-color: ${store.primaryColor}; 
         --secondary-color: ${store.secondaryColor};
         --primary-rgb: ${primaryRgb};
         --secondary-rgb: ${secondaryRgb};`
      );
    }
  }

  private hexToRgb(hex: string): string {
    // Enlever le # si présent
    hex = hex.replace('#', '');
    
    // Convertir en RGB
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
  }
} 