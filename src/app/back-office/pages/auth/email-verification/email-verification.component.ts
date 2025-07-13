import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-email-verification',
  templateUrl: './email-verification.component.html',
  styleUrls: ['./email-verification.component.scss']
})
export class EmailVerificationComponent implements OnInit, OnDestroy {
  isLoading = false;
  isResending = false;
  isEmailVerified = false;
  currentUser: any = null;
  private verificationCheckSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Vérifier si un utilisateur est connecté
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.checkEmailVerificationStatus();
    this.startVerificationCheck();
  }

  ngOnDestroy(): void {
    if (this.verificationCheckSubscription) {
      this.verificationCheckSubscription.unsubscribe();
    }
  }

  async checkEmailVerificationStatus(): Promise<void> {
    try {
      this.isEmailVerified = await this.authService.refreshEmailVerificationStatus();
      if (this.isEmailVerified) {
        this.toastService.success('Email vérifié avec succès ! Vous pouvez maintenant vous connecter.');
        this.router.navigate(['/auth/login']);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification du statut:', error);
    }
  }

  async onManualVerificationCheck(): Promise<void> {
    this.isLoading = true;
    try {
      await this.checkEmailVerificationStatus();
      if (!this.isEmailVerified) {
        this.toastService.info('Votre email n\'est pas encore vérifié. Vérifiez votre boîte de réception et cliquez sur le lien de vérification.');
      }
    } catch (error) {
      console.error('Erreur lors de la vérification manuelle:', error);
      this.toastService.error('Erreur lors de la vérification. Veuillez réessayer.');
    } finally {
      this.isLoading = false;
    }
  }

  startVerificationCheck(): void {
    // Vérifier toutes les 5 secondes
    this.verificationCheckSubscription = interval(5000).subscribe(() => {
      this.checkEmailVerificationStatus();
    });
  }

  async resendVerificationEmail(): Promise<void> {
    if (this.isResending) return;

    this.isResending = true;

    try {
      await this.authService.resendVerificationEmail();
      this.toastService.success('Email de vérification renvoyé !');
    } catch (error) {
      console.error('Erreur lors de l\'envoi de l\'email:', error);
      this.toastService.error('Erreur lors de l\'envoi de l\'email. Veuillez réessayer.');
    } finally {
      this.isResending = false;
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  goToStoreCreation(): void {
    this.router.navigate(['/store-creation']);
  }
} 