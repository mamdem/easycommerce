import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { StoreService, StoreData } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';

// Déclaration pour l'API Google Maps
declare var google: any;

// Interface pour la structure du formulaire
interface StoreForm {
  // Étape 1: Informations de base
  storeName: string;
  storeCategory: string;
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
  
  // Google Maps Autocomplete - utilisation de any pour éviter les erreurs de type
  addressAutocomplete: any = null;
  isAddressSelected = false;
  
  // Catégories de boutique disponibles
  storeCategories = [
    'Mode et vêtements',
    'Électronique',
    'Maison et décoration',
    'Beauté et cosmétiques',
    'Alimentation',
    'Santé et bien-être',
    'Artisanat',
    'Livres et médias',
    'Jouets et jeux',
    'Sports et loisirs',
    'Auto et moto',
    'Bijoux et accessoires',
    'Services professionnels',
    'Autre'
  ];
  
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

    // Continuer l'initialisation
    this.initGoogleMapsAutocomplete();
    
    // Initialiser le formulaire avec les valeurs par défaut
    this.initializeFormDefaults();
    
    // Écouter les changements sur le champ d'adresse
    this.storeForm.get('address')?.valueChanges.subscribe(value => {
      if (value && this.isAddressSelected) {
        this.isAddressSelected = false;
      }
    });
  }

  initGoogleMapsAutocomplete(): void {
    // Vérifier si l'API Google Maps est chargée
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
      // L'API n'est pas encore chargée, on attend un peu et on réessaie
      setTimeout(() => this.initGoogleMapsAutocomplete(), 1000);
      return;
    }

    // Attendre que le DOM soit prêt
    setTimeout(() => {
      const addressInput = document.getElementById('address') as HTMLInputElement;
      if (addressInput) {
        this.addressAutocomplete = new google.maps.places.Autocomplete(addressInput, {
          types: ['address'],
          fields: ['address_components', 'formatted_address', 'geometry']
        });

        // Quand l'utilisateur sélectionne une adresse
        this.addressAutocomplete?.addListener('place_changed', () => {
          this.ngZone.run(() => {
            const place = this.addressAutocomplete?.getPlace();
            if (place && place.geometry && place.geometry.location) {
              // Récupérer les coordonnées
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              
              // Extraire les composants de l'adresse
              let city = '';
              let zipCode = '';
              let country = '';
              
              if (place.address_components) {
                for (const component of place.address_components) {
                  const componentType = component.types[0];
                  
                  if (componentType === 'locality') {
                    city = component.long_name;
                  } else if (componentType === 'postal_code') {
                    zipCode = component.long_name;
                  } else if (componentType === 'country') {
                    country = component.long_name;
                  }
                }
              }
              
              // Mettre à jour le formulaire
              this.storeForm.patchValue({
                address: place.formatted_address,
                city: city,
                zipCode: zipCode,
                country: country,
                latitude: lat,
                longitude: lng,
                manualCoordinates: false
              });
              
              this.isAddressSelected = true;
            }
          });
        });
      }
    }, 1000);
  }
  
  // Création du formulaire avec validations
  createStoreForm(): FormGroup {
    return this.fb.group({
      // Étape 1: Informations de base
      storeName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      storeCategory: ['', Validators.required],
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
      storeCategory: this.storeForm.get('storeCategory'),
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
          storeCategory: formData.storeCategory,
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
      this.logoFile = file; // Stocker le fichier pour l'upload ultérieur
      
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
      this.bannerFile = file; // Stocker le fichier pour l'upload ultérieur
      
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
    // Initialiser les couleurs par défaut
    this.storeForm.patchValue({
      primaryColor: '#3f51b5',
      secondaryColor: '#ff4081'
    });
  }
} 