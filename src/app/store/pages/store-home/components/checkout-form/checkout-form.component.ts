import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerInfo } from '../../../../../core/models/order.model';

@Component({
  selector: 'app-checkout-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="checkout-page">
      <div class="checkout-container">
        <div class="form-header">
          <h2>Finaliser votre commande</h2>
          <p class="subtitle">Veuillez remplir les informations de livraison ci-dessous</p>
        </div>

        <form [formGroup]="checkoutForm" (ngSubmit)="onSubmit()" class="checkout-form">
          <div class="form-section">
            <div class="form-group">
              <label for="fullName">
                <i class="bi bi-person"></i>
                Nom complet
              </label>
              <input
                id="fullName"
                type="text"
                formControlName="fullName"
                placeholder="Ex: John Doe"
                [class.is-invalid]="isFieldInvalid('fullName')"
              >
              <div class="error-message" *ngIf="isFieldInvalid('fullName')">
                Le nom complet est requis (minimum 3 caractères)
              </div>
            </div>

            <div class="form-group">
              <label for="phone">
                <i class="bi bi-telephone"></i>
                Téléphone
              </label>
              <div class="phone-input-container">
                <span class="country-code">+221</span>
                <input
                  id="phone"
                  type="tel"
                  formControlName="phone"
                  placeholder="7X XXX XX XX"
                  [class.is-invalid]="isFieldInvalid('phone')"
                >
              </div>
              <div class="error-message" *ngIf="isFieldInvalid('phone')">
                {{ getPhoneErrorMessage() }}
              </div>
              <div class="input-hint">Format: 7X XXX XX XX (numéro sénégalais)</div>
            </div>

            <div class="form-group">
              <label for="address">
                <i class="bi bi-geo-alt"></i>
                Adresse de livraison
              </label>
              <textarea
                id="address"
                formControlName="address"
                rows="3"
                placeholder="Entrez votre adresse complète"
                [class.is-invalid]="isFieldInvalid('address')"
              ></textarea>
              <div class="error-message" *ngIf="isFieldInvalid('address')">
                L'adresse est requise (minimum 10 caractères)
              </div>
            </div>

            <div class="form-group">
              <label for="notes">
                <i class="bi bi-pencil"></i>
                Instructions de livraison (optionnel)
              </label>
              <textarea
                id="notes"
                formControlName="notes"
                rows="2"
                placeholder="Ex: Près de la pharmacie, appeler avant la livraison..."
              ></textarea>
            </div>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" (click)="onCancel()">
              <i class="bi bi-arrow-left"></i>
              Retour au panier
            </button>
            <button type="submit" class="btn-primary" [disabled]="!checkoutForm.valid || submitting">
              <i class="bi bi-check2"></i>
              {{ submitting ? 'Traitement en cours...' : 'Confirmer la commande' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .checkout-page {
      min-height: 100vh;
      background: #f8f9fa;
      padding: 2rem 1rem;
    }

    .checkout-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .form-header {
      text-align: center;
      margin-bottom: 2rem;

      h2 {
        margin: 0;
        color: var(--store-primary-color);
        font-size: 2rem;
        font-weight: 600;
      }

      .subtitle {
        margin: 0.5rem 0 0;
        color: var(--store-secondary-color);
        font-size: 1.1rem;
      }
    }

    .checkout-form {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .form-section {
      padding: 2rem;
      background: white;
    }

    .form-group {
      margin-bottom: 1.5rem;

      &:last-child {
        margin-bottom: 0;
      }

      label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        color: var(--store-primary-color);
        font-weight: 500;
        font-size: 1rem;

        i {
          font-size: 1.1rem;
        }
      }

      .phone-input-container {
        display: flex;
        align-items: center;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;

        .country-code {
          padding: 0.75rem 1rem;
          background: #f8f9fa;
          border-right: 1px solid #ddd;
          color: var(--store-secondary-color);
          font-weight: 500;
        }

        input {
          border: none;
          border-radius: 0;

          &:focus {
            box-shadow: none;
          }
        }
      }

      input, textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        background: white;
        transition: all 0.2s;

        &::placeholder {
          color: #adb5bd;
        }

        &:focus {
          outline: none;
          border-color: var(--store-primary-color);
          box-shadow: 0 0 0 3px rgba(var(--store-primary-color-rgb), 0.1);
        }

        &.is-invalid {
          border-color: #e74c3c;
          &:focus {
            box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
          }
        }
      }
    }

    .input-hint {
      font-size: 0.8rem;
      color: #6c757d;
      margin-top: 0.25rem;
    }

    .error-message {
      color: #e74c3c;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;

      &::before {
        content: "⚠";
      }
    }

    .form-actions {
      padding: 1.5rem 2rem;
      background: #f8f9fa;
      border-top: 1px solid #eee;
      display: flex;
      gap: 1rem;

      button {
        padding: 1rem 2rem;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        font-size: 1rem;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;

        i {
          font-size: 1.2rem;
        }

        &:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        &.btn-primary {
          background: var(--store-primary-color);
          color: white;
          flex: 2;

          &:hover:not(:disabled) {
            background: var(--store-primary-dark);
            transform: translateY(-1px);
          }
        }

        &.btn-secondary {
          background: white;
          color: var(--store-secondary-color);
          border: 1px solid #ddd;
          flex: 1;

          &:hover {
            background: #f8f9fa;
          }
        }
      }
    }

    @media (max-width: 768px) {
      .checkout-page {
        padding: 1rem;
      }

      .form-section {
        padding: 1.5rem;
      }

      .form-actions {
        padding: 1.5rem;
        flex-direction: column;

        button {
          width: 100%;
          
          &.btn-primary,
          &.btn-secondary {
            flex: none;
          }
        }
      }
    }
  `]
})
export class CheckoutFormComponent {
  @Input() submitting = false;
  @Output() submit = new EventEmitter<CustomerInfo>();
  @Output() cancel = new EventEmitter<void>();

  checkoutForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.checkoutForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(3)]],
      phone: ['', [
        Validators.required,
        Validators.pattern(/^7[0-9]{8}$/)
      ]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      notes: ['']
    });
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.checkoutForm.get(fieldName);
    return field ? field.invalid && (field.dirty || field.touched) : false;
  }

  getPhoneErrorMessage(): string {
    const phone = this.checkoutForm.get('phone');
    if (!phone) return '';
    
    if (phone.hasError('required')) {
      return 'Le numéro de téléphone est requis';
    }
    
    if (phone.hasError('pattern')) {
      return 'Le numéro doit commencer par 7 et contenir 9 chiffres';
    }
    
    return 'Numéro de téléphone invalide';
  }

  onSubmit() {
    if (this.checkoutForm.valid && !this.submitting) {
      const formValue = this.checkoutForm.value;
      // Ajouter l'indicatif pays au numéro
      formValue.phone = '+221' + formValue.phone;
      this.submit.emit(formValue);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
} 