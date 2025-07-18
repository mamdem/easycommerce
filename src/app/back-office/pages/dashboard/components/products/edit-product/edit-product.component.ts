import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AddProductComponent } from '../add-product/add-product.component';
import { ProductService } from '../../../../../../core/services/product.service';
import { StoreService } from '../../../../../../core/services/store.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { CategoryService } from '../../../../../../core/services/category.service';
import { FormBuilder } from '@angular/forms';
import { Product } from '../../../../../../core/models/product.model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-edit-product',
  templateUrl: '../add-product/add-product.component.html',
  styleUrls: ['../add-product/add-product.component.scss']
})
export class EditProductComponent extends AddProductComponent implements OnInit {
  productId!: string;
  originalProduct!: Product;

  constructor(
    protected override fb: FormBuilder,
    protected override router: Router,
    protected override storeService: StoreService,
    protected override productService: ProductService,
    protected override categoryService: CategoryService,
    protected override toastService: ToastService,
    private route: ActivatedRoute
  ) {
    super(fb, router, storeService, productService, categoryService, toastService);
  }

  override async ngOnInit(): Promise<void> {
    // Attendre que la boutique soit chargée avant de continuer
    const store = await firstValueFrom(this.storeService.getSelectedStore());
    if (!store) {
      this.toastService.error('Veuillez sélectionner une boutique');
      this.router.navigate(['/dashboard']);
      return;
    }
    this.currentStore = store;
    
    // Charger les catégories
    this.categories$ = this.categoryService.getStoreCategories(this.currentStore.id);
    
    // Récupérer le produit depuis le state de navigation ou l'API
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state?.['product']) {
      this.originalProduct = navigation.extras.state['product'] as Product;
      this.productId = this.originalProduct.id!;
      await this.prePopulateForm();
    } else {
      this.productId = this.route.snapshot.params['id'];
      await this.loadProduct();
    }
  }

  private async loadProduct(): Promise<void> {
    try {
      this.loading = true;
      
      const product = await firstValueFrom(
        this.productService.getProduct(this.currentStore.id, this.productId)
      );
      
      if (!product) {
        throw new Error('Produit non trouvé');
      }

      console.log('Produit chargé:', product);
      this.originalProduct = product;
      await this.prePopulateForm();
    } catch (error) {
      console.error('Error loading product:', error);
      this.toastService.error('Erreur lors du chargement du produit');
      this.router.navigate(['/dashboard/products']);
    } finally {
      this.loading = false;
    }
  }

  private async prePopulateForm(): Promise<void> {
    try {
      // Pré-remplir les images
      if (this.originalProduct.images) {
        this.previewUrls = [...this.originalProduct.images];
      }

      console.log('Pré-remplissage du formulaire avec les données:', {
        category: this.originalProduct.category
      });

      // Pré-remplir le formulaire
      this.productForm.patchValue({
        name: this.originalProduct.name,
        description: this.originalProduct.description,
        category: this.originalProduct.category || '', // Utiliser category qui contient l'ID
        brand: this.originalProduct.brand,
        tags: this.originalProduct.tags?.join(', '),
        price: this.originalProduct.price,
        stock: this.originalProduct.stock,
        sku: this.originalProduct.sku,
        weight: this.originalProduct.weight,
        dimensions: this.originalProduct.dimensions,
        specifications: this.originalProduct.specifications,
        isActive: this.originalProduct.isActive
      });

      // Log pour le débogage
      console.log('Valeur du champ catégorie après patchValue:', this.productForm.get('category')?.value);
      
      // Log des catégories disponibles
      this.categories$.subscribe(categories => {
        console.log('Catégories disponibles:', categories);
      });
    } catch (error) {
      console.error('Error in prePopulateForm:', error);
      this.toastService.error('Erreur lors du chargement des données du produit');
    }
  }

  override async onSubmit(): Promise<void> {
    if (this.productForm.invalid) {
      this.toastService.error('Veuillez remplir tous les champs requis');
      return;
    }

    this.loading = true;

    try {
      const formData = this.productForm.value;
      
      // Préparer les tags
      const tags = formData.tags ? 
        formData.tags.split(',').map((tag: string) => tag.trim()) : 
        [];

      // Préparer les mises à jour
      const updates: Partial<Product> = {
        name: formData.name,
        description: formData.description,
        category: formData.category, // Utiliser category pour l'ID de la catégorie
        brand: formData.brand,
        tags,
        price: formData.price,
        stock: formData.stock,
        sku: formData.sku,
        weight: formData.weight,
        dimensions: formData.dimensions,
        specifications: formData.specifications,
        isActive: formData.isActive
      };

      // Mettre à jour le produit
      await this.productService.updateProduct(
        this.currentStore.id,
        this.productId,
        updates,
        this.selectedFiles
      );
      
      this.toastService.success('Produit mis à jour avec succès');
      this.router.navigate(['/dashboard/products']);
    } catch (error) {
      console.error('Error updating product:', error);
      this.toastService.error('Une erreur est survenue lors de la mise à jour du produit');
    } finally {
      this.loading = false;
    }
  }

  private async getCategoryName(categoryId: string): Promise<string> {
    try {
      const category = await firstValueFrom(this.categoryService.getCategoryById(this.currentStore.id, categoryId));
      return category.name;
    } catch (error) {
      console.error('Error getting category name:', error);
      return '';
    }
  }
} 