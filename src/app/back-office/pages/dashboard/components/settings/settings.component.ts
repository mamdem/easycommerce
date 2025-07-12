import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StoreService, StoreSettings } from '../../../../../core/services/store.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { StorageService, STORE_IMAGE_DIMENSIONS } from '../../../../../core/services/storage.service';
import { AuthService } from '../../../../../core/services/auth.service';
import { Subject, takeUntil, switchMap, filter, of } from 'rxjs';
import { Store } from '../../../../../core/models/store.model';
import { User } from '../../../../../core/models/user.model';

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
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class SettingsComponent implements OnInit, OnDestroy {
  // Onglet actif
  activeTab: string = 'compte';
  
  // Mode édition
  isEditMode: boolean = false;
  
  // Utilisateur courant
  currentUser: User | null = null;
  
  // Pour compatibilité avec le template existant
  userProfile = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    avatar: ''
  };
  
  // Paramètres utilisateur
  userSettings = {
    name: '',
    email: '',
    phone: '',
    avatar: '',
    notificationEmails: true,
    notificationSMS: false,
    twoFactorAuth: false
  };
  
  // Paramètres de la boutique
  storeSettings: Partial<Store> = {
    storeName: '',
    storeDescription: '',
    storeCategory: '',
    email: '',
    phoneNumber: '',
    address: '',
    city: '',
    country: '',
    zipCode: '',
    taxId: '',
    logoUrl: '',
    bannerUrl: '',
    primaryColor: '#4f46e5',
    secondaryColor: '#f97316',
    latitude: 0,
    longitude: 0
  };
  
  // Paramètres de sécurité
  securitySettings = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  // Variables pour la gestion des fichiers
  logoFile: File | null = null;
  bannerFile: File | null = null;
  resizedLogoFile: File | null = null;
  resizedBannerFile: File | null = null;
  
  // Indicateur de chargement pour le changement de mot de passe
  isChangingPassword = false;
  
  // Propriétés pour l'autocomplétion
  addressAutocomplete: any = null;
  cityAutocomplete: any = null;
  isAddressSelected = false;
  
  // Pour la gestion de la destruction du composant
  private destroy$ = new Subject<void>();
  currentStore!: Store;
  
  constructor(
    private storeService: StoreService,
    private toastService: ToastService,
    private storageService: StorageService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Charger les informations de l'utilisateur
    this.loadUserData();

    // S'abonner aux changements de boutique
    this.storeService.selectedStore$.pipe(
      takeUntil(this.destroy$),
      switchMap(storeId => {
        if (!storeId) {
          return of(null);
        }
        return this.storeService.getSelectedStore();
      }),
      filter(store => !!store) // Ignorer les valeurs null
    ).subscribe({
      next: (store) => {
        if (store) {
          this.currentStore = store;
          this.storeSettings = { ...store };
          // Appliquer les couleurs
          this.storeService.applyStoreTheme(
            this.storeSettings.primaryColor || '#4f46e5',
            this.storeSettings.secondaryColor || '#f97316'
          );
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des paramètres', error);
        this.toastService.error('Erreur lors du chargement des paramètres');
      }
    });

    // Initialiser l'autocomplétion après un délai pour s'assurer que le DOM est prêt
    setTimeout(() => {
      this.initGoogleMapsAutocomplete();
    }, 2000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // Charger les données de l'utilisateur
  loadUserData(): void {
    console.log('Chargement des données utilisateur...');
    this.currentUser = this.authService.getCurrentUser();
    console.log('Utilisateur courant:', this.currentUser);

    if (this.currentUser) {
      // Mettre à jour les informations du profil
      const nameParts = this.currentUser.displayName?.split(' ') || ['', ''];
      this.userProfile = {
        firstName: nameParts[0],
        lastName: nameParts[1] || '',
        email: this.currentUser.email || '',
        phone: this.currentUser.phoneNumber || '',
        avatar: this.currentUser.photoURL || ''
      };
      console.log('Profil utilisateur chargé:', this.userProfile);
    } else {
      console.warn('Aucun utilisateur connecté lors du chargement des données');
    }
  }
  
  // Enregistrer les paramètres de la boutique
  async saveSettings(): Promise<void> {
    try {
      if (!this.storeSettings.id) {
        this.toastService.error('ID de boutique manquant');
        return;
      }

      // Upload du logo si modifié
      if (this.resizedLogoFile || this.logoFile) {
        const fileToUpload = this.resizedLogoFile || this.logoFile;
        if (fileToUpload) {
          const logoUrl = await this.storeService.uploadStoreLogo(this.storeSettings.id, fileToUpload);
          this.storeSettings.logoUrl = logoUrl;
        }
      }

      // Upload de la bannière si modifiée
      if (this.resizedBannerFile || this.bannerFile) {
        const fileToUpload = this.resizedBannerFile || this.bannerFile;
        if (fileToUpload) {
          const bannerUrl = await this.storeService.uploadStoreBanner(this.storeSettings.id, fileToUpload);
          this.storeSettings.bannerUrl = bannerUrl;
        }
      }

      // Mise à jour des paramètres
      this.storeService.updateStoreSettings(this.storeSettings).subscribe({
        next: (success) => {
          if (success) {
            this.toastService.success('Paramètres enregistrés avec succès');
            // Réinitialiser les fichiers
            this.logoFile = null;
            this.bannerFile = null;
            this.resizedLogoFile = null;
            this.resizedBannerFile = null;
            // Désactiver le mode édition
            this.isEditMode = false;
          }
        },
        error: (error) => {
          console.error('Erreur lors de l\'enregistrement des paramètres', error);
          this.toastService.error('Erreur lors de l\'enregistrement des paramètres');
        }
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour des images', error);
      this.toastService.error('Erreur lors de la mise à jour des images');
    }
  }
  
  // Réinitialiser les paramètres
  resetSettings(): void {
    // Recharger les paramètres depuis le store service
    this.storeService.getSelectedStore().subscribe({
      next: (store: Store | null) => {
        if (store) {
          this.storeSettings = store;
          // Appliquer les couleurs
          this.storeService.applyStoreTheme(
            this.storeSettings.primaryColor || '#4f46e5',
            this.storeSettings.secondaryColor || '#f97316'
          );
        }
      },
      error: (error: Error) => {
        console.error('Erreur lors du chargement des paramètres', error);
        this.toastService.error('Erreur lors du chargement des paramètres');
      }
    });
    this.logoFile = null;
    this.bannerFile = null;
  }

  // Changer l'onglet actif
  changeTab(tab: string): void {
    this.activeTab = tab;
  }

  // Sauvegarder le profil utilisateur
  async saveProfile(): Promise<void> {
    try {
      console.log('Début de la sauvegarde du profil...');
      
      // Vérifier si l'utilisateur est connecté
      const currentUser = this.authService.getCurrentUser();
      console.log('État de l\'utilisateur avant la mise à jour:', currentUser);
      
      if (!currentUser) {
        console.error('Tentative de mise à jour sans utilisateur connecté');
        this.toastService.error('Vous devez être connecté pour modifier votre profil');
        return;
      }

      // Vérifier si les données ont changé
      if (!this.isProfileChanged()) {
        console.log('Aucune modification détectée');
        this.toastService.info('Aucune modification n\'a été effectuée');
        return;
      }

      // Construire le nom complet
      const fullName = `${this.userProfile.firstName} ${this.userProfile.lastName}`.trim();
      console.log('Données à mettre à jour:', {
        displayName: fullName,
        email: this.userProfile.email,
        phoneNumber: this.userProfile.phone,
        photoURL: this.userProfile.avatar
      });
      
      // Mettre à jour le profil utilisateur
      await this.authService.updateProfile({
        displayName: fullName,
        email: this.userProfile.email,
        phoneNumber: this.userProfile.phone,
        photoURL: this.userProfile.avatar
      });

      // Recharger les données utilisateur après la mise à jour
      this.loadUserData();
      
      this.toastService.success('Profil mis à jour avec succès');
    } catch (error) {
      console.error('Erreur détaillée lors de la mise à jour du profil:', error);
      
      // Afficher un message d'erreur plus descriptif
      if (error instanceof Error) {
        this.toastService.error(error.message || 'Erreur lors de la mise à jour du profil');
      } else {
        this.toastService.error('Une erreur inattendue est survenue lors de la mise à jour du profil');
      }
    }
  }
  
  // Mettre à jour le mot de passe
  async updatePassword(): Promise<void> {
    try {
      // Vérifier si l'utilisateur est connecté
      const currentUser = this.authService.getCurrentUser();
      if (!currentUser) {
        this.toastService.error('Vous devez être connecté pour modifier votre mot de passe');
        return;
      }

      // Vérifier que tous les champs sont remplis
      if (!this.securitySettings.currentPassword || !this.securitySettings.newPassword || !this.securitySettings.confirmPassword) {
        this.toastService.error('Veuillez remplir tous les champs');
        return;
      }

      // Vérifier que les mots de passe correspondent
    if (this.securitySettings.newPassword !== this.securitySettings.confirmPassword) {
        this.toastService.error('Les nouveaux mots de passe ne correspondent pas');
        return;
      }

      // Vérifier que le nouveau mot de passe est différent de l'ancien
      if (this.securitySettings.currentPassword === this.securitySettings.newPassword) {
        this.toastService.error('Le nouveau mot de passe doit être différent de l\'ancien');
        return;
      }

      // Vérifier la complexité du mot de passe
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
      if (!passwordRegex.test(this.securitySettings.newPassword)) {
        this.toastService.error('Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule, un chiffre et un caractère spécial');
      return;
    }

      this.isChangingPassword = true;

      // Mettre à jour le mot de passe
      await this.authService.updatePassword(
        this.securitySettings.currentPassword,
        this.securitySettings.newPassword
      );

      // Réinitialiser le formulaire
    this.securitySettings = {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };

      this.toastService.success('Mot de passe mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mot de passe:', error);
      
      // Gérer les différents types d'erreurs
      if (error instanceof Error) {
        switch (error.message) {
          case 'auth/wrong-password':
            this.toastService.error('Le mot de passe actuel est incorrect');
            break;
          case 'auth/requires-recent-login':
            this.toastService.error('Pour des raisons de sécurité, veuillez vous reconnecter avant de modifier votre mot de passe');
            // TODO: Implémenter la logique de reconnexion si nécessaire
            break;
          default:
            this.toastService.error('Une erreur est survenue lors de la mise à jour du mot de passe');
        }
      } else {
        this.toastService.error('Une erreur inattendue est survenue');
      }
    } finally {
      this.isChangingPassword = false;
    }
  }

  // Gérer le redimensionnement du logo
  async handleLogoResize(resizedFile: File): Promise<void> {
    this.resizedLogoFile = resizedFile;
    // Prévisualisation du logo redimensionné
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        this.storeSettings.logoUrl = e.target.result as string;
      }
    };
    reader.readAsDataURL(this.resizedLogoFile);
  }

  // Gérer le redimensionnement de la bannière
  async handleBannerResize(resizedFile: File): Promise<void> {
    this.resizedBannerFile = resizedFile;
    // Prévisualisation de la bannière redimensionnée
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        this.storeSettings.bannerUrl = e.target.result as string;
      }
    };
    reader.readAsDataURL(this.resizedBannerFile);
  }

  // Gérer le changement de logo
  async onLogoChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.logoFile = input.files[0];
      
      // Vérifier si l'image doit être redimensionnée
      const dimensions = STORE_IMAGE_DIMENSIONS.logo;
      if (dimensions) {
        try {
          const resizedFile = await this.storageService.resizeImage(this.logoFile, dimensions);
          await this.handleLogoResize(resizedFile);
        } catch (error) {
          console.error('Erreur lors du redimensionnement du logo', error);
          this.toastService.error('Erreur lors du redimensionnement du logo');
        }
      } else {
        // Si pas de redimensionnement nécessaire, afficher directement
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            this.storeSettings.logoUrl = e.target.result as string;
          }
        };
        reader.readAsDataURL(this.logoFile);
      }
    }
  }

  // Gérer le changement de bannière
  async onBannerChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.bannerFile = input.files[0];
      
      // Vérifier si l'image doit être redimensionnée
      const dimensions = STORE_IMAGE_DIMENSIONS.banner;
      if (dimensions) {
        try {
          const resizedFile = await this.storageService.resizeImage(this.bannerFile, dimensions);
          await this.handleBannerResize(resizedFile);
        } catch (error) {
          console.error('Erreur lors du redimensionnement de la bannière', error);
          this.toastService.error('Erreur lors du redimensionnement de la bannière');
        }
      } else {
        // Si pas de redimensionnement nécessaire, afficher directement
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            this.storeSettings.bannerUrl = e.target.result as string;
          }
        };
        reader.readAsDataURL(this.bannerFile);
      }
    }
  }

  // Supprimer le logo
  async removeLogo(): Promise<void> {
    if (this.storeSettings.id && this.storeSettings.logoUrl) {
      try {
        await this.storeService.deleteStoreImage(this.storeSettings.id, 'logo');
        this.storeSettings.logoUrl = '';
        this.toastService.success('Logo supprimé avec succès');
      } catch (error) {
        console.error('Erreur lors de la suppression du logo', error);
        this.toastService.error('Erreur lors de la suppression du logo');
      }
    }
  }

  // Supprimer la bannière
  async removeBanner(): Promise<void> {
    if (this.storeSettings.id && this.storeSettings.bannerUrl) {
      try {
        await this.storeService.deleteStoreImage(this.storeSettings.id, 'banner');
        this.storeSettings.bannerUrl = '';
        this.toastService.success('Bannière supprimée avec succès');
      } catch (error) {
        console.error('Erreur lors de la suppression de la bannière', error);
        this.toastService.error('Erreur lors de la suppression de la bannière');
      }
    }
  }

  // Basculer le mode édition
  toggleEditMode(): void {
    this.isEditMode = !this.isEditMode;
    if (!this.isEditMode) {
      // Si on quitte le mode édition sans sauvegarder, on réinitialise les paramètres
      this.resetSettings();
    }
  }

  // Gérer le changement d'avatar
  async onAvatarChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      
      try {
        // Redimensionner l'image si nécessaire
        const resizedFile = await this.storageService.resizeImage(file, { width: 200, height: 200 });
        
        // Mettre à jour l'avatar dans le stockage
        const avatarUrl = await this.storageService.uploadUserAvatar(resizedFile);
        
        // Mettre à jour l'URL dans le profil
        this.userProfile.avatar = avatarUrl;
        
        // Mettre à jour le profil utilisateur avec l'option preventRedirect
        await this.authService.updateProfile({
          photoURL: avatarUrl
        });

        // Recharger les données utilisateur
        this.loadUserData();
        
        // Afficher un message de succès
        this.toastService.success('Photo de profil mise à jour avec succès');
      } catch (error) {
        console.error('Erreur lors du changement d\'avatar:', error);
        this.toastService.error('Erreur lors du changement de la photo de profil');
      }
    }
  }

  // Gérer les erreurs d'image
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/default-avatar.svg';
  }

  // Vérifier si le profil a été modifié
  isProfileChanged(): boolean {
    if (!this.currentUser) return false;

    const currentName = this.currentUser.displayName || '';
    const [currentFirst, currentLast] = currentName.split(' ');
    
    return (
      this.userProfile.firstName !== (currentFirst || '') ||
      this.userProfile.lastName !== (currentLast || '') ||
      this.userProfile.email !== (this.currentUser.email || '') ||
      this.userProfile.phone !== (this.currentUser.phoneNumber || '') ||
      this.userProfile.avatar !== (this.currentUser.photoURL || '')
    );
  }

  // Initialiser l'autocomplétion Google Maps
  initGoogleMapsAutocomplete(): void {
    console.log('Initialisation de l\'autocomplétion Google Maps...');
    
    if (typeof google === 'undefined' || typeof google.maps === 'undefined') {
      console.log('API Google Maps non chargée, nouvelle tentative dans 1s...');
      setTimeout(() => this.initGoogleMapsAutocomplete(), 1000);
      return;
    }

    const addressInput = document.getElementById('storeAddress') as HTMLInputElement;
    const cityInput = document.getElementById('storeCity') as HTMLInputElement;

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
        if (place && place.geometry && place.geometry.location) {
          this.updateFormWithPlaceDetails(place);
        }
      });

      // Gestion de la sélection d'une ville
      this.cityAutocomplete.addListener('place_changed', () => {
        const place = this.cityAutocomplete.getPlace();
        if (place && place.geometry && place.geometry.location) {
          this.updateFormWithPlaceDetails(place, true);
        }
      });

      console.log('Autocomplétion configurée avec succès');
    } catch (error) {
      console.error('Erreur lors de la configuration de l\'autocomplétion:', error);
    }
  }

  // Mettre à jour le formulaire avec les détails du lieu
  private updateFormWithPlaceDetails(place: any, isCityOnly: boolean = false): void {
    console.log('Place sélectionnée:', place);
    
    let city = '';
    let subLocality = '';
    let neighborhood = '';
    let route = '';
    let streetNumber = '';
    let administrativeArea = '';
    
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
        }
      }
    }

    // Déterminer la ville en utilisant la première valeur disponible
    const cityName = city || subLocality || administrativeArea || neighborhood;
    
    // Si c'est une sélection de ville uniquement
    if (isCityOnly) {
      this.storeSettings = {
        ...this.storeSettings,
        city: cityName
      };
    } else {
      // Construire l'adresse détaillée
      let detailedAddress = '';
      if (streetNumber) detailedAddress += streetNumber + ' ';
      if (route) detailedAddress += route + ' ';
      if (neighborhood) detailedAddress += neighborhood + ' ';
      if (subLocality) detailedAddress += subLocality + ' ';
      if (!detailedAddress) detailedAddress = place.name || place.formatted_address;

      // Si c'est une sélection d'adresse complète, mettre à jour l'adresse et la ville
      this.storeSettings = {
        ...this.storeSettings,
        address: detailedAddress.trim(),
        city: cityName, // Remplir automatiquement la ville
        country: 'Sénégal',
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng()
      };

      // Mettre à jour l'input de la ville visuellement
      const cityInput = document.getElementById('storeCity') as HTMLInputElement;
      if (cityInput) {
        cityInput.value = cityName;
      }
    }
    
    this.isAddressSelected = true;
  }

  // Récupérer la position actuelle
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

        // Mettre à jour les coordonnées dans le formulaire
        this.storeSettings = {
          ...this.storeSettings,
          latitude: latitude,
          longitude: longitude
        };

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