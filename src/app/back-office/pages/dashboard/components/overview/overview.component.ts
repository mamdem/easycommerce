import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef, Input, OnChanges, SimpleChanges, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { StoreService } from '../../../../../core/services/store.service';
import { OrderService } from '../../../../../core/services/order.service';
import { Store } from '../../../../../core/models/store.model';
import { Order, OrderStatus } from '../../../../../core/models/order.model';
import { environment } from '../../../../../../environments/environment';
import { map, switchMap, catchError, takeUntil, filter } from 'rxjs/operators';
import { forkJoin, of, Subject, fromEvent } from 'rxjs';
import { SubscriptionService, SubscriptionStatus } from '../../../../../core/services/subscription.service';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner.component';
import { NabooPayService } from '../../../../../core/services/naboo-pay.service';
import { TransactionService, Transaction, StoreTransaction } from '../../../../../core/services/transaction.service';
import { ToastService } from '../../../../../core/services/toast.service';

Chart.register(...registerables);

// Clé pour le stockage local
const AMOUNTS_VISIBILITY_KEY = 'dashboard_amounts_visibility';

// Interface pour la configuration de visibilité
interface AmountsVisibilityConfig {
  showAmounts: boolean;
  lastUpdated: number;
  storeId?: string;
}

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LoadingSpinnerComponent
  ]
})
export class OverviewComponent implements OnInit, AfterViewInit, OnChanges, OnDestroy {
  @ViewChild('salesChart') salesChartRef!: ElementRef;
  @ViewChild('ordersChart') ordersChartRef!: ElementRef;
  
  salesChart: Chart | undefined;
  ordersChart: Chart | undefined;
  
  private _showAmounts: boolean = false;
  get showAmounts(): boolean {
    return this._showAmounts;
  }
  set showAmounts(value: boolean) {
    this._showAmounts = value;
    this.saveAmountsVisibility(value);
  }

  // États de l'abonnement
  isSubscribed: boolean = false;
  isSubscriptionExpired: boolean = false;
  paymentStatus: 'pending' | 'paid' | 'failed' = 'pending';
  isTrialPeriod: boolean = false;
  trialDaysLeft: number = 0;
  selectedStore: any;

  storeBaseUrl = environment.storeBaseUrl;

  // Information de la boutique
  storeInfo: any = {
    legalName: '',
    storeName: '',
    url: '',
    status: 'Actif',
    productsCount: 0,
    revenue: {
      today: 0,
      week: 0,
      month: 0,
      total: 0
    },
    orders: {
      en_cours: 0,
      valide: 0,
      rejete: 0,
      total: 0
    }
  };

  // Données pour les graphiques
  salesData = {
    labels: [] as string[],
    values: [] as number[]
  };

  ordersData = {
    labels: [] as string[],
    values: [] as number[]
  };

  private destroy$ = new Subject<void>();
  subscriptionStatus: SubscriptionStatus | null = null;

  loading = true;
  isSubscriptionLoading = false;
  isSubscriptionActive = false;
  lastPaymentDate: Date | null = null;

  constructor(
    private storeService: StoreService,
    private orderService: OrderService,
    private subscriptionService: SubscriptionService,
    private nabooPayService: NabooPayService,
    private transactionService: TransactionService,
    private cdr: ChangeDetectorRef,
    private router: Router,
    private toastService: ToastService
  ) {
    this.loadAmountsVisibility();
  }

  ngOnInit() {
    // S'abonner aux changements de boutique
    this.storeService.selectedStore$.pipe(
      takeUntil(this.destroy$),
      switchMap(storeId => {
        if (!storeId) {
          return of(null);
        }
        return this.storeService.getStoreById(storeId);
      }),
      filter(store => !!store) // Ignorer les valeurs null
    ).subscribe({
      next: (store) => {
        if (store) {
          this.selectedStore = store;
          this.storeInfo.legalName = store.legalName;
          this.storeInfo.storeName = store.storeName;
          this.storeInfo.url = store.id?.split('_')[1] || '';
          
          // Vérifier le statut d'abonnement
          if (store.currentTransaction?.orderId) {
            this.nabooPayService.getTransactionDetails(store.currentTransaction.orderId).subscribe({
              next: (transactionDetails) => {
                // Vérifier l'expiration
                this.isSubscriptionExpired = this.checkSubscriptionExpiration(transactionDetails.created_at);
                this.isSubscribed = transactionDetails.transaction_status === 'paid' && !this.isSubscriptionExpired;
                this.paymentStatus = this.isSubscriptionExpired ? 'failed' : transactionDetails.transaction_status;
                
                if (transactionDetails.created_at) {
                  this.lastPaymentDate = new Date(transactionDetails.created_at);
                }
                
                // Vérifier la période d'essai
                this.calculateTrialPeriod();
                
                // Mettre à jour le statut
                this.updateSubscriptionStatus();
          
          // Charger les commandes
                this.loadOrders();
              },
              error: (error) => {
                console.error('Erreur lors de la vérification de la transaction:', error);
                this.isSubscribed = false;
                this.paymentStatus = 'failed';
                
                // Vérifier la période d'essai même en cas d'erreur
                this.calculateTrialPeriod();
                
                this.updateSubscriptionStatus();
                this.loadOrders();
              }
            });
          } else {
            // Pas de transaction en cours
            this.isSubscribed = false;
            this.paymentStatus = 'pending';
            
            // Vérifier la période d'essai même sans transaction
            this.calculateTrialPeriod();
            
            this.updateSubscriptionStatus();
            this.loadOrders();
          }
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la boutique:', error);
        this.loading = false;
      }
    });
  }

  private loadOrders() {
          this.orderService.getOrdersByStore(this.storeInfo.url).subscribe({
            next: (orders) => {
              console.log('🟢 Commandes chargées:', orders);
              this.processOrders(orders);
                  
                  // Initialiser les graphiques et terminer le chargement
                  setTimeout(() => {
                    this.initCharts();
                    this.loading = false;
                    console.log('🟢 Chargement terminé');
                  }, 0);
            },
            error: (error) => {
              console.error('🔴 Erreur lors du chargement des commandes:', error);
        this.loading = false;
      }
    });
  }

  private checkSubscriptionExpiration(transactionDate: string): boolean {
    const paymentDate = new Date(transactionDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - paymentDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 30;
  }

  /**
   * Calcule les informations de période d'essai pour la boutique actuelle
   */
  private calculateTrialPeriod(): void {
    if (this.selectedStore?.createdAt) {
      const creationDate = new Date(this.selectedStore.createdAt);
      const today = new Date();
      const diffTime = Math.abs(today.getTime() - creationDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      this.isTrialPeriod = diffDays <= 15;
      this.trialDaysLeft = Math.max(15 - diffDays, 0);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isSubscribed'] || changes['isSubscriptionExpired'] || 
        changes['paymentStatus'] || changes['isTrialPeriod']) {
      this.updateSubscriptionStatus();
    }
  }

  private updateSubscriptionStatus() {
    this.isSubscriptionActive = this.isSubscribed && !this.isSubscriptionExpired;
    
    if (this.isTrialPeriod) {
      this.storeInfo.status = `Essai gratuit (${this.trialDaysLeft}j)`;
    } else if (this.isSubscriptionActive) {
      this.storeInfo.status = 'Actif';
    } else if (this.isSubscriptionExpired) {
      this.storeInfo.status = 'Abonnement expiré';
    } else if (this.paymentStatus === 'pending') {
      this.storeInfo.status = 'En attente de paiement';
    } else if (this.paymentStatus === 'failed') {
      this.storeInfo.status = 'Paiement échoué';
    } else {
      this.storeInfo.status = 'Inactif';
    }
  }

  ngAfterViewInit() {
    // Initialiser les graphiques si les données sont déjà chargées
    if (!this.loading && this.salesData.values.length > 0) {
      this.initCharts();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Charger la configuration de visibilité des montants
  private loadAmountsVisibility(): void {
    try {
      const savedConfig = localStorage.getItem(AMOUNTS_VISIBILITY_KEY);
      if (savedConfig) {
        const config: AmountsVisibilityConfig = JSON.parse(savedConfig);
        
        // Vérifier si la configuration n'est pas trop ancienne (24h)
        const isExpired = Date.now() - config.lastUpdated > 24 * 60 * 60 * 1000;
        
        if (!isExpired) {
          this._showAmounts = config.showAmounts;
          return;
        }
      }
    } catch (error) {
      console.warn('Erreur lors du chargement de la configuration de visibilité:', error);
    }
    
    // Configuration par défaut : montants visibles si rien n'est enregistré
    this._showAmounts = true;
    this.saveAmountsVisibility(true);
  }

  // Sauvegarder la configuration de visibilité des montants
  private saveAmountsVisibility(showAmounts: boolean): void {
    try {
      const config: AmountsVisibilityConfig = {
        showAmounts,
        lastUpdated: Date.now(),
        storeId: this.storeInfo.url
      };
      
      localStorage.setItem(AMOUNTS_VISIBILITY_KEY, JSON.stringify(config));
    } catch (error) {
      console.warn('Erreur lors de la sauvegarde de la configuration de visibilité:', error);
    }
  }

  // Basculer l'affichage des montants
  toggleAmounts(): void {
    this.showAmounts = !this.showAmounts;
    // Mettre à jour les graphiques
    if (this.salesChart) {
      this.salesChart.destroy();
      this.initSalesChart();
    }
    if (this.ordersChart) {
      this.ordersChart.destroy();
      this.initOrdersChart();
    }
  }

  // Formater le montant pour l'affichage
  formatAmount(amount: number): string {
    if (!this.showAmounts) {
      return '••••••••';
    }
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' FCFA';
  }

  private processOrders(orders: Order[]) {
    console.log('🟢 Traitement des commandes');
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    // Réinitialiser les compteurs
    this.storeInfo.revenue = {
      today: 0,
      week: 0,
      month: 0,
      total: 0
    };

    this.storeInfo.orders = {
      en_cours: 0,
      valide: 0,
      rejete: 0,
      total: orders.length
    };

    // Préparer les données pour les graphiques
    const last6Months = new Array(6).fill(0).map((_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      return {
        label: date.toLocaleDateString('fr-FR', { month: 'short' }),
        month: date.getMonth(),
        year: date.getFullYear(),
        sales: 0,
        orders: 0
      };
    }).reverse();

    // Traiter chaque commande
    orders.forEach(order => {
      // Mettre à jour les compteurs de statut
      switch (order.status) {
        case 'en_cours':
          this.storeInfo.orders.en_cours++;
          break;
        case 'valide':
          this.storeInfo.orders.valide++;
          break;
        case 'rejete':
          this.storeInfo.orders.rejete++;
          break;
      }

      // Mettre à jour les revenus (uniquement pour les commandes validées)
      if (order.status === 'valide') {
        this.storeInfo.revenue.total += order.total;

        if (order.createdAt >= oneDayAgo) {
          this.storeInfo.revenue.today += order.total;
        }
        if (order.createdAt >= oneWeekAgo) {
          this.storeInfo.revenue.week += order.total;
        }
        if (order.createdAt >= oneMonthAgo) {
          this.storeInfo.revenue.month += order.total;
        }

        // Mettre à jour les données des graphiques
        const orderDate = new Date(order.createdAt);
        const monthIndex = last6Months.findIndex(m => 
          m.month === orderDate.getMonth() && m.year === orderDate.getFullYear()
        );

        if (monthIndex !== -1) {
          last6Months[monthIndex].sales += order.total;
          last6Months[monthIndex].orders++;
        }
      }
    });

    // Mettre à jour les données des graphiques
    this.salesData.labels = last6Months.map(m => m.label);
    this.salesData.values = last6Months.map(m => m.sales);
    this.ordersData.labels = last6Months.map(m => m.label);
    this.ordersData.values = last6Months.map(m => m.orders);

    console.log('🟢 Données traitées:', {
      revenue: this.storeInfo.revenue,
      orders: this.storeInfo.orders,
      salesData: this.salesData,
      ordersData: this.ordersData
    });
  }

  private initSalesChart() {
    if (!this.salesChartRef) return;
    
    const ctx = this.salesChartRef.nativeElement.getContext('2d');
    
    this.salesChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.salesData.labels,
        datasets: [{
          label: 'Chiffre d\'affaires',
          data: this.salesData.values,
          fill: true,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          pointBackgroundColor: '#4CAF50',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#4CAF50'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => {
                const value = context.parsed.y;
                return this.showAmounts 
                  ? value.toLocaleString('fr-FR') + ' FCFA'
                  : '••••••••';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              callback: (value) => {
                return this.showAmounts 
                  ? value.toLocaleString('fr-FR') + ' FCFA'
                  : '••••••••';
              }
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  private initOrdersChart() {
    if (!this.ordersChartRef) return;
    
    const ctx = this.ordersChartRef.nativeElement.getContext('2d');
    
    this.ordersChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: this.ordersData.labels,
        datasets: [{
          label: 'Commandes',
          data: this.ordersData.values,
          fill: true,
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          tension: 0.4,
          pointBackgroundColor: '#2196F3',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: '#2196F3'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => {
                return context.parsed.y.toString() + ' commande(s)';
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
            },
            ticks: {
              stepSize: 1
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    });
  }

  private initCharts() {
    console.log('🟢 Initialisation des graphiques');
    // S'assurer que les références sont disponibles
    if (!this.salesChartRef || !this.ordersChartRef) {
      console.log('🔴 Références des graphiques non disponibles');
      setTimeout(() => {
        this.initCharts();
      }, 100);
      return;
    }

    // Détruire les graphiques existants si nécessaire
    if (this.salesChart) {
      this.salesChart.destroy();
    }
    if (this.ordersChart) {
      this.ordersChart.destroy();
    }

    this.initSalesChart();
    this.initOrdersChart();
    this.cdr.detectChanges();
  }

  getStatusClass(): string {
    if (this.isSubscriptionLoading) {
      return 'bg-secondary';
    }
    
    if (this.isTrialPeriod) {
      return 'bg-info';
    }
    
    if (this.isSubscriptionActive) {
      return 'bg-success';
    }
    
    if (this.isSubscriptionExpired) {
      return 'bg-warning text-dark';
    }
    
    if (this.paymentStatus === 'pending') {
      return 'bg-warning text-dark';
    }
    
    return 'bg-danger';
  }

  getStatusIcon(): string {
    if (this.isSubscriptionLoading) {
      return 'bi-hourglass-split';
    }
    
    if (this.isTrialPeriod) {
        return 'bi-hourglass-split';
    }
    
    if (this.isSubscriptionActive) {
        return 'bi-check-circle-fill';
    }
    
    if (this.isSubscriptionExpired) {
        return 'bi-exclamation-triangle-fill';
    }
    
    if (this.paymentStatus === 'pending') {
      return 'bi-clock-history';
    }
    
        return 'bi-x-circle-fill';
  }

  /**
   * Redirige vers la page d'abonnement
   */
  goToSubscriptionPage(): void {
    console.log('🟣 Navigation vers la page d\'abonnement');
    if (this.selectedStore?.id) {
      this.router.navigate(['/payment', this.selectedStore.id]);
    } else {
      this.toastService.error('Veuillez d\'abord sélectionner une boutique');
    }
  }
} 