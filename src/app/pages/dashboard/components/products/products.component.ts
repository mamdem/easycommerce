import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { trigger, transition, style, animate } from '@angular/animations';
import { Product } from '../../../../core/models/product.model';
import { Category } from '../../../../core/models/category.model';
import { ProductService } from '../../../../core/services/product.service';
import { StoreService } from '../../../../core/services/store.service';
import { CategoryService } from '../../../../core/services/category.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class ProductsComponent implements OnInit {
  @ViewChild('categoriesContainer') categoriesContainer!: ElementRef;
  @ViewChild('scrollLeftBtn') scrollLeftBtn!: ElementRef;
  @ViewChild('scrollRightBtn') scrollRightBtn!: ElementRef;
  
  products$!: Observable<Product[]>;
  categories$!: Observable<Category[]>;
  categoryMap: Map<string, string> = new Map(); // Map pour stocker les noms des catégories
  loading = true;
  actionLoading = false;
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

  constructor(
    private productService: ProductService,
    private storeService: StoreService,
    private categoryService: CategoryService,
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
    this.loadProducts();
    this.loadCategories();
  }

  private loadProducts(): void {
    this.loading = true;
    this.storeService.getSelectedStore().subscribe(store => {
      if (!store) {
        this.toastService.error('Aucune boutique sélectionnée');
        this.router.navigate(['/dashboard']);
        return;
      }
      
      // Récupérer tous les produits
      this.products$ = this.productService.getStoreProducts(store.id!).pipe(
        map(products => {
          // Si une catégorie est sélectionnée, filtrer les produits
      if (this.selectedCategory) {
            return products.filter(product => product.category === this.selectedCategory);
      }
          // Sinon retourner tous les produits
          return products;
        })
      );
      this.loading = false;
    });
  }

  private loadCategories(): void {
    this.storeService.getSelectedStore().subscribe(store => {
      if (store) {
        this.categories$ = this.categoryService.getStoreCategories(store.id!).pipe(
          map(categories => {
            // Mettre à jour la map des catégories
            this.categoryMap.clear();
            categories.forEach(cat => this.categoryMap.set(cat.id, cat.name));
            return categories;
          })
        );
      }
    });
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
        await this.categoryService.updateCategory(store.id!, this.editingCategoryId, categoryData);
        this.toastService.success('Catégorie modifiée avec succès');
      } else {
        // Création d'une nouvelle catégorie
        await this.categoryService.addCategory(store.id!, categoryData);
        this.toastService.success('Catégorie ajoutée avec succès');
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
    this.showConfirmation(
      'Supprimer la catégorie',
      `Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ? Cette action est irréversible.`,
      'Supprimer',
      'danger',
      async () => {
        this.actionLoading = true;
        try {
          // Récupérer le store ID
          const store = await firstValueFrom(this.storeService.getSelectedStore());
          if (!store) {
            throw new Error('Aucune boutique sélectionnée');
          }

          // Supprimer la catégorie
          await this.categoryService.deleteCategory(store.id!, category.id);
          
          // Réinitialiser la catégorie sélectionnée si c'était celle-ci
          if (this.selectedCategory === category.id) {
            this.selectedCategory = null;
          }

          // Recharger les produits et les catégories
          this.loadProducts();
          this.loadCategories();
          
          this.toastService.success('Catégorie supprimée avec succès');
        } catch (error) {
          console.error('Erreur lors de la suppression de la catégorie:', error);
          this.toastService.error('Erreur lors de la suppression de la catégorie');
        } finally {
          this.actionLoading = false;
        }
      }
    );
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.loadProducts();
      return;
    }

    this.loading = true;
    this.storeService.getSelectedStore().subscribe(store => {
      if (store) {
        this.products$ = this.productService.searchProducts(store.id!, this.searchTerm.trim());
      }
      this.loading = false;
    });
  }

  onCategoryChange(category: string | null): void {
    this.selectedCategory = category;
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
    this.actionLoading = true;
    this.router.navigate(['/dashboard/products/edit', product.id], {
      state: { product }
    }).finally(() => this.actionLoading = false);
  }

  async deleteProduct(product: Product): Promise<void> {
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

  getDiscountPercentage(product: Product): number {
    if (!product.discountPrice || !product.price) return 0;
    return Math.round(((product.price - product.discountPrice) / product.price) * 100);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = 'assets/default-product.svg';
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  getCategoryName(categoryId: string): string {
    return this.categoryMap.get(categoryId) || categoryId;
  }

  filterByCategory(category: Category | null): void {
    if (category) {
      // Si on clique sur la catégorie déjà sélectionnée, la désélectionner
      this.selectedCategory = this.selectedCategory === category.id ? null : category.id;
    } else {
      // Si on clique sur "Voir tout" ou null, réinitialiser la sélection
      this.selectedCategory = null;
    }
    // Recharger les produits avec le nouveau filtre
    this.loadProducts();
  }

  scrollCategories(direction: 'left' | 'right'): void {
    const container = this.categoriesContainer.nativeElement;
    const scrollAmount = 300; // Ajustez cette valeur selon vos besoins
    
    if (direction === 'left') {
      container.scrollLeft -= scrollAmount;
    } else {
      container.scrollLeft += scrollAmount;
    }
    
    // Mettre à jour la visibilité des boutons
    this.updateScrollButtons();
  }

  private updateScrollButtons(): void {
    const container = this.categoriesContainer.nativeElement;
    
    // Désactiver le bouton gauche si on est au début
    if (this.scrollLeftBtn) {
      this.scrollLeftBtn.nativeElement.disabled = container.scrollLeft <= 0;
    }
    
    // Désactiver le bouton droit si on est à la fin
    if (this.scrollRightBtn) {
      const isAtEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 1;
      this.scrollRightBtn.nativeElement.disabled = isAtEnd;
    }
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
} 