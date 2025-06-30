import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Observable, map, firstValueFrom, combineLatest, of, switchMap } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { trigger, transition, style, animate } from '@angular/animations';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs/operators';

import { Product } from '../../../../../core/models/product.model';
import { Category } from '../../../../../core/models/category.model';
import { ProductService } from '../../../../../core/services/product.service';
import { StoreService } from '../../../../../core/services/store.service';
import { CategoryService } from '../../../../../core/services/category.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { PriceService } from '../../../../../core/services/price.service';
import { PromotionService, Promotion } from '../../../../../core/services/promotion.service';
import { ProductCardComponent } from '../../../../../shared/components/product-card/product-card.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner.component';
import { Store } from '../../../../../core/models/store.model';

interface ProductWithPromotion extends Product {
  originalPrice: number;
  discountedPrice: number | null;
  promotion: Promotion | null;
  promotionId?: string;
  categoryName?: string;
}

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    ProductCardComponent,
    LoadingSpinnerComponent,
    ConfirmDialogComponent,
    MatDialogModule
  ],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('liftUpDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
          style({ opacity: 0, transform: 'translateY(20px)' }))
      ])
    ])
  ]
})
export class ProductsComponent implements OnInit {
  @ViewChild('categoriesContainer') categoriesContainer!: ElementRef;
  @ViewChild('scrollLeftBtn') scrollLeftBtn!: ElementRef;
  @ViewChild('scrollRightBtn') scrollRightBtn!: ElementRef;
  
  products: ProductWithPromotion[] = [];
  categories$!: Observable<Category[]>;
  promotions$!: Observable<Promotion[]>;
  categories: Category[] = [];
  private categoryMap: Map<string, Category> = new Map();
  actionLoading = false;
  loading = false;
  searchTerm = '';
  selectedCategory: string | null = null;
  viewMode: 'grid' | 'list' = 'grid';
  showCategoryForm = false;
  categoryForm: FormGroup;
  editingCategoryId: string | null = null;

  // Propriétés pour le popup
  showConfirmPopup = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmActionText = '';
  confirmCancelText = 'Annuler';
  confirmType: 'danger' | 'warning' | 'primary' = 'primary';
  private confirmCallback: (() => void) | null = null;

  showAllCategoriesPopup = false;

  currentStore!: Store;
  loadingProducts = true;
  loadingCategories = true;

  // Pagination et cache
  currentPage = 1;
  pageSize = 12;
  totalPages = 0;
  totalProducts = 0;
  lastVisible: any = null;
  loadingMore = false;
  productsCache: { [page: number]: ProductWithPromotion[] } = {};
  lastVisibleCache: { [page: number]: any } = {};

  // Gestion des promotions
  activePromotions: Promotion[] = [];

  showDeleteConfirm: string | null = null;
  categoryToDelete: Category | null = null;

  constructor(
    private productService: ProductService,
    private storeService: StoreService,
    private categoryService: CategoryService,
    private promotionService: PromotionService,
    private priceService: PriceService,
    private toastService: ToastService,
    private router: Router,
    private dialog: MatDialog,
    private fb: FormBuilder
  ) {
    this.categoryForm = this.createCategoryForm();
  }

  private createCategoryForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  private async loadStore(): Promise<void> {
    try {
      const store = await firstValueFrom(this.storeService.getSelectedStore());
      if (!store) {
        this.toastService.error('Veuillez sélectionner une boutique');
        this.router.navigate(['/dashboard']);
        return;
      }
      this.currentStore = store;
      this.loadCategories();
      this.loadProducts();
      await this.loadPromotions();
    } catch (error) {
      console.error('Error loading store:', error);
      this.toastService.error('Erreur lors du chargement de la boutique');
    }
  }

  private loadCategories(): void {
    this.loadingCategories = true;
    this.storeService.getSelectedStore().pipe(
      take(1),
      switchMap(store => {
        if (!store) {
          throw new Error('Aucune boutique sélectionnée');
        }
        return this.categoryService.getStoreCategories(store.id);
      })
    ).subscribe({
      next: (categories) => {
        this.categories = categories;
        categories.forEach(cat => this.categoryMap.set(cat.id, cat));
        this.categories$ = of(categories);
        this.loadingCategories = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des catégories:', error);
        this.toastService.error('Erreur lors du chargement des catégories');
        this.loadingCategories = false;
      }
    });
  }

  private loadProducts(): void {
    this.loadingProducts = true;
    this.storeService.getSelectedStore().pipe(
      take(1),
      switchMap(store => {
        if (!store) {
          throw new Error('Aucune boutique sélectionnée');
        }
        this.currentStore = store;

        // Charger les promotions actives
        return this.promotionService.getPromotions(store.id).pipe(
          map(promotions => {
            const now = Date.now();
            return promotions.filter(promo => 
              promo.actif && 
              promo.dateDebut <= now && 
              promo.dateFin >= now &&
              (!promo.utilisationsMax || promo.utilisationsActuelles < promo.utilisationsMax)
            );
          }),
          switchMap(activePromotions => {
            this.activePromotions = activePromotions;
            
            // Charger les catégories d'abord
            return this.categoryService.getStoreCategories(store.id).pipe(
              switchMap(categories => {
                const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
                
                // Puis charger les produits
                return this.productService.getStoreProducts(store.id).pipe(
                  map(products => {
                    return products.map(product => {
                      const productWithPromo: ProductWithPromotion = {
                        ...product,
                        originalPrice: product.price,
                        discountedPrice: null,
                        promotion: null,
                        categoryName: product.category ? categoryMap.get(product.category)?.name || 'Non catégorisé' : 'Non catégorisé'
                      };

                      // Appliquer la promotion si disponible
                      const applicablePromotion = this.priceService.getApplicablePromotion(product, activePromotions);
                      if (applicablePromotion) {
                        productWithPromo.promotion = applicablePromotion;
                        productWithPromo.discountedPrice = product.price * (1 - applicablePromotion.reduction / 100);
                      }

                      return productWithPromo;
                    });
                  })
                );
              })
            );
          })
        );
      })
    ).subscribe({
      next: (products) => {
        this.products = products;
        this.loadingProducts = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des produits:', error);
        this.toastService.error('Erreur lors du chargement des produits');
        this.loadingProducts = false;
      }
    });
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      if (page === 1) {
        this.lastVisible = null;
      }
      this.loadProducts();
      const container = document.querySelector('.products-container');
      if (container) {
        container.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  startEditingCategory(category: Category): void {
    this.editingCategoryId = category.id;
    this.categoryForm.patchValue({
      name: category.name,
      description: category.description
    });
    this.showCategoryForm = true;
  }

  cancelEditing(): void {
    this.editingCategoryId = null;
    this.showCategoryForm = false;
    this.categoryForm.reset();
  }

  async saveCategory(): Promise<void> {
    if (this.categoryForm.invalid) {
      return;
    }

    this.actionLoading = true;
    const categoryData = this.categoryForm.value;

    try {
      const store = await this.storeService.getSelectedStore().pipe(take(1)).toPromise();
      if (!store) {
        throw new Error('Aucune boutique sélectionnée');
      }

      if (this.editingCategoryId) {
        // Mise à jour d'une catégorie existante
        await this.categoryService.updateCategory(store.id, this.editingCategoryId, categoryData);
        this.toastService.success('Catégorie mise à jour avec succès');
      } else {
        // Création d'une nouvelle catégorie
        await this.categoryService.addCategory(store.id, categoryData);
        this.toastService.success('Catégorie créée avec succès');
      }

      this.categoryForm.reset();
      this.showCategoryForm = false;
      this.editingCategoryId = null;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la catégorie:', error);
      this.toastService.error(this.editingCategoryId ? 
        'Erreur lors de la modification de la catégorie' : 
        'Erreur lors de l\'ajout de la catégorie'
      );
    } finally {
      this.actionLoading = false;
    }
  }

  toggleCategoryForm(): void {
    this.showCategoryForm = !this.showCategoryForm;
    if (!this.showCategoryForm) {
      this.cancelEditing();
    }
  }

  showConfirmation(title: string, message: string, actionText: string, type: 'danger' | 'warning' | 'primary' = 'primary', callback: () => void) {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmActionText = actionText;
    this.confirmType = type;
    this.confirmCallback = callback;
    this.showConfirmPopup = true;
  }

  confirmAction() {
    if (this.confirmCallback) {
      this.confirmCallback();
    }
    this.closeConfirmPopup();
  }

  closeConfirmPopup() {
    this.showConfirmPopup = false;
    this.confirmCallback = null;
  }

  async deleteCategory(category: Category): Promise<void> {
    if (this.actionLoading) return;
    this.showDeleteConfirm = category.id;
    this.categoryToDelete = category;
  }

  async confirmDeleteCategory(): Promise<void> {
    if (!this.categoryToDelete || this.actionLoading) return;

    this.actionLoading = true;
    try {
      const store = await this.storeService.getSelectedStore().pipe(take(1)).toPromise();
      if (!store) {
        throw new Error('Aucune boutique sélectionnée');
      }

      await this.categoryService.deleteCategory(store.id, this.categoryToDelete.id);
      this.toastService.success('Catégorie supprimée avec succès');
      this.loadCategories(); // Recharger les catégories
      this.showDeleteConfirm = null;
      this.categoryToDelete = null;
    } catch (error) {
      console.error('Erreur lors de la suppression de la catégorie:', error);
      this.toastService.error('Erreur lors de la suppression de la catégorie');
    } finally {
      this.actionLoading = false;
    }
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.currentPage = 1;
      this.clearCache();
      this.loadProducts();
      return;
    }

    this.loadingProducts = true;
    this.productService.searchProductsWithPagination(
      this.currentStore.id,
      this.searchTerm.trim(),
      this.pageSize
    ).pipe(take(1)).subscribe({
      next: (result) => {
        // Appliquer les promotions à chaque produit
        const productsWithPromotions: ProductWithPromotion[] = result.products.map(product => {
          // Trouver une promotion active pour ce produit
          const activePromotion = this.activePromotions?.find(promo => {
            if (!promo.actif) return false;
            const now = Date.now();
            if (now < promo.dateDebut || now > promo.dateFin) return false;

            switch (promo.applicationScope) {
              case 'PRODUITS':
                return promo.produitIds?.includes(product.id!);
              case 'CATEGORIES':
                return promo.categorieIds?.includes(product.category);
              case 'PANIER_ENTIER':
                return true;
              default:
                return false;
            }
          });

          // Calculer le prix avec promotion si applicable
          const discountedPrice = activePromotion
            ? product.price * (1 - activePromotion.reduction / 100)
            : null;

          return {
            ...product,
            originalPrice: product.price,
            discountedPrice,
            promotion: activePromotion || null,
            promotionId: activePromotion?.id
          };
        });

        this.products = productsWithPromotions;
        this.currentPage = 1;
        this.clearCache();
        this.productsCache[1] = productsWithPromotions;
        this.totalProducts = result.total;
        this.totalPages = Math.ceil(this.totalProducts / this.pageSize);
        this.loadingProducts = false;
      },
      error: (error) => {
        console.error('Error searching products:', error);
        this.toastService.error('Erreur lors de la recherche des produits');
        this.loadingProducts = false;
      }
    });
  }

  onCategoryChange(category: string | null): void {
    this.selectedCategory = category;
    this.currentPage = 1;
    this.clearCache();
    this.loadProducts();
  }

  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
  }

  addProduct(): void {
    this.actionLoading = true;
    this.router.navigate(['/dashboard/products/add'])
      .finally(() => this.actionLoading = false);
  }

  editProduct(product: Product): void {
    this.clearCache(); // Le cache n'est plus valide après une modification
    this.actionLoading = true;
    this.router.navigate(['/dashboard/products/edit', product.id], {
      state: { product }
    }).finally(() => this.actionLoading = false);
  }

  async deleteProduct(product: Product): Promise<void> {
    this.clearCache(); // Le cache n'est plus valide après une suppression
    this.showConfirmation(
      'Supprimer le produit',
      `Êtes-vous sûr de vouloir supprimer "${product.name}" ? Cette action est irréversible.`,
      'Supprimer',
      'danger',
      async () => {
        this.actionLoading = true;
        try {
          await this.productService.deleteProduct(product.storeId, product.id!);
          this.toastService.success('Produit supprimé avec succès');
          this.loadProducts();
        } catch (error) {
          this.toastService.error('Erreur lors de la suppression du produit');
        } finally {
          this.actionLoading = false;
        }
      }
    );
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
      img.src = 'assets/default-product.svg';
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.clearCache();
    this.loadProducts();
  }

  viewProductDetails(product: Product): void {
    if (product.id) {
      this.router.navigate(['/dashboard/products/details', product.id]);
    }
  }

  getCategoryName(categoryId: string): string {
    const category = this.categoryMap.get(categoryId);
    return category ? category.name : 'Non catégorisé';
  }

  filterByCategory(category: Category | null): void {
    this.selectedCategory = category?.id || null;
    this.currentPage = 1;
    this.clearCache();
    this.loadProducts();
  }

  scrollCategories(direction: 'left' | 'right'): void {
    if (!this.categoriesContainer) return;

    const container = this.categoriesContainer.nativeElement;
    const scrollAmount = container.clientWidth * 0.8; // Défilement de 80% de la largeur visible
    
    if (direction === 'left') {
      container.scrollLeft -= scrollAmount;
    } else {
      container.scrollLeft += scrollAmount;
    }

    // Update scroll buttons after scrolling
    this.updateScrollButtons();
  }

  private updateScrollButtons(): void {
    if (!this.categoriesContainer || !this.scrollLeftBtn || !this.scrollRightBtn) return;

    const container = this.categoriesContainer.nativeElement;
    
    // Disable left button if at start
    this.scrollLeftBtn.nativeElement.disabled = container.scrollLeft <= 0;
    
    // Disable right button if at end
    const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
    this.scrollRightBtn.nativeElement.disabled = isAtEnd;
  }

  ngAfterViewInit(): void {
    // Observer les changements de scroll
    if (this.categoriesContainer) {
      const container = this.categoriesContainer.nativeElement;
      container.addEventListener('scroll', () => this.updateScrollButtons());
      
      // Mise à jour initiale des boutons
      this.updateScrollButtons();
    }
  }

  showAllCategories(): void {
    this.showAllCategoriesPopup = true;
  }

  closeAllCategoriesPopup(): void {
    this.showAllCategoriesPopup = false;
  }

  selectCategoryAndClose(category: Category): void {
    this.filterByCategory(category);
    this.closeAllCategoriesPopup();
  }

  getDiscountPercentage(product: Product & { activePromotion?: Promotion | null }): number {
    if (!product.activePromotion) return 0;
    return product.activePromotion.reduction;
  }

  openCategoryModal(): void {
    this.showCategoryForm = true;
    this.editingCategoryId = null;
    this.categoryForm.reset();
  }

  private clearCache(): void {
    this.productsCache = {};
    this.lastVisibleCache = {};
  }

  private async loadPromotions(): Promise<void> {
    try {
      if (!this.currentStore?.id) return;
      
      this.promotions$ = this.promotionService.getPromotions(this.currentStore.id);
      this.activePromotions = await firstValueFrom(this.promotions$);
    } catch (error) {
      console.error('Error loading promotions:', error);
      this.toastService.error('Erreur lors du chargement des promotions');
    }
  }

  // Méthode pour calculer le prix promotionnel
  calculateDiscountedPrice(product: ProductWithPromotion): number {
    if (product.promotion) {
      return product.price * (1 - product.promotion.reduction / 100);
    }
    return product.price;
  }

  async saveCategoryForm(): Promise<void> {
    if (this.categoryForm.invalid || this.actionLoading) return;

    this.actionLoading = true;
    try {
      const store = await this.storeService.getSelectedStore().pipe(take(1)).toPromise();
      if (!store) {
        throw new Error('Aucune boutique sélectionnée');
      }

      const categoryData = this.categoryForm.value;

      if (this.editingCategoryId) {
        // Mise à jour d'une catégorie existante
        await this.categoryService.updateCategory(store.id, this.editingCategoryId, categoryData);
        this.toastService.success('Catégorie mise à jour avec succès');
      } else {
        // Création d'une nouvelle catégorie
        await this.categoryService.addCategory(store.id, categoryData);
        this.toastService.success('Catégorie créée avec succès');
      }

      this.showCategoryForm = false;
      this.editingCategoryId = null;
      this.categoryForm.reset();
      this.loadCategories(); // Recharger les catégories
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la catégorie:', error);
      this.toastService.error('Erreur lors de la sauvegarde de la catégorie');
    } finally {
      this.actionLoading = false;
    }
  }
} 