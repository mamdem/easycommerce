import { Routes } from '@angular/router';
import { CartPageComponent } from './store/pages/store-home/components/cart-page/cart-page.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./back-office/pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'login', loadComponent: () => import('./back-office/pages/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./back-office/pages/auth/register/register.component').then(m => m.RegisterComponent) },
  { 
    path: 'boutique/:storeUrl',
    loadChildren: () => import('./store/pages/store-home/store-home.module').then(m => m.StoreHomeModule)
  },
  { 
    path: 'dashboard',
    loadChildren: () => import('./back-office/pages/dashboard/dashboard.module').then(m => m.DashboardModule)
  },
  { path: '**', redirectTo: '/home' }
];
