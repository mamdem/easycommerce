import { Injectable } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ImageCropperModalComponent, ImageCropperDialogData } from '../../shared/components/image-cropper-modal/image-cropper-modal.component';

export interface ImageDimensions {
  width: number;
  height: number;
}

export const STORE_IMAGE_DIMENSIONS = {
  logo: { width: 200, height: 200 },
  banner: { width: 1200, height: 300 }
};

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  constructor(
    private storage: AngularFireStorage,
    private dialog: MatDialog
  ) {}

  /**
   * Upload un fichier vers Firebase Storage
   */
  uploadFile(path: string, file: File): Observable<string> {
    const ref = this.storage.ref(path);
    const task = this.storage.upload(path, file);

    return new Observable<string>(observer => {
      task.snapshotChanges().pipe(
        finalize(async () => {
          try {
            const url = await ref.getDownloadURL().toPromise();
            observer.next(url);
            observer.complete();
          } catch (error) {
            observer.error(error);
          }
        })
      ).subscribe();
    });
  }

  /**
   * Supprime un fichier de Firebase Storage
   */
  async deleteFile(path: string): Promise<void> {
    await this.storage.ref(path).delete().toPromise();
  }

  /**
   * Génère un nom de fichier unique
   */
  generateUniqueFileName(originalName: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    return `${timestamp}_${randomString}.${extension}`;
  }

  /**
   * Retourne le chemin de l'image pour une boutique
   */
  getStoreImagePath(storeId: string, type: 'logo' | 'banner'): string {
    return `stores/${storeId}/${type}/${this.generateUniqueFileName('image')}`;
  }

  /**
   * Upload une image avec redimensionnement
   */
  uploadImage(file: File, path: string, dimensions: ImageDimensions): Observable<string> {
    return new Observable<string>(observer => {
      const dialogRef = this.dialog.open(ImageCropperModalComponent, {
        width: '800px',
        data: {
          imageFile: file,
          aspectRatio: dimensions.width / dimensions.height,
          resizeToWidth: dimensions.width,
          resizeToHeight: dimensions.height,
          maintainAspectRatio: true,
          title: 'Redimensionner l\'image'
        } as ImageCropperDialogData
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Si l'utilisateur a validé le recadrage, on upload l'image recadrée
          this.uploadFile(path, result).subscribe({
            next: (url) => {
              observer.next(url);
              observer.complete();
            },
            error: (error) => observer.error(error)
          });
        } else {
          // Si l'utilisateur a annulé, on envoie une erreur
          observer.error('Opération annulée');
        }
      });
    });
  }
} 