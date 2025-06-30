import { Injectable } from '@angular/core';
import { AngularFireStorage } from '@angular/fire/compat/storage';
import { Observable, from } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { ImageCropperModalComponent, ImageCropperDialogData } from '../../shared/components/image-cropper-modal/image-cropper-modal.component';
import { getStorage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { getAuth } from 'firebase/auth';

export interface ImageDimensions {
  width: number;
  height: number;
  quality?: number;
}

export const STORE_IMAGE_DIMENSIONS = {
  logo: {
    width: 200,
    height: 200,
    quality: 0.8
  } as ImageDimensions,
  banner: {
    width: 1200,
    height: 300,
    quality: 0.8
  } as ImageDimensions
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
   * Redimensionne une image selon les dimensions spécifiées
   */
  async resizeImage(file: File, dimensions: ImageDimensions): Promise<File> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (!ctx) {
            reject(new Error('Impossible de créer le contexte 2D'));
            return;
          }

          // Calculer les dimensions en gardant le ratio
          let newWidth = dimensions.width;
          let newHeight = dimensions.height;
          const ratio = Math.min(newWidth / img.width, newHeight / img.height);
          newWidth = img.width * ratio;
          newHeight = img.height * ratio;

          // Configurer le canvas
          canvas.width = newWidth;
          canvas.height = newHeight;

          // Dessiner l'image redimensionnée
          ctx.drawImage(img, 0, 0, newWidth, newHeight);

          // Convertir en blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Échec de la conversion en blob'));
                return;
              }
              // Créer un nouveau fichier avec le même nom
              const resizedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(resizedFile);
            },
            file.type,
            dimensions.quality || 0.8
          );
        };
        img.onerror = () => {
          reject(new Error('Erreur lors du chargement de l\'image'));
        };
        img.src = e.target?.result as string;
      };
      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };
      reader.readAsDataURL(file);
    });
  }

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
    const random = Math.floor(Math.random() * 1000);
    const extension = originalName.split('.').pop();
    return `${timestamp}-${random}.${extension}`;
  }

  /**
   * Retourne le chemin de l'image pour une boutique
   */
  getStoreImagePath(storeId: string, type: 'logo' | 'banner'): string {
    return `stores/${storeId}/${type}/${this.generateUniqueFileName('image')}`;
  }

  /**
   * Upload une image
   */
  uploadImage(file: File, path: string, dimensions?: ImageDimensions): Observable<string> {
    return from(
      (async () => {
        try {
          // Redimensionner l'image si des dimensions sont spécifiées
          const imageToUpload = dimensions ? await this.resizeImage(file, dimensions) : file;
          
          // Upload vers Firebase Storage
          const ref = this.storage.ref(path);
          const task = ref.put(imageToUpload);
          
          // Attendre la fin de l'upload
          await task;
          
          // Retourner l'URL de téléchargement
          return await ref.getDownloadURL().toPromise();
        } catch (error) {
          console.error('Erreur lors de l\'upload de l\'image:', error);
          throw error;
        }
      })()
    );
  }

  /**
   * Upload l'avatar de l'utilisateur
   * @param file Le fichier image à uploader
   * @returns L'URL de l'avatar uploadé
   */
  async uploadUserAvatar(file: File): Promise<string> {
    const auth = getAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('Aucun utilisateur connecté');
    }

    const storage = getStorage();
    const avatarRef = ref(storage, `users/${currentUser.uid}/avatar/${file.name}`);

    try {
      // Upload le fichier
      const snapshot = await uploadBytes(avatarRef, file);
      
      // Obtenir l'URL de téléchargement
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Erreur lors de l\'upload de l\'avatar:', error);
      throw error;
    }
  }
} 