import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Store } from '../../core/models/store.model';

export interface AdminDashboardStats {
  totalStores: number;
  totalUsers: number;
  totalCustomers: number;
  storesChange: number;
  usersChange: number;
  customersChange: number;
}

@Injectable({
  providedIn: 'root'
})
export class AdminStoreService {
  constructor(private firestore: AngularFirestore) {}

  /**
   * Récupère toutes les boutiques du système
   * @returns Observable<Store[]> Liste de toutes les boutiques
   */
  getAllStores(): Observable<Store[]> {
    return this.firestore.collection<Store>('urls').valueChanges({ idField: 'id' });
  }

  /**
   * Récupère tous les utilisateurs (boutiquiers)
   * @returns Observable<any[]> Liste de tous les utilisateurs
   */
  getAllUsers(): Observable<any[]> {
    return this.firestore.collection('users').valueChanges({ idField: 'id' });
  }

  /**
   * Récupère tous les clients acheteurs
   * @returns Observable<any[]> Liste de tous les clients
   */
  getAllCustomers(): Observable<any[]> {
    return this.firestore.collection('customers').valueChanges({ idField: 'id' });
  }

  /**
   * Récupère les statistiques du tableau de bord admin
   * @returns Observable<AdminDashboardStats> Statistiques complètes
   */
  getDashboardStats(): Observable<AdminDashboardStats> {
    return combineLatest([
      this.getAllStores(),
      this.getAllUsers(),
      this.getAllCustomers()
    ]).pipe(
      map(([stores, users, customers]) => {
        // Calcul des totaux
        const totalStores = stores.length;
        const totalUsers = users.length;
        const totalCustomers = customers.length;

        // Pour l'instant, on met des valeurs par défaut pour les changements
        // Vous pouvez ajuster cela plus tard quand les champs de date seront disponibles
        const storesChange = 12; // Exemple : +12%
        const usersChange = 25;  // Exemple : +25%
        const customersChange = 15; // Exemple : +15%

        return {
          totalStores,
          totalUsers,
          totalCustomers,
          storesChange,
          usersChange,
          customersChange
        };
      })
    );
  }

  /**
   * Récupère les statistiques des boutiques
   * @returns Observable contenant les statistiques
   */
  getStoreStatistics(): Observable<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
  }> {
    return this.getAllStores().pipe(
      map(stores => {
        const stats = {
          total: stores.length,
          active: stores.filter(store => store.status === 'active').length,
          inactive: stores.filter(store => store.status === 'inactive').length,
          pending: stores.filter(store => store.status === 'pending').length
        };
        return stats;
      })
    );
  }

  /**
   * Récupère les dernières boutiques créées
   * @param limit Nombre de boutiques à récupérer
   * @returns Observable<Store[]> Liste des dernières boutiques
   */
  getRecentStores(limit: number = 5): Observable<Store[]> {
    return this.firestore.collection<Store>('urls', ref => 
      ref.limit(limit)
    ).valueChanges({ idField: 'id' });
  }

  /**
   * Met à jour le statut d'une boutique
   * @param storeId ID de la boutique
   * @param status Nouveau statut
   */
  async updateStoreStatus(storeId: string, status: 'active' | 'inactive' | 'pending'): Promise<void> {
    await this.firestore.doc(`urls/${storeId}`).update({
      status,
      updatedAt: Date.now()
    });
  }

  /**
   * Recherche des boutiques par nom ou propriétaire
   * @param query Terme de recherche
   * @returns Observable<Store[]> Liste des boutiques correspondantes
   */
  searchStores(query: string): Observable<Store[]> {
    query = query.toLowerCase().trim();
    return this.getAllStores().pipe(
      map(stores => stores.filter(store => 
        store.storeName.toLowerCase().includes(query) ||
        store.legalName.toLowerCase().includes(query) ||
        store.email.toLowerCase().includes(query)
      ))
    );
  }
} 