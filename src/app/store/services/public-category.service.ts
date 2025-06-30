import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, of, from, map, switchMap, catchError } from 'rxjs';
import { Category } from '../../core/models/category.model';
import { UrlService } from '../../core/services/url.service';
import firebase from 'firebase/compat/app';

@Injectable({
  providedIn: 'root'
})
export class PublicCategoryService {
  constructor(
    private firestore: AngularFirestore,
    private urlService: UrlService
  ) {}

  getCategoryById(storeUrl: string, categoryId: string): Observable<Category> {
    if (!storeUrl || !categoryId) {
      return of({ id: '', name: 'Catégorie inconnue', storeId: '', createdAt: new Date(), updatedAt: new Date() });
    }

    return this.firestore.collection('urls').doc(storeUrl).get().pipe(
      switchMap(urlDoc => {
        if (!urlDoc.exists) {
          console.log('URL de boutique non trouvée:', storeUrl);
          return of({ id: '', name: 'Catégorie inconnue', storeId: '', createdAt: new Date(), updatedAt: new Date() });
        }

        const urlData = urlDoc.data() as { userId: string, storeId: string };
        console.log('Données URL trouvées:', urlData);

        return this.firestore
          .collection('public_stores')
          .doc(urlData.storeId)
          .collection('categories')
          .doc(categoryId)
          .get()
          .pipe(
            map(categoryDoc => {
              if (!categoryDoc.exists) {
                return { id: '', name: 'Catégorie inconnue', storeId: '', createdAt: new Date(), updatedAt: new Date() };
              }
              const data = categoryDoc.data() as any;
              return {
                id: categoryDoc.id,
                name: data.name || '',
                description: data.description || '',
                icon: data.icon || '',
                productCount: data.productCount || 0,
                storeId: urlData.storeId,
                createdAt: data.createdAt instanceof firebase.firestore.Timestamp ? data.createdAt.toDate() : new Date(),
                updatedAt: data.updatedAt instanceof firebase.firestore.Timestamp ? data.updatedAt.toDate() : new Date()
              } as Category;
            })
          );
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération de la catégorie:', error);
        return of({ id: '', name: 'Catégorie inconnue', storeId: '', createdAt: new Date(), updatedAt: new Date() });
      })
    );
  }

  getStoreCategories(storeUrl: string): Observable<Category[]> {
    return this.firestore.collection('urls').doc(storeUrl).get().pipe(
      switchMap(urlDoc => {
        if (!urlDoc.exists) {
          console.log('URL de boutique non trouvée:', storeUrl);
          return of([]);
        }

        const urlData = urlDoc.data() as { userId: string, storeId: string };
        console.log('Données URL trouvées:', urlData);

        return this.firestore
          .collection('public_stores')
          .doc(urlData.storeId)
          .collection('categories')
          .valueChanges({ idField: 'id' })
          .pipe(
            map(categories => {
              return categories.map(category => ({
                id: category['id'],
                name: category['name'] || '',
                description: category['description'] || '',
                icon: category['icon'] || '',
                productCount: category['productCount'] || 0,
                storeId: urlData.storeId,
                createdAt: category['createdAt'] instanceof firebase.firestore.Timestamp ? category['createdAt'].toDate() : new Date(),
                updatedAt: category['updatedAt'] instanceof firebase.firestore.Timestamp ? category['updatedAt'].toDate() : new Date()
              })) as Category[];
            })
          );
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des catégories:', error);
        return of([]);
      })
    );
  }
} 