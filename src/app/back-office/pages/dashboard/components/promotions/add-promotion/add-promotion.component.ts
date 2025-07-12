import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PromotionService, Promotion } from '../../../../../../core/services/promotion.service';
import { StoreService } from '../../../../../../core/services/store.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { ProductService } from '../../../../../../core/services/product.service';
import { CategoryService } from '../../../../../../core/services/category.service';
import { Product } from '../../../../../../core/models/product.model';
import { Category } from '../../../../../../core/models/category.model';
import { Observable, of } from 'rxjs';

@Component({
  selector: 'app-add-promotion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './add-promotion.component.html',
  styleUrls: ['./add-promotion.component.scss']
})
export class AddPromotionComponent implements OnInit {
  promotionForm: FormGroup;
  selectedStore: any;
  isLoading: boolean = false;
  products$: Observable<Product[]> = of([]);
  allProducts: Product[] = [];
  selectedProducts: Product[] = [];
  reductionPercentage: number = 0;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private promotionService: PromotionService,
    private storeService: StoreService,
    private productService: ProductService,
    private toastService: ToastService
  ) {
    // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    this.promotionForm = this.fb.group({
      type: ['REDUCTION_PRODUIT'],
      nom: ['', Validators.required],
      reduction: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      dateDebut: [today, Validators.required],
      dateFin: ['', Validators.required],
      actif: [true],
      produitIds: [[], Validators.required],
      afficherAutomatiquement: [true]
    });

    // Écouter les changements de sélection des produits
    this.promotionForm.get('produitIds')?.valueChanges.subscribe(selectedIds => {
      this.updateSelectedProducts(selectedIds);
    });

    // Écouter les changements du pourcentage de réduction
    this.promotionForm.get('reduction')?.valueChanges.subscribe(reduction => {
      this.reductionPercentage = reduction || 0;
    });
  }

  ngOnInit(): void {
    this.storeService.getSelectedStore().subscribe(store => {
      if (store) {
        this.selectedStore = store;
        this.products$ = this.productService.getStoreProducts(store.id!);
        
        // Stocker tous les produits pour les calculs
        this.products$.subscribe(products => {
          this.allProducts = products;
        });
      } else {
        this.router.navigate(['/dashboard/promotions']);
      }
    });
  }

  updateSelectedProducts(selectedIds: string[]): void {
    this.selectedProducts = this.allProducts.filter(product => 
      selectedIds.includes(product.id!)
    );
  }

  calculatePromotionalPrice(originalPrice: number): number {
    if (!this.reductionPercentage || this.reductionPercentage <= 0) {
      return originalPrice;
    }
    return originalPrice * (1 - this.reductionPercentage / 100);
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price) + ' FCFA';
  }

  onSubmit(): void {
    if (this.promotionForm.invalid || this.isLoading) {
      return;
    }

    this.isLoading = true;

    const formValue = this.promotionForm.value;
    const promotion: Omit<Promotion, 'id' | 'createdAt' | 'updatedAt'> = {
      ...formValue,
      dateDebut: new Date(formValue.dateDebut).getTime(),
      dateFin: new Date(formValue.dateFin).getTime(),
      utilisationsActuelles: 0,
      applicationScope: 'PRODUITS',
      categorieIds: []
    };

    this.promotionService.createPromotion(this.selectedStore.id, promotion).subscribe({
      next: () => {
        this.toastService.success('Promotion créée avec succès');
        this.router.navigate(['/dashboard/promotions']);
      },
      error: (error) => {
        console.error('Erreur lors de la création de la promotion:', error);
        this.toastService.error('Erreur lors de la création de la promotion');
        this.isLoading = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/dashboard/promotions']);
  }
} 