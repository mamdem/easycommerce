import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StoreRoutingModule } from './store-routing.module';
import { StoreHomeComponent } from './pages/store-home/store-home.component';
import { CartPageComponent } from './pages/store-home/components/cart-page/cart-page.component';
import { StoreLayoutComponent } from './layouts/store-layout/store-layout.component';
import { SharedModule } from '../shared/shared.module';
import { ProductCardComponent } from './components/product-card/product-card.component';
import { StoreProductsComponent } from './components/store-products/store-products.component';
import { CartComponent } from './components/cart/cart.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  declarations: [
    StoreHomeComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StoreRoutingModule,
    SharedModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    StoreLayoutComponent,
    CartPageComponent,
    ProductCardComponent,
    StoreProductsComponent,
    CartComponent
  ],
  providers: []
})
export class StoreModule { } 