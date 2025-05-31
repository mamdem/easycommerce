import { Injectable } from '@angular/core';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private db = getFirestore();
  private currentUserDataSubject = new BehaviorSubject<any>(null);
  public currentUserData$: Observable<any> = this.currentUserDataSubject.asObservable();

  constructor() {}

  // Récupère les données d'un utilisateur par son ID
  async getUserById(userId: string): Promise<any | null> {
    try {
      const userDoc = await getDoc(doc(this.db, 'users', userId));
      if (userDoc.exists()) {
        return userDoc.data();
      }
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération des données utilisateur:', error);
      throw error;
    }
  }

  // Met à jour les données utilisateur courantes dans le BehaviorSubject
  updateCurrentUserData(userData: any): void {
    this.currentUserDataSubject.next(userData);
  }

  // Met à jour le profil utilisateur dans Firestore
  async updateUserProfile(userId: string, userData: any): Promise<void> {
    try {
      const userRef = doc(this.db, 'users', userId);
      await updateDoc(userRef, userData);
      
      // Met à jour également les données locales
      const currentData = this.currentUserDataSubject.value;
      if (currentData) {
        this.currentUserDataSubject.next({
          ...currentData,
          ...userData
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil utilisateur:', error);
      throw error;
    }
  }

  // Vérifie si un utilisateur existe déjà avec cet email
  async checkUserExistsByEmail(email: string): Promise<boolean> {
    try {
      const usersRef = collection(this.db, 'users');
      const q = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'email:', error);
      return false;
    }
  }

  // Récupère le nom complet de l'utilisateur formaté
  getFormattedUserName(userData: any): string {
    if (!userData) return '';
    
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    } else if (userData.displayName) {
      return userData.displayName;
    } else if (userData.email) {
      return userData.email.split('@')[0];
    }
    
    return 'Utilisateur';
  }
} 