import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Order } from '../../../../../core/models/order.model';

@Component({
  selector: 'app-reject-order-dialog',
  template: `
    <div class="popup-overlay" (click)="onOverlayClick($event)">
      <div class="popup-container">
        <!-- En-tête -->
        <div class="popup-header">
          <div class="header-content">
            <i class="bi bi-exclamation-triangle warning-icon"></i>
            <h2>Rejeter la commande</h2>
          </div>
          <button class="close-button" (click)="dialogRef.close()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- Corps -->
        <div class="popup-content">
          <div class="confirmation-message">
            <p class="order-id">
              Êtes-vous sûr de vouloir rejeter la commande <strong>#{{ data.order.id }}</strong> ?
            </p>
            <p class="warning-text">
              <i class="bi bi-info-circle"></i>
              Cette action ne peut pas être annulée.
            </p>
          </div>
          
          <div class="form-field">
            <label>Motif du rejet</label>
            <textarea 
              [(ngModel)]="reason" 
              rows="4" 
              placeholder="Veuillez expliquer le motif du rejet..."
              required></textarea>
            <small class="hint-text">Cette explication sera visible par le client</small>
          </div>
        </div>

        <!-- Actions -->
        <div class="popup-actions">
          <button 
            class="btn-cancel"
            (click)="dialogRef.close()">
            Annuler
          </button>
          <button 
            class="btn-confirm"
            [disabled]="!reason.trim()"
            (click)="onConfirm()">
            <i class="bi bi-x-circle"></i>
            Confirmer le rejet
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .popup-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    .popup-container {
      background: white;
      border-radius: 12px;
      width: 95%;
      max-width: 500px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: slideIn 0.3s ease-out;
      overflow: hidden;
    }

    .popup-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      display: flex;
      align-items: center;
      justify-content: space-between;

      .header-content {
        display: flex;
        align-items: center;
        gap: 12px;

        h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
        }
      }

      .warning-icon {
        color: #f59e0b;
        font-size: 22px;
      }

      .close-button {
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        color: #6b7280;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;

        &:hover {
          background-color: #f3f4f6;
          color: #1f2937;
        }
      }
    }

    .popup-content {
      padding: 24px;

      .confirmation-message {
        margin-bottom: 24px;

        .order-id {
          margin: 0 0 8px 0;
          font-size: 15px;
          color: #1f2937;
        }

        .warning-text {
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6b7280;
          font-size: 14px;

          i {
            color: #3b82f6;
          }
        }
      }

      .form-field {
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: 500;
          color: #374151;
        }

        textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          resize: none;
          font-size: 14px;
          line-height: 1.5;
          
          &:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
          }
        }

        .hint-text {
          display: block;
          margin-top: 6px;
          color: #6b7280;
          font-size: 12px;
        }
      }
    }

    .popup-actions {
      padding: 16px 24px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: flex-end;
      gap: 12px;

      button {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;

        &.btn-cancel {
          background: white;
          border: 1px solid #d1d5db;
          color: #374151;

          &:hover {
            background: #f3f4f6;
            border-color: #9ca3af;
          }
        }

        &.btn-confirm {
          background: #ef4444;
          border: none;
          color: white;

          &:hover {
            background: #dc2626;
          }

          &:disabled {
            background: #fca5a5;
            cursor: not-allowed;
          }
        }
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ]
})
export class RejectOrderDialogComponent {
  reason: string = '';

  constructor(
    public dialogRef: MatDialogRef<RejectOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { order: Order }
  ) {}

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('popup-overlay')) {
      this.dialogRef.close();
    }
  }

  onConfirm(): void {
    if (this.reason.trim()) {
      this.dialogRef.close(this.reason);
    }
  }
} 