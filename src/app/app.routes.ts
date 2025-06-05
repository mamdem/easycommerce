import { Routes } from '@angular/router';
import { CartPageComponent } from './store/pages/store-home/components/cart-page/cart-page.component';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent) },
  { path: 'login', loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/auth/register/register.component').then(m => m.RegisterComponent) },
  { 
    path: 'boutique/:storeUrl',
    loadChildren: () => import('./store/pages/store-home/store-home.module').then(m => m.StoreHomeModule)
  },
  { path: 'dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: '**', redirectTo: '/home' }
];
