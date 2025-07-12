import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface Transaction {
  transactionId?: string;
  storeId: string;
  amount: number;
  status: 'pending' | 'paid' | 'failed';
  paymentMethod: string;
  orderId: string;
  createdAt: number;
  updatedAt: number;
  description: string;
}

export interface StoreTransaction {
  id: string;
  orderId: string;
  status: 'pending' | 'paid' | 'failed';
  updatedAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {}

  /**
   * Crée une nouvelle transaction pour une boutique et met à jour la transaction courante
   */
  async createTransaction(storeId: string, transactionData: Partial<Transaction>): Promise<string> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    const timestamp = Date.now();
    const transaction: Transaction = {
      storeId,
      amount: 0,
      status: 'pending',
      paymentMethod: 'wave',
      orderId: '',
      createdAt: timestamp,
      updatedAt: timestamp,
      description: 'Paiement test',
      ...transactionData
    };

    try {
      // Créer la transaction dans la sous-collection transactions
      const docRef = await this.firestore
        .collection('stores')
        .doc(currentUser.uid)
        .collection('userStores')
        .doc(storeId)
        .collection('transactions')
        .add(transaction);

      // Mettre à jour l'ID de la transaction
      const transactionId = docRef.id;
      await docRef.update({ transactionId });

      // Mettre à jour la transaction courante dans le document de la boutique
      const storeTransaction: StoreTransaction = {
        id: transactionId,
        orderId: '',
        status: transaction.status,
        updatedAt: timestamp
      };

      await this.firestore
        .collection('stores')
        .doc(currentUser.uid)
        .collection('userStores')
        .doc(storeId)
        .update({
          currentTransaction: storeTransaction
        });

      return transactionId;
    } catch (error) {
      console.error('Erreur lors de la création de la transaction:', error);
      throw error;
    }
  }

  /**
   * Met à jour le statut d'une transaction et la transaction courante de la boutique
   */
  async updateTransactionStatus(
    storeId: string, 
    transactionId: string, 
    status: 'pending' | 'paid' | 'failed'
  ): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    const timestamp = Date.now();

    try {
      // Mettre à jour la transaction dans la sous-collection
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

      // Mettre à jour la transaction courante dans le document de la boutique
      await this.firestore
        .collection('stores')
        .doc(currentUser.uid)
        .collection('userStores')
        .doc(storeId)
        .update({
          'currentTransaction.status': status,
          'currentTransaction.updatedAt': timestamp
        });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut de la transaction:', error);
      throw error;
    }
  }

  /**
   * Met à jour l'ID de commande de la transaction
   */
  async updateTransactionOrderId(
    storeId: string,
    transactionId: string,
    orderId: string
  ): Promise<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    const timestamp = Date.now();

    try {
      // Mettre à jour la transaction dans la sous-collection
      await this.firestore
        .collection('stores')
        .doc(currentUser.uid)
        .collection('userStores')
        .doc(storeId)
        .collection('transactions')
        .doc(transactionId)
        .update({
          orderId,
          updatedAt: timestamp
        });

      // Mettre à jour la transaction courante dans le document de la boutique
      await this.firestore
        .collection('stores')
        .doc(currentUser.uid)
        .collection('userStores')
        .doc(storeId)
        .update({
          'currentTransaction.orderId': orderId,
          'currentTransaction.updatedAt': timestamp
        });
    } catch (error) {
      console.error('Erreur lors de la mise à jour de l\'ID de commande:', error);
      throw error;
    }
  }

  /**
   * Récupère toutes les transactions d'une boutique
   */
  getStoreTransactions(storeId: string): Observable<Transaction[]> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    return this.firestore
      .collection('stores')
      .doc(currentUser.uid)
      .collection('userStores')
      .doc(storeId)
      .collection('transactions', ref => ref.orderBy('createdAt', 'desc'))
      .valueChanges()
      .pipe(
        map(transactions => transactions as Transaction[])
      );
  }

  /**
   * Récupère une transaction spécifique
   */
  getTransaction(storeId: string, transactionId: string): Observable<Transaction | null> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      throw new Error('Utilisateur non connecté');
    }

    return this.firestore
      .collection('stores')
      .doc(currentUser.uid)
      .collection('userStores')
      .doc(storeId)
      .collection('transactions')
      .doc(transactionId)
      .valueChanges()
      .pipe(
        map(transaction => transaction as Transaction | null)
      );
  }
} 