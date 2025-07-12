import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  // NabooPay configuration (commented out)
  // private readonly TOKEN = 'naboo-c0a57106-2798-4add-ab90-85e4ba0f64cd.48ce78c9-6969-47c6-9dac-43fba2affb90';
  // private naboopayClient: NabooPay;
  // private readonly API_URL = 'https://api.naboopay.com/v1';

  // Stripe configuration
  private readonly STRIPE_PUBLIC_KEY = 'YOUR_STRIPE_PUBLIC_KEY';
  private readonly API_URL = environment.apiUrl + '/payments';

  constructor(private http: HttpClient) {
    // Initialize Stripe
    this.loadStripe();
  }

  private loadStripe() {
    if (!window.Stripe) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      document.body.appendChild(script);
    }
  }

  // NabooPay payment method (commented out)
  /*
  initiateWavePayment(data: {
    amount: number;
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

    return from(this.naboopayClient.transaction.create(request));
  }

  checkTransactionStatus(orderId: string): Observable<any> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.TOKEN}`,
      'Content-Type': 'application/json'
    });

    return this.http.get(`${this.API_URL}/transaction/status/${orderId}`, { headers });
  }
  */

  // Stripe payment methods
  initiateStripePayment(data: {
    amount: number;
    currency: string;
    description: string;
  }): Observable<any> {
    return this.http.post(`${this.API_URL}/create-payment-intent`, {
      amount: data.amount * 100, // Stripe uses cents
      currency: data.currency,
      description: data.description
    });
  }

  confirmStripePayment(paymentIntentId: string, paymentMethodId: string): Observable<any> {
    return this.http.post(`${this.API_URL}/confirm-payment`, {
      paymentIntentId,
      paymentMethodId
    });
  }

  getPaymentStatus(paymentIntentId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/status/${paymentIntentId}`);
  }

  createSubscription(data: {
    customerId: string;
    priceId: string;
  }): Observable<any> {
    return this.http.post(`${this.API_URL}/create-subscription`, data);
  }
} 