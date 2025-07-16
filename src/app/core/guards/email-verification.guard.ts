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
    
    console.log('🔍 EmailVerificationGuard - Utilisateur actuel:', currentUser);
    
    // Si l'utilisateur n'est pas connecté, rediriger vers la connexion
    if (!currentUser) {
      console.log('❌ Utilisateur non connecté, redirection vers login');
      this.router.navigate(['/auth/login']);
      return false;
    }

    // Pour les connexions Google, l'email est automatiquement vérifié
    // Permettre l'accès au dashboard même si emailVerified est false
    // car cela peut être un problème de synchronisation avec Firebase
    if (currentUser.providerData && currentUser.providerData.length > 0) {
      console.log('🔍 ProviderData trouvé:', currentUser.providerData);
      const googleProvider = currentUser.providerData.find(provider => 
        provider.providerId === 'google.com'
      );
      
      if (googleProvider) {
        console.log('✅ Utilisateur Google détecté, accès autorisé au dashboard');
        return true;
      }
    }

    console.log('🔍 EmailVerified:', currentUser.emailVerified);
    
    // Si l'email n'est pas vérifié et que ce n'est pas un utilisateur Google,
    // rediriger vers la vérification
    if (!currentUser.emailVerified) {
      console.log('❌ Email non vérifié, redirection vers email-verification');
      this.router.navigate(['/auth/email-verification']);
      return false;
    }

    // Si l'email est vérifié, permettre l'accès
    console.log('✅ Email vérifié, accès autorisé au dashboard');
    return true;
  }
} 