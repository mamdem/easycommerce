import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StripeService } from '../../../core/services/stripe.service';
import { ToastService } from '../../../core/services/toast.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit {
  loading = false;
  paymentSuccess = false;
  paymentCanceled = false;

  constructor(
    private stripeService: StripeService,
    private toastService: ToastService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Vérifier le statut du paiement au retour
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
