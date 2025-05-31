import { Injectable } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from } from 'rxjs';
import { finalize } from 'rxjs/operators';

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
  constructor(private storage: AngularFireStorage) {}

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
    // Pour l'instant, on upload simplement l'image sans redimensionnement
    // TODO: Implémenter le redimensionnement des images
    return this.uploadFile(path, file);
  }
} 