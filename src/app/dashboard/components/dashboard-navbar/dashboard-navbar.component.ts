import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationDrawerComponent } from '../notification-drawer/notification-drawer.component';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-dashboard-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationDrawerComponent],
  template: `
    <nav class="dashboard-navbar">
      <div class="navbar-brand">
        <img src="assets/logo.png" alt="Logo" class="brand-logo">
        <span class="brand-name">EasyCommerce</span>
      </div>

      <div class="navbar-actions">
        <button class="notification-btn" (click)="toggleNotifications()">
          <i class="bi bi-bell"></i>
          <span class="notification-badge" *ngIf="unreadCount$ | async as count">
            {{ count }}
          </span>
        </button>
        <!-- Autres boutons de la navbar -->
      </div>

      <app-notification-drawer
        [isOpen]="isNotificationDrawerOpen"
        [storeId]="currentStoreId"
      ></app-notification-drawer>
    </nav>
  `,
  styles: [`
    .dashboard-navbar {
      height: 64px;
      background: white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 1.5rem;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1000;
    }

    .navbar-brand {
      display: flex;
      align-items: center;
      gap: 1rem;

      .brand-logo {
        height: 32px;
        width: auto;
      }

      .brand-name {
        font-size: 1.25rem;
        font-weight: 600;
        color: var(--primary-color);
      }
    }

    .navbar-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .notification-btn {
      position: relative;
      background: none;
      border: none;
      padding: 0.5rem;
      font-size: 1.25rem;
      color: #666;
      cursor: pointer;
      transition: color 0.2s;

      &:hover {
        color: var(--primary-color);
      }

      .notification-badge {
        position: absolute;
        top: 0;
        right: 0;
        background: #ef4444;
        color: white;
        font-size: 0.75rem;
        font-weight: 600;
        min-width: 18px;
        height: 18px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
      }
    }
  `]
})
export class DashboardNavbarComponent implements OnInit {
  isNotificationDrawerOpen = false;
  currentStoreId: string = ''; // À remplacer par la valeur réelle de votre store
  unreadCount$!: Observable<number>;

  constructor(private notificationService: NotificationService) {}

  ngOnInit() {
    if (this.currentStoreId) {
      this.unreadCount$ = this.notificationService.getUnreadCount(this.currentStoreId);
    }
  }

  toggleNotifications() {
    this.isNotificationDrawerOpen = !this.isNotificationDrawerOpen;
  }
} 