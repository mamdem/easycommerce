import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StoreService, StoreSettings } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';

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
  
  constructor(
    private authService: AuthService,
    private storeService: StoreService,
    private router: Router,
    private toastService: ToastService
  ) {}
  
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
}
