import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StripeService } from '../../../core/services/stripe.service';
import { NabooPayService } from '../../../core/services/naboo-pay.service';
import { ToastService } from '../../../core/services/toast.service';
import { StoreService, StoreSettings } from '../../../core/services/store.service';
import { TransactionService, Transaction } from '../../../core/services/transaction.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="payment-page">
      <div class="hero-section">
        <div class="shape-blob"></div>
        <div class="shape-blob shape-blob-2"></div>
        
      <div class="pricing-card">
        <a routerLink="/dashboard" class="back-link">
          <i class="bi bi-arrow-left"></i>
          Retour
        </a>

        <div class="price-header">
            <div class="logo-container">
              <img src="assets/lgo-jokkofy.png" alt="Jokkofy Logo" class="brand-logo">
            </div>
          <p class="subtitle">Solution E-commerce Complète</p>
            
            <!-- Informations de la boutique -->
            <div *ngIf="store" class="store-info">
              <div class="store-logo">
                <img [src]="store.logoUrl || 'assets/default-store.svg'" 
                     [alt]="store.storeName"
                     (error)="onImageError($event)">
              </div>
              <h2 class="store-name">{{ store.storeName }}</h2>
            </div>
          
          <div class="price">
              <span class="amount">100</span>
              <span class="currency">FCFA</span>
          </div>
            <p class="trial">Test de paiement</p>
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

          <!-- Message d'erreur si pas de boutique -->
          <div *ngIf="!store && !loading" class="status-message warning">
            <i class="bi bi-exclamation-circle-fill"></i>
            <p>Aucune boutique sélectionnée</p>
        </div>

        <!-- Bouton de paiement -->
        <button 
            *ngIf="!paymentSuccess && store"
            (click)="startPayment()" 
          [disabled]="loading"
          class="subscribe-button">
            <span *ngIf="!loading">Procéder au paiement</span>
          <div *ngIf="loading" class="spinner"></div>
        </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    $primary-color: #fe7b33;
    $primary-color-dark: darken(#fe7b33, 10%);
    $secondary-color: #00c3d6;
    $secondary-color-dark: darken(#00c3d6, 10%);
    $dark-color: #1a1f36;
    $text-color: #4a5568;
    $border-radius: 12px;
    $box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    $transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    .payment-page {
      min-height: 100vh;
      background: #f8fafc;
    }

    .hero-section {
      padding: 2rem 0;
      background: linear-gradient(135deg, rgba($secondary-color, 0.1) 0%, rgba($primary-color, 0.1) 100%);
      position: relative;
      overflow: hidden;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;

      .shape-blob {
        position: absolute;
        width: 600px;
        height: 600px;
        background: linear-gradient(135deg, rgba($secondary-color, 0.1) 0%, rgba($primary-color, 0.1) 100%);
        border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
        top: -300px;
        right: -300px;
        animation: blob-animation 15s infinite;
      }

      .shape-blob-2 {
        left: -300px;
        bottom: -300px;
        top: auto;
        animation-delay: -7.5s;
      }
    }

    @keyframes blob-animation {
      0% {
        border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
      }
      50% {
        border-radius: 70% 30% 30% 70% / 70% 70% 30% 30%;
      }
      100% {
        border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
      }
    }

    .pricing-card {
      background: white;
      border-radius: $border-radius;
      box-shadow: $box-shadow;
      padding: 2rem;
      width: 100%;
      max-width: 500px;
      position: relative;
      margin: 0 1rem;
    }

    .back-link {
      position: absolute;
      top: 1rem;
      left: 1rem;
      color: $text-color;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      transition: $transition;

      &:hover {
        color: $primary-color;
      }
    }

    .price-header {
      text-align: center;
      margin-bottom: 2rem;

      .logo-container {
        margin-bottom: 1rem;
        
        .brand-logo {
          height: 60px;
          width: auto;
          object-fit: contain;
        }
      }

      .subtitle {
        color: $text-color;
        margin: 0.5rem 0 1.5rem;
      }

      .price {
        .amount {
          font-size: 2.5rem;
          font-weight: 700;
          color: $primary-color;
        }

        .currency {
          color: $text-color;
          margin-left: 0.25rem;
        }
      }

      .trial {
        color: $secondary-color;
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
      border-radius: $border-radius;
      transition: $transition;

      &:hover {
        background: rgba($primary-color, 0.05);
        transform: translateX(5px);
      }

      i {
        color: $primary-color;
        font-size: 1.2rem;
      }

      span {
        color: $text-color;
      }
    }

    .subscribe-button {
      width: 100%;
      padding: 1rem;
      background: $primary-color;
      color: white;
      border: none;
      border-radius: $border-radius;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: $transition;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;

      &:hover {
        background: $primary-color-dark;
        transform: translateY(-2px);
      }

      &:disabled {
        background: #94a3b8;
        cursor: not-allowed;
        transform: none;
      }
    }

    .status-message {
      margin: 1rem 0;
      padding: 1rem;
      border-radius: $border-radius;
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

    @media (max-width: 768px) {
      .hero-section {
        padding: 2rem 1rem;
      }

      .pricing-card {
        margin: 0 1rem;
      }
    }

    .store-info {
      margin: 1.5rem 0;
      text-align: center;

      .store-logo {
        width: 80px;
        height: 80px;
        margin: 0 auto 1rem;
        border-radius: 50%;
        overflow: hidden;
        border: 3px solid rgba($primary-color, 0.1);
        padding: 3px;
        background: white;

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 50%;
        }
      }

      .store-name {
        font-size: 1.5rem;
        color: $dark-color;
        margin: 0;
        font-weight: 600;
      }
    }
  `]
})
export class PaymentComponent implements OnInit {
  loading = false;
  paymentSuccess = false;
  paymentCanceled = false;
  store: StoreSettings | null = null;
  currentTransactionId: string | null = null;

  constructor(
    private stripeService: StripeService,
    private nabooPayService: NabooPayService,
    private toastService: ToastService,
    private storeService: StoreService,
    private transactionService: TransactionService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.loading = true;
    
    // Récupérer l'ID de la boutique depuis l'URL
    this.route.params.subscribe(params => {
      const storeId = params['storeId'];
      if (storeId) {
        this.loadStoreData(storeId);
      } else {
        this.loading = false;
        this.toastService.error('Aucune boutique sélectionnée');
      }
    });

    // Vérifier le statut du paiement au retour
    this.route.queryParams.subscribe(params => {
      if (params['success'] === 'true' && params['session_id']) {
        this.checkPaymentStatus(params['session_id']);
      } else if (params['canceled'] === 'true') {
        this.paymentCanceled = true;
        this.toastService.warning('Le paiement a été annulé');
        // Mettre à jour le statut de la transaction si elle existe
        if (this.currentTransactionId && this.store?.id) {
          this.transactionService.updateTransactionStatus(
            this.store.id,
            this.currentTransactionId,
            'failed'
          );
        }
      }
    });
  }

  loadStoreData(storeId: string) {
    this.storeService.getStoreById(storeId).subscribe({
      next: (store) => {
        this.store = store;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la boutique:', error);
        this.toastService.error('Impossible de charger les informations de la boutique');
        this.loading = false;
      }
    });
  }

  async startPayment() {
    if (!this.store) {
      this.toastService.error('Aucune boutique sélectionnée');
      return;
    }

    this.loading = true;
    console.log('Initiation du paiement pour la boutique:', this.store.storeName);

    try {
      // Créer d'abord la transaction dans Firestore
      const transactionData: Partial<Transaction> = {
        amount: 100,
        description: 'Test - Abonnement mensuel à la plateforme Jokkofy',
        paymentMethod: 'wave',
        status: 'pending'
      };

      // Créer la transaction et obtenir son ID
      this.currentTransactionId = await this.transactionService.createTransaction(
        this.store.id!,
        transactionData
      );

      // Initier le paiement avec NabooPay
      const paymentData = {
        amount: 100,  // Montant de test : 100 FCFA
        storeId: this.store.id!
      };

      this.nabooPayService.initiateWavePayment(paymentData).subscribe({
        next: async (response) => {
          console.log('Réponse de la transaction:', response);
          this.loading = false;
          
          if (response && response.checkout_url) {
            // Mettre à jour l'ID de commande dans la transaction
            if (this.currentTransactionId && this.store?.id) {
              await this.transactionService.updateTransactionOrderId(
                this.store.id,
                this.currentTransactionId,
                response.order_id
              );
            }

            window.open(response.checkout_url, '_blank');
            this.toastService.success('Veuillez compléter votre paiement dans la nouvelle fenêtre.');
            localStorage.setItem('lastTransactionId', response.order_id);
            this.checkTransactionStatus(response.order_id);
          } else {
            this.toastService.error('URL de paiement non disponible');
            // Marquer la transaction comme échouée
            if (this.currentTransactionId && this.store?.id) {
              await this.transactionService.updateTransactionStatus(
                this.store.id,
                this.currentTransactionId,
                'failed'
              );
            }
          }
        },
        error: async (error) => {
          console.error('Erreur détaillée de la transaction:', error);
          this.toastService.error(error?.message || 'Erreur lors de la création de la transaction');
          this.loading = false;
          
          // Marquer la transaction comme échouée
          if (this.currentTransactionId && this.store?.id) {
            await this.transactionService.updateTransactionStatus(
              this.store.id,
              this.currentTransactionId,
              'failed'
            );
          }
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'initiation du paiement:', error);
      this.toastService.error('Erreur lors de l\'initiation du paiement');
      this.loading = false;
    }
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

  /**
   * Vérifie le statut de la transaction
   */
  checkTransactionStatus(orderId: string): void {
    if (!this.store) return;

    this.nabooPayService.getTransactionDetails(orderId).subscribe({
      next: (status) => {
        console.log('Statut de la transaction:', status);
        
        // Si la transaction est payée, rediriger vers le dashboard
        if (status.transaction_status === 'paid') {
          this.toastService.success('Paiement effectué avec succès !');
          this.router.navigate(['/dashboard']);
        } else if (status.transaction_status === 'failed') {
          this.toastService.error('Le paiement a échoué. Veuillez réessayer.');
        }
      },
      error: (error) => {
        console.error('Erreur lors de la vérification du statut:', error);
        this.toastService.error('Impossible de vérifier le statut du paiement');
      }
    });
  }

  /**
   * Met à jour le statut de la transaction
   */
  updateTransactionStatus(orderId: string, status: 'pending' | 'paid' | 'failed'): void {
    if (!this.store?.id) return;

    this.transactionService.updateTransactionStatus(
      this.store.id,
      orderId,
      status
    ).catch(error => {
      console.error('Erreur lors de la mise à jour du statut:', error);
    });
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/default-store.svg';
  }
} 