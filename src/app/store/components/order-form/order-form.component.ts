import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerInfo } from '../../../core/services/order.service';

@Component({
  selector: 'app-order-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <form [formGroup]="orderForm" (ngSubmit)="onSubmit()" class="order-form">
      <h3>Informations de livraison</h3>
      
      <div class="form-row">
        <div class="form-group">
          <label for="firstName">Prénom</label>
          <input id="firstName" type="text" formControlName="firstName" class="form-control">
          <div class="error" *ngIf="orderForm.get('firstName')?.errors?.['required'] && orderForm.get('firstName')?.touched">
            Le prénom est requis
          </div>
        </div>

        <div class="form-group">
          <label for="lastName">Nom</label>
          <input id="lastName" type="text" formControlName="lastName" class="form-control">
          <div class="error" *ngIf="orderForm.get('lastName')?.errors?.['required'] && orderForm.get('lastName')?.touched">
            Le nom est requis
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="email">Email</label>
          <input id="email" type="email" formControlName="email" class="form-control">
          <div class="error" *ngIf="orderForm.get('email')?.errors?.['required'] && orderForm.get('email')?.touched">
            L'email est requis
          </div>
          <div class="error" *ngIf="orderForm.get('email')?.errors?.['email'] && orderForm.get('email')?.touched">
            L'email n'est pas valide
          </div>
        </div>

        <div class="form-group">
          <label for="phone">Téléphone</label>
          <input id="phone" type="tel" formControlName="phone" class="form-control">
          <div class="error" *ngIf="orderForm.get('phone')?.errors?.['required'] && orderForm.get('phone')?.touched">
            Le téléphone est requis
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="address">Adresse</label>
        <input id="address" type="text" formControlName="address" class="form-control">
        <div class="error" *ngIf="orderForm.get('address')?.errors?.['required'] && orderForm.get('address')?.touched">
          L'adresse est requise
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label for="city">Ville</label>
          <input id="city" type="text" formControlName="city" class="form-control">
          <div class="error" *ngIf="orderForm.get('city')?.errors?.['required'] && orderForm.get('city')?.touched">
            La ville est requise
          </div>
        </div>

        <div class="form-group">
          <label for="zipCode">Code postal</label>
          <input id="zipCode" type="text" formControlName="zipCode" class="form-control">
          <div class="error" *ngIf="orderForm.get('zipCode')?.errors?.['required'] && orderForm.get('zipCode')?.touched">
            Le code postal est requis
          </div>
        </div>
      </div>

      <div class="form-group">
        <label for="country">Pays</label>
        <input id="country" type="text" formControlName="country" class="form-control">
        <div class="error" *ngIf="orderForm.get('country')?.errors?.['required'] && orderForm.get('country')?.touched">
          Le pays est requis
        </div>
      </div>

      <div class="form-actions">
        <button type="button" class="btn btn-secondary" (click)="onCancel.emit()">Annuler</button>
        <button type="submit" class="btn btn-primary" [disabled]="orderForm.invalid || submitting">
          <span *ngIf="!submitting">Commander</span>
          <span *ngIf="submitting">En cours...</span>
        </button>
      </div>
    </form>
  `,
  styles: [`
    .order-form {
      max-width: 600px;
      margin: 0 auto;
      padding: 2rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .form-control {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }

    .error {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
    }

    .btn {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 4px;
      font-weight: 500;
      cursor: pointer;
    }

    .btn-primary {
      background: var(--primary-color, #007bff);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-color-dark, #0056b3);
    }

    .btn-primary:disabled {
      background: #ccc;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #6c757d;
      color: white;
    }

    .btn-secondary:hover {
      background: #5a6268;
    }

    @media (max-width: 576px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class OrderFormComponent {
  @Input() submitting = false;
  @Output() submit = new EventEmitter<CustomerInfo>();
  @Output() onCancel = new EventEmitter<void>();

  orderForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.orderForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      address: ['', Validators.required],
      city: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['', Validators.required]
    });
  }

  onSubmit() {
    if (this.orderForm.valid) {
      this.submit.emit(this.orderForm.value);
    }
  }
} 