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
  User as FirebaseUser,
  updateEmail,
  sendPasswordResetEmail,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword as firebaseUpdatePassword,
  sendEmailVerification
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';
import { getFirestore, doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ToastService } from './toast.service';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private app = initializeApp(environment.firebase);
  private auth = getAuth();
  private firestore = getFirestore(this.app);
  private googleProvider = new GoogleAuthProvider();
  private facebookProvider = new FacebookAuthProvider();
  
  private userSubject = new BehaviorSubject<User | null>(null);
  public user$: Observable<User | null> = this.userSubject.asObservable();
  private currentUser: User | null = null;
  
  // Flags pour l'état de l'authentification
  private _isAuthenticated: boolean = false;
  private _isMerchant: boolean = false;
  private _hasStore: boolean = false;

  constructor(private router: Router, private toastService: ToastService) {
    // Initialisation de Firebase
    this.auth = getAuth(this.app);
    
    // Configurer la langue française pour Firebase Auth
    this.auth.languageCode = 'fr';
    
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
                hasStore: userDoc['hasStore'] || false,
                emailVerified: userData.emailVerified || false,
                isAnonymous: userData.isAnonymous || false,
                phoneNumber: userData.phoneNumber || null
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
    
    const baseUserData = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
      phoneNumber: additionalData.phoneNumber || null,
      emailVerified: user.emailVerified,
      isAnonymous: user.isAnonymous,
      userType: userType as 'customer' | 'merchant',
      hasStore: false,
      metadata: {
        creationTime: user.metadata.creationTime,
        lastSignInTime: user.metadata.lastSignInTime
      },
      providerData: user.providerData,
      refreshToken: user.refreshToken,
      tenantId: user.tenantId
    } as User;
    
    if (userDoc.exists()) {
      // Mettre à jour le document existant
      const existingData = userDoc.data();
      await updateDoc(userRef, {
        ...baseUserData,
        firstName: firstName || existingData['firstName'] || '',
        lastName: lastName || existingData['lastName'] || '',
        updatedAt: timestamp
      });
    } else {
      // Créer un nouveau document
      await setDoc(userRef, {
        ...baseUserData,
        firstName,
        lastName,
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
      
      // Envoyer l'email de vérification en français
      await sendEmailVerification(user, {
        url: `${window.location.origin}/auth/email-verification`,
        handleCodeInApp: false
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
        phoneNumber: userData.phoneNumber || null,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        userType: userType,
        hasStore: false,
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        },
        providerData: user.providerData,
        refreshToken: user.refreshToken,
        tenantId: user.tenantId
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
      
      const userData: User = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        phoneNumber: user.phoneNumber,
        emailVerified: user.emailVerified,
        isAnonymous: user.isAnonymous,
        userType: userDoc ? userDoc['userType'] : 'customer',
        hasStore: userDoc ? userDoc['hasStore'] : false,
        metadata: {
          creationTime: user.metadata.creationTime,
          lastSignInTime: user.metadata.lastSignInTime
        },
        providerData: user.providerData,
        refreshToken: user.refreshToken,
        tenantId: user.tenantId
      };
      
      this.userSubject.next(userData);
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
      // Déconnexion de Firebase
      await signOut(this.auth);
      
      // Réinitialiser l'état de l'utilisateur
      this.userSubject.next(null);
      
      // Nettoyer le localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('selectedStoreId');
      localStorage.removeItem('userType');
      localStorage.removeItem('hasStore');
      localStorage.removeItem('token');
      
      // Nettoyer le sessionStorage
      sessionStorage.clear();
      
      // Réinitialiser les flags
      this._isAuthenticated = false;
      this._isMerchant = false;
      this._hasStore = false;
      
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
    const user = this.userSubject.value;
    if (user) {
      return {
        ...user,
        emailVerified: user.emailVerified || false,
        isAnonymous: user.isAnonymous || false,
        phoneNumber: user.phoneNumber || null,
        userType: user.userType || 'customer',
        hasStore: user.hasStore || false
      };
    }
    return null;
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
    const currentUser = this.getCurrentUser();
    
    if (!currentUser) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // Vérifier si l'email est vérifié
    if (!currentUser.emailVerified) {
      this.router.navigate(['/auth/email-verification']);
      return;
    }

    // Si l'utilisateur est un marchand sans boutique, rediriger vers la création de boutique
    if (currentUser.userType === 'merchant' && !currentUser.hasStore) {
      this.router.navigate(['/store-creation']);
      return;
    }

    // Si l'utilisateur est un marchand avec une boutique, rediriger vers le dashboard
    if (currentUser.userType === 'merchant' && currentUser.hasStore) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Par défaut, rediriger vers le dashboard
    this.router.navigate(['/dashboard']);
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
    try {
      console.log('🔄 Mise à jour du statut hasStore:', hasStore);
      
      const currentUser = this.userSubject.value;
      if (!currentUser) {
        console.log('⚠️ Aucun utilisateur courant trouvé');
        return;
      }

      // Mettre à jour dans Firestore avec gestion d'erreur
      try {
        const userRef = doc(this.firestore, 'users', currentUser.uid);
        await updateDoc(userRef, {
          hasStore: hasStore,
          updatedAt: Date.now()
        });
        console.log('✅ Firestore mis à jour avec succès');
      } catch (firestoreError) {
        console.error('❌ Erreur Firestore (non bloquante):', firestoreError);
        // Continuer même si Firestore échoue
      }
      
      // Mettre à jour l'état local (toujours faire ceci)
      const updatedUser = {
        ...currentUser,
        hasStore
      };
      this.userSubject.next(updatedUser);
      localStorage.setItem('hasStore', hasStore.toString());
      
      console.log('✅ État local mis à jour avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour du statut hasStore:', error);
      // Ne pas rejeter l'erreur pour éviter de bloquer le processus
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
   * Met à jour le profil de l'utilisateur
   * @param profileData Les données du profil à mettre à jour
   */
  async updateProfile(profileData: {
    displayName?: string;
    email?: string;
    phoneNumber?: string;
    photoURL?: string;
  }): Promise<void> {
    try {
      // Vérifier d'abord l'état de l'authentification via le BehaviorSubject
      const currentUserFromSubject = this.userSubject.value;
      console.log('État utilisateur depuis userSubject:', currentUserFromSubject);

      // Vérifier ensuite l'état de Firebase Auth
      const auth = getAuth(this.app);
      const firebaseUser = auth.currentUser;
      console.log('État utilisateur depuis Firebase Auth:', firebaseUser);

      // Si aucun utilisateur n'est trouvé dans les deux sources
      if (!currentUserFromSubject && !firebaseUser) {
        throw new Error('Vous devez être connecté pour modifier votre profil');
      }

      // Utiliser l'utilisateur Firebase si disponible, sinon utiliser celui du subject
      const currentUser = firebaseUser || currentUserFromSubject;
      if (!currentUser) {
        throw new Error('Impossible de récupérer les informations de l\'utilisateur');
      }

      // Créer un tableau de promesses pour les mises à jour
      const updatePromises: Promise<any>[] = [];

      if (firebaseUser) {
        // Mettre à jour le profil Firebase si l'utilisateur Firebase est disponible
        if (profileData.displayName !== undefined || profileData.photoURL !== undefined) {
          updatePromises.push(
            updateProfile(firebaseUser, {
              displayName: profileData.displayName || firebaseUser.displayName,
              photoURL: profileData.photoURL || firebaseUser.photoURL
            })
          );
        }

        // Mettre à jour l'email si fourni et différent
        if (profileData.email && profileData.email !== firebaseUser.email) {
          updatePromises.push(updateEmail(firebaseUser, profileData.email));
        }
      }

      // Mettre à jour le numéro de téléphone dans Firestore
      if (profileData.phoneNumber !== undefined) {
        const userRef = doc(this.firestore, 'users', currentUser.uid);
        updatePromises.push(
          updateDoc(userRef, {
            phoneNumber: profileData.phoneNumber,
            updatedAt: Date.now()
          })
        );
      }

      // Attendre que toutes les mises à jour soient terminées
      await Promise.all(updatePromises);

      // Mettre à jour le subject avec les nouvelles données
      const updatedUserData = {
        ...currentUserFromSubject,
        displayName: profileData.displayName || currentUserFromSubject?.displayName,
        email: profileData.email || currentUserFromSubject?.email,
        phoneNumber: profileData.phoneNumber || currentUserFromSubject?.phoneNumber,
        photoURL: profileData.photoURL || currentUserFromSubject?.photoURL,
        uid: currentUser.uid
      } as User;

      this.userSubject.next(updatedUserData);
      
      // Mettre à jour le localStorage
      localStorage.setItem('user', JSON.stringify(updatedUserData));

      // Ne pas afficher de toast ici car il sera géré par le composant appelant
    } catch (error) {
      console.error('Erreur détaillée lors de la mise à jour du profil:', error);
      
      // Gérer les erreurs spécifiques de Firebase
      if (error instanceof Error) {
        switch (error.message) {
          case 'auth/requires-recent-login':
            throw new Error('Pour des raisons de sécurité, veuillez vous reconnecter avant de modifier ces informations');
          case 'auth/email-already-in-use':
            throw new Error('Cette adresse email est déjà utilisée par un autre compte');
          case 'auth/invalid-email':
            throw new Error('L\'adresse email fournie n\'est pas valide');
          default:
            throw error;
        }
      }
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email);
      this.toastService.success('Un email de réinitialisation de mot de passe a été envoyé');
    } catch (error) {
      console.error('Erreur lors de la réinitialisation du mot de passe:', error);
      throw error;
    }
  }

  /**
   * Met à jour le mot de passe de l'utilisateur
   * @param currentPassword Le mot de passe actuel
   * @param newPassword Le nouveau mot de passe
   */
  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser || !currentUser.email) {
        throw new Error('Aucun utilisateur connecté');
      }

      // Réauthentifier l'utilisateur avant de changer le mot de passe
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
      await reauthenticateWithCredential(currentUser, credential);
      
      // Mettre à jour le mot de passe
      await firebaseUpdatePassword(currentUser, newPassword);
      
      this.toastService.success('Mot de passe mis à jour avec succès');
    } catch (error) {
      console.error('Erreur lors de la mise à jour du mot de passe:', error);
      
      if (error instanceof Error) {
        switch (error.message) {
          case 'auth/wrong-password':
            throw new Error('Mot de passe actuel incorrect');
          case 'auth/requires-recent-login':
            throw new Error('Pour des raisons de sécurité, veuillez vous reconnecter avant de modifier votre mot de passe');
          default:
            throw new Error('Erreur lors de la mise à jour du mot de passe');
        }
      }
      throw error;
    }
  }

  // Méthode pour vérifier si l'email de l'utilisateur est vérifié
  isEmailVerified(): boolean {
    const currentUser = this.auth.currentUser;
    return currentUser ? currentUser.emailVerified : false;
  }

  // Méthode pour renvoyer l'email de vérification
  async resendVerificationEmail(): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        throw new Error('Aucun utilisateur connecté');
      }

      if (currentUser.emailVerified) {
        throw new Error('Votre email est déjà vérifié');
      }

      await sendEmailVerification(currentUser, {
        url: `${window.location.origin}/auth/email-verification`,
        handleCodeInApp: false
      });
      this.toastService.success('Email de vérification envoyé avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email de vérification:', error);
      throw error;
    }
  }

  // Méthode pour rafraîchir l'état de vérification de l'email
  async refreshEmailVerificationStatus(): Promise<boolean> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) {
        return false;
      }

      // Recharger l'utilisateur pour obtenir l'état de vérification à jour
      await currentUser.reload();
      return currentUser.emailVerified;
    } catch (error) {
      console.error('Erreur lors du rafraîchissement du statut de vérification:', error);
      return false;
    }
  }
} 