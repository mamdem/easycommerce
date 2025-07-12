import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';
import { ToastService } from './toast.service';

export interface Customer {
  id?: string;
  uid?: string; // Firebase Auth UID
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  emailVerified?: boolean;
}

export interface LoginData {
  phone: string;
  password: string;
  remember: boolean;
}

export interface RegisterData {
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CustomerAuthService {
  private currentCustomerSubject = new BehaviorSubject<Customer | null>(null);
  public currentCustomer$ = this.currentCustomerSubject.asObservable();
  
  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn$ = this.isLoggedInSubject.asObservable();

  constructor(
    private firestore: AngularFirestore,
    private afAuth: AngularFireAuth,
    private toastService: ToastService
  ) {
    // Surveiller l'état d'authentification Firebase
    this.afAuth.authState.pipe(
      switchMap(user => {
        if (user) {
          // Utilisateur connecté, récupérer ses données depuis Firestore
          return this.firestore.collection('customers').doc(user.uid).valueChanges({ idField: 'id' });
        } else {
          // Utilisateur déconnecté
          return of(null);
        }
      })
    ).subscribe(customer => {
      this.currentCustomerSubject.next(customer as Customer | null);
      this.isLoggedInSubject.next(!!customer);
    });
  }

  // Inscription
  async register(data: RegisterData): Promise<{ success: boolean; message: string }> {
    try {
      // Validation des PINs
      if (data.password !== data.confirmPassword) {
        return { success: false, message: 'Les codes PIN ne correspondent pas' };
      }

      // Validation du format PIN (4 chiffres)
      if (!/^\d{4}$/.test(data.password)) {
        return { success: false, message: 'Le code PIN doit contenir exactement 4 chiffres' };
      }

      if (!data.terms) {
        return { success: false, message: 'Vous devez accepter les conditions d\'utilisation' };
      }

      // Vérifier si le téléphone existe déjà
      const phoneExists = await this.checkPhoneExists(data.phone);
      if (phoneExists) {
        return { success: false, message: 'Un compte avec ce numéro de téléphone existe déjà' };
      }

      // Créer un email temporaire basé sur le téléphone pour Firebase Auth
      const tempEmail = `${data.phone.replace(/\s+/g, '')}@temp.local`;
      
      // Pour Firebase Auth, nous devons utiliser un mot de passe de 6 caractères minimum
      // Nous utiliserons le PIN + un suffixe pour respecter les règles Firebase
      const firebasePassword = data.password + '00'; // PIN + '00' pour avoir 6 caractères
      
      // Créer le compte Firebase Auth avec email temporaire
      const userCredential = await this.afAuth.createUserWithEmailAndPassword(tempEmail, firebasePassword);
      
      if (!userCredential.user) {
        return { success: false, message: 'Erreur lors de la création du compte' };
      }

      // Créer le document customer dans Firestore
      const customer: Customer = {
        uid: userCredential.user.uid,
        email: tempEmail, // Email temporaire, non utilisé pour la connexion
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isActive: true,
        emailVerified: false
      };

      await this.firestore.collection('customers').doc(userCredential.user.uid).set(customer);

      this.toastService.success('Compte créé avec succès !');
      
      return { success: true, message: 'Compte créé avec succès' };

    } catch (error: any) {
      console.error('Erreur lors de l\'inscription:', error);
      
      let message = 'Une erreur est survenue lors de l\'inscription';
      
      switch (error.code) {
        case 'auth/email-already-in-use':
          message = 'Un compte avec ce numéro existe déjà';
          break;
        case 'auth/invalid-email':
          message = 'Numéro de téléphone invalide';
          break;
        case 'auth/weak-password':
          message = 'Code PIN invalide';
          break;
        case 'auth/network-request-failed':
          message = 'Erreur de connexion. Vérifiez votre connexion internet';
          break;
      }

      return { success: false, message };
    }
  }

  // Connexion
  async login(data: LoginData): Promise<{ success: boolean; message: string }> {
    try {
      // Validation du format PIN (4 chiffres)
      if (!/^\d{4}$/.test(data.password)) {
        return { success: false, message: 'Le code PIN doit contenir exactement 4 chiffres' };
      }

      // Rechercher le client par téléphone dans Firestore
      const customerQuery = await this.firestore.collection('customers', ref => 
        ref.where('phone', '==', data.phone)
      ).get().toPromise();

      if (customerQuery?.empty) {
        return { success: false, message: 'Aucun compte trouvé avec ce numéro de téléphone' };
      }

      const customerDoc = customerQuery?.docs[0];
      const customer = customerDoc?.data() as Customer;

      if (!customer.isActive) {
        return { success: false, message: 'Votre compte a été désactivé' };
      }

      // Utiliser l'email temporaire pour la connexion Firebase Auth avec PIN + '00'
      const firebasePassword = data.password + '00';
      const userCredential = await this.afAuth.signInWithEmailAndPassword(customer.email, firebasePassword);
      
      if (!userCredential.user) {
        return { success: false, message: 'Erreur lors de la connexion' };
      }

      // Mettre à jour la dernière connexion
      await this.firestore.collection('customers').doc(userCredential.user.uid).update({
        updatedAt: Date.now()
      });

      this.toastService.success(`Bienvenue ${customer.firstName} !`);
      
      return { success: true, message: 'Connexion réussie' };

    } catch (error: any) {
      console.error('Erreur lors de la connexion:', error);
      
      let message = 'Une erreur est survenue lors de la connexion';
      
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          message = 'Numéro de téléphone ou code PIN incorrect';
          break;
        case 'auth/invalid-email':
          message = 'Numéro de téléphone invalide';
          break;
        case 'auth/too-many-requests':
          message = 'Trop de tentatives. Réessayez plus tard';
          break;
        case 'auth/network-request-failed':
          message = 'Erreur de connexion. Vérifiez votre connexion internet';
          break;
      }

      return { success: false, message };
    }
  }

  // Déconnexion
  async logout(): Promise<void> {
    try {
      await this.afAuth.signOut();
      this.currentCustomerSubject.next(null);
      this.isLoggedInSubject.next(false);
      this.toastService.success('Vous avez été déconnecté');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      this.toastService.error('Erreur lors de la déconnexion');
    }
  }

  // Vérifier si un téléphone existe déjà
  private async checkPhoneExists(phone: string): Promise<boolean> {
    try {
      const query = await this.firestore.collection('customers', ref => 
        ref.where('phone', '==', phone)
      ).get().toPromise();
      
      return !query?.empty;
    } catch (error) {
      console.error('Erreur lors de la vérification du téléphone:', error);
      return false;
    }
  }

  // Réinitialiser le mot de passe par téléphone
  async resetPassword(phone: string): Promise<{ success: boolean; message: string }> {
    try {
      // Rechercher le client par téléphone
      const customerQuery = await this.firestore.collection('customers', ref => 
        ref.where('phone', '==', phone)
      ).get().toPromise();

      if (customerQuery?.empty) {
        return { success: false, message: 'Aucun compte trouvé avec ce numéro de téléphone' };
      }

      const customerDoc = customerQuery?.docs[0];
      const customer = customerDoc?.data() as Customer;

      // Envoyer l'email de réinitialisation à l'email temporaire
      await this.afAuth.sendPasswordResetEmail(customer.email);
      return { success: true, message: 'Instructions de réinitialisation envoyées par email temporaire' };
    } catch (error: any) {
      console.error('Erreur lors de la réinitialisation:', error);
      
      let message = 'Une erreur est survenue';
      
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'Aucun compte trouvé avec ce numéro de téléphone';
          break;
        case 'auth/invalid-email':
          message = 'Numéro de téléphone invalide';
          break;
      }

      return { success: false, message };
    }
  }

  // Obtenir le client actuel
  getCurrentCustomer(): Customer | null {
    return this.currentCustomerSubject.value;
  }

  // Vérifier si l'utilisateur est connecté
  isLoggedIn(): boolean {
    return this.isLoggedInSubject.value;
  }

  // Mettre à jour les informations du client
  async updateCustomer(data: Partial<Customer>): Promise<{ success: boolean; message: string }> {
    try {
      const currentCustomer = this.getCurrentCustomer();
      if (!currentCustomer || !currentCustomer.uid) {
        return { success: false, message: 'Utilisateur non connecté' };
      }

      const updateData = {
        ...data,
        updatedAt: Date.now()
      };

      await this.firestore.collection('customers').doc(currentCustomer.uid).update(updateData);
      
      return { success: true, message: 'Informations mises à jour' };
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      return { success: false, message: 'Erreur lors de la mise à jour' };
    }
  }
} 