import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../../shared/shared.module';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { DashboardRoutingModule } from './dashboard-routing.module';
import { DashboardComponent } from './dashboard.component';
import { ProductsComponent } from './components/products/products.component';
import { AddProductComponent } from './components/products/add-product/add-product.component';
import { EditProductComponent } from './components/products/edit-product/edit-product.component';
import { SettingsComponent } from './components/settings/settings.component';
import { CustomersComponent } from './components/customers/customers.component';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { OrdersComponent } from './components/orders/orders.component';
import { OrderDetailsComponent } from './components/orders/order-details/order-details.component';
import { OverviewComponent } from './components/overview/overview.component';
import { RejectOrderDialogComponent } from './components/orders/reject-order-dialog/reject-order-dialog.component';
import { PromotionsComponent } from './components/promotions/promotions.component';

@NgModule({
  declarations: [
    AddProductComponent,
    EditProductComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    DashboardRoutingModule,
    SharedModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    OrderDetailsComponent,
    RejectOrderDialogComponent,
    CustomersComponent,
    SettingsComponent,
    PromotionsComponent,
    ProductsComponent,
    OrdersComponent,
    OverviewComponent,
    StatisticsComponent
  ]
})
export class DashboardModule { }
