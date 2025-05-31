import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { StoreService } from '../services/store.service';
import { ToastService } from '../services/toast.service';
import { map } from 'rxjs/operators';

// Guard moderne Angular (>= 14) - Approche fonctionnelle avec injection
export const storeGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const storeService = inject(StoreService);
  const toastService = inject(ToastService);

  // Vérifier d'abord si l'utilisateur est authentifié
  if (!authService.isAuthenticated()) {
    toastService.warning('Veuillez vous connecter pour accéder à cette page', 'Accès refusé');
    return router.createUrlTree(['/auth/login']);
  }

  // Ensuite vérifier si l'utilisateur a une boutique
  return storeService.hasStore().pipe(
    map(hasStore => {
      if (hasStore) {
        return true;
      } else {
        toastService.warning('Vous devez créer une boutique pour accéder à cette page', 'Accès refusé');
        return router.createUrlTree(['/store/create']);
      }
    })
  );
}; 