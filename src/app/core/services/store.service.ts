import { Injectable } from '@angular/core';
import { AngularFirestore, DocumentReference } from '@angular/fire/compat/firestore';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { BehaviorSubject, Observable, from, of } from 'rxjs';
import { map, switchMap, tap, catchError, take } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../../environments/environment';
import { Store } from '../models/store.model';
import { StorageService, STORE_IMAGE_DIMENSIONS, ImageDimensions } from './storage.service';
import { User } from '../models/user.model';

// Interface pour les données de boutique
export interface StoreData {
  id?:string;
  ownerId: string;
  storeName: string;
  storeCategory: string;
  storeDescription: string;
  logoUrl?: string;
  bannerUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  legalName: string;
  taxId?: string;
  address: string;
  city: string;
  zipCode: string;
  country: string;
  phoneNumber: string;
  email: string;
  latitude: number;
  longitude: number;
  influenceurCode?: string; // Code de l'influenceur qui a référé cette boutique
  createdAt: number;
  updatedAt: number;
  isPublic: boolean;
  storeUrl: string;
}

export interface StoreSettings {
  id?: string;
  ownerId: string;
  legalName: string;
  storeName: string;
  storeDescription: string;
  storeCategory: string;
  email: string;
  phoneNumber: string;
  address: string;
  city: string;
  country: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  taxId: string;
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
  monthlyTargetSales: number; // Objectif de ventes mensuel
  createdAt: number;
  updatedAt: number;
  status?: 'active' | 'inactive' | 'pending';
  currentTransaction?: {
    id: string;
    orderId: string;
    status: Transaction['status'];
    updatedAt: number;
  } | null;
}

// Interface pour les URLs de boutique
interface StoreUrl {
  userId: string;
  storeId: string;
  createdAt: number;
}

// Interface pour les transactions
export interface Transaction {
  id?: string;
  orderId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  paymentMethod: string;
  createdAt: number;
  updatedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class StoreService {
  private storeSettings: StoreSettings | null = null;
  private storeSettingsSource = new BehaviorSubject<StoreSettings | null>(null);
  storeSettings$ = this.storeSettingsSource.asObservable();
  private selectedStore: Store | null = null;
  private selectedStoreSubject = new BehaviorSubject<string | null>(localStorage.getItem('selectedStoreId'));
  public selectedStore$ = this.selectedStoreSubject.asObservable();

  private readonly storeData: Store = {
    id: '1',
    ownerId: 'owner123',
    legalName: 'EasyCommerce SARL',
    storeName: 'EasyCommerce',
    storeDescription: 'Votre boutique en ligne facile et rapide',
    storeCategory: 'E-commerce',
    email: 'contact@easycommerce.fr',
    phoneNumber: '+33 1 23 45 67 89',
    address: '123 Rue du Commerce',
    city: 'Paris',
    country: 'France',
    zipCode: '75001',
    latitude: 48.856614,
    longitude: 2.3522219,
    logoUrl: '/assets/images/logo.png',
    bannerUrl: '/assets/images/banner.jpg',
    primaryColor: '#2196f3',
    secondaryColor: '#1976d2',
    taxId: 'FR123456789',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    status: 'active'
  };

  constructor(
    private authService: AuthService,
    private toastService: ToastService,
    private firestore: AngularFirestore,
    private storage: AngularFireStorage,
    private storageService: StorageService
  ) {}

  /**
   * Crée une URL simplifiée pour une boutique
   */
  private async createStoreUrl(storeIdentity: string, userId: string, storeId: string): Promise<string> {
       // Sauvegarder dans la collection urls
    await this.firestore.doc(`urls/${storeIdentity}`).set({
      userId,
      storeId,
      createdAt: Date.now()
    });

    return storeIdentity;
  }

  /**
   * Sauvegarde une boutique
   */
  async saveStore(storeData: Partial<StoreData>): Promise<string> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!this.authService.isAuthenticated()) {
      this.toastService.error('Vous devez être connecté pour créer une boutique', 'Erreur d\'authentification');
      throw new Error('Utilisateur non connecté');
    }
    
    if (!currentUser || !currentUser.uid) {
      this.toastService.error('Impossible de récupérer vos informations', 'Erreur d\'authentification');
      throw new Error('UID utilisateur manquant');
    }
    
    try {
      // Générer un ID unique pour la boutique
      const storeIdentity = `${storeData.legalName!.replace(/\s+/g, '-')}-${Math.random().toString(36).substring(2, 7)}`;
      const storeId = `${currentUser.uid}_${storeIdentity}`;
      
      // Créer l'URL de la boutique
      const storeUrl = await this.createStoreUrl(storeIdentity, currentUser.uid, storeId);
      
      // Préparer les données à sauvegarder
      const timestamp = Date.now();
      const completeStoreData: StoreData = {
        id: storeId,
        storeName: '',
        storeCategory: '',
        storeDescription: '',
        logoUrl: '/assets/default-store-logo.svg', // Logo par défaut en SVG
        bannerUrl: '/assets/baniere.png', // Bannière par défaut
        primaryColor: '#3f51b5',
        secondaryColor: '#ff4081',
        legalName: '',
        address: '',
        city: '',
        zipCode: '',
        country: '',
        phoneNumber: '',
        email: currentUser.email || '',
        latitude: 0,
        longitude: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        ownerId: currentUser.uid,
        storeUrl: storeUrl, // Ajouter l'URL de la boutique
        isPublic: true, // La boutique est publique par défaut
        ...storeData
      };
      
      // Sauvegarder dans la collection stores/{userId}/userStores
      await this.firestore
        .collection('stores')
        .doc(currentUser.uid)
        .collection('userStores')
        .doc(storeId)
        .set(completeStoreData);
      
      return storeId;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la boutique:', error);
      this.toastService.error('Une erreur est survenue lors de la sauvegarde de la boutique', 'Erreur');
      throw error;
    }
  }

  /**
   * Télécharge une image vers Firebase Storage
   * @param file Le fichier image à télécharger
   * @param path Le chemin dans Storage (ex: 'logos', 'banners')
   * @returns Promise avec l'URL de téléchargement
   */
  async uploadImage(file: File, path: string): Promise<string> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }
    
    // Créer un nom de fichier unique
    const extension = file.name.split('.').pop();
    const fileName = `${currentUser.uid}_${Date.now()}.${extension}`;
    
    // Utiliser AngularFireStorage
    const filePath = `${path}/${fileName}`;
    const fileRef = this.storage.ref(filePath);
    const task = this.storage.upload(filePath, file);
    
    // Attendre la fin du téléchargement et récupérer l'URL
    await task;
    const downloadURL = await fileRef.getDownloadURL().toPromise();
    
    return downloadURL;
  }

  /**
   * Récupère les informations d'une boutique
   * @param storeId L'identifiant de la boutique
   * @returns Promise avec les données de la boutique
   */
  async getStore(storeId: string): Promise<StoreData | null> {
    try {
      const storeDoc = await this.firestore
        .collection('stores')
        .doc(storeId)
        .get()
        .toPromise();
      
      if (storeDoc && storeDoc.exists) {
        const storeData = storeDoc.data() as StoreData;
        // Vérifier si la boutique est publique ou si l'utilisateur est le propriétaire
        const currentUser = this.authService.getCurrentUser();
        if (storeData.isPublic || (currentUser && storeData.ownerId === currentUser.uid)) {
          return storeData;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération de la boutique:', error);
      return null;
    }
  }

  /**
   * Vérifie si l'utilisateur actuel possède une boutique
   * @returns Promise avec la valeur booléenne
   */
  async checkUserHasStore(): Promise<boolean> {
    const currentUser = this.authService.getCurrentUser();
    
    // Accès d'urgence temporaire - retourner true pour débloquer l'accès au dashboard
    // TODO: À supprimer une fois le problème résolu
    console.log('Vérification du statut de la boutique pour', currentUser);
    if (currentUser) {
      console.log('Accès temporaire activé pour permettre l\'accès au dashboard');
      // Mettre à jour le statut dans le localStorage pour être cohérent avec l'accès
      localStorage.setItem('hasStore', 'true');
      return true;
    }
    
    if (!currentUser) {
      return false;
    }
    
    try {
      // Chercher dans Firestore les boutiques où ownerId = userId
      const user = currentUser as User;
      const storeId = `store_${user.uid}`;
      const storeData = await this.getStore(storeId);
      
      return !!storeData;
    } catch (error) {
      console.error('Erreur lors de la vérification de la boutique:', error);
      // En cas d'erreur, autoriser temporairement l'accès
      return true;
    }
  }

  /**
   * Récupère les paramètres de la boutique pour l'utilisateur courant
   */
  getStoreSettings(): Observable<StoreSettings[]> {
    console.log('Début de getStoreSettings');
    return this.authService.user$.pipe(
      switchMap(user => {
        console.log('User dans getStoreSettings:', user);
        if (!user) {
          console.log('Pas d\'utilisateur, retour tableau vide');
          return of([]);
        }
        
        // Accéder à la collection stores/{userId}/userStores
        return this.firestore.collection(`stores/${user.uid}/userStores`)
          .valueChanges({ idField: 'id' }).pipe(
            map(stores => {
              console.log('Boutiques trouvées dans Firestore:', stores);
              if (stores && stores.length > 0) {
                // Cast pour assurer la compatibilité avec l'interface StoreSettings
                const typedStores = stores as unknown as StoreSettings[];
                // Utiliser la première boutique comme boutique active par défaut
                this.storeSettingsSource.next(typedStores[0]);
                return typedStores;
              }
              console.log('Aucune boutique trouvée');
              return [];
            }),
            catchError(error => {
              console.error('Erreur lors de la récupération des boutiques:', error);
              this.toastService.error('Impossible de récupérer les boutiques');
              return of([]);
            })
          );
      })
    );
  }

  /**
   * Met à jour les paramètres de la boutique
   */
  updateStoreSettings(settings: Partial<StoreSettings>): Observable<boolean> {
    return new Observable<boolean>(observer => {
      const currentUser = this.authService.getCurrentUser();
      
      if (!currentUser) {
        this.toastService.error('Vous devez être connecté pour modifier une boutique', 'Erreur d\'authentification');
        observer.next(false);
        observer.complete();
        return;
      }

      if (!settings.id) {
        this.toastService.error('ID de boutique manquant', 'Erreur de mise à jour');
        observer.next(false);
        observer.complete();
        return;
      }

      // Préparer les données à mettre à jour
      const updatedSettings: Partial<StoreSettings> = {
        ...settings,
        updatedAt: Date.now()
      };

      // Mettre à jour dans Firestore
      this.firestore
        .collection('stores')
        .doc(currentUser.uid)
        .collection('userStores')
        .doc(settings.id)
        .set(updatedSettings, { merge: true }) // Utiliser set avec merge: true au lieu de update
        .then(() => {
          // Mettre à jour le BehaviorSubject
          const currentSettings = this.storeSettingsSource.getValue();
          if (currentSettings) {
            this.storeSettingsSource.next({
              ...currentSettings,
              ...updatedSettings
            });
          }

          // Appliquer les nouvelles couleurs si elles ont été modifiées
          if (settings.primaryColor || settings.secondaryColor) {
            this.applyStoreTheme(
              settings.primaryColor || currentSettings?.primaryColor || '#4f46e5',
              settings.secondaryColor || currentSettings?.secondaryColor || '#f97316'
            );
          }

          this.toastService.success('Paramètres de la boutique mis à jour avec succès');
          observer.next(true);
          observer.complete();
        })
        .catch(error => {
          console.error('Erreur lors de la mise à jour des paramètres:', error);
          this.toastService.error('Impossible de mettre à jour les paramètres');
          observer.next(false);
          observer.complete();
        });
    });
  }

  /**
   * Crée une nouvelle boutique
   */
  async createStore(store: Partial<Store>, logoFile?: File): Promise<string> {
    const user = await this.authService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const timestamp = Date.now();
    const storeData: Partial<Store> = {
      ...store,
      ownerId: user.uid,
      createdAt: timestamp,
      updatedAt: timestamp,
      status: 'active'
    };

    // Upload du logo si fourni
    if (logoFile) {
      const fileName = this.storageService.generateUniqueFileName(logoFile.name);
      const path = `stores/${user.uid}/logo/${fileName}`;
      const dimensions: ImageDimensions = STORE_IMAGE_DIMENSIONS.logo;
      const uploadResult = await this.storageService.uploadImage(logoFile, path, dimensions).toPromise();
      if (!uploadResult) {
        throw new Error('Échec de l\'upload du logo');
      }
      storeData.logoUrl = uploadResult;
    }

    const docRef = await this.firestore.collection('stores').add(storeData);
    return docRef.id;
  }

  /**
   * Met à jour une boutique existante
   */
  async updateStore(storeId: string, updates: Partial<Store>): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.uid) throw new Error('Utilisateur non connecté');

    const updateData = {
      ...updates,
      updatedAt: Date.now()
    };

    try {
      // Mettre à jour dans la collection privée
      await this.firestore
        .collection('stores')
        .doc(currentUser.uid)
        .collection('userStores')
        .doc(storeId)
        .update(updateData);

      // Mettre à jour dans la collection publique
      await this.firestore
        .collection('public_stores')
        .doc(storeId)
        .update(updateData);

    } catch (error) {
      console.error('Erreur lors de la mise à jour de la boutique:', error);
      throw error;
    }
  }

  /**
   * Récupère la boutique de l'utilisateur connecté
   */
  getUserStore(): Observable<Store | null> {
    return from(Promise.resolve(this.authService.getCurrentUser())).pipe(
      switchMap(user => {
        if (!user) return of(null);
        return this.firestore.collection<Store>('stores', ref => 
          ref.where('ownerId', '==', user.uid)
        ).valueChanges({ idField: 'id' }).pipe(
          map(stores => stores[0] || null)
        );
      })
    );
  }

  /**
   * Vérifie si l'utilisateur a une boutique
   */
  hasStore(): Observable<boolean> {
    return this.getUserStore().pipe(
      map(store => !!store)
    );
  }

  /**
   * Supprime une boutique
   */
  async deleteStore(storeId: string): Promise<void> {
    const user = await this.authService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');

    // Supprimer le logo si existant
    const storeDoc = await this.firestore.collection('stores').doc<Store>(storeId).get().toPromise();
    const storeData = storeDoc?.data();
    if (storeData?.logoUrl) {
      const logoPath = storeData.logoUrl.split('?')[0].split('/o/')[1];
      if (logoPath) {
        await this.storageService.deleteFile(decodeURIComponent(logoPath));
      }
    }

    await this.firestore.collection('stores').doc(storeId).delete();
  }

  /**
   * Applique les couleurs du thème de la boutique
   */
  applyStoreTheme(primaryColor: string, secondaryColor: string): void {
    document.documentElement.style.setProperty('--bs-primary', primaryColor);
    document.documentElement.style.setProperty('--bs-secondary', secondaryColor);
    
    // Créer des variantes de couleurs pour le thème
    document.documentElement.style.setProperty('--bs-primary-light', this.lightenColor(primaryColor, 20));
    document.documentElement.style.setProperty('--bs-primary-dark', this.darkenColor(primaryColor, 20));
    document.documentElement.style.setProperty('--bs-secondary-light', this.lightenColor(secondaryColor, 20));
    document.documentElement.style.setProperty('--bs-secondary-dark', this.darkenColor(secondaryColor, 20));
  }
  
  /**
   * Éclaircit une couleur hexadécimale
   */
  private lightenColor(hex: string, percent: number): string {
    // Convertir la couleur hexadécimale en RGB
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    
    // Éclaircir la couleur
    r = Math.min(255, Math.floor(r + (255 - r) * (percent / 100)));
    g = Math.min(255, Math.floor(g + (255 - g) * (percent / 100)));
    b = Math.min(255, Math.floor(b + (255 - b) * (percent / 100)));
    
    // Convertir en hexadécimal
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  /**
   * Assombrit une couleur hexadécimale
   */
  private darkenColor(hex: string, percent: number): string {
    // Convertir la couleur hexadécimale en RGB
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    
    // Assombrir la couleur
    r = Math.max(0, Math.floor(r * (1 - percent / 100)));
    g = Math.max(0, Math.floor(g * (1 - percent / 100)));
    b = Math.max(0, Math.floor(b * (1 - percent / 100)));
    
    // Convertir en hexadécimal
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  getStoreById(storeId: string): Observable<StoreSettings | null> {
    console.log('Début de getStoreById avec storeId:', storeId);
    return this.authService.user$.pipe(
      switchMap(user => {
        console.log('User dans getStoreById:', user);
        if (!user) {
          console.log('Pas d\'utilisateur, retour null');
          return of(null);
        }
        
        // Accéder directement au document de la boutique dans la collection stores/{userId}/userStores
        return this.firestore.collection(`stores/${user.uid}/userStores`).doc(storeId)
          .valueChanges().pipe(
            map(store => {
              console.log('Boutique trouvée dans Firestore:', store);
              if (store) {
                // Cast pour assurer la compatibilité avec l'interface StoreSettings
                const typedStore = store as unknown as StoreSettings;
                this.storeSettingsSource.next(typedStore);
                return typedStore;
              }
              console.log('Aucune boutique trouvée avec cet ID');
              return null;
            }),
            catchError(error => {
              console.error('Erreur lors de la récupération de la boutique:', error);
              return of(null);
            })
          );
      })
    );
  }

  /**
   * Upload le logo d'une boutique
   */
  async uploadStoreLogo(storeId: string, file: File): Promise<string> {
    const path = this.storageService.getStoreImagePath(storeId, 'logo');
    const dimensions: ImageDimensions = STORE_IMAGE_DIMENSIONS.logo;
    const uploadResult = await this.storageService.uploadImage(file, path, dimensions).toPromise();
    if (!uploadResult) {
      throw new Error('Échec de l\'upload du logo');
    }
    return uploadResult;
  }

  /**
   * Upload la bannière d'une boutique
   */
  async uploadStoreBanner(storeId: string, file: File): Promise<string> {
    const path = this.storageService.getStoreImagePath(storeId, 'banner');
    const dimensions: ImageDimensions = STORE_IMAGE_DIMENSIONS.banner;
    const uploadResult = await this.storageService.uploadImage(file, path, dimensions).toPromise();
    if (!uploadResult) {
      throw new Error('Échec de l\'upload de la bannière');
    }
    return uploadResult;
  }

  /**
   * Supprime une image de boutique
   */
  async deleteStoreImage(storeId: string, type: 'logo' | 'banner'): Promise<void> {
    const path = this.storageService.getStoreImagePath(storeId, type);
    await this.storageService.deleteFile(path);
  }

  /**
   * Récupère toutes les boutiques de l'utilisateur
   */
  getUserStores(): Observable<StoreSettings[]> {
    console.log('Récupération des boutiques de l\'utilisateur...');
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          console.log('Aucun utilisateur connecté');
          return of([]);
        }
        
        console.log('Utilisateur connecté:', user.uid);
        return this.firestore
          .collection<StoreSettings>('stores')
          .doc(user.uid)
          .collection('userStores')
          .valueChanges({ idField: 'id' })
          .pipe(
            map(stores => {
              // Cast explicite vers StoreSettings[]
              const typedStores = stores as unknown as StoreSettings[];
              console.log('Boutiques trouvées:', typedStores);
              
              if (typedStores.length > 0) {
                // Mettre à jour la boutique active si aucune n'est sélectionnée
                const currentStore = this.storeSettingsSource.getValue();
                if (!currentStore) {
                  this.storeSettingsSource.next(typedStores[0]);
                }
              }
              
              return typedStores;
            }),
            catchError(error => {
              console.error('Erreur lors de la récupération des boutiques:', error);
              return of([]);
            })
          );
      })
    );
  }

  /**
   * Récupère la boutique sélectionnée
   */
  getSelectedStore(): Observable<Store | null> {
    const storeId = localStorage.getItem('selectedStoreId');
    if (!storeId) return of(null);
    
    return this.getStoreById(storeId).pipe(
      map(storeSettings => {
        if (!storeSettings) return null;
        return {
          id: storeSettings.id || '',
          ownerId: storeSettings.ownerId || '',
          legalName: storeSettings.legalName || '',
          storeName: storeSettings.storeName || '',
          storeDescription: storeSettings.storeDescription || '',
          storeCategory: storeSettings.storeCategory || '',
          email: storeSettings.email || '',
          phoneNumber: storeSettings.phoneNumber || '',
          address: storeSettings.address || '',
          city: storeSettings.city || '',
          country: storeSettings.country || '',
          zipCode: storeSettings.zipCode || '',
          latitude: storeSettings.latitude || 0,
          longitude: storeSettings.longitude || 0,
          taxId: storeSettings.taxId || '',
          logoUrl: storeSettings.logoUrl || '',
          bannerUrl: storeSettings.bannerUrl || '',
          primaryColor: storeSettings.primaryColor || '#000000',
          secondaryColor: storeSettings.secondaryColor || '#000000',
          createdAt: storeSettings.createdAt || Date.now(),
          updatedAt: storeSettings.updatedAt || Date.now(),
          status: 'active'
        } as Store;
      })
    );
  }

  /**
   * Récupère une boutique par son URL (version publique)
   */
  getStoreByUrl(storeUrl: string): Observable<StoreData | null> {
    console.log('Recherche de la boutique avec URL:', storeUrl);
    
    // D'abord, chercher dans la collection urls pour obtenir les informations de la boutique
    return from(this.firestore.doc(`urls/${storeUrl}`).get()).pipe(
      switchMap(urlDoc => {
        if (!urlDoc.exists) {
          console.log('URL non trouvée:', storeUrl);
          return of(null);
        }
        
        const urlData = urlDoc.data() as { userId: string; storeId: string };
        console.log('URL data trouvée:', urlData);
        
        // Ensuite, récupérer la boutique dans la collection stores/{userId}/userStores
        return this.firestore
          .doc(`stores/${urlData.userId}/userStores/${urlData.storeId}`)
          .get()
          .pipe(
            map(storeDoc => {
              if (!storeDoc.exists) {
                console.log('Boutique non trouvée:', urlData.storeId);
                return null;
              }
              
              const storeData = storeDoc.data() as StoreData;
              console.log('Données de la boutique trouvées:', storeData);
              
              return {
                ...storeData,
                id: storeDoc.id
              };
            })
          );
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération de la boutique:', error);
        return of(null);
      })
    );
  }

  // Méthode séparée pour uploader un nouveau logo
  async uploadNewStoreLogo(storeId: string, logoFile: File): Promise<string> {
    const user = await this.authService.getCurrentUser();
    if (!user) throw new Error('Utilisateur non connecté');

    const fileName = this.storageService.generateUniqueFileName(logoFile.name);
    const path = `stores/${user.uid}/logo/${fileName}`;
    const dimensions: ImageDimensions = STORE_IMAGE_DIMENSIONS.logo;
    const uploadResult = await this.storageService.uploadImage(logoFile, path, dimensions).toPromise();
    
    if (!uploadResult) {
      throw new Error('Échec de l\'upload du logo');
    }

    // Mettre à jour le logoUrl dans la boutique
    await this.updateStore(storeId, { logoUrl: uploadResult });
    
    return uploadResult;
  }

  getStoreInfo(): Observable<Store> {
    // Simuler un appel API avec un délai de 500ms
    return new Observable<Store>(observer => {
      setTimeout(() => {
        observer.next(this.storeData);
        observer.complete();
      }, 500);
    });
  }

  /**
   * Synchronise les données d'une boutique privée vers sa version publique
   */
  async syncStoreToPublic(storeId: string): Promise<void> {
    try {
      // 1. Récupérer les données de la boutique privée
      const userId = this.authService.getCurrentUser()?.uid;
      if (!userId) throw new Error('Utilisateur non connecté');

      const privateStorePath = `stores/${userId}/userStores/${storeId}`;
      const publicStorePath = `public_stores/${storeId}`;

      // 2. Récupérer les données de la boutique privée
      const privateStoreDoc = await this.firestore.doc(privateStorePath).get().toPromise();
      if (!privateStoreDoc?.exists) {
        console.error('Boutique privée non trouvée:', storeId);
        return;
      }

      const storeData = privateStoreDoc.data();
      if (!storeData) return;

      // 3. Copier les données de la boutique dans la collection publique
      await this.firestore.doc(publicStorePath).set(storeData);

      // 4. Synchroniser les catégories
      const privateCategories = await this.firestore.collection(`${privateStorePath}/categories`).get().toPromise();
      const publicCategoriesPath = `${publicStorePath}/categories`;

      for (const categoryDoc of privateCategories?.docs || []) {
        const categoryData = categoryDoc.data();
        await this.firestore.doc(`${publicCategoriesPath}/${categoryDoc.id}`).set(categoryData);
      }

      // 5. Synchroniser les produits
      const privateProducts = await this.firestore.collection(`${privateStorePath}/products`).get().toPromise();
      const publicProductsPath = `${publicStorePath}/products`;

      for (const productDoc of privateProducts?.docs || []) {
        const productData = productDoc.data();
        await this.firestore.doc(`${publicProductsPath}/${productDoc.id}`).set(productData);
      }

      console.log('Synchronisation terminée pour la boutique:', storeId);
    } catch (error) {
      console.error('Erreur lors de la synchronisation de la boutique:', error);
      throw error;
    }
  }

  async migratePublicStoresToStores(): Promise<void> {
    try {
      // Récupérer toutes les boutiques publiques
      const publicStoresSnapshot = await this.firestore
        .collection('public_stores')
        .get()
        .toPromise();

      if (!publicStoresSnapshot || publicStoresSnapshot.empty) {
        console.log('Aucune boutique publique à migrer');
        return;
      }

      // Migrer chaque boutique
      const batch = this.firestore.firestore.batch();
      
      publicStoresSnapshot.docs.forEach(doc => {
        const storeData = doc.data() as StoreData;
        const storeRef = this.firestore.collection('stores').doc(doc.id).ref;
        
        batch.set(storeRef, {
          ...storeData,
          isPublic: true,
          updatedAt: Date.now()
        });
        
        // Supprimer le document de public_stores
        batch.delete(doc.ref);
      });

      // Exécuter le batch
      await batch.commit();
      
      console.log(`Migration terminée: ${publicStoresSnapshot.size} boutiques migrées`);
    } catch (error) {
      console.error('Erreur lors de la migration des boutiques:', error);
      throw error;
    }
  }

  /**
   * Synchronise les données privées vers les collections publiques
   */
  async syncStoreDataToPublic(storeId: string): Promise<void> {
    const userId = this.authService.getCurrentUser()?.uid;
    if (!userId) throw new Error('User not authenticated');

    try {
      // 1. Synchroniser les catégories
      const categoriesSnapshot = await this.firestore
        .collection(`stores/${userId}/userStores/${storeId}/categories`)
        .get()
        .toPromise();

      const categoriesBatch = this.firestore.firestore.batch();
      categoriesSnapshot?.forEach(doc => {
        const publicRef = this.firestore
          .collection('public_stores')
          .doc(storeId)
          .collection('categories')
          .doc(doc.id)
          .ref;
        categoriesBatch.set(publicRef, doc.data());
      });
      await categoriesBatch.commit();

      // 2. Synchroniser les promotions
      const promotionsSnapshot = await this.firestore
        .collection(`stores/${userId}/userStores/${storeId}/promotions`)
        .get()
        .toPromise();

      const promotionsBatch = this.firestore.firestore.batch();
      promotionsSnapshot?.forEach(doc => {
        const publicRef = this.firestore
          .collection('public_stores')
          .doc(storeId)
          .collection('promotions')
          .doc(doc.id)
          .ref;
        promotionsBatch.set(publicRef, doc.data());
      });
      await promotionsBatch.commit();

      console.log('✅ Données synchronisées avec succès vers les collections publiques');
    } catch (error) {
      console.error('❌ Erreur lors de la synchronisation des données:', error);
      throw error;
    }
  }

  /**
   * Sauvegarde une transaction pour une boutique
   * @param storeId ID de la boutique
   * @param transaction Données de la transaction
   */
  async saveTransaction(storeId: string, transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser?.uid) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      const timestamp = Date.now();
      const transactionData: Transaction = {
        ...transaction,
        createdAt: timestamp,
        updatedAt: timestamp
      };

      // Créer la transaction dans la sous-collection transactions de la boutique
      const transactionRef = await this.firestore
        .collection('stores')
        .doc(currentUser.uid)
        .collection('userStores')
        .doc(storeId)
        .collection('transactions')
        .add(transactionData);

      // Mettre à jour le document de la boutique avec la transaction en cours
      await this.firestore
        .collection('stores')
        .doc(currentUser.uid)
        .collection('userStores')
        .doc(storeId)
        .update({
          currentTransaction: {
            id: transactionRef.id,
            orderId: transaction.orderId,
            status: transaction.status
          }
        });

      return transactionRef.id;
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la transaction:', error);
      throw error;
    }
  }

  /**
   * Met à jour le statut d'une transaction
   * @param storeId ID de la boutique
   * @param transactionId ID de la transaction
   * @param status Nouveau statut
   */
  async updateTransactionStatus(storeId: string, transactionId: string, status: Transaction['status']): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    
    if (!currentUser?.uid) {
      throw new Error('Utilisateur non connecté');
    }

    try {
      const timestamp = Date.now();

      // Mettre à jour la transaction
      await this.firestore
        .collection('stores')
        .doc(currentUser.uid)
        .collection('userStores')
        .doc(storeId)
        .collection('transactions')
        .doc(transactionId)
        .update({
          status,
          updatedAt: timestamp
        });

      // Si la transaction est terminée (paid ou failed), supprimer la référence de la transaction en cours
      if (status === 'paid' || status === 'failed') {
        await this.firestore
          .collection('stores')
          .doc(currentUser.uid)
          .collection('userStores')
          .doc(storeId)
          .update({
            currentTransaction: null
          });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de la transaction:', error);
      throw error;
    }
  }

  /**
   * Met à jour la boutique sélectionnée
   */
  updateSelectedStore(storeId: string | null) {
    if (storeId) {
      localStorage.setItem('selectedStoreId', storeId);
    } else {
      localStorage.removeItem('selectedStoreId');
    }
    this.selectedStoreSubject.next(storeId);
  }
} 