import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CustomerInfo } from '../../../../../core/services/order.service';

@Component({
  selector: 'app-checkout-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="checkout-form">
      <h2>Informations de livraison</h2>
      
      <form (ngSubmit)="onSubmit()" #checkoutForm="ngForm">
        <div class="form-group">
          <label for="fullName">Nom complet</label>
          <input
            type="text"
            id="fullName"
            name="fullName"
            [(ngModel)]="customerInfo.fullName"
            required
            #fullName="ngModel">
          <div class="error" *ngIf="fullName.invalid && fullName.touched">
            Le nom est requis
          </div>
        </div>

        <div class="form-group">
          <label for="phone">Téléphone</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            [(ngModel)]="customerInfo.phone"
            required
            pattern="[0-9]{10}"
            #phone="ngModel">
          <div class="error" *ngIf="phone.invalid && phone.touched">
            Un numéro de téléphone valide est requis
          </div>
        </div>

        <div class="form-group">
          <label for="address">Adresse de livraison</label>
          <textarea
            id="address"
            name="address"
            [(ngModel)]="customerInfo.address"
            required
            #address="ngModel"></textarea>
          <div class="error" *ngIf="address.invalid && address.touched">
            L'adresse est requise
          </div>
        </div>

        <div class="form-group">
          <label for="notes">Notes (optionnel)</label>
          <textarea
            id="notes"
            name="notes"
            [(ngModel)]="customerInfo.notes"></textarea>
        </div>

        <div class="form-actions">
          <button type="button" (click)="onCancel()" [disabled]="submitting">
            Retour au panier
          </button>
          <button type="submit" [disabled]="checkoutForm.invalid || submitting">
            {{ submitting ? 'Traitement en cours...' : 'Confirmer la commande' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .checkout-form {
      padding: 20px;
      max-width: 600px;
      margin: 0 auto;
    }

    .form-group {
      margin-bottom: 20px;
    }

    label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }

    input, textarea {
      width: 100%;
      padding: 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    textarea {
      min-height: 100px;
    }

    .error {
      color: red;
      font-size: 0.9em;
      margin-top: 5px;
    }

    .form-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }

    button {
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }

    button[type="submit"] {
      background-color: var(--primary-color, #007bff);
      color: white;
    }

    button[type="button"] {
      background-color: #6c757d;
      color: white;
    }

    button:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }
  `]
})
export class CheckoutFormComponent {
  @Input() submitting = false;
  @Output() submit = new EventEmitter<CustomerInfo>();
  @Output() cancel = new EventEmitter<void>();

  customerInfo: CustomerInfo = {
    fullName: '',
    phone: '',
    address: '',
    notes: ''
  };

  onSubmit() {
    if (this.submitting) return;
    this.submit.emit(this.customerInfo);
  }

  onCancel() {
    this.cancel.emit();
  }
} 