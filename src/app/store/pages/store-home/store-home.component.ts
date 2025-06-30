import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { Observable, BehaviorSubject, Subject, of, combineLatest } from 'rxjs';
import { map, switchMap, tap, take, catchError, finalize, takeUntil } from 'rxjs/operators';
import { Store } from '../../../core/models/store.model';
import { Product } from '@app/core/models/product.model';
import { Category } from '@app/core/models/category.model';
import { StoreService, StoreData } from '../../../core/services/store.service';
import { ProductService } from '@app/core/services/product.service';
import { CartService } from '@app/core/services/cart.service';
import { CategoryService } from '../../../core/services/category.service';
import { PriceService } from '../../../core/services/price.service';
import { PromotionService, Promotion } from '../../../core/services/promotion.service';
import { StoreNavbarComponent } from '../../components/store-navbar/store-navbar.component';
import { StoreFooterComponent } from '../../components/store-footer/store-footer.component';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import * as AOS from 'aos';
import localeFr from '@angular/common/locales/fr';

// Enregistrement de la locale française
registerLocaleData(localeFr, 'fr-FR');

interface ProductWithPromotion extends Product {
  originalPrice: number;
  discountedPrice: number | null;
  promotion: Promotion | null;
  promotionId?: string;
}

@Component({
  selector: 'app-store-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StoreNavbarComponent,
    StoreFooterComponent,
    AngularFirestoreModule
  ],
  providers: [CategoryService, PriceService, PromotionService],
  templateUrl: './store-home.component.html',
  styleUrls: ['./store-home.component.scss']
})
export class StoreHomeComponent implements OnInit, OnDestroy {
  store$!: Observable<Store | null>;
  products$!: Observable<ProductWithPromotion[]>;
  categories$!: Observable<Category[]>;
  storeUrl: string = '';
  storeName: string = '';
  loading: boolean = true;
  error: string | null = null;
  isMobile = window.innerWidth < 768;
  storeStyle: { [key: string]: string } = {};
  private destroy$ = new Subject<void>();
  private productsSubject = new BehaviorSubject<ProductWithPromotion[]>([]);
  private filteredProductsSubject = new BehaviorSubject<ProductWithPromotion[]>([]);
  filteredProducts$ = this.filteredProductsSubject.asObservable();

  // Filtres
  searchQuery: string = '';
  sortOption: string = 'name';
  selectedCategory: Category | null = null;
  priceRange = {
    min: 0,
    max: 0
  };
  private categoryMap: Map<string, Category> = new Map();
  categories: Category[] = [];

  // Modification des prix par défaut
  minPrice: number = 0;
  maxPrice: number = 0;

  constructor(
    private firestore: AngularFirestore,
    private storeService: StoreService,
    private productService: ProductService,
    private cartService: CartService,
    private categoryService: CategoryService,
    private priceService: PriceService,
    private promotionService: PromotionService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  ngOnInit() {
    AOS.init({
      startEvent: 'DOMContentLoaded',
      duration: 800,
      easing: 'ease-out',
      once: true,
      offset: 100,
      delay: 0,
      disable: false,
      mirror: false,
      anchorPlacement: 'top-bottom'
    });

    window.addEventListener('scroll', () => {
      AOS.refresh();
    });

    const urlParts = window.location.pathname.split('/');
    const boutiqueIndex = urlParts.indexOf('boutique');
    if (boutiqueIndex !== -1 && urlParts[boutiqueIndex + 1]) {
      this.storeUrl = urlParts[boutiqueIndex + 1];
      this.loadStoreData();
    } else {
      console.error('Impossible de trouver l\'URL de la boutique dans le chemin:', window.location.pathname);
      this.error = 'URL de boutique invalide';
      this.loading = false;
    }
  }

  private loadStoreData() {
      this.loading = true;
      this.error = null;
      
    this.firestore.collection('urls').doc(this.storeUrl).valueChanges()
      .pipe(
        take(1),
        tap(urlDoc => {
          console.log('🔍 Document URL trouvé:', urlDoc);
        }),
        switchMap(urlDoc => {
          if (!urlDoc) {
            throw new Error('Boutique non trouvée');
          }
          const { userId, storeId } = urlDoc as { userId: string; storeId: string };
          console.log('🔑 UserId et StoreId récupérés:', { userId, storeId });

          const storePath = `stores/${userId}/userStores/${storeId}`;
          
          // Récupérer les données de la boutique
          return combineLatest([
            this.firestore.doc(`${storePath}`).valueChanges() as Observable<Store>,
            this.firestore.collection(`${storePath}/categories`).valueChanges({ idField: 'id' }),
            this.firestore.collection(`${storePath}/products`).valueChanges({ idField: 'id' }),
            this.firestore.collection(`${storePath}/promotions`).valueChanges({ idField: 'id' })
          ]).pipe(
            take(1),
            map(([store, categories, products, promotions]) => {
              // Filtrer les promotions actives
              const now = Date.now();
              const activePromotions = (promotions as Promotion[]).filter(promo => 
                promo.actif && 
                promo.dateDebut <= now && 
                promo.dateFin >= now &&
                (!promo.utilisationsMax || promo.utilisationsActuelles < promo.utilisationsMax)
              );
              
              console.log('📦 Données récupérées:', {
                store,
                categoriesCount: categories.length,
                productsCount: products.length,
                promotions: {
                  total: promotions.length,
                  active: activePromotions.length
          }
              });

              return {
                store: { ...store, id: storeId } as Store,
                categories: categories as Category[],
                products: products as Product[],
                promotions: activePromotions
              };
        })
      );
        }),
        takeUntil(this.destroy$)
      ).subscribe({
        next: ({ store, categories, products, promotions }) => {
          console.log('✅ Données chargées avec succès');
          
          this.storeName = store.storeName;
          this.updateStoreStyle(store);
          this.store$ = of(store);

          // Mise à jour des catégories
        this.categories = categories;
          categories.forEach(cat => this.categoryMap.set(cat.id, cat));
          this.categories$ = of(categories);

          // Traitement des produits avec promotions
          const productsWithPromo = products.map(product => {
            // Vérifier si le produit a un ID et une catégorie valides
            if (!product.id || !product.category) {
              console.warn('⚠️ Produit invalide trouvé:', product);
                return {
                  ...product,
                  originalPrice: product.price,
                discountedPrice: null,
                promotion: null
              } as ProductWithPromotion;
            }

            const productId = product.id; // On sait que l'ID existe grâce à la vérification précédente

            // Trouver la promotion applicable
            const applicablePromotion = promotions.find(promo => {
              // Vérifier si la promotion s'applique au produit
              switch (promo.applicationScope) {
                case 'PANIER_ENTIER':
                  return true;
                case 'PRODUITS':
                  return Array.isArray(promo.produitIds) && promo.produitIds.includes(productId);
                case 'CATEGORIES':
                  return Array.isArray(promo.categorieIds) && promo.categorieIds.includes(product.category);
                default:
                  return false;
              }
            });

            let discountedPrice = null;
            if (applicablePromotion) {
              // Calculer le prix avec promotion
              if (applicablePromotion.type === 'REDUCTION_PRODUIT' || applicablePromotion.type === 'CODE_PROMO') {
                // Réduction en pourcentage
                discountedPrice = product.price * (1 - (applicablePromotion.reduction / 100));
              } else if (applicablePromotion.type === 'OFFRE_LIMITEE') {
                // Réduction en montant fixe
                discountedPrice = Math.max(0, product.price - applicablePromotion.reduction);
              }

              // Arrondir le prix avec 2 décimales
              if (discountedPrice !== null) {
                discountedPrice = Math.round(discountedPrice * 100) / 100;
              }

              console.log(`🏷️ Promotion appliquée au produit ${product.name}:`, {
                originalPrice: product.price,
                promotion: {
                  nom: applicablePromotion.nom,
                  type: applicablePromotion.type,
                  reduction: applicablePromotion.reduction,
                  scope: applicablePromotion.applicationScope
                },
                discountedPrice
              });
            }

            return {
              ...product,
              originalPrice: product.price,
              discountedPrice: discountedPrice,
              promotion: applicablePromotion || null,
              promotionId: applicablePromotion?.id
            } as ProductWithPromotion;
          });

          console.log('🛍️ Résumé des produits:', {
            total: productsWithPromo.length,
            avecPromo: productsWithPromo.filter(p => p.promotion).length,
            sansPromo: productsWithPromo.filter(p => !p.promotion).length
          });

          this.productsSubject.next(productsWithPromo);
          this.products$ = this.productsSubject.asObservable();
          this.filterProducts();

          // Mise à jour des limites de prix absolues
          if (products.length > 0) {
            const prices = productsWithPromo.map(p => p.discountedPrice || p.price);
            this.minPrice = Math.min(...prices);
            this.maxPrice = Math.max(...prices);
          }

        this.loading = false;
      },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des données:', error);
          this.error = error.message || 'Une erreur est survenue lors du chargement des données';
        this.loading = false;
      }
      });
  }

  private filterProducts() {
    if (!this.productsSubject.value) return;

    const products = this.productsSubject.value;
    console.log('🔍 Filtrage des produits:', {
      total: products.length,
      recherche: this.searchQuery,
      categorie: this.selectedCategory?.name || 'Toutes',
      prix: this.priceRange
    });

    const filtered = products.filter(product => {
          // Filtre par catégorie
      const matchesCategory = !this.selectedCategory || product.category === this.selectedCategory.id;
          
      // Filtre par recherche (nom ou description)
      const searchLower = this.searchQuery.toLowerCase().trim();
      const matchesSearch = !searchLower || 
        product.name.toLowerCase().includes(searchLower) ||
        (product.description && product.description.toLowerCase().includes(searchLower));
          
      // Filtre par prix - si min et max sont 0, on affiche tout
      const price = product.discountedPrice || product.price;
      const matchesPrice = (this.priceRange.min === 0 && this.priceRange.max === 0) ||
        (price >= this.priceRange.min && price <= this.priceRange.max);

      return matchesCategory && matchesSearch && matchesPrice;
    });

    // Tri des produits
    const sorted = this.sortProducts(filtered);

    console.log('✅ Résultat du filtrage:', {
      avant: products.length,
      apres: sorted.length,
      criteres: {
        recherche: this.searchQuery || 'aucune',
        categorie: this.selectedCategory?.name || 'toutes',
        prixMin: this.priceRange.min,
        prixMax: this.priceRange.max
      }
    });

    this.filteredProductsSubject.next(sorted);
  }

  private sortProducts(products: ProductWithPromotion[]): ProductWithPromotion[] {
    return [...products].sort((a, b) => {
      const priceA = a.discountedPrice || a.price;
      const priceB = b.discountedPrice || b.price;

          switch (this.sortOption) {
        case 'price': // Tri par prix croissant
          return priceA - priceB;
        case '-price': // Tri par prix décroissant
          return priceB - priceA;
        case 'name': // Tri par nom A-Z
              return a.name.localeCompare(b.name);
        case '-name': // Tri par nom Z-A
          return b.name.localeCompare(a.name);
            default:
              return 0;
          }
        });
  }

  // Gestionnaires d'événements pour les filtres
  onSearch() {
    console.log('🔎 Recherche:', this.searchQuery);
    this.filterProducts();
  }

  onSort() {
    console.log('📊 Tri:', this.sortOption);
    this.filterProducts();
  }

  selectCategory(category: Category | null) {
    console.log('📂 Sélection catégorie:', category?.name || 'Toutes');
    this.selectedCategory = category;
    this.filterProducts();
  }

  onPriceRangeChange() {
    console.log('💰 Changement de prix:', this.priceRange);
    // Validation des valeurs
    if (this.priceRange.min < 0) this.priceRange.min = 0;
    if (this.priceRange.max < this.priceRange.min && this.priceRange.max !== 0) {
      this.priceRange.max = this.priceRange.min;
  }
    this.filterProducts();
  }

  // Réinitialiser les filtres
  resetFilters() {
    this.searchQuery = '';
    this.sortOption = 'name';
    this.selectedCategory = null;
    this.priceRange = {
      min: 0,
      max: 0 // Remis à 0 pour tout afficher
    };
    this.filterProducts();
  }

  // Méthodes utilitaires
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

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Catégorie inconnue';
  }

  isProductInCart(product: ProductWithPromotion): boolean {
    if (!product.id) return false;
    return this.cartService.isProductInCart(product.id, this.storeUrl);
  }

  getCartButtonLabel(product: ProductWithPromotion): string {
    if (product.stock === 0) {
      return 'Rupture de stock';
    }
    return this.isProductInCart(product) ? 'Déjà dans le panier' : 'Ajouter au panier';
  }

  onAddToCart(product: ProductWithPromotion): void {
    if (product.stock === 0 || !product.id) return;
    
    if (this.isProductInCart(product)) {
      // Optionnel : Vous pouvez ajouter une logique pour retirer du panier
      // this.cartService.removeFromCart(product.id);
      return;
    }

    this.cartService.addToCart(product, this.storeUrl, this.storeName);
  }

  // Ajout de la méthode reloadStore
  reloadStore(): void {
    this.loadStoreData();
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/default-product.svg';
  }

  viewProductDetails(product: Product): void {
    this.router.navigate([product.id], { relativeTo: this.route });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    window.removeEventListener('resize', () => this.checkScreenSize());
    window.removeEventListener('scroll', () => {
      AOS.refresh();
    });
  }
} 