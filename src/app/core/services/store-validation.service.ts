import { Injectable } from '@angular/core';
import { StoreService } from './store.service';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class StoreValidationService {
  constructor(private storeService: StoreService) {}

  validateStoreUrl(storeUrl: string): Observable<boolean> {
    return this.storeService.getStoreByUrl(storeUrl).pipe(
      map(store => !!store),
      catchError(() => of(false))
    );
  }
} 