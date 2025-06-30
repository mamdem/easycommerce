import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../../../../../core/services/order.service';
import { Order } from '../../../../../../core/models/order.model';
import { ToastService } from '../../../../../../core/services/toast.service';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { RejectOrderDialogComponent } from '../reject-order-dialog/reject-order-dialog.component';
import { StoreService } from '../../../../../../core/services/store.service';

@Component({
  selector: 'app-order-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule
  ],
  templateUrl: './order-details.component.html',
  styleUrl: './order-details.component.scss'
})
export class OrderDetailsComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  error = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private storeService: StoreService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      const orderId = params['id'];
      if (orderId) {
        this.loadOrder(orderId);
      } else {
        this.error = true;
        this.loading = false;
        this.toastService.error('ID de commande invalide');
      }
    });
  }

  private loadOrder(orderId: string): void {
    this.loading = true;
    this.storeService.getSelectedStore().subscribe({
      next: (store) => {
        if (store) {
          const storeUrl = store.id?.split('_')[1] || '';
          this.orderService.getOrderById(storeUrl, orderId).subscribe({
            next: (order) => {
              if (order) {
                this.order = {
                  ...order,
                  subtotal: order.subtotal || 0,
                  shippingFee: order.shippingFee || 0,
                  total: order.total || 0,
                  items: order.items?.map(item => ({
                    ...item,
                    quantity: item.quantity || 0,
                    product: {
                      id: item.productId,
                      name: item.product?.name || '',
                      price: item.product?.price || 0,
                      description: item.product?.description || '',
                      imageUrl: item.product?.imageUrl
                    }
                  })) || []
                };
              }
              this.loading = false;
            },
            error: (error) => {
              console.error('Erreur lors du chargement de la commande:', error);
              this.error = true;
              this.loading = false;
              this.toastService.error('Impossible de charger les détails de la commande');
            }
          });
        } else {
          this.error = true;
          this.loading = false;
          this.toastService.error('Boutique non trouvée');
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la boutique:', error);
        this.error = true;
        this.loading = false;
        this.toastService.error('Erreur lors du chargement de la boutique');
      }
    });
  }

  validateOrder(): void {
    if (!this.order?.id) return;

    this.orderService.updateOrderStatus(this.order.storeUrl, this.order.id, 'valide').subscribe({
      next: () => {
        if (this.order) {
          this.order.status = 'valide';
          this.order.updatedAt = Date.now();
        }
        this.toastService.success('Commande validée avec succès');
      },
      error: (error) => {
        console.error('Erreur lors de la validation de la commande:', error);
        this.toastService.error('Erreur lors de la validation de la commande');
      }
    });
  }

  rejectOrder(): void {
    if (!this.order) return;

    const dialogRef = this.dialog.open(RejectOrderDialogComponent, {
      data: { order: this.order }
    });

    dialogRef.afterClosed().subscribe(reason => {
      if (reason !== undefined && this.order?.id) {
        this.orderService.updateOrderStatus(this.order.storeUrl, this.order.id, 'rejete', reason).subscribe({
          next: () => {
            if (this.order) {
              this.order.status = 'rejete';
              this.order.updatedAt = Date.now();
              this.order.rejectionReason = reason;
            }
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

  goBack(): void {
    this.router.navigate(['/dashboard/orders']);
  }

  getStatusLabel(status: string | undefined): string {
    if (!status) return '';
    
    const statusLabels: { [key: string]: string } = {
      'en_cours': 'En attente',
      'valide': 'Validée',
      'rejete': 'Rejetée'
    };
    return statusLabels[status] || status;
  }

  getStatusBadgeClass(status: string | undefined): string {
    if (!status) return 'bg-secondary';
    
    switch(status) {
      case 'en_cours': return 'bg-warning';
      case 'valide': return 'bg-success';
      case 'rejete': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  formatDate(timestamp: number | undefined): string {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatAmount(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '0 FCFA';
    return amount.toLocaleString('fr-FR') + ' FCFA';
  }

  calculateItemTotal(price: number | undefined, quantity: number | undefined): number {
    return (price || 0) * (quantity || 0);
  }
}
