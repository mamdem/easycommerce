import { Component, OnInit, NgZone } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { StoreService, StoreData } from '../../../core/services/store.service';
import { ToastService } from '../../../core/services/toast.service';
import { AdminInfluenceurService, Influenceur } from '../../../admin/services/admin-influenceur.service';
import { environment } from '../../../../environments/environment';

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
  
  // Influenceur
  influenceurCode: string | null = null;
  influenceurData: Influenceur | null = null;
  isValidatingInfluenceur = false;
  influenceurValidationMessage = '';
  
  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private storeService: StoreService,
    private toastService: ToastService,
    private ngZone: NgZone,
    private influenceurService: AdminInfluenceurService
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

    // Récupérer le code influenceur depuis l'URL
    this.route.paramMap.subscribe(params => {
      const influenceurCodeParam = params.get('influenceurCode');
      if (influenceurCodeParam) {
        // Normaliser le code : majuscules et suppression des espaces
        this.influenceurCode = influenceurCodeParam.toUpperCase().trim();
        console.log('🔗 Code influenceur détecté dans l\'URL:', influenceurCodeParam, '-> normalisé:', this.influenceurCode);
        this.validateInfluenceurCode();
      } else {
        console.log('ℹ️ Aucun code influenceur dans l\'URL');
      }
    });
    
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

    // Exposer une méthode de test dans la console en mode développement
    if (!environment.production) {
      (window as any).createTestInfluenceur = () => this.createTestInfluenceur();
      console.log('🧪 Mode développement: Utilisez createTestInfluenceur() dans la console pour créer un influenceur de test');
    }
  }

  /**
   * Valide le code influenceur depuis l'URL
   */
  private async validateInfluenceurCode(): Promise<void> {
    if (!this.influenceurCode) return;

    console.log('🔍 Validation du code influenceur:', this.influenceurCode);
    this.isValidatingInfluenceur = true;
    this.influenceurValidationMessage = 'Vérification du code influenceur...';

    try {
      // Normaliser le code en majuscules et supprimer les espaces
      const normalizedCode = this.influenceurCode.toUpperCase().trim();
      console.log('📝 Code normalisé:', normalizedCode);
      
      // Récupérer l'influenceur par son code promo (qui est aussi son ID)
      this.influenceurService.getInfluenceurByCodePromo(normalizedCode)
        .subscribe({
          next: (influenceur) => {
            console.log('📦 Résultat de la recherche:', influenceur);
            
            if (influenceur && influenceur.statut === 'active') {
              this.influenceurData = influenceur;
              this.influenceurValidationMessage = `✅ Code valide ! Vous bénéficierez d'une réduction de ${influenceur.reductionPourcentage}% grâce à ${influenceur.prenom} ${influenceur.nom}`;
              console.log('✅ Code influenceur validé avec succès');
              this.toastService.success(
                `Code influenceur "${normalizedCode}" validé ! Réduction de ${influenceur.reductionPourcentage}%`,
                'Code valide'
              );
            } else if (influenceur && influenceur.statut !== 'active') {
              this.influenceurValidationMessage = `❌ Le code "${normalizedCode}" n'est plus actif`;
              console.log('⚠️ Code influenceur trouvé mais inactif:', influenceur.statut);
              this.toastService.warning(
                `Le code influenceur "${normalizedCode}" n'est plus actif`,
                'Code inactif'
              );
              this.influenceurCode = null;
              this.influenceurData = null;
            } else {
              this.influenceurValidationMessage = `❌ Code "${normalizedCode}" invalide`;
              console.log('❌ Code influenceur non trouvé');
              this.toastService.error(
                `Le code influenceur "${normalizedCode}" n'existe pas`,
                'Code invalide'
              );
              this.influenceurCode = null;
              this.influenceurData = null;
            }
            this.isValidatingInfluenceur = false;
          },
          error: (error) => {
            console.error('❌ Erreur lors de la validation du code influenceur:', error);
            this.influenceurValidationMessage = `❌ Erreur lors de la validation du code "${normalizedCode}"`;
            this.toastService.error(
              'Erreur lors de la validation du code influenceur',
              'Erreur'
            );
            this.influenceurCode = null;
            this.influenceurData = null;
            this.isValidatingInfluenceur = false;
          }
        });
    } catch (error) {
      console.error('❌ Erreur générale lors de la validation du code influenceur:', error);
      this.influenceurValidationMessage = `❌ Erreur lors de la validation du code "${this.influenceurCode}"`;
      this.isValidatingInfluenceur = false;
    }
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
  
  /**
   * Sauvegarde les données de la boutique
   */
  async onSubmit(): Promise<void> {
    console.log('🚀 Début de la soumission du formulaire');
    
    const termsAccepted = this.storeForm.get('termsAccepted')?.value;
    
    if (!this.storeForm.valid || !termsAccepted) {
      console.log('❌ Formulaire invalide ou conditions non acceptées');
      this.markFormGroupTouched(this.confirmationForm);
      this.toastService.error('Veuillez remplir tous les champs obligatoires et accepter les conditions', 'Formulaire incomplet');
      return;
    }

    this.isSubmitting = true;
    console.log('⏳ isSubmitting défini à true');

    try {
      // Récupérer l'utilisateur courant
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser || !currentUser.uid) {
        throw new Error('Utilisateur non authentifié');
      }
      console.log('👤 Utilisateur courant récupéré:', currentUser.uid);

      // Préparer les données de la boutique
      const formData = this.storeForm.value;
      const storeData: Partial<StoreData> = {
        ...formData,
        influenceurCode: this.influenceurCode // Inclure le code influenceur s'il existe
      };
      console.log('📦 Données de la boutique préparées:', { 
        storeName: storeData.storeName, 
        influenceurCode: storeData.influenceurCode 
      });

      // Sauvegarder la boutique avec timeout
      console.log('💾 Sauvegarde de la boutique...');
      const storeId = await Promise.race([
        this.storeService.saveStore(storeData),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout lors de la sauvegarde')), 30000)
        )
      ]);
      console.log('✅ Boutique sauvegardée avec l\'ID:', storeId);

      // Si un code influenceur est valide, enregistrer l'utilisation avec la nouvelle logique
      if (this.influenceurCode && this.influenceurData) {
        console.log('🎯 Enregistrement de l\'utilisation du code influenceur...');
        try {
          await Promise.race([
            this.influenceurService.enregistrerUtilisation(
              this.influenceurCode,
              currentUser.uid,
              storeId
            ),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Timeout lors de l\'enregistrement influenceur')), 15000)
            )
          ]);
          console.log('✅ Utilisation du code influenceur enregistrée avec succès');
        } catch (error) {
          console.error('❌ Erreur lors de l\'enregistrement de l\'utilisation du code influenceur:', error);
          // Ne pas faire échouer la création de boutique pour cette erreur
        }
      }

      // Mettre à jour le statut hasStore de l'utilisateur avec timeout
      console.log('👤 Mise à jour du statut hasStore...');
      try {
        await Promise.race([
          this.authService.updateStoreStatus(true),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Timeout lors de la mise à jour du statut')), 10000)
          )
        ]);
        console.log('✅ Statut hasStore mis à jour');
      } catch (error) {
        console.error('⚠️ Erreur lors de la mise à jour du statut hasStore, mais boutique créée:', error);
        // Continuer même si cette étape échoue
      }

      // Afficher le message de succès
      this.toastService.success('Boutique créée avec succès !', 'Succès');
      
      // Rediriger vers le dashboard avec un délai pour s'assurer que le toast s'affiche
      console.log('🔄 Redirection vers le dashboard...');
      setTimeout(() => {
        this.router.navigate(['/dashboard']).then(
          (success) => console.log('Navigation réussie:', success),
          (error) => console.error('Erreur de navigation:', error)
        );
      }, 500);
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la création de la boutique:', error);
      this.toastService.error(error.message || 'Une erreur est survenue lors de la création de la boutique', 'Erreur');
    } finally {
      // S'assurer que le loading se termine toujours
      setTimeout(() => {
        this.isSubmitting = false;
        console.log('🔄 isSubmitting remis à false');
      }, 100);
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

  /**
   * Méthode de test pour créer un influenceur avec le code MACDIDIOP
   * Accessible uniquement en mode développement via la console
   */
  private async createTestInfluenceur(): Promise<void> {
    try {
      const result = await this.influenceurService.createTestInfluenceur();
      console.log('✅ Influenceur de test créé avec le code:', result);
      this.toastService.success('Influenceur de test MACDIDIOP créé avec succès!', 'Test réussi');
    } catch (error) {
      console.error('❌ Erreur lors de la création de l\'influenceur de test:', error);
      this.toastService.error('Erreur lors de la création de l\'influenceur de test', 'Erreur');
    }
  }

  /**
   * Méthode de test pour déboguer le problème de soumission
   * Accessible depuis la console: window.debugStoreCreation()
   */
  debugStoreCreation(): void {
    console.log('🔍 État actuel du composant:');
    console.log('- isSubmitting:', this.isSubmitting);
    console.log('- currentStep:', this.currentStep);
    console.log('- storeForm.valid:', this.storeForm.valid);
    console.log('- termsAccepted:', this.storeForm.get('termsAccepted')?.value);
    console.log('- influenceurCode:', this.influenceurCode);
    console.log('- influenceurData:', this.influenceurData);
    console.log('- Formulaire values:', this.storeForm.value);
    
    // Exposer cette méthode globalement pour le débogage
    (window as any).debugStoreCreation = () => this.debugStoreCreation();
    (window as any).testStoreSubmission = () => this.testStoreSubmission();
  }

  /**
   * Méthode de test pour simuler la soumission sans vraiment créer la boutique
   */
  private async testStoreSubmission(): Promise<void> {
    console.log('🧪 Test de soumission (simulation)');
    
    this.isSubmitting = true;
    
    try {
      // Simuler les étapes
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('✅ Simulation réussie');
      this.toastService.success('Test de soumission réussi!', 'Test');
    } catch (error) {
      console.error('❌ Erreur dans le test:', error);
    } finally {
      this.isSubmitting = false;
    }
  }
} 