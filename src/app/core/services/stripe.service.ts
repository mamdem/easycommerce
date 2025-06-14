import { Injectable } from '@angular/core';
import { loadStripe, Stripe } from '@stripe/stripe-js';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { AuthService, User } from './auth.service';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StripeService {
  private stripe: Promise<Stripe | null>;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.stripe = loadStripe(environment.stripe.publicKey);
  }

  // Créer une session de paiement pour l'abonnement mensuel
  createSubscriptionSession(): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      return of({ error: 'Utilisateur non connecté' });
    }

    return of(currentUser).pipe(
      switchMap((user: User) => {
        return this.http.post(`${environment.apiUrl}/payments/create-subscription-session`, {
          email: user.email,
          userId: user.uid
        });
      })
    );
  }

  // Rediriger vers la page de paiement Stripe
  async redirectToCheckout(sessionId: string) {
    try {
      const stripe = await this.stripe;
      if (stripe) {
        const result = await stripe.redirectToCheckout({
          sessionId: sessionId
        });
        
        if (result.error) {
          throw new Error(result.error.message);
        }
      }
    } catch (error) {
      console.error('Erreur lors de l\'initialisation du paiement:', error);
      throw error;
    }
  }

  // Vérifier le statut d'un abonnement
  getSubscriptionStatus(sessionId: string): Observable<any> {
    return this.http.get(`${environment.apiUrl}/payments/subscription-status/${sessionId}`);
  }

  // Annuler un abonnement
  cancelSubscription(subscriptionId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/payments/cancel-subscription`, {
      subscriptionId
    });
  }
}
