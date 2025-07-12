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
import { NabooPayService } from '../../../core/services/naboo-pay.service';
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

  // Statut de l'abonnement
  isSubscriptionActive: boolean = false;
  isSubscriptionExpired: boolean = false;
  isSubscriptionLoading: boolean = true;

  // Période d'essai
  isTrialPeriod: boolean = false;
  trialDaysLeft: number = 0;
  
  // Propriété pour savoir si la boutique est accessible (période d'essai OU abonnement actif)
  get isStoreAccessible(): boolean {
    return this.isTrialPeriod || this.isSubscriptionActive;
  }

  // Gestion des erreurs d'images
  logoLoadError: boolean = false;

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
    private nabooPayService: NabooPayService,
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
      this.isSubscriptionLoading = true;
      this.logoLoadError = false; // Réinitialiser l'erreur de logo
      
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
            this.firestore.doc(storePath).valueChanges() as Observable<Store>,
            this.firestore.collection(`${storePath}/categories`).valueChanges({ idField: 'id' }) as Observable<Category[]>,
            this.firestore.collection(`${storePath}/products`).valueChanges({ idField: 'id' }) as Observable<Product[]>,
            this.firestore.collection(`${storePath}/promotions`).valueChanges({ idField: 'id' }) as Observable<Promotion[]>
          ]).pipe(
            take(1),
            map(([store, categories, products, promotions]) => {
              console.log('📦 Données brutes récupérées:', {
                store,
                categories: categories.length,
                products: products.length,
                promotions: promotions.length
              });

              // Vérifier le statut de l'abonnement sans le mettre à jour
              if (store && store.currentTransaction?.orderId) {
                this.checkSubscriptionStatus(store.currentTransaction.orderId);
              } else {
                // Pas de transaction en cours, mais la boutique pourrait être en période d'essai
                this.isSubscriptionActive = false;
                this.isSubscriptionExpired = false;
                this.isSubscriptionLoading = false;
              }

              // Calculer les informations de période d'essai
              this.calculateTrialPeriod(store);

              // Filtrer les promotions actives
              const now = Date.now();
              const activePromotions = (promotions as Promotion[]).filter(promo => 
                promo.actif && 
                promo.dateDebut <= now && 
                promo.dateFin >= now &&
                (!promo.utilisationsMax || promo.utilisationsActuelles < promo.utilisationsMax)
              );
              
              // Stocker les catégories dans le Map pour un accès rapide
              this.categories = categories;
              this.categoryMap.clear();
              categories.forEach(cat => this.categoryMap.set(cat.id, cat));

              // Traiter les produits avec les promotions
              const processedProducts = this.processProducts(products, activePromotions);
              console.log('✨ Produits traités:', processedProducts.length);
              
              // Mettre à jour les sujets
              this.productsSubject.next(processedProducts);
              this.products$ = this.productsSubject.asObservable();
              
              // Initialiser les filtres
              this.initializeFilters(processedProducts);
              
              // Mettre à jour les produits filtrés
              this.filterProducts();

              return {
                store: { ...store, id: storeId } as Store,
                categories: categories as Category[],
                products: processedProducts,
                promotions: activePromotions
              };
        })
      );
        }),
        takeUntil(this.destroy$)
      ).subscribe({
        next: ({ store, categories }) => {
          console.log('✅ Données chargées avec succès');
          
          this.storeName = store.storeName;
          this.updateStoreStyle(store);
          this.store$ = of(store);
          this.categories$ = of(categories);

          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des données:', error);
          this.error = 'Une erreur est survenue lors du chargement de la boutique';
          this.loading = false;
          this.isSubscriptionLoading = false;
        }
      });
  }

  private initializeFilters(products: ProductWithPromotion[]) {
    if (products.length > 0) {
      const prices = products.map(p => p.discountedPrice || p.price);
      this.minPrice = Math.min(...prices);
      this.maxPrice = Math.max(...prices);
      this.priceRange = {
        min: this.minPrice,
        max: this.maxPrice
      };
    }
  }

  private checkSubscriptionStatus(transactionId: string) {
    if (!transactionId) {
      this.isSubscriptionActive = false;
      this.isSubscriptionLoading = false;
      return;
    }

    this.nabooPayService.getTransactionDetails(transactionId).pipe(
      catchError(error => {
        console.error('❌ Erreur lors de la vérification de la transaction:', error);
        return of(null);
      })
    ).subscribe({
      next: (response) => {
        if (!response) {
          this.isSubscriptionActive = false;
          this.isSubscriptionExpired = true;
          this.isSubscriptionLoading = false;
          return;
        }

        const paymentDate = new Date(response.created_at);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - paymentDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        this.isSubscriptionExpired = diffDays > 30;
        this.isSubscriptionActive = response.transaction_status === 'paid' && !this.isSubscriptionExpired;
        this.isSubscriptionLoading = false;

        console.log('💳 Vérification du statut de l\'abonnement:', {
          transactionId,
          status: response.transaction_status,
          daysElapsed: diffDays,
          isActive: this.isSubscriptionActive,
          isExpired: this.isSubscriptionExpired
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors de la vérification du statut de l\'abonnement:', error);
        this.isSubscriptionActive = false;
        this.isSubscriptionLoading = false;
      }
    });
  }

  /**
   * Calcule les informations de période d'essai pour la boutique
   */
  private calculateTrialPeriod(store: Store): void {
    if (store?.createdAt) {
      const creationDate = new Date(store.createdAt);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - creationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      this.isTrialPeriod = diffDays <= 15;
      this.trialDaysLeft = Math.max(15 - diffDays, 0);
      
      console.log('🕐 Calcul de la période d\'essai:', {
        creationDate,
        daysElapsed: diffDays,
        isTrialPeriod: this.isTrialPeriod,
        trialDaysLeft: this.trialDaysLeft
      });
    }
  }

  private processProducts(products: Product[], promotions: Promotion[]): ProductWithPromotion[] {
    return products.map(product => {
            // Vérifier si le produit a un ID et une catégorie valides
            if (!product.id || !product.category) {
              console.warn('⚠️ Produit invalide trouvé:', product);
                return {
                  ...product,
                  originalPrice: product.price,
                discountedPrice: null,
                promotion: null
        };
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
    const category = this.categoryMap.get(categoryId);
    return category ? category.name : 'Non catégorisé';
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

  onLogoError(event: Event) {
    this.logoLoadError = true;
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