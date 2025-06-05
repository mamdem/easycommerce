import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StoreValidationService } from '../../../../core/services/store-validation.service';
import { map } from 'rxjs/operators';

export const storeExistsGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const storeValidationService = inject(StoreValidationService);
  const storeUrl = route.params['storeUrl'];

  if (!storeUrl) {
    return router.createUrlTree(['/home']);
  }

  return storeValidationService.validateStoreUrl(storeUrl).pipe(
    map(exists => {
      if (exists) {
        return true;
      }
      return router.createUrlTree(['/home']);
    })
  );
}; 