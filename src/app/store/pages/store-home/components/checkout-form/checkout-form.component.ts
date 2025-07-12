import { Component, EventEmitter, Input, Output, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CustomerInfo } from '../../../../../core/models/order.model';
import { CustomerAuthService, Customer } from '../../../../../core/services/customer-auth.service';

// Déclaration pour l'API Google Maps
declare var google: {
  maps: {
    Geocoder: new () => {
      geocode: (request: {
        location?: { lat: number; lng: number };
        address?: string;
      }, callback: (
        results: Array<{
          address_components: Array<{
            long_name: string;
            short_name: string;
            types: string[];
          }>;
          formatted_address: string;
          geometry: {
            location: {
              lat: () => number;
              lng: () => number;
            };
          };
        }>,
        status: string
      ) => void) => void;
    };
    places: {
      Autocomplete: new (
        inputField: HTMLInputElement,
        options?: {
          componentRestrictions?: { country: string };
          fields?: string[];
          types?: string[];
        }
      ) => any;
    };
  };
};

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
          <p class="subtitle" *ngIf="!currentCustomer">Veuillez remplir les informations de livraison ci-dessous</p>
          <p class="subtitle" *ngIf="currentCustomer">
            <i class="bi bi-person-check"></i>
            Bonjour {{ currentCustomer.firstName }} {{ currentCustomer.lastName }}, veuillez vérifier et compléter les informations ci-dessous
          </p>
        </div>

        <form [formGroup]="checkoutForm" (ngSubmit)="onSubmit()" class="checkout-form">
          <!-- Section informations personnelles (toujours visible, pré-remplie si connecté) -->
          <div class="form-section" [class.customer-info]="currentCustomer">
            <div class="section-title">
              <i class="bi" [class.bi-person]="!currentCustomer" [class.bi-person-check]="currentCustomer"></i>
              {{ currentCustomer ? 'Vos informations (modifiables)' : 'Informations personnelles' }}
            </div>
            
            <div class="customer-notice" *ngIf="currentCustomer">
              <i class="bi bi-info-circle"></i>
              <span>Informations de votre compte - vous pouvez les modifier si nécessaire</span>
            </div>
            
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
                [class.prefilled]="currentCustomer"
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
                  [class.prefilled]="currentCustomer"
                >
              </div>
              <div class="error-message" *ngIf="isFieldInvalid('phone')">
                {{ getPhoneErrorMessage() }}
              </div>
              <div class="input-hint">Format: 7X XXX XX XX (numéro sénégalais)</div>
            </div>
          </div>

          <!-- Section livraison (toujours visible) -->
          <div class="form-section">
            <div class="section-title">
              <i class="bi bi-truck"></i>
              Informations de livraison
            </div>

            <div class="form-group">
              <label for="address">
                <i class="bi bi-geo-alt"></i>
                Adresse de livraison
              </label>
              <div class="address-input-container">
              <textarea
                id="address"
                formControlName="address"
                rows="3"
                  placeholder="Commencez à taper votre adresse..."
                [class.is-invalid]="isFieldInvalid('address')"
                  [class.address-selected]="isAddressSelected"
              ></textarea>
              </div>
              
              <button type="button" 
                      class="location-button" 
                      (click)="getCurrentLocation()"
                      [disabled]="isGettingLocation">
                <i class="bi" 
                   [class.bi-geo-alt-fill]="!isGettingLocation"
                   [class.bi-arrow-clockwise]="isGettingLocation"
                   [class.spinning]="isGettingLocation"></i>
                {{ isGettingLocation ? 'Récupération de votre position...' : 'Utiliser ma position actuelle' }}
              </button>
              
              <div class="error-message" *ngIf="isFieldInvalid('address')">
                L'adresse est requise (minimum 10 caractères)
              </div>
              <div class="input-hint">
                <i class="bi bi-cursor"></i>
                Sélectionnez une adresse dans les suggestions pour une saisie plus rapide
                <span class="autocomplete-status" *ngIf="isAddressSelected">
                  <i class="bi bi-check-circle text-success"></i>
                  Adresse sélectionnée
                </span>
                <span class="geolocation-status" *ngIf="customerLatitude && customerLongitude">
                  <i class="bi bi-geo-alt-fill text-primary"></i>
                  Position géolocalisée
                </span>
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

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      color: var(--store-primary-color);
      font-weight: 600;
      font-size: 1.2rem;
      padding-bottom: 0.75rem;
      border-bottom: 2px solid rgba(var(--store-primary-rgb), 0.1);

      i {
        font-size: 1.2rem;
      }
    }

    .customer-info {
      background: linear-gradient(135deg, #f0f7ff 0%, #e6f3ff 100%);
      border: 1px solid #cce5ff;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      
      .section-title {
        color: var(--store-primary-color);
        border-bottom: 2px solid rgba(var(--store-primary-rgb), 0.2);
        margin-bottom: 1rem;
      }
    }

    .customer-notice {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: rgba(var(--store-primary-rgb), 0.1);
      border-radius: 8px;
      margin-bottom: 1.5rem;
      color: var(--store-primary-color);
      font-size: 0.9rem;
      border-left: 4px solid var(--store-primary-color);

      i {
        font-size: 1rem;
        color: var(--store-primary-color);
      }
    }

    .customer-display {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      .info-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1rem;
        background: rgba(255, 255, 255, 0.7);
        border-radius: 8px;
        border: 1px solid rgba(var(--store-primary-rgb), 0.15);

        .label {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--store-primary-color);

          i {
            font-size: 1.1rem;
          }
        }

        .value {
          font-weight: 600;
          color: var(--store-secondary-color);
          background: rgba(var(--store-primary-rgb), 0.1);
          padding: 0.25rem 0.75rem;
          border-radius: 6px;
        }
      }
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

      .address-input-container {
        position: relative;
        
        textarea {
          width: 100%;
          padding: 0.75rem; // Retour au padding normal
          resize: vertical;
          min-height: 80px;
        }
      }
      
      .location-button {
        width: 100%;
        margin-top: 0.75rem;
        padding: 0.75rem 1rem;
        border: 2px solid var(--store-primary-color);
        border-radius: 8px;
        background: linear-gradient(135deg, rgba(var(--store-primary-rgb), 0.1) 0%, rgba(var(--store-primary-rgb), 0.05) 100%);
        color: var(--store-primary-color);
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        font-size: 0.95rem;

        &:hover:not(:disabled) {
          background: linear-gradient(135deg, rgba(var(--store-primary-rgb), 0.15) 0%, rgba(var(--store-primary-rgb), 0.1) 100%);
          border-color: color-mix(in srgb, var(--store-primary-color) 80%, black 20%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(var(--store-primary-rgb), 0.2);
        }

        &:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        i {
          font-size: 1.1rem;
          
          &.spinning {
            animation: spin 1s linear infinite;
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

        &.prefilled {
          background: linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%);
          border-color: rgba(var(--store-primary-rgb), 0.3);
          color: var(--store-primary-color);
          font-weight: 500;

          &:focus {
            background: white;
            border-color: var(--store-primary-color);
            box-shadow: 0 0 0 3px rgba(var(--store-primary-rgb), 0.15);
          }
        }

        &.address-selected {
          border-color: #28a745;
          background: linear-gradient(135deg, #f8fff8 0%, #f0fff0 100%);

          &:focus {
            border-color: #28a745;
            box-shadow: 0 0 0 3px rgba(40, 167, 69, 0.15);
          }
        }
      }

      // Styles spécifiques pour le textarea dans le conteneur d'adresse
      .address-input-container {
        textarea {
          width: 100%;
          padding: 0.75rem 3rem 0.75rem 0.75rem; // Espace pour le bouton
          resize: vertical;
          min-height: 80px;
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
      
      .location-button {
        font-size: 0.9rem;
        padding: 0.7rem 1rem;
      }
    }

    .input-hint {
      font-size: 0.8rem;
      color: #6c757d;
      margin-top: 0.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      i {
        font-size: 0.9rem;
        color: var(--store-primary-color);
      }

      .autocomplete-status {
        margin-left: auto;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        
        i {
          color: #28a745;
          font-size: 1rem;
        }
      }
      
      .geolocation-status {
        margin-left: auto;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        color: var(--store-primary-color);
        
        i {
          color: var(--store-primary-color);
          font-size: 1rem;
        }
      }
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

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }
  `]
})
export class CheckoutFormComponent implements OnInit {
  @Input() submitting = false;
  @Output() submit = new EventEmitter<CustomerInfo>();
  @Output() cancel = new EventEmitter<void>();

  checkoutForm: FormGroup;
  currentCustomer: Customer | null = null;
  
  // Google Maps Autocomplete
  addressAutocomplete: any = null;
  isAddressSelected = false;
  
  // Géolocalisation
  isGettingLocation = false;
  customerLatitude: number | null = null;
  customerLongitude: number | null = null;

  constructor(
    private fb: FormBuilder,
    private customerAuthService: CustomerAuthService,
    private ngZone: NgZone
  ) {
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

  ngOnInit(): void {
    this.currentCustomer = this.customerAuthService.getCurrentCustomer();
    
    if (this.currentCustomer) {
      // Utilisateur connecté : pré-remplir les champs mais les laisser éditables
      this.checkoutForm.patchValue({
        fullName: `${this.currentCustomer.firstName} ${this.currentCustomer.lastName}`,
        phone: this.currentCustomer.phone.replace('+221', '') // Enlever l'indicatif pour l'affichage
      });
    }

    // Écouter les changements sur le champ d'adresse pour l'autocomplétion
    this.checkoutForm.get('address')?.valueChanges.subscribe(value => {
      if (value && this.isAddressSelected) {
        this.isAddressSelected = false;
      }
    });

    // Initialiser l'autocomplétion après un délai pour s'assurer que le DOM est prêt
    setTimeout(() => {
      this.initGoogleMapsAutocomplete();
    }, 1000);
  }

  initGoogleMapsAutocomplete(): void {
    console.log('Initialisation de l\'autocomplétion Google Maps pour l\'adresse...');
    
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
      console.log('API Google Maps non chargée, nouvelle tentative dans 1s...');
      setTimeout(() => this.initGoogleMapsAutocomplete(), 1000);
      return;
    }

    const addressInput = document.getElementById('address') as HTMLInputElement;

    if (!addressInput) {
      console.log('Champ adresse non trouvé, nouvelle tentative dans 1s...');
      setTimeout(() => this.initGoogleMapsAutocomplete(), 1000);
      return;
    }

    try {
      // Configuration de l'autocomplétion pour l'adresse
      this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, {
        componentRestrictions: { country: 'SN' }, // Restriction au Sénégal
        fields: ['address_components', 'formatted_address', 'geometry', 'name'],
        types: ['geocode', 'establishment'] // Permet de rechercher des adresses, établissements, et points d'intérêt
      });

      // Gestion de la sélection d'une adresse
      this.addressAutocomplete.addListener('place_changed', () => {
        this.ngZone.run(() => {
          const place = this.addressAutocomplete.getPlace();
          console.log('Place sélectionnée (adresse):', place);
          if (place && place.geometry && place.geometry.location) {
            this.updateFormWithPlaceDetails(place);
          }
        });
      });

      console.log('Autocomplétion adresse configurée avec succès');
    } catch (error) {
      console.error('Erreur lors de la configuration de l\'autocomplétion:', error);
    }
  }

  private updateFormWithPlaceDetails(place: any, isFromGeolocation = false): void {
    console.log('Mise à jour du formulaire avec les détails:', place);
    
    let city = '';
    let subLocality = '';
    let neighborhood = '';
    let route = '';
    let streetNumber = '';
    let administrativeArea = '';
    let country = '';
    
    if (place.address_components) {
      for (const component of place.address_components) {
        const types = component.types;
        
        if (types.includes('locality')) {
          city = component.long_name;
        } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
          subLocality = component.long_name;
        } else if (types.includes('neighborhood')) {
          neighborhood = component.long_name;
        } else if (types.includes('route')) {
          route = component.long_name;
        } else if (types.includes('street_number')) {
          streetNumber = component.long_name;
        } else if (types.includes('administrative_area_level_2') && !city) {
          administrativeArea = component.long_name;
        } else if (types.includes('country')) {
          country = component.long_name;
        }
      }
    }
    
    // Déterminer la ville en utilisant la première valeur disponible
    const cityName = city || subLocality || administrativeArea || neighborhood;
    
    // Construire l'adresse détaillée
    let detailedAddress = '';
    if (streetNumber) detailedAddress += streetNumber + ' ';
    if (route) detailedAddress += route + ' ';
    if (neighborhood) detailedAddress += neighborhood + ' ';
    if (subLocality) detailedAddress += subLocality + ' ';
    if (!detailedAddress) detailedAddress = place.name || place.formatted_address;

    // Mettre à jour le champ adresse avec l'adresse complète formatée
    this.checkoutForm.patchValue({
      address: detailedAddress.trim()
    });
    
    // Stocker les coordonnées si disponibles
    if (place.geometry && place.geometry.location) {
      this.customerLatitude = place.geometry.location.lat();
      this.customerLongitude = place.geometry.location.lng();
    }
    
    this.isAddressSelected = true;
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
      
      const customerInfo: CustomerInfo = {
        fullName: formValue.fullName,
        email: '', // Email non collecté dans ce formulaire
        phone: '+221' + formValue.phone,
        address: formValue.address,
        city: '', // Ville non collectée séparément
        deliveryInstructions: formValue.notes || '',
        latitude: this.customerLatitude || null,
        longitude: this.customerLongitude || null
      };
      
      this.submit.emit(customerInfo);
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      console.error('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    this.isGettingLocation = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        
        // Stocker les coordonnées
        this.customerLatitude = latitude;
        this.customerLongitude = longitude;

        // Utiliser le Geocoding inverse de Google Maps pour obtenir l'adresse
        if (typeof google !== 'undefined' && google.maps) {
          const geocoder = new google.maps.Geocoder();
          const latlng = { lat: latitude, lng: longitude };

          geocoder.geocode({ location: latlng }, (results, status) => {
            this.ngZone.run(() => {
              this.isGettingLocation = false;
              if (status === 'OK' && results[0]) {
                const place = results[0];
                this.updateFormWithPlaceDetails(place, true); // true pour indiquer que c'est depuis la géolocalisation
                console.log('Position récupérée avec succès');
              } else {
                console.error('Impossible de récupérer l\'adresse pour ces coordonnées');
              }
            });
          });
        } else {
          this.isGettingLocation = false;
          console.error('API Google Maps non disponible');
        }
      },
      (error) => {
        this.isGettingLocation = false;
        let message = 'Une erreur est survenue lors de la récupération de votre position';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Vous devez autoriser l\'accès à votre position';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Position non disponible';
            break;
          case error.TIMEOUT:
            message = 'La requête a expiré';
            break;
        }
        console.error(message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }
} 