import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { OrderService } from '../../../../core/services/order.service';
import { StoreService } from '../../../../core/services/store.service';
import { Order, OrderStatus } from '../../../../core/models/order.model';
import { ToastService } from '../../../../core/services/toast.service';
import { RejectOrderDialogComponent } from './reject-order-dialog/reject-order-dialog.component';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
})
export class OrdersComponent implements OnInit {
  orders: Order[] = [];
  loading = true;
  
  // Statuts disponibles
  statuses: OrderStatus[] = ['en_cours', 'valide', 'rejete'];
  statusLabels = {
    'en_cours': 'En attente',
    'valide': 'Validée',
    'rejete': 'Rejetée'
  };

  // Filtres
  selectedStatus: OrderStatus | 'tous' = 'tous';
  searchTerm: string = '';

  constructor(
    private orderService: OrderService,
    private storeService: StoreService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadOrders();
  }

  private loadOrders(): void {
    this.loading = true;
    this.storeService.getSelectedStore().subscribe(store => {
      if (store) {
        const storeUrl = store.id?.split('_')[1] || '';
        this.orderService.getOrdersByStore(storeUrl).subscribe({
          next: (orders) => {
            console.log('Commandes chargées:', orders);
            this.orders = orders;
            this.loading = false;
          },
          error: (error) => {
            console.error('Erreur lors du chargement des commandes:', error);
            this.loading = false;
            this.toastService.error('Erreur lors du chargement des commandes');
          }
        });
      }
    });
  }

  // Filtrer les commandes par statut
  filterByStatus(status: OrderStatus | 'tous'): void {
    this.selectedStatus = status;
  }

  // Obtenir les commandes filtrées
  get filteredOrders(): Order[] {
    return this.orders.filter(order => {
      // Filtre par statut
      const statusMatch = this.selectedStatus === 'tous' || order.status === this.selectedStatus;
      
      // Filtre par terme de recherche
      const searchMatch = this.searchTerm === '' || 
        order.customerInfo.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.customerInfo.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.id?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return statusMatch && searchMatch;
    });
  }

  // Obtenir le nombre de commandes par statut
  getOrdersCountByStatus(status: OrderStatus): number {
    return this.orders.filter(order => order.status === status).length;
  }

  // Obtenir l'icône pour le statut
  getStatusIcon(status: OrderStatus): string {
    switch(status) {
      case 'en_cours': return 'bi-hourglass-split';
      case 'valide': return 'bi-check-circle';
      case 'rejete': return 'bi-x-circle';
      default: return 'bi-question-circle';
    }
  }

  // Retourner la classe CSS pour le badge de statut
  getStatusBadgeClass(status: OrderStatus): string {
    switch(status) {
      case 'en_cours': return 'bg-warning';
      case 'valide': return 'bg-success';
      case 'rejete': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  // Obtenir le libellé du statut
  getStatusLabel(status: OrderStatus): string {
    return this.statusLabels[status] || status;
  }

  // Valider une commande
  validateOrder(order: Order): void {
    if (order.id) {
      this.orderService.updateOrderStatus(order.storeUrl, order.id, 'valide').subscribe({
        next: () => {
          order.status = 'valide';
          order.updatedAt = Date.now();
          this.toastService.success('Commande validée avec succès');
        },
        error: (error) => {
          console.error('Erreur lors de la validation de la commande:', error);
          this.toastService.error('Erreur lors de la validation de la commande');
        }
      });
    }
  }

  // Rejeter une commande
  rejectOrder(order: Order): void {
    const dialogRef = this.dialog.open(RejectOrderDialogComponent, {
      width: '500px',
      data: { order },
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(reason => {
      if (reason && order.id) {
        this.orderService.updateOrderStatus(order.storeUrl, order.id, 'rejete', reason).subscribe({
          next: () => {
            order.status = 'rejete';
            order.rejectionReason = reason;
            order.updatedAt = Date.now();
            this.toastService.success('Commande rejetée');
          },
          error: (error) => {
            console.error('Erreur lors du rejet de la commande:', error);
            this.toastService.error('Erreur lors du rejet de la commande');
          }
        });
      }
    });
  }

  // Exporter les commandes
  exportOrders(): void {
    // TODO: Implémenter l'export des commandes
    this.toastService.info('Fonctionnalité d\'export en cours de développement');
  }

  // Imprimer les commandes
  printOrders(): void {
    window.print();
  }

  // Effacer la recherche
  clearSearch(): void {
    this.searchTerm = '';
  }

  // Gérer la recherche
  onSearch(): void {
    // Vous pouvez ajouter une logique supplémentaire ici si nécessaire
  }

  // Formater la date
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Formater le montant
  formatAmount(amount: number): string {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  }
} 