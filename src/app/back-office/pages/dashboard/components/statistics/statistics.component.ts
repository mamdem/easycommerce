import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService, StoreSettings } from '../../../../../core/services/store.service';
import { OrderService } from '../../../../../core/services/order.service';
import { Order } from '../../../../../core/models/order.model';
import { Store } from '../../../../../core/models/store.model';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { RouterModule } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner.component';
import { Subject, takeUntil, switchMap, filter, of } from 'rxjs';

// Enregistrer la locale française
registerLocaleData(localeFr, 'fr-FR');

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingSpinnerComponent
  ]
})
export class StatisticsComponent implements OnInit, OnDestroy {
  // Référence à l'objet Math pour l'utiliser dans le template
  Math = Math;
  
  // Données pour les statistiques
  salesData = {
    daily: [] as number[],
    weekly: [] as number[],
    monthly: [] as number[]
  };
  
  // Période sélectionnée (daily, weekly, monthly)
  selectedPeriod: string = 'weekly';
  
  // Labels pour les graphiques selon la période
  timeLabels = {
    daily: [] as string[],
    weekly: [] as string[],
    monthly: [] as string[]
  };
  
  // Statistiques globales
  globalStats = {
    totalRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    returningCustomers: 0,
    topSellingProduct: '',
    productsSold: 0
  };
  
  // Données pour les produits les plus vendus
  topProducts: { 
    name: string; 
    quantity: number; 
    revenue: number;
    images?: string[];
    imageUrl?: string;
  }[] = [];
  
  // Données pour les clients les plus actifs
  topCustomers: { name: string; orders: number; spent: number; }[] = [];

  // Couleurs de la boutique
  storeSettings: StoreSettings | null = null;
  primaryColorRgb: string = '';
  secondaryColorRgb: string = '';

  // Données des commandes
  private orders: Order[] = [];
  currentStore!: Store;

  loading = true;

  // Pour la gestion de la destruction du composant
  private destroy$ = new Subject<void>();

  constructor(
    private storeService: StoreService,
    private orderService: OrderService
  ) { }

  ngOnInit(): void {
    console.log('Statistics component initialized');
    
    // S'abonner aux changements de boutique
    this.storeService.selectedStore$.pipe(
      takeUntil(this.destroy$),
      switchMap(storeId => {
        if (!storeId) {
          return of(null);
        }
        return this.storeService.getSelectedStore();
      }),
      filter(store => !!store) // Ignorer les valeurs null
    ).subscribe({
      next: (store) => {
        if (store) {
          this.currentStore = store;
    this.loadStoreSettings();
    this.loadOrders();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la boutique:', error);
      this.loading = false;
      }
    });
  }

  // Charger les commandes
  loadOrders(): void {
    this.loading = true;
    const storeUrl = this.currentStore.id?.split('_')[1] || '';
        this.orderService.getOrdersByStore(storeUrl).subscribe({
          next: (orders) => {
            this.orders = orders;
            this.processOrders();
        this.loading = false;
          },
          error: (error) => {
            console.error('Erreur lors du chargement des commandes:', error);
        this.loading = false;
      }
    });
  }

  // Traiter les commandes pour générer les statistiques
  private processOrders(): void {
    if (!this.orders.length) return;

    // Trier les commandes par date
    const sortedOrders = [...this.orders].sort((a, b) => a.createdAt - b.createdAt);

    // Calculer les statistiques globales
    this.calculateGlobalStats(sortedOrders);

    // Générer les données de ventes par période
    this.generateSalesData(sortedOrders);

    // Calculer les meilleurs produits
    this.calculateTopProducts(sortedOrders);

    // Calculer les meilleurs clients
    this.calculateTopCustomers(sortedOrders);
  }

  private calculateGlobalStats(orders: Order[]): void {
    const validOrders = orders.filter(order => order.status === 'valide');
    
    this.globalStats.totalOrders = validOrders.length;
    this.globalStats.totalRevenue = validOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    this.globalStats.averageOrderValue = this.globalStats.totalOrders > 0 
      ? this.globalStats.totalRevenue / this.globalStats.totalOrders 
      : 0;

    // Calculer le taux de clients récurrents
    const uniqueCustomers = new Set(validOrders.map(order => order.customerInfo?.phone));
    const repeatCustomers = new Set(
      validOrders
        .map(order => order.customerInfo?.phone)
        .filter((phone, index, array) => array.indexOf(phone) !== index)
    );
    this.globalStats.returningCustomers = uniqueCustomers.size > 0 
      ? (repeatCustomers.size / uniqueCustomers.size) * 100 
      : 0;

    // Calculer le nombre total de produits vendus
    this.globalStats.productsSold = validOrders.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
  }

  private generateSalesData(orders: Order[]): void {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
    const validOrders = orders.filter(order => 
      order.status === 'valide' && 
      order.createdAt >= thirtyDaysAgo.getTime()
    );

    // Générer les données journalières
    const dailyData = new Map<string, number>();
    const weeklyData = new Map<string, number>();
    const monthlyData = new Map<string, number>();

    for (let i = 0; i < 30; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateStr = date.toLocaleDateString('fr-FR');
      const weekStr = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
      const monthStr = `${date.getFullYear()}-${date.getMonth() + 1}`;

      dailyData.set(dateStr, 0);
      weeklyData.set(weekStr, 0);
      monthlyData.set(monthStr, 0);
    }

    // Remplir les données avec les commandes
    validOrders.forEach(order => {
      const date = new Date(order.createdAt);
      const dateStr = date.toLocaleDateString('fr-FR');
      const weekStr = `${date.getFullYear()}-W${this.getWeekNumber(date)}`;
      const monthStr = `${date.getFullYear()}-${date.getMonth() + 1}`;

      dailyData.set(dateStr, (dailyData.get(dateStr) || 0) + (order.total || 0));
      weeklyData.set(weekStr, (weeklyData.get(weekStr) || 0) + (order.total || 0));
      monthlyData.set(monthStr, (monthlyData.get(monthStr) || 0) + (order.total || 0));
    });

    // Convertir les données en tableaux
    this.salesData.daily = Array.from(dailyData.values()).reverse();
    this.salesData.weekly = Array.from(weeklyData.values()).reverse();
    this.salesData.monthly = Array.from(monthlyData.values()).reverse();

    // Générer les labels
    this.timeLabels.daily = Array.from(dailyData.keys()).reverse();
    this.timeLabels.weekly = Array.from(weeklyData.keys())
      .map(week => `Semaine ${week.split('-W')[1]}`)
      .reverse();
    this.timeLabels.monthly = Array.from(monthlyData.keys())
      .map(month => {
        const [year, monthNum] = month.split('-');
        return new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('fr-FR', { month: 'long' });
      })
      .reverse();
  }

  private calculateTopProducts(orders: Order[]): void {
    const productStats = new Map<string, { 
      quantity: number; 
      revenue: number;
      images?: string[];
      imageUrl?: string;
    }>();

    orders.filter(order => order.status === 'valide').forEach(order => {
      order.items.forEach(item => {
        const stats = productStats.get(item.product.name) || { 
          quantity: 0, 
          revenue: 0,
          images: item.product.images || [],
          imageUrl: item.product.imageUrl
        };
        stats.quantity += item.quantity;
        stats.revenue += item.quantity * item.product.price;
        productStats.set(item.product.name, stats);
      });
    });

    this.topProducts = Array.from(productStats.entries())
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    if (this.topProducts.length > 0) {
      this.globalStats.topSellingProduct = this.topProducts[0].name;
    }
  }

  private calculateTopCustomers(orders: Order[]): void {
    const customerStats = new Map<string, { name: string; orders: number; spent: number; }>();

    orders.filter(order => order.status === 'valide').forEach(order => {
      if (!order.customerInfo) return;

      const customerKey = order.customerInfo.phone || order.customerInfo.email;
      const stats = customerStats.get(customerKey) || { 
        name: order.customerInfo.fullName || 'Client inconnu',
        orders: 0,
        spent: 0
      };

      stats.orders += 1;
      stats.spent += order.total || 0;
      customerStats.set(customerKey, stats);
    });

    this.topCustomers = Array.from(customerStats.values())
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // Charger les paramètres de la boutique
  loadStoreSettings(): void {
    if (!this.currentStore) return;
    
    this.storeService.getStoreSettings().subscribe(settings => {
      if (settings && settings.length > 0) {
        this.storeSettings = settings[0];
        this.applyStoreColors(settings[0]);
      }
    });
  }

  // Appliquer les couleurs de la boutique au composant
  applyStoreColors(settings: StoreSettings): void {
    this.storeService.applyStoreTheme(settings.primaryColor, settings.secondaryColor);
    this.primaryColorRgb = this.hexToRgb(settings.primaryColor);
    this.secondaryColorRgb = this.hexToRgb(settings.secondaryColor);
    
    document.documentElement.style.setProperty('--primary-color-rgb', this.primaryColorRgb);
    document.documentElement.style.setProperty('--secondary-color-rgb', this.secondaryColorRgb);
  }

  // Convertir une couleur hex en format RGB
  hexToRgb(hex: string): string {
    hex = hex.replace(/^#/, '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  }

  // Calculer la hauteur de la barre pour le graphique
  getBarHeight(value: number): number {
    const data = this.currentData;
    if (!data || data.length === 0) return 0;
    
    const maxValue = Math.max(...data);
    if (maxValue === 0) return 0;
    
    return (value / maxValue) * 70;
  }

  // Changer la période des données
  changePeriod(period: string): void {
    this.selectedPeriod = period;
  }

  // Obtenir les données pour la période sélectionnée
  get currentData(): number[] {
    return this.salesData[this.selectedPeriod as keyof typeof this.salesData];
  }
  
  // Obtenir les labels pour la période sélectionnée
  get currentLabels(): string[] {
    return this.timeLabels[this.selectedPeriod as keyof typeof this.timeLabels];
  }
  
  // Obtenir la valeur maximale pour l'échelle Y
  getMaxValue(): number {
    const data = this.currentData;
    if (!data || data.length === 0) return 0;
    return Math.ceil(Math.max(...data) / 100) * 100; // Arrondir au centaine supérieure
  }
  
  // Calculer le pourcentage de progression
  calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  }

  // Obtenir l'image du produit
  getProductImage(product: { images?: string[]; imageUrl?: string; }): string {
    if (product.images && product.images.length > 0) {
      return product.images[0];
    }
    if (product.imageUrl) {
      return product.imageUrl;
    }
    return 'assets/default-product.svg';
  }

  // Gérer les erreurs de chargement d'image
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/default-product.svg';
  }

  // Formater le numéro de téléphone pour l'affichage
  formatPhoneNumber(phone: string): string {
    if (!phone) return 'Client inconnu';
    
    // Si c'est déjà un numéro formaté ou un email, le retourner tel quel
    if (phone.includes('@') || phone.includes(' ')) {
      return phone;
    }
    
    // Formater le numéro de téléphone (XX XX XX XX XX)
    return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 