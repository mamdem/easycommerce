import { Component, OnInit } from '@angular/core';
import { StoreService, Store } from '../../../../services/store.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  // Onglet actif
  activeTab: string = 'compte';
  
  // Pour compatibilité avec le template existant
  userProfile = {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    avatar: ''
  };
  
  // Paramètres utilisateur
  userSettings = {
    name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    phone: '+33 6 12 34 56 78',
    avatar: '',
    notificationEmails: true,
    notificationSMS: false,
    twoFactorAuth: false
  };
  
  // Paramètres de notification
  notificationSettings = {
    emailNotifications: true,
    orderConfirmation: true,
    orderShipped: true,
    orderDelivered: true,
    customerReviews: true,
    lowStock: true,
    marketingEmails: false
  };
  
  // Paramètres d'affichage
  displaySettings = {
    darkMode: false,
    compactView: false,
    showHelpTips: true,
    autoRefresh: false,
    refreshInterval: 5
  };
  
  // Paramètres de la boutique
  storeSettings: Partial<Store> = {
    name: 'Ma Boutique',
    description: 'Description de ma boutique en ligne',
    logo: '',
    primaryColor: '#4f46e5',
    secondaryColor: '#f97316',
    currency: 'EUR',
    language: 'fr',
    address: {
      street: '123 Rue du Commerce',
      city: 'Paris',
      zipCode: '75001',
      country: 'France'
    },
    userId: ''
  };
  
  // Paramètres de sécurité
  securitySettings = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  constructor(private storeService: StoreService) { }

  ngOnInit(): void {
    this.loadStoreSettings();
    
    // Assurer que l'adresse est toujours initialisée
    if (!this.storeSettings.address) {
      this.storeSettings.address = {
        street: '',
        city: '',
        zipCode: '',
        country: ''
      };
    }
  }

  // Changer d'onglet
  changeTab(tab: string): void {
    this.activeTab = tab;
  }
  
  // Alias pour compatibilité
  setActiveTab(tab: string): void {
    this.changeTab(tab);
  }
  
  // Charger les paramètres de la boutique
  loadStoreSettings(): void {
    if (this.storeService.selectedStore) {
      this.storeSettings = {
        ...this.storeSettings,
        ...this.storeService.selectedStore,
        address: this.storeSettings.address // Keep the default address if not present in selectedStore
      };
    }
  }
  
  // Sauvegarder le profil
  saveProfile(): void {
    console.log('Profil enregistré:', this.userProfile);
    // Mettre à jour userSettings à partir de userProfile
    this.userSettings.name = `${this.userProfile.firstName} ${this.userProfile.lastName}`;
    this.userSettings.email = this.userProfile.email;
    this.userSettings.phone = this.userProfile.phone;
    this.userSettings.avatar = this.userProfile.avatar;
  }
  
  // Enregistrer les paramètres de la boutique
  async saveSettings(): Promise<void> {
    if (this.storeService.selectedStore?.id) {
      try {
        await this.storeService.updateStore(this.storeService.selectedStore.id, this.storeSettings);
        console.log('Paramètres de la boutique enregistrés avec succès');
        // Appliquer les couleurs
        document.documentElement.style.setProperty('--primary-color', this.storeSettings.primaryColor || '');
        document.documentElement.style.setProperty('--secondary-color', this.storeSettings.secondaryColor || '');
      } catch (error) {
        console.error('Erreur lors de l\'enregistrement des paramètres', error);
      }
    }
  }
  
  // Enregistrer les paramètres de notification
  saveNotificationSettings(): void {
    console.log('Paramètres de notification enregistrés:', this.notificationSettings);
  }
  
  // Enregistrer les paramètres d'affichage
  saveDisplaySettings(): void {
    console.log('Paramètres d\'affichage enregistrés:', this.displaySettings);
  }
  
  // Réinitialiser les paramètres
  resetSettings(): void {
    this.loadStoreSettings();
  }
  
  // Appliquer les couleurs en temps réel pour prévisualisation
  applyColorsPreview(): void {
    document.documentElement.style.setProperty('--primary-color', this.storeSettings.primaryColor || '');
    document.documentElement.style.setProperty('--secondary-color', this.storeSettings.secondaryColor || '');
  }
  
  // Initialiser l'adresse si elle n'existe pas
  initializeAddress(): void {
    if (!this.storeSettings.address) {
      this.storeSettings.address = {
        street: '',
        city: '',
        zipCode: '',
        country: ''
      };
    }
  }
  
  // Mettre à jour le mot de passe
  updatePassword(): void {
    if (this.securitySettings.newPassword !== this.securitySettings.confirmPassword) {
      console.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    console.log('Mise à jour du mot de passe...');
    // Logique pour mettre à jour le mot de passe
  }
} 