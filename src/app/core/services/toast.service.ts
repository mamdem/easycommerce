import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private toastr: ToastrService) {}

  /**
   * Affiche une notification de succès
   * @param message Le message à afficher
   * @param title Le titre de la notification (optionnel)
   */
  success(message: string, title: string = 'Succès') {
    this.toastr.success(message, title, {
      timeOut: 3000,
      positionClass: 'toast-top-right',
      progressBar: true,
      closeButton: true
    });
  }

  /**
   * Affiche une notification d'erreur
   * @param message Le message à afficher
   * @param title Le titre de la notification (optionnel)
   */
  error(message: string, title: string = 'Erreur') {
    this.toastr.error(message, title, {
      timeOut: 5000,
      positionClass: 'toast-top-right',
      progressBar: true,
      closeButton: true
    });
  }

  /**
   * Affiche une notification d'information
   * @param message Le message à afficher
   * @param title Le titre de la notification (optionnel)
   */
  info(message: string, title: string = 'Information') {
    this.toastr.info(message, title, {
      timeOut: 3000,
      positionClass: 'toast-top-right',
      progressBar: true,
      closeButton: true
    });
  }

  /**
   * Affiche une notification d'avertissement
   * @param message Le message à afficher
   * @param title Le titre de la notification (optionnel)
   */
  warning(message: string, title: string = 'Attention') {
    this.toastr.warning(message, title, {
      timeOut: 4000,
      positionClass: 'toast-top-right',
      progressBar: true,
      closeButton: true
    });
  }
} 