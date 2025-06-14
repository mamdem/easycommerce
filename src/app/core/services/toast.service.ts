import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private snackBar: MatSnackBar) {}

  private showMessage(message: string, type: 'success' | 'error' | 'info' | 'warning', title?: string, duration: number = 3000): void {
    const config: MatSnackBarConfig = {
      duration: duration,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: [`toast-${type}`]
    };

    const displayMessage = title ? `${title}: ${message}` : message;
    this.snackBar.open(displayMessage, 'Fermer', config);
  }

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    this.showMessage(message, type);
  }

  success(message: string, title?: string): void {
    this.showMessage(message, 'success', title);
  }

  error(message: string, title?: string): void {
    this.showMessage(message, 'error', title);
  }

  warning(message: string, title?: string): void {
    this.showMessage(message, 'warning', title);
  }

  info(message: string, title?: string): void {
    this.showMessage(message, 'info', title);
  }
} 