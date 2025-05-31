import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <div class="confirm-dialog" [class]="data.type">
      <!-- En-tête -->
      <div class="dialog-header">
        <div class="icon-wrapper">
          <i class="bi" [class]="getIconClass()"></i>
        </div>
        <h2>{{ data.title }}</h2>
      </div>

      <!-- Corps -->
      <div class="dialog-content">
        <p>{{ data.message }}</p>
      </div>

      <!-- Actions -->
      <div class="dialog-actions">
        <button type="button"
                (click)="onCancel()"
                class="btn btn-light">
          <i class="bi bi-x me-2"></i>
          {{ data.cancelText || 'Annuler' }}
        </button>
        <button type="button"
                (click)="onConfirm()"
                [class]="'btn btn-' + getBtnClass()">
          <i class="bi" [class]="getBtnIconClass()"></i>
          {{ data.confirmText || 'Confirmer' }}
        </button>
      </div>
    </div>
  `,
  styles: [`
    .confirm-dialog {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      width: 100%;
      max-width: 400px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.1);
    }

    .dialog-header {
      padding: 1.5rem;
      text-align: center;
      position: relative;
    }

    .icon-wrapper {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 1rem;
      font-size: 2rem;
    }

    .danger .icon-wrapper {
      background: rgba(220, 53, 69, 0.1);
      color: #dc3545;
    }

    .warning .icon-wrapper {
      background: rgba(255, 193, 7, 0.1);
      color: #ffc107;
    }

    .info .icon-wrapper {
      background: rgba(13, 202, 240, 0.1);
      color: #0dcaf0;
    }

    h2 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #2c3e50;
    }

    .dialog-content {
      padding: 0 1.5rem;
      color: #6c757d;
      text-align: center;
    }

    .dialog-content p {
      margin: 0;
      line-height: 1.5;
    }

    .dialog-actions {
      padding: 1.5rem;
      display: flex;
      justify-content: center;
      gap: 1rem;
      border-top: 1px solid #e9ecef;
      margin-top: 1.5rem;
    }

    .btn {
      min-width: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      font-weight: 500;
      transition: all 0.2s;
    }

    .btn:hover {
      transform: translateY(-1px);
    }

    .btn:active {
      transform: translateY(0);
    }

    .btn i {
      font-size: 1.1em;
    }

    .danger .btn-danger {
      background: #dc3545;
      border-color: #dc3545;
    }

    .warning .btn-warning {
      background: #ffc107;
      border-color: #ffc107;
      color: #000;
    }

    .info .btn-info {
      background: #0dcaf0;
      border-color: #0dcaf0;
      color: #000;
    }

    @media (max-width: 576px) {
      .dialog-actions {
        flex-direction: column;
      }

      .btn {
        width: 100%;
      }
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {
    // Configurer le dialogue pour être centré
    dialogRef.addPanelClass('dialog-center');
  }

  getIconClass(): string {
    switch (this.data.type) {
      case 'warning':
        return 'bi-exclamation-triangle-fill';
      case 'danger':
        return 'bi-exclamation-circle-fill';
      case 'info':
        return 'bi-info-circle-fill';
      default:
        return 'bi-info-circle-fill';
    }
  }

  getBtnClass(): string {
    switch (this.data.type) {
      case 'danger':
        return 'danger';
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      default:
        return 'primary';
    }
  }

  getBtnIconClass(): string {
    switch (this.data.type) {
      case 'danger':
        return 'bi-trash me-2';
      case 'warning':
        return 'bi-exclamation-circle me-2';
      case 'info':
        return 'bi-check me-2';
      default:
        return 'bi-check me-2';
    }
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
} 