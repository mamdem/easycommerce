import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { StoreService } from '../../../../core/services/store.service';
import { OrderService } from '../../../../core/services/order.service';
import { Store } from '../../../../core/models/store.model';
import { Order, OrderStatus } from '../../../../core/models/order.model';
import { environment } from '../../../../../environments/environment';
import { map, switchMap } from 'rxjs/operators';
import { forkJoin } from 'rxjs';

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
})
export class OverviewComponent implements OnInit, AfterViewInit {
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

  constructor(
    private storeService: StoreService,
    private orderService: OrderService
  ) {
    this.loadAmountsVisibility();
  }

  ngOnInit() {
    this.loadStoreData();
  }

  ngAfterViewInit() {
    // Les graphiques seront initialisés une fois les données chargées
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

  private loadStoreData() {
    this.storeService.getSelectedStore().pipe(
      switchMap(store => {
        if (store) {
          this.storeInfo.legalName = store.legalName;
          this.storeInfo.storeName = store.storeName;
          this.storeInfo.url = store.id?.split('_')[1] || '';
          
          // Charger les commandes de la boutique
          return this.orderService.getOrdersByStore(this.storeInfo.url);
        }
        return [];
      })
    ).subscribe({
      next: (orders: Order[]) => {
        this.processOrders(orders);
        this.initCharts();
      },
      error: error => {
        console.error('Erreur lors du chargement des données:', error);
      }
    });
  }

  private processOrders(orders: Order[]) {
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
      this.storeInfo.orders[order.status]++;

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
    this.initSalesChart();
    this.initOrdersChart();
  }
} 