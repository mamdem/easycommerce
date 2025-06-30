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
  categories$: Observable<Category[]> = of([]);

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private promotionService: PromotionService,
    private storeService: StoreService,
    private productService: ProductService,
    private categoryService: CategoryService,
    private toastService: ToastService
  ) {
    this.promotionForm = this.fb.group({
      type: ['CODE_PROMO', Validators.required],
      nom: ['', Validators.required],
      code: [''],
      reduction: ['', [Validators.required, Validators.min(0), Validators.max(100)]],
      dateDebut: ['', Validators.required],
      dateFin: ['', Validators.required],
      actif: [true],
      applicationScope: ['PANIER_ENTIER'],
      produitIds: [[]],
      categorieIds: [[]],
      minimumAchat: [null],
      utilisationsMax: [null],
      afficherAutomatiquement: [true]
    });

    // Ajout des validateurs conditionnels
    this.promotionForm.get('type')?.valueChanges.subscribe(type => {
      const codeControl = this.promotionForm.get('code');
      const applicationScopeControl = this.promotionForm.get('applicationScope');
      const produitsControl = this.promotionForm.get('produitIds');
      const categoriesControl = this.promotionForm.get('categorieIds');

      if (type === 'CODE_PROMO') {
        codeControl?.setValidators([Validators.required, Validators.minLength(3)]);
      } else {
        codeControl?.clearValidators();
      }

      if (type === 'REDUCTION_PRODUIT') {
        applicationScopeControl?.setValue('PRODUITS');
        produitsControl?.setValidators([Validators.required]);
      } else if (type === 'CODE_PROMO') {
        produitsControl?.clearValidators();
        if (applicationScopeControl?.value === 'PRODUITS') {
          produitsControl?.setValidators([Validators.required]);
        } else if (applicationScopeControl?.value === 'CATEGORIES') {
          categoriesControl?.setValidators([Validators.required]);
        }
      }

      codeControl?.updateValueAndValidity();
      produitsControl?.updateValueAndValidity();
      categoriesControl?.updateValueAndValidity();
    });

    // Gestion des changements de scope d'application
    this.promotionForm.get('applicationScope')?.valueChanges.subscribe(scope => {
      const produitsControl = this.promotionForm.get('produitIds');
      const categoriesControl = this.promotionForm.get('categorieIds');

      produitsControl?.clearValidators();
      categoriesControl?.clearValidators();

      if (scope === 'PRODUITS') {
        produitsControl?.setValidators([Validators.required]);
      } else if (scope === 'CATEGORIES') {
        categoriesControl?.setValidators([Validators.required]);
      }

      produitsControl?.updateValueAndValidity();
      categoriesControl?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.storeService.getSelectedStore().subscribe(store => {
      if (store) {
        this.selectedStore = store;
        this.products$ = this.productService.getStoreProducts(store.id!);
        this.categories$ = this.categoryService.getStoreCategories(store.id!);
      } else {
        this.router.navigate(['/dashboard/promotions']);
      }
    });
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
      produitIds: formValue.applicationScope === 'PRODUITS' ? formValue.produitIds : [],
      categorieIds: formValue.applicationScope === 'CATEGORIES' ? formValue.categorieIds : []
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