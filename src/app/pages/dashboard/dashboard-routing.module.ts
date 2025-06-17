import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard.component';
import { ProductsComponent } from './components/products/products.component';
import { AddProductComponent } from './components/products/add-product/add-product.component';
import { EditProductComponent } from './components/products/edit-product/edit-product.component';
import { OrdersComponent } from './components/orders/orders.component';
import { CustomersComponent } from './components/customers/customers.component';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { SettingsComponent } from './components/settings/settings.component';
import { OverviewComponent } from './components/overview/overview.component';
import { OrderDetailsComponent } from './components/orders/order-details/order-details.component';

const routes: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      {
        path: '',
        redirectTo: 'overview',
        pathMatch: 'full'
      },
      {
        path: 'overview',
        component: OverviewComponent
      },
      {
        path: 'products',
        component: ProductsComponent
      },
      {
        path: 'products/add',
        component: AddProductComponent
      },
      {
        path: 'products/edit/:id',
        component: EditProductComponent
      },
      {
        path: 'orders',
        component: OrdersComponent
      },
      {
        path: 'orders/:id',
        component: OrderDetailsComponent
      },
      {
        path: 'customers',
        component: CustomersComponent
      },
      {
        path: 'statistics',
        component: StatisticsComponent
      },
      {
        path: 'settings',
        component: SettingsComponent
      },
      {
        path: 'promotions',
        loadChildren: () => import('./components/promotions/promotions.module').then(m => m.PromotionsModule)
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { } 