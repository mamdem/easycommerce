import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { StoreHomeComponent } from './store-home.component';
import { CartPageComponent } from './components/cart-page/cart-page.component';
import { storeExistsGuard } from './guards/store-exists.guard';

const routes: Routes = [
  {
    path: '',
    component: StoreHomeComponent,
    canActivate: [storeExistsGuard],
    children: [
      {
        path: 'cart',
        component: CartPageComponent,
        title: 'Panier de la boutique'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class StoreHomeRoutingModule { } 