import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UrlService {
  constructor(private firestore: AngularFirestore) {}

  getStoreIdFromUrl(storeUrl: string): Observable<string | null> {
    return this.firestore
      .collection('urls')
      .doc(storeUrl)
      .valueChanges()
      .pipe(
        map((doc: any) => {
          if (!doc) return null;
          return doc.storeId;
        })
      );
  }
} 