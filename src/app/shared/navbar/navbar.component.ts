import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StoreService, StoreSettings } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { SubscriptionService, SubscriptionStatus } from '../../core/services/subscription.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit {
  storeName: string = 'E-boutique'; // Valeur par défaut
  userStores: StoreSettings[] = [];
  selectedStore: StoreSettings | null = null;
  loading = false;
  subscriptionStatus$: Observable<SubscriptionStatus>;
  
  constructor(
    private authService: AuthService,
    private storeService: StoreService,
    private router: Router,
    private toastService: ToastService,
    private subscriptionService: SubscriptionService
  ) {
    console.log('🟡 NavbarComponent initialized');
    this.subscriptionStatus$ = this.subscriptionService.getSubscriptionStatus().pipe(
      tap(status => {
        console.log('🟡 Raw subscription status in navbar:', JSON.stringify(status, null, 2));
        console.log('🟡 Status type:', status?.status);
        console.log('🟡 Is in trial:', status?.isInTrial);
        console.log('🟡 Days left in trial:', status?.daysLeftInTrial);
      })
    );
  }
  
  ngOnInit(): void {
    this.loadStores();
  }
  
  loadStores(): void {
    if (this.isAuthenticated()) {
      this.loading = true;
      this.storeService.getUserStores().subscribe({
        next: (stores) => {
          console.log('Boutiques chargées dans navbar:', stores);
          this.userStores = stores;
          
          // Récupérer la boutique sélectionnée
          const savedStoreId = localStorage.getItem('selectedStoreId');
          if (savedStoreId && stores.some(store => store.id === savedStoreId)) {
            this.selectedStore = stores.find(store => store.id === savedStoreId) || null;
          } else if (stores.length > 0) {
            this.selectedStore = stores[0];
            localStorage.setItem('selectedStoreId', stores[0].id || '');
          }
          
          if (this.selectedStore) {
            this.storeName = this.selectedStore.storeName || this.selectedStore.legalName;
          }
          
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des boutiques:', error);
          this.loading = false;
          this.toastService.error('Impossible de charger vos boutiques');
        }
      });
    }
  }
  
  onStoreSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const storeId = select.value;
    
    if (storeId === 'new') {
      this.router.navigate(['/store-creation']);
      return;
    }
    
    const selectedStore = this.userStores.find(store => store.id === storeId);
    if (selectedStore) {
      this.selectedStore = selectedStore;
      this.storeName = selectedStore.storeName || selectedStore.legalName;
      localStorage.setItem('selectedStoreId', storeId);
      
      // Recharger la page du dashboard si on y est déjà
      if (this.router.url.includes('/dashboard')) {
        window.location.reload();
      } else {
        this.router.navigate(['/dashboard']);
      }
    }
  }
  
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }
  
  getUserName(): string {
    const user = this.authService.getCurrentUser();
    if (user && user.displayName) {
      return user.displayName;
    } else if (user && user.email) {
      return user.email.split('@')[0];
    }
    return 'Utilisateur';
  }
  
  logout(): void {
    this.authService.signOut();
    this.router.navigate(['/auth/login']);
  }

  getSubscriptionIcon(status: SubscriptionStatus): string {
    if (!status) return 'bi-cart-plus';
    
    switch (status.status) {
      case 'trialing':
        return 'bi-hourglass-split';
      case 'active':
        return 'bi-check-circle-fill';
      case 'past_due':
        return 'bi-exclamation-triangle-fill';
      case 'canceled':
        return 'bi-x-circle-fill';
      case 'unpaid':
        return 'bi-exclamation-circle-fill';
      default:
        return 'bi-cart-plus';
    }
  }

  getSubscriptionStatusText(status: SubscriptionStatus): string {
    console.log('🟡 getSubscriptionStatusText called with:', JSON.stringify(status, null, 2));
    if (!status?.status) {
      console.log('🟡 No status or status.status is null/undefined, returning "S\'abonner"');
      return 'S\'abonner';
    }
    
    const statusLower = status.status.toLowerCase();
    console.log('🟡 Status after toLowerCase:', statusLower);
    
    switch (statusLower) {
      case 'trialing':
        const days = status.daysLeftInTrial || 30;
        console.log('🟡 Trialing status detected, days left:', days);
        return `Essai gratuit (${days}j)`;
      case 'active':
        console.log('🟡 Active status detected');
        return 'Abonné';
      case 'past_due':
        console.log('🟡 Past due status detected');
        return 'Paiement en retard';
      case 'canceled':
        console.log('🟡 Canceled status detected');
        return 'Abonnement annulé';
      case 'unpaid':
        console.log('🟡 Unpaid status detected');
        return 'Paiement requis';
      default:
        console.log('🟡 Unknown status:', statusLower);
        return 'S\'abonner';
    }
  }

  getSubscriptionStatusClass(status: SubscriptionStatus): string {
    console.log('🟡 getSubscriptionStatusClass called with:', JSON.stringify(status, null, 2));
    if (!status?.status) {
      console.log('🟡 No status, returning btn-primary');
      return 'btn-primary';
    }
    
    const statusLower = status.status.toLowerCase();
    console.log('🟡 Status class for:', statusLower);
    
    switch (statusLower) {
      case 'trialing':
        return 'btn-info';
      case 'active':
        return 'btn-success';
      case 'past_due':
      case 'unpaid':
        return 'btn-warning';
      case 'canceled':
        return 'btn-danger';
      default:
        return 'btn-primary';
    }
  }
}
