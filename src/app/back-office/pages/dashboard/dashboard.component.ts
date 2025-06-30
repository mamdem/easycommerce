import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StoreService, StoreData, StoreSettings } from '../../../core/services/store.service';
import { ToastService } from '../../../core/services/toast.service';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { map, switchMap } from 'rxjs/operators';
import { Store } from '../../../core/models/store.model';
import { User } from '../../../core/models/user.model';
import { CartService } from '../../../core/services/cart.service';
import { Observable, of, Subscription } from 'rxjs';
import { SubscriptionService, SubscriptionStatus } from '../../../core/services/subscription.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDrawerComponent } from '../../../dashboard/components/notification-drawer/notification-drawer.component';

@Component({
  selector: 'app-dashboard', 
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationDrawerComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Information de la boutique
  storeInfo: any = {
    name: 'Ma Boutique',
    url: 'ma-boutique',
    status: 'Actif',
    productsCount: 12,
    revenue: {
      today: 240,
      week: 1850,
      month: 7520,
      total: 24680
    },
    orders: {
      pending: 5,
      processing: 3,
      shipped: 8,
      completed: 42
    }
  };
  
  // Boutique sélectionnée
  selectedStore: StoreSettings | null = null;
  selectedStoreId: string | null = null;
  loading: boolean = true;
  
  // Produits récents
  recentProducts: any[] = [
    { id: 'P001', name: 'Produit 1', category: 'Électronique', price: 99.99, stock: 15 },
    { id: 'P002', name: 'Produit 2', category: 'Mode', price: 29.99, stock: 8 },
    { id: 'P003', name: 'Produit 3', category: 'Maison', price: 49.99, stock: 0 },
    { id: 'P004', name: 'Produit 4', category: 'Sport', price: 59.99, stock: 3 }
  ];
  
  // Commandes récentes
  recentOrders: any[] = [
    { id: 'C001', date: '2023-07-15', customer: 'Jean Dupont', total: 129.99, status: 'Livré' },
    { id: 'C002', date: '2023-07-16', customer: 'Marie Martin', total: 89.99, status: 'En attente' },
    { id: 'C003', date: '2023-07-17', customer: 'Pierre Durand', total: 159.99, status: 'Expédiée' },
    { id: 'C004', date: '2023-07-18', customer: 'Sophie Petit', total: 99.99, status: 'En cours' }
  ];

  // Section active
  activeSection: string = 'dashboard';
  
  // États de l'utilisateur
  isMerchantStatus: boolean = false;
  hasStoreStatus: boolean = false;

  // Ajouter une propriété pour stocker les boutiques de l'utilisateur
  userStores: StoreSettings[] = [];

  // Ajouter la propriété userMenuOpen
  userMenuOpen: boolean = false;

  currentUser: User | null = null;

  cartItemsCount = 0;
  storeUrl: string = '';

  notificationsCount = 0;

  subscriptionStatus: SubscriptionStatus | null = null;
  private subscriptionStatusSub: Subscription | null = null;

  isNotificationDrawerOpen = false;
  notifications: any[] = [
    {
      id: 1,
      type: 'order',
      icon: 'bi-cart-check',
      message: 'Nouvelle commande reçue',
      time: 'Il y a 5 minutes',
      isUnread: true
    },
    {
      id: 2,
      type: 'review',
      icon: 'bi-star',
      message: 'Nouvel avis client',
      time: 'Il y a 2 heures',
      isUnread: false
    },
    {
      id: 3,
      type: 'stock',
      icon: 'bi-box-seam',
      message: 'Stock faible pour "Produit X"',
      time: 'Il y a 1 jour',
      isUnread: false
    }
  ];

  constructor(
    private authService: AuthService,
    private storeService: StoreService,
    private toastService: ToastService,
    private router: Router,
    private cartService: CartService,
    private subscriptionService: SubscriptionService,
    private notificationService: NotificationService
  ) {
    this.loadUserData();
  }

  ngOnInit(): void {
    this.checkUserStatus();
    this.updateUserStatus();
    this.loadSelectedStore();
    this.loadUserStores();
    this.loadNotifications();
    this.loadNotificationsCount();

    // S'abonner aux changements du panier
    this.cartService.cartItems$.subscribe(items => {
      this.cartItemsCount = items.reduce((total, item) => total + item.quantity, 0);
    });

    // S'abonner une seule fois aux changements de statut
    this.subscriptionStatusSub = this.subscriptionService.getSubscriptionStatus()
      .subscribe(status => {
        this.subscriptionStatus = status;
      });
  }

  ngOnDestroy() {
    // Se désabonner pour éviter les fuites de mémoire
    if (this.subscriptionStatusSub) {
      this.subscriptionStatusSub.unsubscribe();
    }
  }
  
  /**
   * Charge la boutique sélectionnée
   */
  loadSelectedStore(): void {
    // Vérifier s'il y a un storeId stocké dans localStorage
    this.selectedStoreId = localStorage.getItem('selectedStoreId');
    
    if (this.selectedStoreId) {
      this.loading = true;
      
      // Charger les données de la boutique sélectionnée
      this.storeService.getStoreById(this.selectedStoreId).subscribe(
        (store) => {
          this.selectedStore = store as any;
          this.loading = false;
          
          if (store) {
            // Mettre à jour les informations de la boutique
            this.storeInfo.name = store.storeName || store.legalName || this.storeInfo.name;
            this.storeInfo.url = store.id || this.storeInfo.url;
            
            // Appliquer le thème de la boutique avec les couleurs
            console.log('Couleurs de la boutique:', {
              primary: store.primaryColor,
              secondary: store.secondaryColor
            });
            
            if (store.primaryColor && store.secondaryColor) {
              this.storeService.applyStoreTheme(store.primaryColor, store.secondaryColor);
              this.setRgbValues(store.primaryColor, store.secondaryColor);
            }
            
            // Charger les données détaillées
            this.loadStoreData();
          } else {
            this.toastService.error('Boutique non trouvée, veuillez en sélectionner une autre', 'Erreur');
            this.router.navigate(['/home']);
          }
        },
        (error) => {
          console.error('Erreur lors du chargement de la boutique:', error);
          this.loading = false;
          this.toastService.error('Impossible de charger la boutique sélectionnée', 'Erreur');
        }
      );
    } else {
      // S'il n'y a pas de boutique sélectionnée, charger la première boutique de l'utilisateur
      this.loading = true;
      this.storeService.getStoreSettings().subscribe(
        (stores) => {
          if (stores && stores.length > 0) {
            const firstStore = stores[0] as any;
            this.selectedStore = firstStore;
            this.selectedStoreId = firstStore.id;
            
            // Stocker l'ID pour les prochaines visites
            localStorage.setItem('selectedStoreId', firstStore.id || '');
            
            // Mettre à jour les informations de la boutique
            this.storeInfo.name = firstStore.storeName || firstStore.legalName || this.storeInfo.name;
            this.storeInfo.url = firstStore.id || this.storeInfo.url;
            
            // Appliquer le thème de la boutique
            console.log('Couleurs de la première boutique:', {
              primary: firstStore.primaryColor,
              secondary: firstStore.secondaryColor
            });
            
            if (firstStore.primaryColor && firstStore.secondaryColor) {
              this.storeService.applyStoreTheme(firstStore.primaryColor, firstStore.secondaryColor);
            }
            
            // Charger les données détaillées
            this.loadStoreData();
          } else {
            this.toastService.warning('Vous n\'avez pas encore de boutique, créez-en une !', 'Information');
            this.router.navigate(['/store-creation']);
          }
          this.loading = false;
        },
        (error) => {
          console.error('Erreur lors du chargement des boutiques:', error);
          this.loading = false;
          this.toastService.error('Impossible de charger vos boutiques', 'Erreur');
        }
      );
    }
  }
  
  /**
   * Mettre à jour le statut marchand/boutique de l'utilisateur
   */
  updateUserStatus(): void {
    // Vérifier si l'utilisateur est un marchand (synchrone)
    this.isMerchantStatus = this.authService.isMerchant();
    
    // Vérifier si l'utilisateur a une boutique (asynchrone)
    this.storeService.getUserStore().pipe(
      map(store => !!store)
    ).subscribe((hasStore: boolean) => {
      this.hasStoreStatus = hasStore;
    });
  }
  
  /**
   * Détecter la section active en fonction de l'URL
   */
  detectActiveSection(): void {
    const url = this.router.url;
    
    if (url.includes('/dashboard/products')) {
      this.activeSection = 'products';
    } else if (url.includes('/dashboard/orders')) {
      this.activeSection = 'orders';
    } else if (url.includes('/dashboard/customers')) {
      this.activeSection = 'customers';
    } else if (url.includes('/dashboard/statistics')) {
      this.activeSection = 'statistics';
    } else if (url.includes('/dashboard/settings')) {
      this.activeSection = 'settings';
    } else {
      this.activeSection = 'dashboard';
    }
    
    console.log('Section active:', this.activeSection);
  }
  
  /**
   * Vérifier le statut de l'utilisateur
   */
  checkUserStatus(): void {
    const user = this.authService.getCurrentUser();
    if (!user) {
      console.log('Utilisateur non connecté, redirection vers la page de connexion');
      this.toastService.warning('Veuillez vous connecter pour accéder à votre dashboard', 'Accès refusé');
      this.router.navigate(['/auth/login']);
      return;
    }
  }
  
  /**
   * Fonction pour charger les données de la boutique
   */
  loadStoreData(): void {
    try {
      // Cette fonction sera étendue pour charger les vraies données depuis le backend
      console.log('Chargement des données pour la boutique:', this.selectedStoreId);
      
      // Pour l'instant, on utilise des données fictives
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      this.toastService.error('Impossible de charger les données de la boutique', 'Erreur');
    }
  }
  
  /**
   * Redirection vers la création de boutique
   */
  goToStoreCreation(): void {
    this.router.navigate(['/store-creation']);
  }
  
  /**
   * Retour à la liste des boutiques
   */
  goToStoreList(): void {
    this.router.navigate(['/home']);
  }
  
  /**
   * Déconnexion
   */
  async logout(): Promise<void> {
    try {
      await this.authService.signOut();
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  }

  // Vérifier si l'utilisateur est un marchand
  isMerchant(): boolean {
    return this.isMerchantStatus;
  }

  // Vérifier si l'utilisateur a une boutique
  hasStore(): boolean {
    return this.hasStoreStatus;
  }
  
  /**
   * Vérifier et stocker en cache le statut de l'utilisateur
   * Évite les appels multiples aux méthodes qui peuvent créer une boucle
   */
  setUserStatus(): { isMerchant: boolean, hasStore: boolean } {
    return { 
      isMerchant: this.isMerchantStatus, 
      hasStore: this.hasStoreStatus 
    };
  }

  /**
   * Affiche la boutique (vue publique)
   */
  viewStore(): void {
    if (this.selectedStore && this.selectedStore.id) {
      this.router.navigate(['/store', this.selectedStore.id]);
    } else {
      this.toastService.warning('Veuillez d\'abord sélectionner une boutique');
    }
  }

  /**
   * Définir les valeurs RGB des couleurs pour utilisation dans les styles CSS
   */
  private setRgbValues(primaryColor: string, secondaryColor: string): void {
    // Convertir la couleur primaire en RGB
    const primaryRgb = this.hexToRgb(primaryColor);
    const secondaryRgb = this.hexToRgb(secondaryColor);
    
    // Définir les variables CSS
    document.documentElement.style.setProperty('--primary-color-rgb', primaryRgb);
    document.documentElement.style.setProperty('--secondary-color-rgb', secondaryRgb);
  }
  
  /**
   * Convertir une couleur hexadécimale en valeurs RGB
   */
  private hexToRgb(hex: string): string {
    // Supprimer le # si présent
    hex = hex.replace('#', '');
    
    // Convertir les valeurs hexadécimales en décimal
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Retourner la chaîne RGB
    return `${r}, ${g}, ${b}`;
  }

  /**
   * Charge toutes les boutiques de l'utilisateur
   */
  loadUserStores(): void {
    console.log('Chargement des boutiques dans le dashboard...');
    this.loading = true;
    
    // Obtenir l'utilisateur courant
    const currentUser = this.authService.getCurrentUser();
    console.log('Utilisateur courant:', currentUser);

    if (!currentUser) {
      console.log('Aucun utilisateur connecté');
      this.loading = false;
      this.toastService.error('Utilisateur non connecté');
      return;
    }

    // Utiliser getUserStores pour la cohérence avec la navbar
    this.storeService.getUserStores().subscribe({
      next: (stores) => {
        console.log('Boutiques récupérées dans le dashboard:', stores);
        this.userStores = stores;
        
        // Si aucune boutique n'est sélectionnée
        if (!this.selectedStore) {
          const savedStoreId = localStorage.getItem('selectedStoreId');
          console.log('ID de boutique sauvegardé:', savedStoreId);
          
          if (savedStoreId && stores.some(store => store.id === savedStoreId)) {
            console.log('Sélection de la boutique sauvegardée:', savedStoreId);
              this.selectStore(savedStoreId);
          } else if (stores.length > 0) {
            console.log('Sélection de la première boutique:', stores[0].id);
            this.selectStore(stores[0].id || '');
          }
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des boutiques:', error);
        this.loading = false;
        this.toastService.error('Impossible de charger vos boutiques', 'Erreur');
      }
    });
  }

  /**
   * Sélectionne une boutique
   */
  selectStore(storeId: string): void {
    if (!storeId) {
      this.toastService.error('ID de boutique invalide', 'Erreur');
      return;
    }

    // Si l'option "nouvelle boutique" est sélectionnée
    if (storeId === 'new') {
      this.router.navigate(['/store-creation']);
      return;
    }
    
    console.log('Sélection de la boutique:', storeId);
    
    // Éviter de recharger si c'est déjà la boutique sélectionnée
    if (this.selectedStoreId === storeId) {
      console.log('Cette boutique est déjà sélectionnée');
      return;
    }
    
    this.loading = true;
    
    this.storeService.getStoreById(storeId).subscribe({
      next: (store) => {
        if (store) {
          console.log('Boutique sélectionnée:', store);
          this.selectedStore = store;
          this.selectedStoreId = storeId;
          
          // Sauvegarder l'ID pour les visites futures
          localStorage.setItem('selectedStoreId', storeId);
          
          // Mettre à jour les informations de la boutique
          this.storeInfo.name = store.storeName || store.legalName || this.storeInfo.name;
          this.storeInfo.url = store.id || this.storeInfo.url;
          
          // Appliquer les couleurs du thème
          if (store.primaryColor && store.secondaryColor) {
            console.log('Application des couleurs:', store.primaryColor, store.secondaryColor);
            this.storeService.applyStoreTheme(store.primaryColor, store.secondaryColor);
            this.setRgbValues(store.primaryColor, store.secondaryColor);
          }
          
          // Charger les données de la boutique
          this.loadStoreData();
          
          this.toastService.success(`Boutique "${store.storeName || store.legalName || 'Ma Boutique'}" sélectionnée`);
        } else {
          this.toastService.error('Boutique introuvable', 'Erreur');
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la sélection de la boutique:', error);
        this.loading = false;
        this.toastService.error('Impossible de sélectionner cette boutique', 'Erreur');
      }
    });
  }

  /**
   * Gère le changement de sélection dans le select
   */
  onStoreSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;
    if (select) {
      this.selectStore(select.value);
    }
  }

  async loadUserData() {
    try {
      // Charger les informations de l'utilisateur
      this.currentUser = await this.authService.getCurrentUser();
      if (!this.currentUser) {
        this.router.navigate(['/auth/login']);
        return;
      }

      // Charger les boutiques de l'utilisateur
      this.storeService.getUserStores().subscribe(
        stores => {
          this.userStores = stores;
          if (stores.length > 0) {
            this.selectedStore = stores[0];
          }
          this.loading = false;
        },
        error => {
          console.error('Erreur lors du chargement des boutiques:', error);
          this.loading = false;
        }
      );
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      this.loading = false;
    }
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img.classList.contains('store-logo')) {
      img.src = 'assets/default-store-logo.svg';
    } else if (img.classList.contains('user-avatar')) {
      img.src = 'assets/default-avatar.svg';
    }
  }

  /**
   * Charge les notifications (à implémenter avec votre service de notifications)
   */
  private loadNotifications(): void {
    // Pour l'instant, on compte juste les notifications non lues
    this.notificationsCount = this.notifications.filter(n => n.isUnread).length;
  }

  getSubscriptionStatusText(status: SubscriptionStatus): string {
    if (!status?.status) return 'S\'abonner';
    
    switch (status.status.toLowerCase()) {
      case 'trialing':
        const days = status.daysLeftInTrial || 30;
        return `Essai gratuit (${days}j)`;
      case 'active':
        return 'Abonné';
      case 'past_due':
        return 'Paiement en retard';
      case 'canceled':
        return 'Renouveler';
      case 'unpaid':
        return 'Paiement requis';
      default:
        return 'S\'abonner';
    }
  }

  getSubscriptionStatusClass(status: SubscriptionStatus): string {
    if (!status?.status) return 'btn-primary';
    
    switch (status.status.toLowerCase()) {
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

  getSubscriptionIcon(status: SubscriptionStatus): string {
    if (!status?.status) return 'bi-cart-plus';
    
    switch (status.status.toLowerCase()) {
      case 'trialing':
        return 'bi-hourglass-split';
      case 'active':
        return 'bi-check-circle-fill';
      case 'past_due':
        return 'bi-exclamation-triangle-fill';
      case 'canceled':
        return 'bi-arrow-clockwise';
      case 'unpaid':
        return 'bi-exclamation-circle-fill';
      default:
        return 'bi-cart-plus';
    }
  }

  goToSubscriptionPage(): void {
    console.log('🟣 Navigation vers la page d\'abonnement');
    this.router.navigate(['/payment']);
  }

  toggleNotificationDrawer() {
    this.isNotificationDrawerOpen = !this.isNotificationDrawerOpen;
    // Empêcher le défilement du body quand le drawer est ouvert
    document.body.style.overflow = this.isNotificationDrawerOpen ? 'hidden' : '';
  }

  markAllNotificationsAsRead() {
    this.notifications = this.notifications.map(notification => ({
      ...notification,
      isUnread: false
    }));
    this.notificationsCount = 0;
    this.toastService.success('Toutes les notifications ont été marquées comme lues');
  }

  private loadNotificationsCount() {
    if (this.selectedStore?.id) {
      this.notificationService.getUnreadCount(this.selectedStore.id).subscribe(
        count => {
          this.notificationsCount = count;
        }
      );
    }
  }
} 