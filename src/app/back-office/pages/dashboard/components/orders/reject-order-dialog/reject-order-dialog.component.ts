import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Order } from '../../../../../../core/models/order.model';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-reject-order-dialog',
  template: `
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <div class="modal-dialog" [@liftUpDown]>
        <div class="modal-content">
          <h3>Rejeter la commande</h3>
          <div class="form-group mb-3">
            <label>Motif du rejet</label>
            <textarea 
              [(ngModel)]="reason" 
              class="form-control"
              rows="3" 
              placeholder="Veuillez expliquer le motif du rejet..."
              required></textarea>
            <small class="text-muted">Cette explication sera visible par le client</small>
          </div>
          <div class="modal-actions">
            <button class="btn btn-light" (click)="dialogRef.close()">
            Annuler
          </button>
            <button class="btn btn-primary" 
            [disabled]="!reason.trim()"
            (click)="onConfirm()">
              Confirmer
          </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1050;
    }

    .modal-dialog {
      width: 100%;
      max-width: 400px;
      margin: 1rem;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      padding: 1.75rem;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
      text-align: center;
    }

    .modal-content h3 {
      margin: 0 0 1.5rem;
      font-size: 1.25rem;
          font-weight: 600;
      color: var(--primary-color, #2c3e50);
    }

    .form-group {
      text-align: left;
      }

    .form-group label {
          display: block;
      margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }

    .form-control {
          width: 100%;
      padding: 0.75rem;
          border: 1px solid #d1d5db;
          border-radius: 8px;
      font-size: 0.95rem;
          
          &:focus {
            outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
          }
        }

    small {
          display: block;
      margin-top: 0.5rem;
      font-size: 0.875rem;
    }

    .modal-actions {
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 1.75rem;
    }

    .modal-actions .btn {
      min-width: 100px;
      padding: 0.625rem 1.25rem;
      font-size: 0.95rem;
        font-weight: 500;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .btn-light {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      color: #64748b;

          &:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
        color: #475569;
          }
        }

    .btn-primary {
      background: var(--primary-color, #3b82f6);
          border: none;
          color: white;

          &:hover {
        background: var(--primary-dark-color, #2563eb);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(var(--primary-rgb, 59, 130, 246), 0.2);
          }

          &:disabled {
        background: #93c5fd;
            cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }
    }

    @media (max-width: 576px) {
      .modal-dialog {
        margin: 1rem;
      }

      .modal-content {
        padding: 1.5rem;
      }
    }
  `],
  animations: [
    trigger('liftUpDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateY(20px)' }))
      ])
    ])
  ],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ]
})
export class RejectOrderDialogComponent {
  reason: string = '';

  constructor(
    public dialogRef: MatDialogRef<RejectOrderDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { order: Order }
  ) {}

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.dialogRef.close();
    }
  }

  onConfirm(): void {
    if (this.reason.trim()) {
      this.dialogRef.close(this.reason);
    }
  }
} 