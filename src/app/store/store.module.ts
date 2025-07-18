import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StoreRoutingModule } from './store-routing.module';
import { StoreHomeComponent } from './pages/store-home/store-home.component';
import { CartPageComponent } from './pages/store-home/components/cart-page/cart-page.component';
import { StoreLayoutComponent } from './layouts/store-layout/store-layout.component';
import { SharedModule } from '../shared/shared.module';
import { StoreProductsComponent } from './components/store-products/store-products.component';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    StoreRoutingModule,
    SharedModule,
    MatProgressSpinnerModule,
    MatButtonModule
  ],
  providers: []
})
export class StoreModule { } 