import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService, StoreSettings } from '../../../../core/services/store.service';

@Component({
  selector: 'app-statistics',
  templateUrl: './statistics.component.html',
  styleUrls: ['./statistics.component.scss'],
})
export class StatisticsComponent implements OnInit {
  // Référence à l'objet Math pour l'utiliser dans le template
  Math = Math;
  
  // Données pour les statistiques
  salesData = {
    daily: [320, 450, 280, 390, 520, 680, 420, 380, 510, 460, 590, 610, 550, 680],
    weekly: [1800, 2200, 1900, 2400, 2800, 3100, 2900, 3300, 3600, 3200, 3500, 3800],
    monthly: [8500, 9200, 7800, 8900, 10200, 11500, 10800, 12000, 13600, 12500, 13800, 15200]
  };
  
  // Période sélectionnée (daily, weekly, monthly)
  selectedPeriod: string = 'weekly';
  
  // Labels pour les graphiques selon la période
  timeLabels = {
    daily: ['1 Sept', '2 Sept', '3 Sept', '4 Sept', '5 Sept', '6 Sept', '7 Sept', '8 Sept', '9 Sept', '10 Sept', '11 Sept', '12 Sept', '13 Sept', '14 Sept'],
    weekly: ['Jan W1', 'Jan W2', 'Jan W3', 'Jan W4', 'Fév W1', 'Fév W2', 'Fév W3', 'Fév W4', 'Mar W1', 'Mar W2', 'Mar W3', 'Mar W4'],
    monthly: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc']
  };
  
  // Statistiques globales
  globalStats = {
    totalRevenue: 152800,
    totalOrders: 1250,
    averageOrderValue: 122.24,
    conversionRate: 3.2,
    returningCustomers: 42,
    topSellingProduct: 'Smartphone XYZ',
    productsSold: 1850
  };
  
  // Données pour les produits les plus vendus
  topProducts = [
    { name: 'Smartphone XYZ', quantity: 128, revenue: 38400 },
    { name: 'Écouteurs sans fil', quantity: 95, revenue: 12350 },
    { name: 'Montre connectée', quantity: 82, revenue: 16400 },
    { name: 'Tablette Pro 11"', quantity: 68, revenue: 27200 },
    { name: 'Enceinte portable', quantity: 54, revenue: 5940 }
  ];
  
  // Données pour les clients les plus actifs
  topCustomers = [
    { name: 'Jean Dupont', orders: 12, spent: 2450 },
    { name: 'Marie Martin', orders: 9, spent: 1820 },
    { name: 'Pierre Durand', orders: 8, spent: 1640 },
    { name: 'Sophie Petit', orders: 7, spent: 1290 },
    { name: 'Lucas Bernard', orders: 6, spent: 980 }
  ];

  // Couleurs de la boutique
  storeSettings: StoreSettings | null = null;
  primaryColorRgb: string = '';
  secondaryColorRgb: string = '';

  constructor(private storeService: StoreService) { }

  ngOnInit(): void {
    console.log('Statistics component initialized');
    this.loadStoreSettings();
  }

  // Charger les paramètres de la boutique
  loadStoreSettings(): void {
    this.storeService.getStoreSettings().subscribe(settings => {
      if (settings) {
        this.storeSettings = settings[0];
        this.applyStoreColors(settings[0]);
      }
    });
  }

  // Appliquer les couleurs de la boutique au composant
  applyStoreColors(settings: StoreSettings): void {
    // Appliquer au niveau global
    this.storeService.applyStoreTheme(settings.primaryColor, settings.secondaryColor);
    
    // Convertir les couleurs hex en RGB pour les utiliser dans les rgba()
    this.primaryColorRgb = this.hexToRgb(settings.primaryColor);
    this.secondaryColorRgb = this.hexToRgb(settings.secondaryColor);
    
    document.documentElement.style.setProperty('--primary-color-rgb', this.primaryColorRgb);
    document.documentElement.style.setProperty('--secondary-color-rgb', this.secondaryColorRgb);
  }

  // Convertir une couleur hex en format RGB
  hexToRgb(hex: string): string {
    // Supprimer le # si présent
    hex = hex.replace(/^#/, '');
    
    // Convertir en format RGB
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
  
  // Calculer le pourcentage de progression
  calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return 100;
    return ((current - previous) / previous) * 100;
  }
} 