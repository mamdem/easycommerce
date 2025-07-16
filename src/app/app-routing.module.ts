import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './back-office/pages/home/home.component';
import { EmailVerificationGuard } from './core/guards/email-verification.guard';
// Commenté pour désactiver les guards
// import { StoreCreationGuard } from './core/guards/store-creation.guard';
// import { authGuard, postLoginGuard } from './core/guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'home', component: HomeComponent },
  { 
    path: 'auth', 
    loadChildren: () => import('./back-office/pages/auth/auth.module').then(m => m.AuthModule) 
  },
  { 
    path: 'payment/:storeId',
    loadComponent: () => import('./back-office/pages/payment/payment.component').then(m => m.PaymentComponent)
  },
  { 
    path: 'store-creation',   
    loadChildren: () => import('./back-office/pages/store-creation/store-creation.module').then(m => m.StoreCreationModule)
    // Guards désactivés temporairement
    // canActivate: [EmailVerificationGuard]
  },
  { 
    path: 'dashboard', 
    loadChildren: () => import('./back-office/pages/dashboard/dashboard.module').then(m => m.DashboardModule)
    // Guards désactivés temporairement
    // canActivate: [EmailVerificationGuard]
  },
  {
    path: 'boutique/:storeUrl',
    loadChildren: () => import('./store/store.module').then(m => m.StoreModule)
  },
  {
    path: 'admin-page',
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule)
  },
  { path: '**', redirectTo: '/home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
