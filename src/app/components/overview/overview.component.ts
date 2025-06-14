import { Component, OnInit, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration } from 'chart.js';
import { CustomerService } from '../../core/services/customer.service';

@Component({
  selector: 'app-overview',
  templateUrl: './overview.component.html',
  styleUrls: ['./overview.component.scss']
})
export class OverviewComponent implements OnInit, OnDestroy {
  private salesChart: Chart | null = null;

  constructor(private customerService: CustomerService) {}

  ngOnInit(): void {
    this.initCharts();
  }

  private initCharts(): void {
    this.customerService.getCustomers().subscribe(customers => {
      // Préparer les données pour le graphique
      const data = this.prepareChartData(customers);
      this.initSalesChart(data);
    });
  }

  private prepareChartData(customers: any[]): any {
    // Exemple de préparation des données
    return {
      labels: customers.map(c => c.lastOrderDate),
      data: customers.map(c => c.totalSpent)
    };
  }

  initSalesChart(data: any): void {
    // Détruire le graphique existant s'il existe
    if (this.salesChart) {
      this.salesChart.destroy();
    }

    const ctx = document.getElementById('salesChart') as HTMLCanvasElement;
    if (!ctx) return;

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.labels,
        datasets: [{
          label: 'Ventes',
          data: data.data,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: 'Graphique des ventes'
          }
        }
      }
    };

    this.salesChart = new Chart(ctx, config);
  }

  ngOnDestroy(): void {
    // Nettoyer le graphique lors de la destruction du composant
    if (this.salesChart) {
      this.salesChart.destroy();
    }
  }
} 