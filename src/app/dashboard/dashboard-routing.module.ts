import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductDetailsComponent } from '../back-office/pages/dashboard/components/products/product-details/product-details.component';

const routes: Routes = [
  {
    path: 'products',
    children: [
      {
        path: 'details/:productId',
        component: ProductDetailsComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class DashboardRoutingModule { } 