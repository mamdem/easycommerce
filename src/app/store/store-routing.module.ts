import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StoreLayoutComponent } from './layouts/store-layout/store-layout.component';
import { StoreHomeComponent } from './pages/store-home/store-home.component';
import { CartPageComponent } from './pages/store-home/components/cart-page/cart-page.component';
import { StoreContactComponent } from './pages/store-home/store-contact/store-contact.component';

const routes: Routes = [
  {
    path: '',
    component: StoreLayoutComponent,
    children: [
      {
        path: '',
        component: StoreHomeComponent
      },
      {
        path: 'cart',
        component: CartPageComponent
      },
      {
        path: 'contact',
        component: StoreContactComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StoreRoutingModule { } 