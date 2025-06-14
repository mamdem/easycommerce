import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Category } from '../models/category.model';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {}

  private getCategoriesPath(storeId: string): string {
    const userId = this.authService.getCurrentUser()?.uid;
    if (!userId) throw new Error('User not authenticated');
    return `stores/${userId}/userStores/${storeId}/categories`;
  }

  getStoreCategories(storeId: string): Observable<Category[]> {
    return this.firestore
      .collection<Category>(this.getCategoriesPath(storeId), ref => 
        ref.orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'id' })
      .pipe(
        map(categories => categories)
      );
  }

  async addCategory(storeId: string, categoryData: Partial<Category>): Promise<Category> {
    try {
      const userId = this.authService.getCurrentUser()?.uid;
      if (!userId) throw new Error('User not authenticated');

      const newCategory: Omit<Category, 'id'> = {
        ...categoryData as Omit<Category, 'id'>,
        storeId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await this.firestore
        .collection(this.getCategoriesPath(storeId))
        .add(newCategory);
      
      return {
        id: docRef.id,
        ...newCategory
      };
    } catch (error) {
      console.error('Error adding category:', error);
      throw error;
    }
  }

  async updateCategory(storeId: string, categoryId: string, categoryData: Partial<Category>): Promise<void> {
    try {
      const updateData = {
        ...categoryData,
        updatedAt: new Date()
      };

      await this.firestore
        .doc(`${this.getCategoriesPath(storeId)}/${categoryId}`)
        .update(updateData);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(storeId: string, categoryId: string): Promise<void> {
    try {
      await this.firestore
        .doc(`${this.getCategoriesPath(storeId)}/${categoryId}`)
        .delete();
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }
} 