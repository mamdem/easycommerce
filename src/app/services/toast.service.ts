import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor() {}

  showSuccess(message: string): void {
    // Implement toast notification (you can use ngx-toastr or your preferred library)
    console.log('Success:', message);
  }

  showError(message: string): void {
    // Implement toast notification
    console.error('Error:', message);
  }

  showWarning(message: string): void {
    // Implement toast notification
    console.warn('Warning:', message);
  }

  showInfo(message: string): void {
    // Implement toast notification
    console.info('Info:', message);
  }
} 