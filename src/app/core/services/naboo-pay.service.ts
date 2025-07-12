import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, switchMap, tap, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NabooPay, TransactionRequest, ProductModel, Wallet, TransactionResponse } from 'naboopay';
import { StoreService, Transaction } from './store.service';

// Étendre l'interface pour inclure getOne
interface NabooPayTransaction {
  create(request: TransactionRequest): Promise<TransactionResponse>;
  status(orderId: string): Promise<TransactionResponse>;
  getOne(transactionId: string): Promise<TransactionResponse>;
}

interface NabooPayClient {
  transaction: NabooPayTransaction;
}

export interface NabooPayTransactionResponse {
  order_id: string;
  method_of_payment: string[];
  amount: number;
  amount_to_pay: number;
  currency: string;
  created_at: string;
  transaction_status: 'pending' | 'paid' | 'failed';
  products: {
    name: string;
    category: string;
    amount: number;
    quantity: number;
    description: string;
  }[];
  is_done: boolean;
  is_escrow: boolean;
  is_merchant: boolean;
  checkout_url: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NabooPayService {
  private readonly TOKEN = 'naboo-c0a57106-2798-4add-ab90-85e4ba0f64cd.48ce78c9-6969-47c6-9dac-43fba2affb90';
  private naboopayClient: NabooPay;
  private readonly API_URL = 'https://api.naboopay.com/api/v1';

  constructor(
    private http: HttpClient,
    private storeService: StoreService
  ) {
    // Initialiser le client NabooPay avec le token
    this.naboopayClient = new NabooPay(this.TOKEN);
  }

  async initiatePayment(data: {
    amount: number;
    storeId: string;
  }): Promise<PaymentResponse> {
    try {
      const request = new TransactionRequest({
        method_of_payment: [Wallet.WAVE],
        products: [
          new ProductModel({
            name: 'Abonnement Jokkofy',
            category: 'subscription',
            amount: data.amount,
            quantity: 1,
            description: 'Abonnement mensuel à la plateforme Jokkofy',
          }),
        ],
      });

      const response = await this.naboopayClient.transaction.create(request);

      // Sauvegarder la transaction dans la boutique
      await this.storeService.saveTransaction(data.storeId, {
        orderId: response.order_id,
        amount: data.amount,
        status: 'pending',
        paymentMethod: 'WAVE'
      });

      return {
        success: true,
        paymentUrl: response.checkout_url
      };
    } catch (error) {
      console.error('Erreur lors de l\'initiation du paiement:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Une erreur est survenue'
      };
    }
  }

  initiateWavePayment(data: {
    amount: number;
    storeId: string;
  }): Observable<TransactionResponse> {
    const request = new TransactionRequest({
      method_of_payment: [Wallet.WAVE],
      products: [
        new ProductModel({
          name: 'Abonnement Jokkofy',
          category: 'subscription',
          amount: data.amount,
          quantity: 1,
          description: 'Test - Abonnement mensuel à la plateforme Jokkofy',
        }),
      ],
    });

    return from(this.naboopayClient.transaction.create(request)).pipe(
      tap(async (response) => {
        // Sauvegarder la transaction dans la boutique
        await this.storeService.saveTransaction(data.storeId, {
          orderId: response.order_id,
          amount: data.amount,
          status: 'pending',
          paymentMethod: 'WAVE'
        });
      })
    );
  }

  checkTransactionStatus(orderId: string, storeId: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.TOKEN}`,
      'Content-Type': 'application/json'
    });

    return this.http.get(`${this.API_URL}/transaction/status/${orderId}`, { headers }).pipe(
      tap(async (response: any) => {
        // Mettre à jour le statut de la transaction dans la boutique
        const status = response.status === 'PAID' ? 'paid' : 
                      response.status === 'FAILED' ? 'failed' : 'pending';
                      
        // Récupérer la transaction en cours depuis la boutique
        const storeDoc = await this.storeService.getStoreById(storeId).toPromise();
        if (storeDoc?.currentTransaction?.id) {
          await this.storeService.updateTransactionStatus(
            storeId,
            storeDoc.currentTransaction.id,
            status
          );
        }
      })
    );
  }

  /**
   * Récupère les détails d'une transaction depuis NabooPay
   * @param orderId L'ID de la commande NabooPay
   */
  getTransactionDetails(orderId: string): Observable<NabooPayTransactionResponse> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.TOKEN}`,
      'Accept': 'application/json'
    });

    // Construire l'URL avec le paramètre order_id
    const url = `${this.API_URL}/transaction/get-one-transaction?order_id=${orderId}`;
    
    console.log('Appel API NabooPay:', url);
    return this.http.get<NabooPayTransactionResponse>(url, { headers }).pipe(
      tap(response => {
        // Si la transaction est payée ou échouée, mettre à jour le statut dans Firestore
        if (response.transaction_status === 'paid' || response.transaction_status === 'failed') {
          this.storeService.updateTransactionStatus(
            response.order_id,
            response.order_id,
            response.transaction_status
          ).catch(error => {
            console.error('Erreur lors de la mise à jour du statut:', error);
          });
        }
      })
    );
  }
} 