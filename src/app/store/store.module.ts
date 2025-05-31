import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
import { StoreRoutingModule } from './store-routing.module';
import { StoreHomeComponent } from './pages/store-home/store-home.component';
import { ProductCardComponent } from './components/product-card/product-card.component';

@NgModule({
  declarations: [
    StoreHomeComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    SharedModule,
    StoreRoutingModule,
    ProductCardComponent
  ],
  providers: []
})
export class StoreModule { } 