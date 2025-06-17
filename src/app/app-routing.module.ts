import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
// Commenté pour désactiver les guards
// import { StoreCreationGuard } from './core/guards/store-creation.guard';
// import { authGuard, postLoginGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { 
    path: 'auth', 
    loadChildren: () => import('./pages/auth/auth.module').then(m => m.AuthModule) 
  },
  { 
    path: 'payment',
    loadComponent: () => import('./pages/payment/payment.component').then(m => m.PaymentComponent)
  },
  { 
    path: 'store/:id', 
    loadChildren: () => import('./pages/store/store.module').then(m => m.StoreModule)
    // Guards désactivés
    // canActivate: [authGuard, postLoginGuard]
  },
  { 
    path: 'store-creation',   
    loadChildren: () => import('./pages/store-creation/store-creation.module').then(m => m.StoreCreationModule)
    // Guards désactivés
    // canActivate: [authGuard, postLoginGuard]
  },
  { 
    path: 'dashboard', 
    loadChildren: () => import('./pages/dashboard/dashboard.module').then(m => m.DashboardModule)
    // Guards désactivés
    // canActivate: [authGuard, postLoginGuard]
  },
  {
    path: 'boutique/:storeUrl',
    loadChildren: () => import('./store/store.module').then(m => m.StoreModule)
  },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
