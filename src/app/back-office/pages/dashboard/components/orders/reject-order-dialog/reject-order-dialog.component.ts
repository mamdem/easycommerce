import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Order } from '../../../../../../core/models/order.model';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-reject-order-dialog',
  template: `
    <!-- Dialog de confirmation de rejet de commande -->
    <div class="modal-overlay" *ngIf="show" [@fadeInOut] (click)="onOverlayClick($event)">
      <div class="modal-dialog" [@liftUpDown]>
        <div class="modal-content">
          <div class="modal-header">
            <div class="modal-icon danger">
              <i class="bi bi-exclamation-triangle"></i>
            </div>
            <h3>Rejeter la commande</h3>
          </div>
          
          <div class="modal-body">
            <p class="mb-3">Vous êtes sur le point de rejeter la commande #{{ order?.id }}.</p>
            
            <div class="form-group">
              <label for="rejectionReason">Motif du rejet *</label>
              <textarea 
                id="rejectionReason"
                [(ngModel)]="reason" 
                class="form-control"
                rows="4" 
                placeholder="Veuillez expliquer le motif du rejet (produit indisponible, problème de livraison, etc.)..."
                required></textarea>
              <small class="form-text">Cette explication sera visible par le client</small>
            </div>
          </div>
          
          <div class="modal-actions">
            <button class="btn btn-light" (click)="onCancel()">
              Annuler
            </button>
            <button class="btn btn-danger" 
                    [disabled]="!reason.trim()"
                    (click)="onConfirm()">
              <i class="bi bi-x-lg me-2"></i>
              Rejeter la commande
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
      max-width: 480px;
      margin: 1rem;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
    }

    .modal-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1.5rem 1.5rem 0;
      margin-bottom: 1rem;
    }

    .modal-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      i {
        font-size: 1.25rem;
      }

      &.danger {
        background-color: #fee2e2;
        color: #dc2626;
      }
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      color: #1f2937;
      flex: 1;
    }

    .modal-body {
      padding: 0 1.5rem 1rem;

      p {
        color: #4b5563;
        font-size: 0.95rem;
        line-height: 1.5;
        margin: 0 0 1.5rem;
      }
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #374151;
      font-size: 0.9rem;
    }

    .form-control {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-size: 0.95rem;
      font-family: inherit;
      resize: vertical;
      min-height: 100px;
      
      &:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      &::placeholder {
        color: #9ca3af;
      }
    }

    .form-text {
      display: block;
      margin-top: 0.5rem;
      font-size: 0.85rem;
      color: #6b7280;
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      background: #f8fafc;
      border-top: 1px solid #e5e7eb;
    }

    .modal-actions .btn {
      min-width: 110px;
      padding: 0.625rem 1.25rem;
      font-size: 0.95rem;
      font-weight: 500;
      border-radius: 8px;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-light {
      background: white;
      border: 1px solid #d1d5db;
      color: #374151;

      &:hover {
        background: #f9fafb;
        border-color: #9ca3af;
        color: #1f2937;
      }
    }

    .btn-danger {
      background: #dc2626;
      border: 1px solid #dc2626;
      color: white;

      &:hover:not(:disabled) {
        background: #b91c1c;
        border-color: #b91c1c;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.25);
      }

      &:disabled {
        background: #fca5a5;
        border-color: #fca5a5;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
        opacity: 0.6;
      }

      i {
        font-size: 1rem;
      }
    }

    @media (max-width: 576px) {
      .modal-dialog {
        margin: 1rem;
        max-width: calc(100vw - 2rem);
      }

      .modal-header,
      .modal-body,
      .modal-actions {
        padding-left: 1.25rem;
        padding-right: 1.25rem;
      }

      .modal-actions {
        flex-direction: column;
        
        .btn {
          width: 100%;
          min-width: auto;
        }
      }
    }
  `],
  animations: [
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('liftUpDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
          style({ opacity: 0, transform: 'translateY(20px)' }))
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
  @Input() show: boolean = false;
  @Input() order: Order | null = null;
  @Output() confirm = new EventEmitter<string>();
  @Output() cancel = new EventEmitter<void>();

  reason: string = '';

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.onCancel();
    }
  }

  onConfirm(): void {
    if (this.reason.trim()) {
      this.confirm.emit(this.reason.trim());
      this.reason = '';
    }
  }

  onCancel(): void {
    this.cancel.emit();
    this.reason = '';
  }
} 