import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface NotificationData {
  orderId?: string;
  orderAmount?: number;
  customerName?: string;
  customerEmail?: string;
  productId?: string;
  productName?: string;
  stockLevel?: number;
  daysRemaining?: number;
}

export interface Notification {
  id?: string;
  storeId: string;
  storeUrl: string;
  type: 'ORDER' | 'STOCK' | 'SUBSCRIPTION';
  status: 'READ' | 'UNREAD';
  message: string;
  data: NotificationData;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(
    private firestore: AngularFirestore,
    private authService: AuthService
  ) {}

  private getNotificationsPath(storeId: string): string {
    const userId = this.authService.getCurrentUser()?.uid;
    if (!userId) throw new Error('Utilisateur non connecté');
    return `stores/${userId}/userStores/${storeId}/notifications`;
  }

  createNotification(notification: Pick<Notification, 'storeId' | 'storeUrl' | 'type' | 'message' | 'data'>): Promise<string> {
    const userId = this.authService.getCurrentUser()?.uid;
    if (!userId) throw new Error('Utilisateur non connecté');

    const notificationData: Notification = {
      ...notification,
      createdAt: Date.now(),
      status: 'UNREAD'
    };

    return this.firestore
      .collection(this.getNotificationsPath(notification.storeId))
      .add(notificationData)
      .then(docRef => docRef.id);
  }

  getStoreNotifications(storeId: string): Observable<Notification[]> {
    return this.firestore
      .collection<Notification>(
        this.getNotificationsPath(storeId),
        ref => ref.orderBy('createdAt', 'desc')
      )
      .valueChanges({ idField: 'id' });
  }

  getUnreadCount(storeId: string): Observable<number> {
    return this.firestore
      .collection<Notification>(
        this.getNotificationsPath(storeId),
        ref => ref.where('status', '==', 'UNREAD')
      )
      .valueChanges()
      .pipe(
        map(notifications => notifications.length)
      );
  }

  async markAsRead(storeId: string, notificationId: string): Promise<void> {
    await this.firestore
      .doc(`${this.getNotificationsPath(storeId)}/${notificationId}`)
      .update({ status: 'READ' });
  }

  async markAllAsRead(storeId: string): Promise<void> {
    const batch = this.firestore.firestore.batch();
    const snapshot = await this.firestore
      .collection(this.getNotificationsPath(storeId))
      .ref.where('status', '==', 'UNREAD')
      .get();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'READ' });
    });

    await batch.commit();
  }

  async deleteOldNotifications(storeId: string, olderThanDays: number = 30): Promise<void> {
    const cutoffDate = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    const batch = this.firestore.firestore.batch();
    
    const snapshot = await this.firestore
      .collection(this.getNotificationsPath(storeId))
      .ref.where('createdAt', '<', cutoffDate)
      .get();

    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  }
} 