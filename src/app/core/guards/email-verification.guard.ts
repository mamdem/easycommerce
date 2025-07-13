import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class EmailVerificationGuard implements CanActivate {
  
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): boolean {
    const currentUser = this.authService.getCurrentUser();
    
    // Si l'utilisateur n'est pas connecté, rediriger vers la connexion
    if (!currentUser) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Si l'email n'est pas vérifié, rediriger vers la vérification
    if (!currentUser.emailVerified) {
      this.router.navigate(['/auth/email-verification']);
      return false;
    }

    // Si l'email est vérifié, permettre l'accès
    return true;
  }
} 