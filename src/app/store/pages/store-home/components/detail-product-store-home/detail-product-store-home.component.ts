import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Product } from '../../../../../core/models/product.model';

@Component({
  selector: 'app-detail-product-store-home',
  standalone: true,
  imports: [],
  templateUrl: './detail-product-store-home.component.html',
  styleUrl: './detail-product-store-home.component.scss'
})
export class DetailProductStoreHomeComponent {
  constructor(
    public dialogRef: MatDialogRef<DetailProductStoreHomeComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product }
  ) {}

  closeDialog(): void {
    this.dialogRef.close();
  }

  addToCart(product: Product): void {
    // TODO: Implement add to cart functionality
    console.log('Adding to cart:', product);
  }
}
