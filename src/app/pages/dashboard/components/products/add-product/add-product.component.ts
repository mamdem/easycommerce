import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import { StoreService } from '../../../../../core/services/store.service';
import { ProductService } from '../../../../../core/services/product.service';
import { CategoryService } from '../../../../../core/services/category.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { Category } from '../../../../../core/models/category.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-add-product',
  templateUrl: './add-product.component.html',
  styleUrls: ['./add-product.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, height: 0, transform: 'translateY(-10px)' }),
        animate('200ms ease-out', style({ opacity: 1, height: '*', transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, height: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ]
})
export class AddProductComponent implements OnInit {
  productForm!: FormGroup;
  categoryForm!: FormGroup;
  loading = false;
  currentStep = 1;
  totalSteps = 3;
  previewUrls: string[] = [];
  selectedFiles: File[] = [];
  protected currentStore: any;
  categories$!: Observable<Category[]>;
  showNewCategoryForm = false;
  
  constructor(
    protected fb: FormBuilder,
    protected router: Router,
    protected storeService: StoreService,
    protected productService: ProductService,
    protected categoryService: CategoryService,
    protected toastService: ToastService
  ) {
    this.initForm();
    this.initCategoryForm();
  }

  ngOnInit(): void {
    // Vérifier si une boutique est sélectionnée
    this.storeService.getSelectedStore().subscribe(
      store => {
        if (!store) {
          this.toastService.error('Veuillez sélectionner une boutique');
          this.router.navigate(['/dashboard']);
          return;
        }
        this.currentStore = store;
        this.loadCategories();
      }
    );
  }

  protected loadCategories(): void {
    if (this.currentStore) {
      this.categories$ = this.categoryService.getStoreCategories(this.currentStore.id);
    }
  }

  protected initCategoryForm(): void {
    this.categoryForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: ['']
    });
  }

  protected initForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(20)]],
      category: ['', Validators.required],
      brand: [''],
      tags: [''],
      price: ['', [Validators.required, Validators.min(0)]],
      stock: ['', [Validators.required, Validators.min(0)]],
      sku: [''],
      weight: [''],
      dimensions: this.fb.group({
        length: [''],
        width: [''],
        height: ['']
      }),
      specifications: [''],
      isActive: [true]
    });
  }

  toggleNewCategoryForm(): void {
    this.showNewCategoryForm = !this.showNewCategoryForm;
    if (!this.showNewCategoryForm) {
      this.categoryForm.reset();
    }
  }

  async saveNewCategory(): Promise<void> {
    if (this.categoryForm.invalid) {
      return;
    }

    this.loading = true;
    try {
      const categoryData = this.categoryForm.value;
      const newCategory = await this.categoryService.addCategory(this.currentStore.id, categoryData);
      
      // Select the new category
      this.productForm.patchValue({
        category: newCategory.id
      });
      
      this.toastService.success('Catégorie ajoutée avec succès');
      this.toggleNewCategoryForm();
      this.loadCategories();
    } catch (error) {
      this.toastService.error('Erreur lors de l\'ajout de la catégorie');
    } finally {
      this.loading = false;
    }
  }

  // Gestion des images
  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (this.validateFile(file)) {
          this.selectedFiles.push(file);
          this.createPreview(file);
        }
      }
    }
  }

  protected validateFile(file: File): boolean {
    if (!file.type.startsWith('image/')) {
      this.toastService.error('Seules les images sont autorisées');
      return false;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.toastService.error('L\'image ne doit pas dépasser 5MB');
      return false;
    }

    return true;
  }

  protected createPreview(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.previewUrls.push(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  removeImage(index: number): void {
    this.previewUrls.splice(index, 1);
    this.selectedFiles.splice(index, 1);
  }

  // Validation des champs
  isFieldInvalid(fieldName: string): boolean {
    const field = this.productForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getErrorMessage(fieldName: string): string {
    const field = this.productForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;
    if (errors['required']) return 'Ce champ est requis';
    if (errors['minlength']) {
      const minLength = errors['minlength'].requiredLength;
      return `Minimum ${minLength} caractères requis`;
    }
    if (errors['min']) return 'La valeur doit être positive';
    
    return 'Ce champ est invalide';
  }

  // Navigation entre les étapes
  nextStep(): void {
    if (this.validateCurrentStep()) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  protected validateCurrentStep(): boolean {
    if (!this.productForm) return false;
    
    const controls = this.productForm.controls;
    
    switch (this.currentStep) {
      case 1:
        return controls['name'].valid && 
               controls['description'].valid && 
               controls['category'].valid;
      case 2:
        return controls['price'].valid && 
               controls['stock'].valid;
      default:
        return true;
    }
  }

  // Soumission du formulaire
  async onSubmit(): Promise<void> {
    if (this.productForm.invalid) {
      this.toastService.error('Veuillez remplir tous les champs requis');
      return;
    }

    if (this.selectedFiles.length === 0) {
      this.toastService.error('Veuillez ajouter au moins une image');
      return;
    }

    this.loading = true;

    try {
      const formData = this.productForm.value;
      
      // Préparer les tags
      const tags = formData.tags ? 
        formData.tags.split(',').map((tag: string) => tag.trim()) : 
        [];

      const productData = {
        ...formData,
        storeId: this.currentStore.id,
        tags,
        images: [] // Sera rempli par le service
      };

      // Créer le produit avec les images
      await this.productService.createProduct(productData, this.selectedFiles);
      
      this.toastService.success('Produit ajouté avec succès');
      this.router.navigate(['/dashboard/products']);
    } catch (error) {
      console.error('Error creating product:', error);
      this.toastService.error('Une erreur est survenue lors de la création du produit');
    } finally {
      this.loading = false;
    }
  }

  // Navigation
  cancel(): void {
    this.router.navigate(['/dashboard/products']);
  }
}
