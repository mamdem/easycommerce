import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  constructor(private toastr: ToastrService) {}

  /**
   * Affiche un message de succès
   */
  success(message: string, title: string = 'Succès'): void {
    this.toastr.success(message, title, {
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
      positionClass: 'toast-top-right',
      enableHtml: true,
      toastClass: 'ngx-toastr toast-success'
    });
  }

  /**
   * Affiche un message d'erreur
   */
  error(message: string, title: string = 'Erreur'): void {
    this.toastr.error(message, title, {
      timeOut: 5000,
      progressBar: true,
      closeButton: true,
      positionClass: 'toast-top-right',
      enableHtml: true,
      toastClass: 'ngx-toastr toast-error'
    });
  }

  /**
   * Affiche un message d'information
   */
  info(message: string, title: string = 'Information'): void {
    this.toastr.info(message, title, {
      timeOut: 3000,
      progressBar: true,
      closeButton: true,
      positionClass: 'toast-top-right',
      enableHtml: true,
      toastClass: 'ngx-toastr toast-info'
    });
  }

  /**
   * Affiche un message d'avertissement
   */
  warning(message: string, title: string = 'Attention'): void {
    this.toastr.warning(message, title, {
      timeOut: 4000,
      progressBar: true,
      closeButton: true,
      positionClass: 'toast-top-right',
      enableHtml: true,
      toastClass: 'ngx-toastr toast-warning'
    });
  }
} 