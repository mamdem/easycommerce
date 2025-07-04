import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StoreService, StoreData } from '../../../core/services/store.service';
import { ToastService } from '../../../core/services/toast.service';

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

// Interface pour la structure du formulaire
interface StoreForm {
  // Étape 1: Informations de base
  storeName: string;
  storeDescription: string;
  
  // Étape 2: Image de marque
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
  
  // Étape 3: Détails commerciaux
  legalName: string;
  taxId: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
  email: string;
  latitude: number;
  longitude: number;
  manualCoordinates: boolean;
  
  // Étape 4: Confirmation
  termsAccepted: boolean;
}

@Component({
  selector: 'app-store-creation',
  templateUrl: './store-creation.component.html',
  styleUrls: ['./store-creation.component.scss']
})
export class StoreCreationComponent implements OnInit {
  storeForm: FormGroup;
  currentStep = 1;
  totalSteps = 4;
  isSubmitting = false;
  errorMessage = '';
  
  // Fichiers sélectionnés pour upload
  logoFile: File | null = null;
  bannerFile: File | null = null;
  
  // Google Maps Autocomplete
  addressAutocomplete: any = null;
  cityAutocomplete: any = null;
  isAddressSelected = false;
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private storeService: StoreService,
    private toastService: ToastService,
    private ngZone: NgZone
  ) {
    this.storeForm = this.createStoreForm();
  }
  
  ngOnInit(): void {
    // Vérifier si l'utilisateur est authentifié
    if (!this.authService.isAuthenticated()) {
      this.toastService.error('Vous devez être connecté pour créer une boutique', 'Accès refusé');
      this.router.navigate(['/auth/login']);
      return;
    }

    // Récupérer l'utilisateur courant
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.uid) {
      this.toastService.error('Impossible de récupérer vos informations', 'Erreur');
      this.router.navigate(['/auth/login']);
      return;
    }
    
    // Initialiser le formulaire avec les valeurs par défaut
    this.initializeFormDefaults();
    
    // Écouter les changements sur le champ d'adresse
    this.storeForm.get('address')?.valueChanges.subscribe(value => {
      if (value && this.isAddressSelected) {
        this.isAddressSelected = false;
      }
    });

    // Initialiser l'autocomplétion après un délai pour s'assurer que le DOM est prêt
    setTimeout(() => {
      this.initGoogleMapsAutocomplete();
    }, 2000);
  }

  initGoogleMapsAutocomplete(): void {
    console.log('Initialisation de l\'autocomplétion Google Maps...');
    
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
      console.log('API Google Maps non chargée, nouvelle tentative dans 1s...');
      setTimeout(() => this.initGoogleMapsAutocomplete(), 1000);
      return;
    }

      const addressInput = document.getElementById('address') as HTMLInputElement;
    const cityInput = document.getElementById('city') as HTMLInputElement;

    if (!addressInput || !cityInput) {
      console.log('Champs non trouvés, nouvelle tentative dans 1s...');
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

      // Configuration de l'autocomplétion pour la ville
      this.cityAutocomplete = new google.maps.places.Autocomplete(cityInput, {
        componentRestrictions: { country: 'SN' }, // Restriction au Sénégal
        fields: ['address_components', 'formatted_address', 'geometry'],
        types: ['(cities)'] // Restriction aux villes uniquement
      });

      // Gestion de la sélection d'une adresse
      this.addressAutocomplete.addListener('place_changed', () => {
        const place = this.addressAutocomplete.getPlace();
        console.log('Place sélectionnée (adresse):', place);
        if (place && place.geometry && place.geometry.location) {
          this.updateFormWithPlaceDetails(place);
        }
      });

      // Gestion de la sélection d'une ville
      this.cityAutocomplete.addListener('place_changed', () => {
        const place = this.cityAutocomplete.getPlace();
        console.log('Place sélectionnée (ville):', place);
            if (place && place.geometry && place.geometry.location) {
          this.updateFormWithPlaceDetails(place, true);
        }
      });

      console.log('Autocomplétion configurée avec succès');
    } catch (error) {
      console.error('Erreur lors de la configuration de l\'autocomplétion:', error);
    }
  }

  private updateFormWithPlaceDetails(place: any, isCityOnly: boolean = false): void {
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
    
    // Si c'est une sélection de ville uniquement
    if (isCityOnly) {
      this.storeForm.patchValue({
        city: cityName,
        country: 'Sénégal' // Par défaut pour le Sénégal puisque nous avons restreint la recherche au Sénégal
      });
    } else {
      // Construire l'adresse détaillée
      let detailedAddress = '';
      if (streetNumber) detailedAddress += streetNumber + ' ';
      if (route) detailedAddress += route + ' ';
      if (neighborhood) detailedAddress += neighborhood + ' ';
      if (subLocality) detailedAddress += subLocality + ' ';
      if (!detailedAddress) detailedAddress = place.name || place.formatted_address;

      // Si c'est une sélection d'adresse complète
              this.storeForm.patchValue({
        address: detailedAddress.trim(),
        city: cityName,
        country: country || 'Sénégal', // Utiliser le pays détecté ou par défaut 'Sénégal'
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng()
      });

      // Mettre à jour l'input de la ville visuellement
      const cityInput = document.getElementById('city') as HTMLInputElement;
      if (cityInput) {
        cityInput.value = cityName;
      }
    }
              
              this.isAddressSelected = true;
  }
  
  // Création du formulaire avec validations
  createStoreForm(): FormGroup {
    return this.fb.group({
      // Étape 1: Informations de base
      storeName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      storeDescription: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
      
      // Étape 2: Image de marque
      logoUrl: [''],
      bannerUrl: [''],
      primaryColor: ['#3f51b5'],
      secondaryColor: ['#ff4081'],
      
      // Étape 3: Détails commerciaux
      legalName: ['', Validators.required],
      taxId: [''],
      address: ['', Validators.required],
      city: ['', Validators.required],
      zipCode: ['', Validators.required],
      country: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      latitude: [null, Validators.required],
      longitude: [null, Validators.required],
      manualCoordinates: [false],
      
      // Étape 4: Confirmation
      termsAccepted: [false, Validators.requiredTrue]
    });
  }
  
  // Getters pour accéder facilement aux sous-sections du formulaire
  get basicInfoForm(): { [key: string]: AbstractControl | null } {
    return {
      storeName: this.storeForm.get('storeName'),
      storeDescription: this.storeForm.get('storeDescription')
    };
  }
  
  get brandingForm(): { [key: string]: AbstractControl | null } {
    return {
      logoUrl: this.storeForm.get('logoUrl'),
      bannerUrl: this.storeForm.get('bannerUrl'),
      primaryColor: this.storeForm.get('primaryColor'),
      secondaryColor: this.storeForm.get('secondaryColor')
    };
  }
  
  get businessDetailsForm(): { [key: string]: AbstractControl | null } {
    return {
      legalName: this.storeForm.get('legalName'),
      taxId: this.storeForm.get('taxId'),
      address: this.storeForm.get('address'),
      city: this.storeForm.get('city'),
      zipCode: this.storeForm.get('zipCode'),
      country: this.storeForm.get('country'),
      phoneNumber: this.storeForm.get('phoneNumber'),
      email: this.storeForm.get('email'),
      latitude: this.storeForm.get('latitude'),
      longitude: this.storeForm.get('longitude'),
      manualCoordinates: this.storeForm.get('manualCoordinates')
    };
  }
  
  get confirmationForm(): { [key: string]: AbstractControl | null } {
    return {
      termsAccepted: this.storeForm.get('termsAccepted')
    };
  }

  // Activer la saisie manuelle des coordonnées
  enableManualCoordinates(): void {
    this.storeForm.patchValue({
      manualCoordinates: true
    });
    
    // Si les champs de latitude et longitude sont vides, suggérer des valeurs par défaut (Paris)
    const latitude = this.storeForm.get('latitude');
    const longitude = this.storeForm.get('longitude');
    
    if (!latitude?.value) {
      this.storeForm.patchValue({
        latitude: 48.8566,
        longitude: 2.3522
      });
    }
  }
  
  // Navigation entre les étapes
  nextStep(): void {
    if (this.validateCurrentStep()) {
      if (this.currentStep < this.totalSteps) {
        this.currentStep++;
        window.scrollTo(0, 0); // Remonter en haut de la page
      }
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.markFormGroupTouched(this.getStepFormGroup(this.currentStep));
    }
  }
  
  prevStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      window.scrollTo(0, 0); // Remonter en haut de la page
    }
  }
  
  // Validation de l'étape actuelle
  validateCurrentStep(): boolean {
    const formGroup = this.getStepFormGroup(this.currentStep);
    return formGroup ? this.isStepValid(this.currentStep) : true;
  }
  
  // Obtenir le groupe de formulaire correspondant à l'étape actuelle
  getStepFormGroup(step: number): { [key: string]: AbstractControl | null } | null {
    switch(step) {
      case 1: 
        return this.basicInfoForm;
      case 2: 
        return this.brandingForm;
      case 3: 
        return this.businessDetailsForm;
      case 4: 
        return this.confirmationForm;
      default: 
        return null;
    }
  }
  
  // Vérifier si une étape est valide
  isStepValid(step: number): boolean {
    const formGroup = this.getStepFormGroup(step);
    if (!formGroup) return true;
    
    // Pour l'étape 2 (branding), considérer comme valide même si les URLs sont vides
    if (step === 2) return true;
    
    // Pour chaque contrôle dans le groupe de formulaire, vérifier s'il y a des erreurs
    let isValid = true;
    
    // Log pour debugging
    console.log(`Validation de l'étape ${step}`);
    
    // Cas spécial pour étape 3 (détails commerciaux)
    if (step === 3) {
      const latitude = this.storeForm.get('latitude');
      const longitude = this.storeForm.get('longitude');
      
      console.log('Coordonnées:', {
        'latitude': latitude?.value,
        'longitude': longitude?.value,
        'latitude valide': latitude?.valid,
        'longitude valide': longitude?.valid
      });
      
      // Si les coordonnées sont manquantes et que l'utilisateur n'a pas activé la saisie manuelle
      if ((latitude?.invalid || longitude?.invalid) && !this.storeForm.get('manualCoordinates')?.value) {
        this.errorMessage = 'Veuillez sélectionner une adresse dans les suggestions ou activer la saisie manuelle des coordonnées';
        // Activer automatiquement la saisie manuelle
        this.enableManualCoordinates();
      }
    }
    
    Object.keys(formGroup).forEach(key => {
      const control = formGroup[key];
      if (control) {
        console.log(`Champ ${key}: valeur = "${control.value}", valide = ${control.valid}, erreurs =`, control.errors);
        
        // Skip le champ taxId car il est optionnel
        if (key === 'taxId' || key === 'manualCoordinates') return;
        
        if (control.invalid) {
          console.log(`Champ invalide: ${key}, Erreurs:`, control.errors);
          isValid = false;
        }
      }
    });
    
    console.log(`Étape ${step} valide? ${isValid}`);
    return isValid;
  }
  
  // Marquer tous les champs d'un groupe comme touchés
  markFormGroupTouched(formGroup: { [key: string]: AbstractControl | null } | null): void {
    if (!formGroup) return;
    
    Object.values(formGroup).forEach(control => {
      if (control) {
        control.markAsTouched();
      }
    });
  }
  
  // Soumettre le formulaire
  async submitForm(): Promise<void> {
    // Vérifier que le formulaire est valide et que les conditions sont acceptées
    const termsControl = this.storeForm.get('termsAccepted');
    if (this.storeForm.valid && termsControl && termsControl.value) {
      this.isSubmitting = true;
      this.errorMessage = '';
      
      try {
        // 1. Télécharger les images si présentes
        const formData = this.storeForm.value as StoreForm;
        let logoUrl = formData.logoUrl;
        let bannerUrl = formData.bannerUrl;
        
        // NOTE: Upload vers Firebase Storage temporairement désactivé
        // En attendant l'activation des buckets storage, nous utilisons directement
        // les URL base64 des aperçus d'images pour le stockage dans Firestore
        /*
        // Télécharger le logo si un fichier a été sélectionné
        if (this.logoFile) {
          logoUrl = await this.storeService.uploadImage(this.logoFile, 'store-logos');
        }
        
        // Télécharger la bannière si un fichier a été sélectionné
        if (this.bannerFile) {
          bannerUrl = await this.storeService.uploadImage(this.bannerFile, 'store-banners');
        }
        */
        
        // 2. Enregistrer les données de la boutique dans Firestore
        const storeData: Partial<StoreData> = {
          storeName: formData.storeName,
          storeDescription: formData.storeDescription,
          logoUrl: logoUrl, // URL base64 de l'aperçu du logo
          bannerUrl: bannerUrl, // URL base64 de l'aperçu de la bannière
          primaryColor: formData.primaryColor,
          secondaryColor: formData.secondaryColor,
          legalName: formData.legalName,
          taxId: formData.taxId,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode,
          country: formData.country,
          phoneNumber: formData.phoneNumber,
          email: formData.email,
          latitude: formData.latitude,
          longitude: formData.longitude
        };
        
        // Sauvegarder dans Firebase
        await this.storeService.saveStore(storeData);
        
        // Rediriger vers le tableau de bord après la création
        this.isSubmitting = false;
        this.router.navigate(['/dashboard']);
      } catch (error) {
        this.isSubmitting = false;
        this.errorMessage = 'Une erreur est survenue lors de la création de votre boutique. Veuillez réessayer.';
        console.error('Erreur lors de la création de la boutique:', error);
      }
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.markFormGroupTouched(this.confirmationForm);
      this.errorMessage = 'Veuillez vérifier les informations et accepter les conditions.';
    }
  }
  
  // Méthodes pour l'upload des images
  uploadLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validation du type de fichier
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Seules les images sont autorisées');
        return;
      }

      // Validation de la taille
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('L\'image ne doit pas dépasser 5MB');
        return;
      }

      this.logoFile = file;
      
      // Afficher un aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.storeForm.patchValue({
          logoUrl: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  }
  
  uploadBanner(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Validation du type de fichier
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Seules les images sont autorisées');
        return;
      }

      // Validation de la taille
      if (file.size > 10 * 1024 * 1024) {
        this.toastService.error('L\'image ne doit pas dépasser 10MB');
        return;
      }

      this.bannerFile = file;
      
      // Afficher un aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.storeForm.patchValue({
          bannerUrl: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  }

  // Initialiser les valeurs par défaut du formulaire
  private initializeFormDefaults(): void {
    // Écouter les changements sur le champ storeName
    this.storeForm.get('storeName')?.valueChanges.subscribe(value => {
      // Si le champ legalName est vide, on le remplit avec la valeur de storeName
      const legalNameControl = this.storeForm.get('legalName');
      if (legalNameControl && !legalNameControl.value && !legalNameControl.touched) {
        legalNameControl.setValue(value);
      }
    });

    // Initialiser les couleurs par défaut
    this.storeForm.patchValue({
      primaryColor: '#fe7b33',
      secondaryColor: '#00c3d6'
    });
  }

  getCurrentLocation(): void {
    if (!navigator.geolocation) {
      this.toastService.error('La géolocalisation n\'est pas supportée par votre navigateur', 'Erreur');
      return;
    }

    this.toastService.info('Récupération de votre position en cours...', 'Patientez');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        // Utiliser le Geocoding inverse de Google Maps pour obtenir l'adresse
        const geocoder = new google.maps.Geocoder();
        const latlng = { lat: latitude, lng: longitude };

        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const place = results[0];
            this.updateFormWithPlaceDetails(place);
            this.toastService.success('Position récupérée avec succès', 'Succès');
          } else {
            this.toastService.error('Impossible de récupérer l\'adresse pour ces coordonnées', 'Erreur');
          }
        });
      },
      (error) => {
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
        this.toastService.error(message, 'Erreur');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }
} 