import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface SubscriptionStatus {
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'incomplete_expired' | null;
  subscriptionId?: string;
  trialEnd?: Date;
  isInTrial?: boolean;
  daysLeftInTrial?: number;
  currentPeriodEnd?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private subscriptionStatus = new BehaviorSubject<SubscriptionStatus>({ status: null });
  private apiUrl = 'http://localhost:3000/api';

  constructor(
    private firestore: AngularFirestore,
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('🔵 SubscriptionService initialized');
    this.initSubscriptionStatus();
  }

  private initSubscriptionStatus() {
    console.log('🔵 Starting initSubscriptionStatus');
    this.authService.user$.pipe(
      tap(user => console.log('🔵 Current user:', user?.uid)),
      switchMap(user => {
        if (!user) {
          console.log('❌ No user found, returning null');
          return of(null);
        }
        console.log('🔵 Fetching subscription data for user:', user.uid);
        return this.firestore.collection('subscriptions').doc(user.uid).valueChanges();
      })
    ).subscribe((subscriptionData: any) => {
      console.log('🔵 Raw Firestore data:', JSON.stringify(subscriptionData, null, 2));
      
      if (subscriptionData) {
        console.log('🔵 Processing subscription data:');
        console.log('- subscriptionStatus:', subscriptionData.subscriptionStatus);
        console.log('- isInTrial:', subscriptionData.isInTrial);
        console.log('- daysLeftInTrial:', subscriptionData.daysLeftInTrial);
        
        const status: SubscriptionStatus = {
          status: subscriptionData.subscriptionStatus || null,
          subscriptionId: subscriptionData.subscriptionId,
          trialEnd: subscriptionData.trialEnd?.toDate ? subscriptionData.trialEnd.toDate() : subscriptionData.trialEnd,
          isInTrial: Boolean(subscriptionData.isInTrial),
          daysLeftInTrial: Number(subscriptionData.daysLeftInTrial),
          currentPeriodEnd: subscriptionData.currentPeriodEnd?.toDate ? subscriptionData.currentPeriodEnd.toDate() : subscriptionData.currentPeriodEnd
        };
        
        console.log('✅ Transformed status object:', JSON.stringify(status, null, 2));
        this.subscriptionStatus.next(status);
      } else {
        console.log('❌ No subscription data found, setting null status');
        this.subscriptionStatus.next({ status: null });
      }
    }, error => {
      console.error('❌ Error reading Firestore data:', error);
      this.subscriptionStatus.next({ status: null });
    });
  }

  getSubscriptionStatus(): Observable<SubscriptionStatus> {
    return this.subscriptionStatus.asObservable().pipe(
      tap(status => console.log('🔵 Subscription status emitted:', JSON.stringify(status, null, 2)))
    );
  }

  async updateSubscriptionInFirebase(userId: string, subscriptionData: any) {
    try {
      await this.firestore.collection('subscriptions').doc(userId).set({
        subscriptionId: subscriptionData.subscriptionId,
        subscriptionStatus: subscriptionData.status,
        trialEnd: subscriptionData.trialEnd,
        isInTrial: subscriptionData.isInTrial,
        daysLeftInTrial: subscriptionData.daysLeftInTrial,
        currentPeriodEnd: subscriptionData.currentPeriodEnd,
        updatedAt: new Date()
      }, { merge: true });
    } catch (error) {
      console.error('Erreur lors de la mise à jour Firebase:', error);
      throw error;
    }
  }
} 