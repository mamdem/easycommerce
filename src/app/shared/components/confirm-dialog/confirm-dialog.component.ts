import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  type: 'danger' | 'warning' | 'info';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule],
  template: `
    <div class="popup-dialog" [class]="data.type">
      <div class="popup-header">
        <div class="popup-icon" [class]="data.type">
          <i class="bi" [ngClass]="{
            'bi-exclamation-triangle': data.type === 'warning',
            'bi-exclamation-circle': data.type === 'danger',
            'bi-info-circle': data.type === 'info'
          }"></i>
        </div>
        <h2>{{ data.title }}</h2>
        <button class="close-btn" (click)="onCancel()">
          <i class="bi bi-x"></i>
        </button>
      </div>
      
      <div class="popup-content">
        <p>{{ data.message }}</p>
      </div>
      
      <div class="popup-actions">
        <button 
          type="button" 
          class="btn btn-sm btn-light" 
          (click)="onCancel()">
          {{ data.cancelText }}
        </button>
        <button 
          type="button" 
          [class]="'btn btn-sm btn-' + getBtnClass()"
          (click)="onConfirm()">
          {{ data.confirmText }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .popup-dialog {
      background: white;
      border-radius: 8px;
      width: 320px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      position: relative;
      overflow: hidden;
    }

    .popup-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #f8f9fa;
      border-bottom: 1px solid #e9ecef;
      position: relative;
    }

    .popup-icon {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      i {
        font-size: 1rem;
      }

      &.danger {
        background-color: #fee2e2;
        color: #dc2626;
      }

      &.warning {
        background-color: #fef3c7;
        color: #d97706;
      }

      &.info {
        background-color: #e0f2fe;
        color: #0284c7;
      }
    }

    .close-btn {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      cursor: pointer;
      color: #6b7280;
      transition: all 0.2s;

      &:hover {
        background: #e5e7eb;
        color: #374151;
      }

      i {
        font-size: 1.25rem;
      }
    }

    h2 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #1f2937;
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .popup-content {
      padding: 1rem;

      p {
        margin: 0;
        color: #4b5563;
        font-size: 0.875rem;
        line-height: 1.4;
      }
    }

    .popup-actions {
      padding: 0.75rem;
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      background: #f8f9fa;
      border-top: 1px solid #e9ecef;

      button {
        font-size: 0.875rem;
        padding: 0.375rem 0.75rem;
        min-width: 80px;
      }
    }

    @keyframes popIn {
      from {
        opacity: 0;
        transform: scale(0.9) translateY(10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    :host {
      display: block;
      animation: popIn 0.2s ease-out;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {
    this.dialogRef.addPanelClass('popup-overlay');
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getBtnClass(): string {
    switch (this.data.type) {
      case 'danger':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
        return 'primary';
      default:
        return 'primary';
    }
  }
} 