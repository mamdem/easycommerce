import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../../core/services/notification.service';
import { Observable, of } from 'rxjs';
import { RouterModule } from '@angular/router';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-notification-drawer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="notification-drawer" [class.open]="isOpen">
      <div class="drawer-header">
        <h2>
          <i class="bi bi-bell-fill"></i>
          Notifications
        </h2>
        <button class="close-btn" (click)="close()">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div class="notifications-list">
        <ng-container *ngIf="!storeId">
          <div class="no-notifications">
            <i class="bi bi-shop"></i>
            <p>Sélectionnez une boutique pour voir ses notifications</p>
          </div>
        </ng-container>

        <ng-container *ngIf="storeId && (notifications$ | async) as notifications">
          <div class="notification-item" 
               *ngFor="let notification of notifications"
               [class.unread]="notification.status === 'UNREAD'"
               (click)="onNotificationClick(notification)">
            
            <div class="notification-icon" [ngStyle]="{'background-color': getIconBackground(notification.type)}">
              <i class="bi" [ngClass]="getNotificationIcon(notification.type)"></i>
            </div>
            
            <div class="notification-content">
              <div class="notification-message">
                {{ notification.message }}
              </div>
              
              <div class="notification-details" *ngIf="notification.data">
                <ng-container [ngSwitch]="notification.type">
                  
                  <!-- Détails pour les commandes -->
                  <div *ngSwitchCase="'ORDER'" class="order-details">
                    <div class="order-header">
                      <div class="order-info">
                        <span class="order-id" *ngIf="notification.data.orderId">
                          <i class="bi bi-receipt"></i>
                          Commande #{{ notification.data.orderId }}
                        </span>
                        <span class="order-amount" *ngIf="notification.data.orderAmount">
                          <i class="bi bi-cash-coin"></i>
                          {{ formatAmount(notification.data.orderAmount) }}
                        </span>
                      </div>
                    </div>
                    
                    <div class="customer-info" *ngIf="notification.data.customerName">
                      <div class="customer-detail">
                        <i class="bi bi-person-fill"></i>
                        <span>{{ notification.data.customerName }}</span>
                      </div>
                      <div class="customer-email" *ngIf="notification.data.customerEmail">
                        <i class="bi bi-envelope"></i>
                        <span>{{ notification.data.customerEmail }}</span>
                      </div>
                    </div>
                    
                    <div class="order-actions">
                      <button class="btn-view-order" (click)="viewOrderDetails(notification.data.orderId, $event)">
                        <i class="bi bi-eye"></i>
                        Voir la commande
                      </button>
                    </div>
                  </div>
                  
                  <!-- Détails pour le stock -->
                  <div *ngSwitchCase="'STOCK'" class="stock-details">
                    <div class="stock-info">
                      <div class="product-name" *ngIf="notification.data.productName">
                        <i class="bi bi-box"></i>
                        {{ notification.data.productName }}
                      </div>
                      <div class="stock-level" [class.critical]="(notification.data.stockLevel || 0) <= 5">
                        <i class="bi bi-exclamation-triangle"></i>
                        Stock restant: {{ notification.data.stockLevel || 0 }} unités
                      </div>
                    </div>
                    
                    <div class="stock-actions">
                      <button class="btn-manage-stock" (click)="viewProductDetails(notification.data.productId, $event)">
                        <i class="bi bi-pencil"></i>
                        Gérer le stock
                      </button>
                    </div>
                  </div>
                  
                  <!-- Détails pour l'abonnement -->
                  <div *ngSwitchCase="'SUBSCRIPTION'" class="subscription-details">
                    <div class="subscription-info">
                      <div class="days-remaining" *ngIf="notification.data.daysRemaining !== undefined">
                        <i class="bi bi-calendar-event"></i>
                        {{ notification.data.daysRemaining }} jours restants
                      </div>
                    </div>
                    
                    <div class="subscription-actions">
                      <button class="btn-manage-subscription" (click)="viewSubscription($event)">
                        <i class="bi bi-credit-card"></i>
                        Gérer l'abonnement
                      </button>
                    </div>
                  </div>
                  
                </ng-container>
              </div>
              
              <div class="notification-time">
                <i class="bi bi-clock"></i>
                {{ getTimeAgo(notification.createdAt) }}
              </div>
            </div>
            
            <div class="notification-status" *ngIf="notification.status === 'UNREAD'">
              <span class="unread-dot"></span>
            </div>
          </div>

          <div class="no-notifications" *ngIf="notifications.length === 0">
            <i class="bi bi-bell-slash"></i>
            <p>Aucune notification</p>
            <small>Les nouvelles notifications apparaîtront ici</small>
          </div>
        </ng-container>
      </div>
      
      <div class="drawer-footer" *ngIf="storeId">
        <button class="btn-mark-all-read" (click)="markAllAsRead()">
          <i class="bi bi-check-all"></i>
          Tout marquer comme lu
        </button>
      </div>
    </div>

    <div class="drawer-overlay" 
         [class.active]="isOpen"
         (click)="close()">
    </div>
  `,
  styles: [`
    .notification-drawer {
      position: fixed;
      top: 0;
      right: -450px;
      width: 450px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 20px rgba(0, 0, 0, 0.15);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 1000;
      display: flex;
      flex-direction: column;

      &.open {
        right: 0;
      }
    }

    .drawer-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.5);
      opacity: 0;
      visibility: hidden;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      z-index: 999;

      &.active {
        opacity: 1;
        visibility: visible;
      }
    }

    .drawer-header {
      padding: 1.5rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;

      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .close-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.5rem;
        color: white;
        border-radius: 0.375rem;
        transition: all 0.2s;
        
        &:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      }
    }

    .notifications-list {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;

      &::-webkit-scrollbar {
        width: 6px;
      }

      &::-webkit-scrollbar-track {
        background: #f1f5f9;
      }

      &::-webkit-scrollbar-thumb {
        background: #cbd5e1;
        border-radius: 3px;
      }
    }

    .notification-item {
      display: flex;
      align-items: flex-start;
      padding: 1.25rem;
      border-radius: 0.75rem;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 1rem;
      border: 1px solid #e5e7eb;
      background: white;
      position: relative;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        border-color: #d1d5db;
      }

      &.unread {
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border-left: 4px solid #0ea5e9;
        box-shadow: 0 2px 8px rgba(14, 165, 233, 0.1);

        .notification-message {
          font-weight: 600;
        }
      }
    }

    .notification-status {
      position: absolute;
      top: 1rem;
      right: 1rem;

      .unread-dot {
        width: 10px;
        height: 10px;
        background-color: #0ea5e9;
        border-radius: 50%;
        display: block;
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
      }
    }

    .notification-icon {
      width: 45px;
      height: 45px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
      flex-shrink: 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      i {
        font-size: 1.2rem;
        color: white;
      }
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-message {
      margin-bottom: 0.75rem;
      color: #1e293b;
      font-size: 0.95rem;
      line-height: 1.4;
      padding-right: 1.5rem;
    }

    .notification-time {
      font-size: 0.8125rem;
      color: #64748b;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      margin-top: 0.5rem;
    }

    .notification-details {
      background: #f8fafc;
      padding: 1rem;
      border-radius: 0.5rem;
      margin-bottom: 0.75rem;
      border: 1px solid #e2e8f0;
    }

    /* Styles pour les détails de commande */
    .order-details {
      .order-header {
        margin-bottom: 0.75rem;
      }

      .order-info {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .order-id, .order-amount {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #475569;
      }

      .order-amount {
        font-weight: 600;
        color: #059669;
      }

      .customer-info {
        background: white;
        padding: 0.75rem;
        border-radius: 0.375rem;
        margin: 0.75rem 0;
        border: 1px solid #e2e8f0;
      }

      .customer-detail, .customer-email {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #475569;
        margin-bottom: 0.25rem;

        &:last-child {
          margin-bottom: 0;
        }
      }

      .order-actions {
        margin-top: 0.75rem;
      }

      .btn-view-order {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        }
      }
    }

    /* Styles pour les détails de stock */
    .stock-details {
      .stock-info {
        margin-bottom: 0.75rem;
      }

      .product-name {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #475569;
        margin-bottom: 0.5rem;
        font-weight: 500;
      }

      .stock-level {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #f97316;
        font-weight: 500;

        &.critical {
          color: #dc2626;
          background: #fef2f2;
          padding: 0.375rem 0.75rem;
          border-radius: 0.375rem;
          border: 1px solid #fecaca;
        }
      }

      .btn-manage-stock {
        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        }
      }
    }

    /* Styles pour les détails d'abonnement */
    .subscription-details {
      .subscription-info {
        margin-bottom: 0.75rem;
      }

      .days-remaining {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #eab308;
        font-weight: 500;
        background: #fefce8;
        padding: 0.375rem 0.75rem;
        border-radius: 0.375rem;
        border: 1px solid #fde047;
      }

      .btn-manage-subscription {
        background: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        font-size: 0.875rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.2s;

        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(234, 179, 8, 0.3);
        }
      }
    }

    .drawer-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid #e5e7eb;
      background: #f8fafc;

      .btn-mark-all-read {
        width: 100%;
        background: #6366f1;
        color: white;
        border: none;
        padding: 0.75rem;
        border-radius: 0.5rem;
        font-size: 0.875rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        transition: all 0.2s;
        font-weight: 500;

        &:hover {
          background: #5b21b6;
          transform: translateY(-1px);
        }
      }
    }

    .no-notifications {
      text-align: center;
      padding: 4rem 1rem;
      color: #64748b;

      i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      p {
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
        font-weight: 500;
      }

      small {
        font-size: 0.875rem;
        opacity: 0.7;
      }
    }

    @media (max-width: 768px) {
      .notification-drawer {
        width: 100%;
        right: -100%;
      }
    }
  `]
})
export class NotificationDrawerComponent implements OnInit, OnChanges {
  @Input() isOpen = false;
  @Input() storeId?: string;
  @Output() closeDrawer = new EventEmitter<void>();
  @Output() markAllRead = new EventEmitter<void>();
  notifications$: Observable<Notification[]> = of([]);

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    this.loadNotifications();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['storeId']) {
      this.loadNotifications();
    }
  }

  loadNotifications() {
    if (this.storeId) {
      this.notifications$ = this.notificationService.getStoreNotifications(this.storeId);
    } else {
      this.notifications$ = of([]);
    }
  }

  close() {
    this.closeDrawer.emit();
  }

  markAllAsRead() {
    this.markAllRead.emit();
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'ORDER':
        return 'bi-cart-check-fill';
      case 'STOCK':
        return 'bi-box-seam-fill';
      case 'SUBSCRIPTION':
        return 'bi-star-fill';
      default:
        return 'bi-bell-fill';
    }
  }

  getIconBackground(type: string): string {
    switch (type) {
      case 'ORDER':
        return 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)'; // blue gradient
      case 'STOCK':
        return 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'; // orange gradient
      case 'SUBSCRIPTION':
        return 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)'; // yellow gradient
      default:
        return 'linear-gradient(135deg, #6366f1 0%, #5b21b6 100%)'; // indigo gradient
    }
  }

  getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) {
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else {
      return 'À l\'instant';
    }
  }

  onNotificationClick(notification: Notification) {
    if (this.storeId && notification.status === 'UNREAD') {
      this.notificationService.markAsRead(this.storeId, notification.id!);
    }
  }

  viewOrderDetails(orderId: string | undefined, event: Event) {
    event.stopPropagation();
    if (orderId) {
      // Naviguer vers les détails de la commande
      console.log('Naviguer vers la commande:', orderId);
      // this.router.navigate(['/dashboard/orders', orderId]);
    }
  }

  viewProductDetails(productId: string | undefined, event: Event) {
    event.stopPropagation();
    if (productId) {
      // Naviguer vers les détails du produit
      console.log('Naviguer vers le produit:', productId);
      // this.router.navigate(['/dashboard/products', productId]);
    }
  }

  viewSubscription(event: Event) {
    event.stopPropagation();
    // Naviguer vers la page d'abonnement
    console.log('Naviguer vers l\'abonnement');
    // this.router.navigate(['/subscription']);
  }

  formatAmount(amount: number | undefined): string {
    if (amount === undefined || amount === null) {
      return '0 FCFA';
    }
    return `${amount.toLocaleString()} FCFA`;
  }
} 