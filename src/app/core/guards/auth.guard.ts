import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

// Guard moderne Angular (>= 14) - Approche fonctionnelle avec injection
export const authGuard: CanActivateFn = () => {
  // Désactivation de la garde d'authentification
  // Toujours autoriser l'accès
  return true;
};

// Guard pour rediriger l'utilisateur après connexion
export const postLoginGuard: CanActivateFn = () => {
  // Désactivation de la garde post-connexion
  // Toujours autoriser l'accès
  return true;
}; 