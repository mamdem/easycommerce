import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StripeService } from '../../core/services/stripe.service';
import { ToastService } from '../../core/services/toast.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="payment-page">
      <div class="pricing-card">
        <a routerLink="/dashboard" class="back-link">
          <i class="bi bi-arrow-left"></i>
          Retour
        </a>

        <div class="price-header">
          <h1>Tribix</h1>
          <p class="subtitle">Solution E-commerce Complète</p>
          
          <div class="price">
            <span class="amount">19.99€</span>
            <span class="period">/mois</span>
          </div>
          <p class="trial">30 jours d'essai gratuit</p>
        </div>

        <div class="features">
          <div class="feature-group">
            <div class="feature-item">
              <i class="bi bi-shop"></i>
              <span>Interface de gestion complète</span>
            </div>
            <div class="feature-item">
              <i class="bi bi-globe"></i>
              <span>Site web personnalisé (www.tribix.com/votreboutique)</span>
            </div>
            <div class="feature-item">
              <i class="bi bi-tools"></i>
              <span>Outils marketing et statistiques</span>
            </div>
            <div class="feature-item">
              <i class="bi bi-headset"></i>
              <span>Support prioritaire 7j/7</span>
            </div>
          </div>
        </div>

        <!-- Messages de statut -->
        <div *ngIf="paymentSuccess" class="status-message success">
          <i class="bi bi-check-circle-fill"></i>
          <p>Votre abonnement est actif</p>
        </div>

        <div *ngIf="paymentCanceled" class="status-message warning">
          <i class="bi bi-exclamation-circle-fill"></i>
          <p>Paiement annulé</p>
        </div>

        <!-- Bouton de paiement -->
        <button 
          *ngIf="!paymentSuccess"
          (click)="startSubscription()" 
          [disabled]="loading"
          class="subscribe-button">
          <span *ngIf="!loading">Commencer l'essai gratuit</span>
          <div *ngIf="loading" class="spinner"></div>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .payment-page {
      min-height: 100vh;
      background: #f8f9fa;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }

    .pricing-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      padding: 2rem;
      width: 100%;
      max-width: 500px;
      position: relative;
    }

    .back-link {
      position: absolute;
      top: 1rem;
      left: 1rem;
      color: #666;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }

    .price-header {
      text-align: center;
      margin-bottom: 2rem;

      h1 {
        font-size: 2rem;
        margin: 0;
      }

      .subtitle {
        color: #666;
        margin: 0.5rem 0 1.5rem;
      }

      .price {
        .amount {
          font-size: 2.5rem;
          font-weight: 700;
        }

        .period {
          color: #666;
        }
      }

      .trial {
        color: #2563eb;
        margin-top: 0.5rem;
      }
    }

    .features {
      margin: 2rem 0;
    }

    .feature-group {
      display: grid;
      gap: 1rem;
    }

    .feature-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 8px;

      i {
        color: #2563eb;
        font-size: 1.2rem;
      }

      span {
        color: #333;
      }
    }

    .subscribe-button {
      width: 100%;
      padding: 1rem;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: #1d4ed8;
      }

      &:disabled {
        background: #94a3b8;
      }
    }

    .status-message {
      margin: 1rem 0;
      padding: 1rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.5rem;

      &.success {
        background: #dcfce7;
        color: #166534;
      }

      &.warning {
        background: #fff7ed;
        color: #9a3412;
      }
    }

    .spinner {
      display: inline-block;
      width: 20px;
      height: 20px;
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: white;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `]
})
export class PaymentComponent implements OnInit {
  loading = false;
  paymentSuccess = false;
  paymentCanceled = false;

  constructor(
    private stripeService: StripeService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['success'] === 'true' && params['session_id']) {
        this.checkPaymentStatus(params['session_id']);
      } else if (params['canceled'] === 'true') {
        this.paymentCanceled = true;
        this.toastService.warning('Le paiement a été annulé');
      }
    });
  }

  startSubscription() {
    this.loading = true;
    this.stripeService.createSubscriptionSession().subscribe({
      next: async (response) => {
        if (response.sessionId) {
          try {
            await this.stripeService.redirectToCheckout(response.sessionId);
          } catch (error) {
            this.toastService.error('Erreur lors de la redirection vers le paiement');
          }
        } else {
          this.toastService.error('Erreur lors de la création de la session de paiement');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur:', error);
        this.toastService.error('Erreur lors de l\'initialisation du paiement');
        this.loading = false;
      }
    });
  }

  private checkPaymentStatus(sessionId: string) {
    this.loading = true;
    this.stripeService.getSubscriptionStatus(sessionId).subscribe({
      next: (response) => {
        if (response.status === 'complete') {
          this.paymentSuccess = true;
          this.toastService.success('Paiement réussi ! Votre abonnement est actif');
        } else {
          this.toastService.error('Le statut du paiement est incertain');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la vérification du paiement:', error);
        this.toastService.error('Erreur lors de la vérification du paiement');
        this.loading = false;
      }
    });
  }
} 