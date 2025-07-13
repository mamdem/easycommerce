import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StoreService, StoreData, StoreSettings } from '../../../core/services/store.service';
import { ToastService } from '../../../core/services/toast.service';
import { NavbarComponent } from '../../../shared/navbar/navbar.component';
import { map, switchMap, catchError } from 'rxjs/operators';
import { Store } from '../../../core/models/store.model';
import { User } from '../../../core/models/user.model';
import { CartService } from '../../../core/services/cart.service';
import { Observable, of, Subscription, forkJoin } from 'rxjs';
import { SubscriptionService, SubscriptionStatus } from '../../../core/services/subscription.service';
import { NotificationService, Notification } from '../../../core/services/notification.service';
import { NotificationDrawerComponent } from '../../../dashboard/components/notification-drawer/notification-drawer.component';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { trigger, transition, style, animate } from '@angular/animations';
import { TransactionService, Transaction, StoreTransaction } from '../../../core/services/transaction.service';
import { NabooPayService } from '../../../core/services/naboo-pay.service';
import { OverviewComponent } from './components/overview/overview.component';

@Component({
  selector: 'app-dashboard', 
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    NotificationDrawerComponent,
    NgbDropdownModule,
    FormsModule,
    MatDialogModule,
    OverviewComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('liftUpDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
          style({ opacity: 0, transform: 'translateY(20px)' }))
      ])
    ])
  ]
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
  
  // États de l'abonnement
  isSubscribed: boolean = false;
  isSubscriptionExpired: boolean = false;
  paymentStatus: 'pending' | 'paid' | 'failed' = 'pending';
  isTrialPeriod: boolean = false;
  trialDaysLeft: number = 0;
  
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
  notifications: Notification[] = [];

  subscriptionStatus: SubscriptionStatus | null = null;
  private subscriptionStatusSub: Subscription | null = null;

  isNotificationDrawerOpen = false;

  showLogoutConfirm = false;

  // Ajouter les propriétés pour les transactions
  storeTransactions: Transaction[] = [];
  transactionDetails: any[] = [];

  currentTransaction: StoreTransaction | null = null;

  // Ajouter cette propriété
  lastPaymentDate: Date | null = null;

  constructor(
    private authService: AuthService,
    private storeService: StoreService,
    private toastService: ToastService,
    private router: Router,
    private cartService: CartService,
    private subscriptionService: SubscriptionService,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private transactionService: TransactionService,
    private nabooPayService: NabooPayService
  ) {
    this.loadUserData();
  }

  ngOnInit(): void {
    this.checkUserStatus();
    this.updateUserStatus();
    this.loadSelectedStore();
    this.loadUserStores();
    this.checkTransactionStatus();

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
        (store: StoreSettings | null) => {
          if (store) {
            this.selectedStore = store;
            this.loading = false;
            this.checkTrialPeriod();
            
            // Vérifier le statut d'abonnement
            this.checkStoreSubscriptionStatus(store);
            
            // Mettre à jour les informations de la boutique
            this.storeInfo.name = store.storeName || store.legalName || this.storeInfo.name;
            this.storeInfo.url = store.id || this.storeInfo.url;
            
            // Appliquer le thème de la boutique avec les couleurs
            if (store.primaryColor && store.secondaryColor) {
              this.storeService.applyStoreTheme(store.primaryColor, store.secondaryColor);
              this.setRgbValues(store.primaryColor, store.secondaryColor);
            }
            
            // Charger les données détaillées
            this.loadStoreData();
            
            // Charger les notifications maintenant que la boutique est sélectionnée
            this.loadNotifications();
            this.loadNotificationsCount();
          } else {
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
      this.storeService.getUserStores().subscribe(
        (stores) => {
          if (stores && stores.length > 0) {
            const firstStore = stores[0];
            this.selectedStore = firstStore;
            this.selectedStoreId = firstStore.id || null;
            
            // Récupérer la transaction courante depuis le document de la première boutique
            if (firstStore.currentTransaction) {
              this.currentTransaction = firstStore.currentTransaction;
              console.log('Transaction courante de la première boutique:', this.currentTransaction);
            }
            
            // Stocker l'ID pour les prochaines visites
            if (firstStore.id) {
              localStorage.setItem('selectedStoreId', firstStore.id);
            }
            
            // Mettre à jour les informations de la boutique
            this.storeInfo.name = firstStore.storeName || firstStore.legalName || this.storeInfo.name;
            this.storeInfo.url = firstStore.id || this.storeInfo.url;
            
            // Appliquer le thème de la boutique
            if (firstStore.primaryColor && firstStore.secondaryColor) {
              this.storeService.applyStoreTheme(firstStore.primaryColor, firstStore.secondaryColor);
            }
                
            // Charger les données détaillées
            this.loadStoreData();
            
            // Charger les notifications maintenant que la boutique est sélectionnée
            this.loadNotifications();
            this.loadNotificationsCount();
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
  logout() {
    console.log('Ouverture du dialogue de déconnexion');
    this.showLogoutConfirm = true;
  }

  async confirmLogout() {
    console.log('Confirmation de la déconnexion');
    try {
      // Nettoyer les données locales
      localStorage.clear();
      sessionStorage.clear();
      
      // Se déconnecter via le service d'authentification
      await this.authService.logout();
      
      // Rediriger vers la page d'accueil
      this.router.navigate(['/']);
      this.toastService.success('Vous avez été déconnecté avec succès');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      this.toastService.error('Une erreur est survenue lors de la déconnexion');
    } finally {
      this.showLogoutConfirm = false;
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
   * Vérifier si l'abonnement est expiré (plus de 30 jours)
   */
  private checkSubscriptionExpiration(transactionDate: string): boolean {
    const paymentDate = new Date(transactionDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - paymentDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  }

  /**
   * Vérifie le statut d'abonnement pour une boutique donnée
   */
  private checkStoreSubscriptionStatus(store: StoreSettings): void {
    if (store.currentTransaction?.orderId) {
      this.nabooPayService.getTransactionDetails(store.currentTransaction.orderId).subscribe({
        next: (transactionDetails) => {
          console.log('Détails de la transaction:', transactionDetails);
          
          // Vérifier l'expiration
          this.isSubscriptionExpired = this.checkSubscriptionExpiration(transactionDetails.created_at);
          
          this.isSubscribed = transactionDetails.transaction_status === 'paid' && !this.isSubscriptionExpired;
          this.paymentStatus = this.isSubscriptionExpired ? 'failed' : transactionDetails.transaction_status;
          
          if (transactionDetails.created_at) {
            this.lastPaymentDate = new Date(transactionDetails.created_at);
          }

          // Mettre à jour les informations de période d'essai
          this.checkTrialPeriod();

          // Mettre à jour le localStorage
          if (this.isSubscribed) {
            localStorage.setItem('subscriptionStatus', 'active');
            localStorage.setItem('lastPaymentDate', this.lastPaymentDate?.toISOString() || '');
          } else {
            localStorage.setItem('subscriptionStatus', 'inactive');
          }
        },
        error: (error) => {
          console.error('Erreur lors de la vérification du statut de la transaction:', error);
          this.isSubscribed = false;
          this.paymentStatus = 'failed';
          localStorage.setItem('subscriptionStatus', 'inactive');
          
          // Mettre à jour les informations de période d'essai même en cas d'erreur
          this.checkTrialPeriod();
        }
      });
    } else {
      // Réinitialiser le statut si pas de transaction
      this.isSubscribed = false;
      this.paymentStatus = 'pending';
      this.lastPaymentDate = null;
      localStorage.setItem('subscriptionStatus', 'inactive');
      
      // Mettre à jour les informations de période d'essai
      this.checkTrialPeriod();
    }
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

          // Vérifier le statut d'abonnement
          this.checkStoreSubscriptionStatus(store);
          
          // Mettre à jour les informations de période d'essai
          this.checkTrialPeriod();
          
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
  onStoreSelect(event: any) {
    const selectedStoreId = event.target.value;
    
    if (selectedStoreId === 'new') {
      this.router.navigate(['/store-creation']);
      return;
    }
    
    this.loading = true;
    this.storeService.updateSelectedStore(selectedStoreId);
    
    this.storeService.getStoreById(selectedStoreId).subscribe({
      next: (store) => {
        if (store) {
          this.selectedStore = store;
          this.checkStoreSubscriptionStatus(store);
          // Mettre à jour les informations de période d'essai
          this.checkTrialPeriod();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la boutique:', error);
        this.loading = false;
      }
    });
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
   * Charge les notifications
   */
  private loadNotifications(): void {
    if (this.selectedStore?.id) {
      this.notificationService.getStoreNotifications(this.selectedStore.id).subscribe({
        next: (notifications: Notification[]) => {
          this.notifications = notifications;
          this.notificationsCount = notifications.filter(n => n.status === 'UNREAD').length;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des notifications:', error);
        }
      });
    }
  }

  getSubscriptionStatusText(status: SubscriptionStatus): string {
    if (!status?.status) return 'S\'abonner';
    
    switch (status.status.toLowerCase()) {
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
    if (this.selectedStore?.id) {
      this.router.navigate(['/payment', this.selectedStore.id]);
    } else {
      this.toastService.error('Veuillez d\'abord sélectionner une boutique');
    }
  }

  toggleNotificationDrawer() {
    this.isNotificationDrawerOpen = !this.isNotificationDrawerOpen;
    // Empêcher le défilement du body quand le drawer est ouvert
    document.body.style.overflow = this.isNotificationDrawerOpen ? 'hidden' : '';
  }

  markAllNotificationsAsRead() {
    if (this.selectedStore?.id) {
      this.notificationService.markAllAsRead(this.selectedStore.id).then(() => {
    this.notifications = this.notifications.map(notification => ({
      ...notification,
          status: 'READ' as const
    }));
    this.notificationsCount = 0;
        this.loadNotificationsCount(); // Recharger le compteur
    this.toastService.success('Toutes les notifications ont été marquées comme lues');
      }).catch(error => {
        console.error('Erreur lors du marquage des notifications:', error);
        this.toastService.error('Erreur lors du marquage des notifications');
      });
    }
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

  /**
   * Vérifie si la boutique est en période d'essai
   * @returns boolean
   */
  checkTrialPeriod(): void {
    if (this.selectedStore) {
      const creationDate = new Date(this.selectedStore.createdAt);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - creationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      this.isTrialPeriod = diffDays <= 15;
      this.trialDaysLeft = Math.max(15 - diffDays, 0);
    }
  }

  /**
   * Charge les transactions de la boutique
   */
  loadStoreTransactions(): void {
    if (!this.selectedStore?.id) return;

    this.transactionService.getStoreTransactions(this.selectedStore.id)
      .subscribe({
        next: (transactions) => {
          this.storeTransactions = transactions;
          console.log('Transactions de la boutique:', transactions);

          // Pour chaque transaction, récupérer les détails depuis NabooPay
          const detailsRequests = transactions
            .filter(transaction => {
              // Vérifier si la transaction a un ID valide
              if (!transaction.transactionId) {
                console.log('Transaction sans ID trouvée:', transaction);
                return false;
              }
              return true;
            })
            .map(transaction => {
              console.log('Récupération des détails pour la transaction:', transaction.transactionId);
              return this.nabooPayService.getTransactionDetails(transaction.transactionId!).pipe(
                catchError(error => {
                  // Log détaillé de l'erreur
                  console.error(`Erreur détaillée pour la transaction ${transaction.transactionId}:`, {
                    error,
                    transaction,
                    timestamp: new Date().toISOString()
                  });
                  
                  // Si l'erreur est "Resource not found", on peut marquer la transaction comme échouée
                  if (error?.message?.includes('Resource not found')) {
                    this.transactionService.updateTransactionStatus(
                      this.selectedStore!.id!,
                      transaction.transactionId!,
                      'failed'
                    ).catch(updateError => {
                      console.error('Erreur lors de la mise à jour du statut de la transaction:', updateError);
                    });
                  }
                  
                  return of(null);
                })
              );
            });

          if (detailsRequests.length > 0) {
            // Attendre que toutes les requêtes soient terminées
            forkJoin(detailsRequests).subscribe(details => {
              // Filtrer les résultats null (erreurs)
              this.transactionDetails = details.filter(detail => detail !== null);
              console.log('Détails des transactions depuis NabooPay:', this.transactionDetails);
            });
          } else {
            console.log('Aucune transaction avec transactionId trouvée');
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des transactions:', error);
          this.toastService.error('Impossible de charger les transactions');
        }
      });
  }

  private checkTransactionStatus(): void {
    const lastTransactionId = localStorage.getItem('lastTransactionId');
    if (lastTransactionId) {
      this.nabooPayService.getTransactionDetails(lastTransactionId).subscribe({
        next: (response) => {
          console.log('Statut de la transaction:', response);
          
          // Vérifier l'expiration
          this.isSubscriptionExpired = this.checkSubscriptionExpiration(response.created_at);
          
          if (response.transaction_status === 'paid' && !this.isSubscriptionExpired) {
            this.isSubscribed = true;
            this.paymentStatus = 'paid';
            this.lastPaymentDate = new Date(response.created_at);
            localStorage.setItem('subscriptionStatus', 'active');
          } else if (response.transaction_status === 'failed' || this.isSubscriptionExpired) {
            this.isSubscribed = false;
            this.paymentStatus = 'failed';
            localStorage.setItem('subscriptionStatus', 'inactive');
          }
        },
        error: (error) => {
          console.error('Erreur lors de la vérification du statut:', error);
        }
      });
    }
  }
} 