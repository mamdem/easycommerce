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
import { trigger, transition, style, animate } from '@angular/animations';
import { environment } from '../../../../environments/environment';
import { AdminInfluenceurService } from '../../../admin/services/admin-influenceur.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('0.4s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ],
  template: `
    <div class="payment-page">
      <div class="hero-section">
        <a routerLink="/dashboard" class="back-link">
          <i class="bi bi-arrow-left"></i>
        </a>

        <div class="pricing-card">
          <div class="left-section">
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
                <span class="amount">{{ finalAmount }}</span>
                <span class="currency">{{ paymentConfig.currency }}</span>
          </div>
              <p class="trial">{{ paymentConfig.description }}</p>
              <div *ngIf="reduction > 0" class="reduction-info">
                <p>Réduction appliquée: {{ reduction }}%</p>
                <p>Code promo: {{ store?.influenceurCode }}</p>
            </div>
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

          <div class="right-section">
            <div class="features">
              <h3>Fonctionnalités incluses</h3>
              <div class="feature-list">
                <div class="feature-item">
                  <i class="bi bi-shop"></i>
                  <span>Interface de gestion complète avec tableau de bord personnalisé</span>
                </div>
                <div class="feature-item">
                  <i class="bi bi-globe"></i>
                  <span>Site web personnalisé avec votre nom de domaine (www.tribix.com/votreboutique)</span>
                </div>
                <div class="feature-item">
                  <i class="bi bi-tools"></i>
                  <span>Outils marketing avancés et statistiques détaillées pour suivre vos performances</span>
                </div>
                <div class="feature-item">
                  <i class="bi bi-headset"></i>
                  <span>Support prioritaire 7j/7 avec une équipe dédiée à votre succès</span>
                </div>
                <div class="feature-item">
                  <i class="bi bi-cart-check"></i>
                  <span>Gestion des commandes et des stocks en temps réel</span>
                </div>
              </div>
            </div>

            <!-- Messages de statut -->
            <div *ngIf="paymentSuccess" class="status-message success" @fadeInUp>
              <i class="bi bi-check-circle-fill"></i>
              <p>Votre abonnement est actif</p>
              <a routerLink="/dashboard" class="action-link">Accéder au tableau de bord</a>
            </div>

            <div *ngIf="paymentCanceled" class="status-message warning" @fadeInUp>
              <i class="bi bi-exclamation-circle-fill"></i>
              <p>Paiement annulé</p>
              <button class="retry-button" (click)="startPayment()">Réessayer</button>
            </div>

            <!-- Message d'erreur si pas de boutique -->
            <div *ngIf="!store && !loading" class="status-message warning" @fadeInUp>
              <i class="bi bi-exclamation-circle-fill"></i>
              <p>Aucune boutique sélectionnée</p>
              <a routerLink="/dashboard/stores" class="action-link">Sélectionner une boutique</a>
            </div>
          </div>
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
    $border-radius: 16px;
    $box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    $transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    .payment-page {
      min-height: 100vh;
      background: #f8fafc;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      padding: 2rem;
    }

    .hero-section {
      max-width: 1200px;
      margin: 0 auto;
      background: linear-gradient(135deg, rgba($secondary-color, 0.05) 0%, rgba($primary-color, 0.05) 100%);
      position: relative;
      overflow: hidden;
      min-height: calc(100vh - 4rem);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 24px;
    }

    .pricing-card {
      background: white;
      border-radius: $border-radius;
      box-shadow: $box-shadow;
      width: 100%;
      max-width: 1000px;
      margin: 2rem;
      display: grid;
      grid-template-columns: 1fr 1.5fr;
      overflow: hidden;
      position: relative;
      z-index: 1;

      .left-section {
        padding: 3rem;
        background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
        border-right: 1px solid rgba(0, 0, 0, 0.05);
        display: flex;
        flex-direction: column;
      }

      .right-section {
        padding: 3rem;
        background: white;
      }
    }

    .back-link {
      position: absolute;
      top: 2rem;
      left: 2rem;
      color: $dark-color;
      text-decoration: none;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: $transition;
      width: 45px;
      height: 45px;
      border-radius: 50%;
      z-index: 2;
      background: white;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid rgba(0, 0, 0, 0.05);

      i {
        font-size: 1.4rem;
        transition: $transition;
      }

      &:hover {
        color: $primary-color;
        background: white;
        transform: translateX(-4px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);

        i {
          transform: translateX(-2px);
        }
      }

      @media (max-width: 768px) {
        top: 1rem;
        left: 1rem;
        width: 40px;
        height: 40px;

        i {
          font-size: 1.2rem;
        }
      }
    }

    .price-header {
      text-align: center;
      margin-bottom: 2rem;

      .logo-container {
        margin-bottom: 1.5rem;
        
        .brand-logo {
          height: 60px;
          width: auto;
          object-fit: contain;
        }
      }

      .subtitle {
        color: $text-color;
        margin: 0.75rem 0;
        font-size: 1.1rem;
        letter-spacing: -0.01em;
      }

      .store-info {
        margin: 2rem 0;
        
        .store-logo {
          width: 80px;
          height: 80px;
          margin: 0 auto 1rem;
          border-radius: 50%;
          overflow: hidden;
          border: 2px solid rgba($primary-color, 0.1);
          padding: 2px;
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

      .price {
        margin: 1.5rem 0;
        
        .amount {
          font-size: 3.5rem;
          font-weight: 700;
          color: $primary-color;
          letter-spacing: -0.02em;
        }

        .currency {
          color: $text-color;
          margin-left: 0.5rem;
          font-size: 1.2rem;
          font-weight: 500;
        }
      }

      .trial {
        color: $secondary-color;
        margin-top: 0.75rem;
        font-weight: 500;
      }
    }

    .features {
      margin-top: 2rem;

      h3 {
        font-size: 1.25rem;
        color: $dark-color;
        margin-bottom: 1.5rem;
        font-weight: 600;
      }
    }

    .feature-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .feature-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem;
      background: rgba($primary-color, 0.02);
      border-radius: $border-radius;
      transition: $transition;
      border: 1px solid rgba($primary-color, 0.05);

      &:hover {
        background: rgba($primary-color, 0.05);
        transform: translateX(8px);
      }

      i {
        color: $primary-color;
        font-size: 1.4rem;
        flex-shrink: 0;
        margin-top: 0.2rem;
      }

      span {
        color: $dark-color;
        font-size: 0.95rem;
        font-weight: 500;
        line-height: 1.5;
      }
    }

    .status-message {
      text-align: center;
      padding: 1.5rem;
      border-radius: $border-radius;
      margin: 2rem 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;

      i {
        font-size: 2rem;
      }

      p {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 500;
      }

      &.success {
        background: rgba(#10B981, 0.1);
        color: #059669;
      }

      &.warning {
        background: rgba(#F59E0B, 0.1);
        color: #B45309;
      }

      .action-link {
        color: inherit;
        text-decoration: none;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.5);
        transition: $transition;
        margin-top: 0.5rem;

        &:hover {
          background: rgba(255, 255, 255, 0.8);
        }
      }

      .retry-button {
        background: none;
        border: none;
        color: inherit;
        font-size: 1rem;
        font-weight: 500;
        padding: 0.75rem 1.5rem;
        border-radius: 8px;
        cursor: pointer;
        transition: $transition;
        background: rgba(255, 255, 255, 0.5);

        &:hover {
          background: rgba(255, 255, 255, 0.8);
        }
      }
    }

    .reduction-info {
      margin-top: 1rem;
      padding: 1.25rem;
      background: rgba($primary-color, 0.05);
      border-radius: $border-radius;
      border: 1px solid rgba($primary-color, 0.1);
      
      p {
        margin: 0;
        color: $primary-color;
        font-size: 0.95rem;
        
        &:first-child {
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
      }
    }

    .subscribe-button {
      width: 100%;
      padding: 1.25rem;
      border: none;
      background: $primary-color;
      color: white;
      font-size: 1.1rem;
      font-weight: 600;
      border-radius: $border-radius;
      cursor: pointer;
      transition: $transition;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      position: relative;
      overflow: hidden;
      margin-top: 2rem;

      &:hover {
        background: $primary-color-dark;
        transform: translateY(-2px);
      }

      &:active {
        transform: translateY(0);
      }

      &:disabled {
        background: #CBD5E0;
        cursor: not-allowed;
        transform: none;
    }

    .spinner {
      width: 20px;
      height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: white;
        animation: spin 0.8s linear infinite;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    // Responsive design
    @media (max-width: 1024px) {
      .pricing-card {
        grid-template-columns: 1fr;
        max-width: 600px;

        .left-section {
          border-right: none;
          border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        }
      }
    }

    @media (max-width: 768px) {
      .payment-page {
        padding: 1rem;
      }

      .pricing-card {
        margin: 1rem;

        .left-section,
        .right-section {
          padding: 2rem;
        }
      }

      .feature-list {
        grid-template-columns: 1fr;
      }

      .price-header {
        .price {
          .amount {
            font-size: 2.5rem;
          }
        }
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
  paymentConfig = environment.payment;
  reduction = 0;
  finalAmount: number = this.paymentConfig.amount;

  constructor(
    private stripeService: StripeService,
    private nabooPayService: NabooPayService,
    private toastService: ToastService,
    private storeService: StoreService,
    private transactionService: TransactionService,
    private route: ActivatedRoute,
    private router: Router,
    private influenceurService: AdminInfluenceurService
  ) {}

  async ngOnInit() {
    this.loading = true;
    
    // Vérifier d'abord les paramètres de route
    const routeStoreId = this.route.snapshot.params['storeId'];
    // Puis les query params
    const queryStoreId = this.route.snapshot.queryParamMap.get('storeId');
    
    const storeId = routeStoreId || queryStoreId;
    
      if (storeId) {
      await this.loadStoreData(storeId);
    } else {
      // Si pas de storeId, essayer de charger la boutique par défaut de l'utilisateur
      const userStore = await firstValueFrom(this.storeService.getUserStore());
      if (userStore) {
        await this.loadStoreData(userStore.id!);
      } else {
        this.loading = false;
        this.toastService.error('Veuillez d\'abord sélectionner une boutique');
      }
    }
  }

  async loadStoreData(storeId: string) {
    try {
      const storeData = await firstValueFrom(this.storeService.getStoreById(storeId));
      if (storeData) {
        this.store = storeData;
        await this.checkInfluenceurReduction();
      } else {
        this.toastService.error('Boutique non trouvée');
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la boutique:', error);
      this.toastService.error('Erreur lors du chargement de la boutique');
    } finally {
      this.loading = false;
    }
  }

  async checkInfluenceurReduction() {
    if (this.store?.influenceurCode) {
      try {
        const influenceur = await firstValueFrom(
          this.influenceurService.getInfluenceurByCodePromo(this.store.influenceurCode)
        );
        
        if (influenceur && influenceur.statut === 'active') {
          this.reduction = influenceur.reductionPourcentage;
          this.finalAmount = this.calculateReducedAmount(this.paymentConfig.amount, this.reduction);
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du code promo:', error);
      }
    }
  }

  calculateReducedAmount(amount: number, reduction: number): number {
    return Math.round(amount * (1 - reduction / 100));
  }

  async startPayment() {
    if (!this.store) {
      this.toastService.error('Veuillez sélectionner une boutique');
      return;
    }

    this.loading = true;

    try {
      // Créer d'abord la transaction dans Firestore
      const transactionData: Partial<Transaction> = {
        amount: this.finalAmount,
        description: this.paymentConfig.description,
        paymentMethod: 'wave',
        status: 'pending'
      };

      this.currentTransactionId = await this.transactionService.createTransaction(
        this.store.id!,
        transactionData
      );

      // Initier le paiement avec NabooPay
      const paymentData = {
        amount: this.finalAmount,
        storeId: this.store.id!
      };

      const paymentResponse = await this.nabooPayService.initiatePayment(paymentData);

      if (paymentResponse.success && paymentResponse.paymentUrl) {
        // Rediriger vers la page de paiement
        window.location.href = paymentResponse.paymentUrl;
          } else {
        throw new Error(paymentResponse.error || 'Échec de l\'initialisation du paiement');
      }
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      this.toastService.error('Une erreur est survenue lors du paiement');
      this.loading = false;
    }
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/default-store.svg';
  }
} 