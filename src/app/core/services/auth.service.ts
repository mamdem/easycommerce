import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  signInWithPopup,
  signOut,
  UserCredential,
  updateProfile,
  Auth,
  User as FirebaseUser
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// Définir l'interface User pour le type de retour de getCurrentUser
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  userType: 'customer' | 'merchant';
  hasStore: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private app = initializeApp(environment.firebase);
  private auth: Auth;
  private firestore = getFirestore(this.app);
  private googleProvider = new GoogleAuthProvider();
  private facebookProvider = new FacebookAuthProvider();
  
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$: Observable<User | null> = this.userSubject.asObservable();

  constructor(private router: Router) {
    // Initialisation de Firebase
    this.auth = getAuth(this.app);
    
    // Restaurer l'état de connexion depuis localStorage si disponible
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        this.userSubject.next(userData);
        
        // Récupérer les informations complémentaires depuis Firestore
        this.getUserDataFromFirestore(userData.uid)
          .then(userDoc => {
            if (userDoc) {
              // Mettre à jour le localStorage avec les informations supplémentaires
              const updatedUserData = {
                ...userData,
                userType: userDoc['userType'] || 'customer',
                hasStore: userDoc['hasStore'] || false
              };
              localStorage.setItem('user', JSON.stringify(updatedUserData));
            }
          })
          .catch(error => console.error('Erreur lors de la récupération des données Firestore:', error));
      } catch (e) {
        console.error('Erreur lors de la restauration de la session:', e);
        localStorage.removeItem('user');
      }
    }
  }

  /**
   * Sauvegarde les données utilisateur dans Firestore
   * @param user L'utilisateur Firebase
   * @param additionalData Données supplémentaires à sauvegarder
   * @returns Promise<void>
   */
  private async saveUserToFirestore(userCredential: UserCredential, additionalData: any = {}): Promise<void> {
    const user = userCredential.user;
    const userRef = doc(this.firestore, 'users', user.uid);
    
    // Récupérer d'abord les données existantes
    const userDoc = await getDoc(userRef);
    
    // Extraire le prénom et le nom si disponible dans displayName
    let firstName = additionalData.firstName || '';
    let lastName = additionalData.lastName || '';

    if (!firstName && !lastName && user.displayName) {
      const nameParts = user.displayName.split(' ');
      if (nameParts.length > 1) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      } else {
        firstName = user.displayName;
      }
    }
    
    // Déterminer le type d'utilisateur
    let userType = additionalData.userType || localStorage.getItem('userType') || 'customer';
    
    // Supprimer la sauvegarde temporaire si elle existe
    localStorage.removeItem('userType');
    
    const timestamp = Date.now();
    
    if (userDoc.exists()) {
      // Mettre à jour le document existant
      const existingData = userDoc.data();
      await updateDoc(userRef, {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        firstName: firstName || existingData['firstName'] || '',
        lastName: lastName || existingData['lastName'] || '',
        phoneNumber: additionalData.phoneNumber || existingData['phoneNumber'] || '',
        userType: userType,
        updatedAt: timestamp
      });
    } else {
      // Créer un nouveau document
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        firstName: firstName,
        lastName: lastName,
        phoneNumber: additionalData.phoneNumber || '',
        userType: userType,
        hasStore: false,
        createdAt: timestamp,
        updatedAt: timestamp
      });
    }
  }

  /**
   * Récupère les données utilisateur depuis Firestore
   */
  private async getUserDataFromFirestore(uid: string): Promise<any | null> {
    try {
      const userRef = doc(this.firestore, 'users', uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération des données utilisateur depuis Firestore:', error);
      return null;
    }
  }

  // Méthode pour créer un compte utilisateur avec email et mot de passe
  async register(
    email: string, 
    password: string, 
    userType: 'customer' | 'merchant',
    userData: {
      firstName: string;
      lastName: string;
      phoneNumber?: string;
    }
  ): Promise<UserCredential> {
    try {
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      const user = userCredential.user;
      
      // Mettre à jour le profil avec le nom complet
      const displayName = `${userData.firstName} ${userData.lastName}`.trim();
      await updateProfile(user, {
        displayName: displayName
      });
      
      // Stocker le type d'utilisateur localement
      localStorage.setItem('userType', userType);
      localStorage.setItem('hasStore', 'false');
      
      // Sauvegarder les données complètes dans Firestore
      await this.saveUserToFirestore(userCredential, { ...userData, userType });
      
      // Mettre à jour l'objet utilisateur
      this.userSubject.next({
        uid: user.uid,
        email: user.email,
        displayName: displayName,
        photoURL: user.photoURL,
        userType: userType,
        hasStore: false
      });
      
      return userCredential;
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      throw error;
    }
  }

  // Méthode pour connecter un utilisateur avec email et mot de passe
  async login(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Récupérer les informations supplémentaires de l'utilisateur depuis Firestore
      const user = userCredential.user;
      const userDoc = await this.getUserDataFromFirestore(user.uid);
      
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        userType: userDoc ? userDoc['userType'] : 'customer',
        hasStore: userDoc ? userDoc['hasStore'] : false
      };
      
      this.userSubject.next(userData as User);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return userCredential;
    } catch (error) {
      console.error('Erreur de connexion:', error);
      throw error;
    }
  }

  // Méthode pour la connexion avec Google
  async loginWithGoogle(): Promise<UserCredential> {
    try {
      // Configurer le provider pour demander plus d'informations
      this.googleProvider.addScope('profile');
      this.googleProvider.addScope('email');
      
      const userCredential = await signInWithPopup(this.auth, this.googleProvider);
      const user = userCredential.user;
      
      // Récupérer le type d'utilisateur temporairement stocké (si inscription)
      const userType = localStorage.getItem('userType') || 'merchant';
      
      // Sauvegarder les données utilisateur dans Firestore
      await this.saveUserToFirestore(userCredential, { userType });
      
      // Récupérer les données complètes depuis Firestore
      const userDoc = await this.getUserDataFromFirestore(user.uid);
      
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        userType: userDoc ? userDoc['userType'] : userType,
        hasStore: userDoc ? userDoc['hasStore'] : false
      };
      
      this.userSubject.next(userData as User);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return userCredential;
    } catch (error) {
      console.error('Erreur de connexion avec Google:', error);
      throw error;
    }
  }

  // Méthode pour la connexion avec Facebook
  async loginWithFacebook(): Promise<UserCredential> {
    try {
      const userCredential = await signInWithPopup(this.auth, this.facebookProvider);
      const user = userCredential.user;
      
      // Récupérer le type d'utilisateur temporairement stocké (si inscription)
      const userType = localStorage.getItem('userType') || 'customer';
      
      // Sauvegarder les données utilisateur dans Firestore
      await this.saveUserToFirestore(userCredential, { userType });
      
      // Récupérer les données complètes depuis Firestore
      const userDoc = await this.getUserDataFromFirestore(user.uid);
      
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        userType: userDoc ? userDoc['userType'] : userType,
        hasStore: userDoc ? userDoc['hasStore'] : false
      };
      
      this.userSubject.next(userData as User);
      localStorage.setItem('user', JSON.stringify(userData));
      
      return userCredential;
    } catch (error) {
      console.error('Erreur de connexion avec Facebook:', error);
      throw error;
    }
  }

  // Méthode pour la déconnexion
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.userSubject.next(null);
      localStorage.removeItem('user');
      this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Erreur de déconnexion:', error);
      throw error;
    }
  }

  // Vérifier si l'utilisateur est connecté
  isAuthenticated(): boolean {
    const authenticated = !!this.userSubject.value;
    // Log uniquement lors du développement et moins fréquemment
    // console.log('isAuthenticated:', authenticated, 'userSubject:', this.userSubject.value);
    return authenticated;
  }

  /**
   * Récupère l'utilisateur actuellement connecté
   * @returns L'objet utilisateur ou null si non connecté
   */
  getCurrentUser(): User | null {
    return this.userSubject.value;
  }
  
  /**
   * Vérifie si l'utilisateur courant est un marchand
   */
  isMerchant(): boolean {
    const user = this.getCurrentUser();
    return !!user && user.userType === 'merchant';
  }
  
  /**
   * Vérifie si l'utilisateur courant possède une boutique
   */
  hasStore(): boolean {
    // Cette méthode devrait idéalement vérifier dans Firestore
    // Pour l'instant, on suppose qu'un marchand a une boutique (simplifié)
    return this.isMerchant();
  }
  
  /**
   * Redirection intelligente après connexion
   */
  redirectAfterLogin(): void {
    // 1. Si l'utilisateur n'est pas connecté, rediriger vers la page de connexion
    // if (!this.isAuthenticated()) {
    //   this.router.navigate(['/auth/login']);
    //   return;
    // }
    
    // 2. Si l'utilisateur est un marchand sans boutique, rediriger vers la création de boutique
    // if (this.isMerchant() && !this.hasStore()) {
    //   this.router.navigate(['/store-creation']);
    //   return;
    // }
    
    // 3. Si l'utilisateur est un marchand avec une boutique, rediriger vers le dashboard
    // if (this.isMerchant() && this.hasStore()) {
    //   this.router.navigate(['/dashboard']);
    //   return;
    // }
    
    // 4. Pour les clients (cas par défaut), rediriger vers la page d'accueil
    this.router.navigate(['/home']);
  }
  
  /**
   * Naviguer vers la page de création de boutique
   */
  navigateToStoreCreation(): void {
    const user = this.userSubject.value;
    if (!user) {
      this.router.navigate(['/auth/login']);
      return;
    }
    
    // Si l'utilisateur n'est pas déjà marchand, mettre à jour son type
    if (!this.isMerchant()) {
      // Mettre à jour le type dans localStorage
      localStorage.setItem('userType', 'merchant');
      
      // Mettre à jour l'objet utilisateur
      const updatedUser = {
        ...user,
        userType: 'merchant' as 'merchant'  // Typage explicite pour satisfaire l'union type
      };
      this.userSubject.next(updatedUser);
      
      // Mettre à jour Firestore (en arrière-plan)
      const userRef = doc(this.firestore, 'users', user.uid);
      updateDoc(userRef, {
        userType: 'merchant',
        updatedAt: Date.now()
      }).catch(error => console.error('Erreur lors de la mise à jour du type utilisateur:', error));
    }
    
    // Rediriger vers la page de création de boutique
    this.router.navigate(['/store-creation']);
  }

  // Méthode pour mettre à jour le statut de boutique de l'utilisateur
  async updateStoreStatus(hasStore: boolean): Promise<void> {
    const currentUser = this.userSubject.value;
    if (currentUser) {
      // Mettre à jour dans Firestore
      const userRef = doc(this.firestore, 'users', currentUser.uid);
      await updateDoc(userRef, {
        hasStore: hasStore,
        updatedAt: Date.now()
      });
      
      // Mettre à jour l'état local
      const updatedUser = {
        ...currentUser,
        hasStore
      };
      this.userSubject.next(updatedUser);
      localStorage.setItem('hasStore', hasStore.toString());
    }
  }
  
  // Méthode pour mettre à jour le type d'utilisateur
  async updateUserType(userType: 'customer' | 'merchant'): Promise<void> {
    const currentUser = this.userSubject.value;
    if (currentUser) {
      // Mettre à jour dans Firestore
      const userRef = doc(this.firestore, 'users', currentUser.uid);
      await updateDoc(userRef, {
        userType: userType,
        updatedAt: Date.now()
      });
      
      // Mettre à jour l'état local
      const updatedUser = {
        ...currentUser,
        userType
      };
      this.userSubject.next(updatedUser);
      localStorage.setItem('userType', userType);
    }
  }

  // Obtenir le token d'authentification pour les appels API
  async getAuthToken(): Promise<string | null> {
    const user = this.auth.currentUser;
    if (user) {
      return await user.getIdToken();
    }
    return null;
  }

  /**
   * Déconnecte l'utilisateur
   */
  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.userSubject.next(null);
  }
} 