import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, Notification } from '../../core/services/notification.service';
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
        <h2>Notifications</h2>
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
              <div class="notification-title">{{ notification.message }}</div>
              <div class="notification-time">{{ getTimeAgo(notification.createdAt) }}</div>
              <div class="notification-details" *ngIf="notification.data">
                <ng-container [ngSwitch]="notification.type">
                  <div *ngSwitchCase="'ORDER'">
                    <p class="details-text">{{ notification.data.customerName }} - {{ formatAmount(notification.data.orderAmount) }}</p>
                  </div>
                  <div *ngSwitchCase="'STOCK'">
                    <p class="details-text">{{ notification.data.productName }} - {{ notification.data.stockLevel }} en stock</p>
                  </div>
                </ng-container>
              </div>
            </div>
            <div class="notification-status" *ngIf="notification.status === 'UNREAD'">
              <span class="unread-dot"></span>
            </div>
          </div>

          <div class="no-notifications" *ngIf="notifications.length === 0">
            <i class="bi bi-bell-slash"></i>
            <p>Aucune notification</p>
          </div>
        </ng-container>
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
      right: -400px;
      width: 400px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
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
      padding: 1.25rem;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8fafc;

      h2 {
        margin: 0;
        font-size: 1.25rem;
        font-weight: 600;
        color: #1e293b;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.25rem;
        cursor: pointer;
        padding: 0.5rem;
        color: #64748b;
        border-radius: 0.375rem;
        transition: all 0.2s;
        
        &:hover {
          color: #1e293b;
          background: #e2e8f0;
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
      padding: 1rem;
      border-radius: 0.5rem;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 0.75rem;
      border: 1px solid #e5e7eb;
      background: white;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      }

      &.unread {
        background: #f0f9ff;
        border-left: 3px solid #0ea5e9;

        .notification-title {
          font-weight: 500;
        }
      }
    }

    .notification-status {
      position: absolute;
      top: 1rem;
      right: 1rem;

      .unread-dot {
        width: 8px;
        height: 8px;
        background-color: #4f46e5;
        border-radius: 50%;
        display: block;
      }
    }

    .notification-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 1rem;
      flex-shrink: 0;

      i {
        font-size: 1.1rem;
        color: white;
      }
    }

    .notification-content {
      flex: 1;
      min-width: 0;
    }

    .notification-title {
      margin-bottom: 0.25rem;
      color: #334155;
      font-size: 0.95rem;
      line-height: 1.4;
      padding-right: 1rem;
    }

    .notification-time {
      font-size: 0.8125rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }

    .notification-details {
      background: #f8fafc;
      padding: 0.5rem;
      border-radius: 0.375rem;
      margin-top: 0.5rem;

      .details-text {
        margin: 0;
        font-size: 0.875rem;
        color: #475569;
      }
    }

    .no-notifications {
      text-align: center;
      padding: 3rem 1rem;
      color: #64748b;

      i {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      p {
        margin: 0;
        font-size: 1rem;
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
        return '#0ea5e9'; // blue
      case 'STOCK':
        return '#f97316'; // orange
      case 'SUBSCRIPTION':
        return '#eab308'; // yellow
      default:
        return '#6366f1'; // indigo
    }
  }

  getTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (hours < 24) {
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
  }

  onNotificationClick(notification: Notification) {
    if (this.storeId && notification.status === 'UNREAD') {
      this.notificationService.markAsRead(this.storeId, notification.id!);
    }
  }

  formatAmount(amount: number | undefined): string {
    if (amount === undefined || amount === null) {
      return '0 FCFA';
    }
    return `${amount} FCFA`;
  }
} 