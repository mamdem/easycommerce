import { Routes } from '@angular/router';
import { StoreLayoutComponent } from './layouts/store-layout/store-layout.component';

export const storeRoutes: Routes = [
  {
    path: 'boutique/:storeUrl',
    component: StoreLayoutComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/store-home/store-home.component')
          .then(m => m.StoreHomeComponent)
      },
      {
        path: ':productId',
        loadComponent: () => import('./pages/store-home/components/product-details/product-details.component')
          .then(m => m.ProductDetailsComponent)
      },
      {
        path: 'contact',
        loadComponent: () => import('./pages/store-home/components/store-contact/store-contact.component')
          .then(m => m.StoreContactComponent)
      },
      {
        path: 'panier',
        loadComponent: () => import('./pages/store-home/components/cart-page/cart-page.component')
          .then(m => m.CartPageComponent)
      },
      {
        path: 'conditions',
        loadComponent: () => import('./pages/terms/terms.component')
          .then(m => m.TermsComponent)
      }
    ]
  }
]; 