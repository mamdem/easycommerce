import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardRoutingModule } from './dashboard-routing.module';
import { ProductDetailsComponent } from '../back-office/pages/dashboard/components/products/product-details/product-details.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    DashboardRoutingModule,
    ProductDetailsComponent
  ]
})
export class DashboardModule { } 