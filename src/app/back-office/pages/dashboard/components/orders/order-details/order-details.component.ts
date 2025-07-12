import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { Subject, takeUntil, switchMap, filter, of } from 'rxjs';
import { OrderService } from '../../../../../../core/services/order.service';
import { StoreService } from '../../../../../../core/services/store.service';
import { ToastService } from '../../../../../../core/services/toast.service';
import { Order } from '../../../../../../core/models/order.model';
import { Store } from '../../../../../../core/models/store.model';
import { MatDialog } from '@angular/material/dialog';
import { RejectOrderDialogComponent } from '../reject-order-dialog/reject-order-dialog.component';

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
export class OrderDetailsComponent implements OnInit, OnDestroy {
  order: Order | null = null;
  loading = true;
  error = false;
  currentStore!: Store;

  // Pour la gestion de la destruction du composant
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private storeService: StoreService,
    private toastService: ToastService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    const orderId = this.route.snapshot.paramMap.get('id');
    if (!orderId) {
      this.error = true;
      this.loading = false;
      this.toastService.error('ID de commande non trouvé');
      return;
    }

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
        this.loadOrder(orderId);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la boutique:', error);
        this.error = true;
        this.loading = false;
      }
    });
  }

  private loadOrder(orderId: string): void {
    this.loading = true;
    const storeUrl = this.currentStore.id?.split('_')[1] || '';
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
    // Implement the goBack method
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
