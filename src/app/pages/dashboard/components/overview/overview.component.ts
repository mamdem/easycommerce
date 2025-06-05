import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { StoreService, StoreSettings } from '../../../../core/services/store.service';
import { Store } from '../../../../core/models/store.model';
import { environment } from '../../../../../environments/environment';

Chart.register(...registerables);

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
      pending: 0,
      processing: 0,
      shipped: 0,
      completed: 0
    }
  };
  
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

  // Données de démonstration
  salesData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
    values: [1200, 1900, 1500, 2200, 1800, 2400]
  };

  ordersData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
    values: [25, 42, 35, 48, 38, 52]
  };

  constructor(private storeService: StoreService) { }

  ngOnInit() {
    this.loadStoreData();
  }

  ngAfterViewInit() {
    this.initSalesChart();
    this.initOrdersChart();
  }

  private loadStoreData() {
    console.log('Début du chargement des données de la boutique');
    // Récupérer les informations de la boutique sélectionnée
    this.storeService.getSelectedStore().subscribe(store => {
      console.log('Données de la boutique reçues:', store);
      if (store) {
        this.storeInfo = {
          ...this.storeInfo,
          legalName: store.legalName,
          storeName: store.storeName,
          url: store.id?.split('_')[1] || '', // Récupère la partie après userId_
        };
        console.log('StoreInfo mis à jour:', this.storeInfo);
      } else {
        console.log('Aucune donnée de boutique reçue');
      }
    }, error => {
      console.error('Erreur lors du chargement des données de la boutique:', error);
    });
  }

  private initSalesChart() {
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
              label: function(context) {
                return context.parsed.y + ' €';
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
              callback: function(value) {
                return value + ' €';
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
            intersect: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(0, 0, 0, 0.05)'
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
} 