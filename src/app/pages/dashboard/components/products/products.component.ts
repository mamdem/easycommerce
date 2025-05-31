import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Product } from '../../../../core/models/product.model';
import { ProductService } from '../../../../core/services/product.service';
import { StoreService } from '../../../../core/services/store.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-products',
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  products$!: Observable<Product[]>;
  loading = true;
  actionLoading = false;
  searchTerm = '';
  selectedCategory: string | null = null;
  viewMode: 'grid' | 'list' = 'grid';
  categories = [
    'Vêtements',
    'Chaussures',
    'Accessoires',
    'Électronique',
    'Maison',
    'Sport',
    'Beauté',
    'Alimentation',
    'Autres'
  ];

  constructor(
    private productService: ProductService,
    private storeService: StoreService,
    private toastService: ToastService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  private loadProducts(): void {
    this.loading = true;
    this.storeService.getSelectedStore().subscribe(store => {
      if (!store) {
        this.toastService.error('Aucune boutique sélectionnée');
        this.router.navigate(['/dashboard']);
        return;
      }
      
      if (this.selectedCategory) {
        this.products$ = this.productService.getProductsByCategory(store.id!, this.selectedCategory);
      } else {
        this.products$ = this.productService.getStoreProducts(store.id!);
      }
      this.loading = false;
    });
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
      state: { product } // Passer les données du produit pour pré-remplir le formulaire
    }).finally(() => this.actionLoading = false);
  }

  async deleteProduct(product: Product): Promise<void> {
    const dialogData: ConfirmDialogData = {
      title: 'Supprimer le produit',
      message: `Êtes-vous sûr de vouloir supprimer "${product.name}" ? Cette action est irréversible.`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      type: 'danger'
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: 'auto',
      maxWidth: '95vw',
      maxHeight: '95vh',
      disableClose: true,
      autoFocus: false,
      data: dialogData,
      panelClass: ['dialog-center', 'animate__animated', 'animate__fadeIn']
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        this.actionLoading = true;
        try {
          await this.productService.deleteProduct(product.storeId, product.id!);
          this.toastService.success('Produit supprimé avec succès');
          this.loadProducts(); // Recharger la liste après suppression
        } catch (error) {
          this.toastService.error('Erreur lors de la suppression du produit');
        } finally {
          this.actionLoading = false;
        }
      }
    });
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
} 