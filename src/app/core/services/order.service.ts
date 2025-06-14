import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { CartService } from './cart.service';
import { Observable, from, throwError, forkJoin, of } from 'rxjs';
import { map, catchError, mergeMap } from 'rxjs/operators';
import { Order, CustomerInfo, OrderStatus } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(
    private firestore: AngularFirestore,
    private cartService: CartService
  ) {}

  createOrder(storeUrl: string, storeName: string, customerInfo: CustomerInfo): Observable<string> {
    console.log('Début de création de commande:', { storeUrl, storeName, customerInfo });
    
    const cartItems = this.cartService.getCartItemsByStore(storeUrl);
    console.log('Articles du panier:', cartItems);
    
    const subtotal = this.cartService.getCartSubtotal(storeUrl);
    const shippingFee = this.cartService.getShippingFee(storeUrl);
    const total = subtotal + shippingFee;

    if (cartItems.length === 0) {
      console.warn('Tentative de création de commande avec un panier vide');
      return throwError(() => new Error('Le panier est vide'));
    }

    const orderItems = cartItems.map(item => ({
      productId: item.product.id,
      product: {
        id: item.product.id,
        name: item.product.name,
        description: item.product.description || '',
        price: item.product.price,
        imageUrl: item.product.imageUrl || 'assets/images/placeholder.png'
      },
      quantity: item.quantity
    }));

    const order: Order = {
      storeUrl,
      storeName,
      items: orderItems,
      customerInfo,
      subtotal,
      shippingFee,
      total,
      status: 'en_cours',
      createdAt: Date.now()
    };

    console.log('Création de la commande avec les données:', order);

    // Utiliser la nouvelle structure de collection
    return from(
      this.firestore
        .collection('orders')
        .doc(storeUrl)
        .collection('orders')
        .add(order)
    ).pipe(
      map(docRef => {
        console.log('Commande créée avec succès, ID:', docRef.id);
        return docRef.id;
      }),
      catchError(error => {
        console.error('Erreur lors de la création de la commande:', error);
        return throwError(() => new Error('Erreur lors de la création de la commande'));
      })
    );
  }

  getOrderById(storeUrl: string, orderId: string): Observable<Order | null> {
    return this.firestore
      .collection('orders')
      .doc(storeUrl)
      .collection('orders')
      .doc<Order>(orderId)
      .valueChanges()
      .pipe(
        map(order => order ? { ...order, id: orderId } : null),
        catchError(error => {
          console.error('Erreur lors de la récupération de la commande:', error);
          return throwError(() => new Error('Erreur lors de la récupération de la commande'));
        })
      );
  }

  getOrdersByStore(storeUrl: string): Observable<Order[]> {
    return this.firestore
      .collection('orders')
      .doc(storeUrl)
      .collection<Order>('orders')
      .valueChanges({ idField: 'id' })
      .pipe(
        map(orders => {
          // Trier les commandes côté client
          return orders.sort((a, b) => b.createdAt - a.createdAt);
        }),
        catchError(error => {
          console.error('Erreur lors de la récupération des commandes:', error);
          return throwError(() => new Error('Erreur lors de la récupération des commandes'));
        })
      );
  }

  updateOrderStatus(storeUrl: string, orderId: string, status: OrderStatus, rejectionReason?: string): Observable<void> {
    const updateData: Partial<Order> = {
      status,
      updatedAt: Date.now()
    };

    if (status === 'rejete' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    return from(
      this.firestore
        .collection('orders')
        .doc(storeUrl)
        .collection('orders')
        .doc(orderId)
        .update(updateData)
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la mise à jour du statut:', error);
        return throwError(() => new Error('Erreur lors de la mise à jour du statut'));
      })
    );
  }

  // Méthode pour vérifier les commandes existantes (toutes boutiques confondues)
  checkExistingOrders(): Observable<Order[]> {
    console.log('[OrderService] Début de la vérification des commandes existantes...');
    
    // Utiliser la même approche que dans la page des commandes
    return this.firestore.collection('stores').get().pipe(
      mergeMap(storeSnapshots => {
        if (storeSnapshots.empty) {
          console.log('[OrderService] Aucune boutique trouvée');
          return of([]);
        }

        console.log('[OrderService] Nombre de boutiques trouvées:', storeSnapshots.docs.length);
        
        const storeObservables = storeSnapshots.docs.map(storeDoc => {
          const storeData = storeDoc.data();
          const storeUrl = storeDoc.id.split('_')[1];
          
          console.log('[OrderService] Vérification des commandes pour la boutique:', storeUrl);
          
          return this.getOrdersByStore(storeUrl);
        });

        return forkJoin(storeObservables).pipe(
          map(ordersArrays => {
            const allOrders = ordersArrays.flat();
            console.log('[OrderService] Nombre total de commandes trouvées:', allOrders.length);
            if (allOrders.length > 0) {
              console.log('[OrderService] Premières commandes trouvées:', allOrders.slice(0, 3));
            }
            return allOrders;
          })
        );
      }),
      catchError(error => {
        console.error('[OrderService] Erreur lors de la récupération des commandes:', error);
        return throwError(() => error);
      })
    );
  }

  // Extraire l'URL de la boutique à partir de l'ID complet
  private extractStoreUrl(fullStoreId: string): string {
    const parts = fullStoreId.split('_');
    return parts.length > 1 ? parts[1] : fullStoreId;
  }

  // Méthode pour vérifier une commande spécifique
  checkOrder(storeUrl: string, orderId: string): Observable<Order | undefined> {
    console.log('Vérification de la commande:', orderId, 'dans la boutique:', storeUrl);
    return this.firestore
      .collection('orders')
      .doc(storeUrl)
      .collection('orders')
      .doc<Order>(orderId)
      .valueChanges()
      .pipe(
        map(order => {
          console.log('Commande trouvée:', order);
          return order;
        }),
        catchError(error => {
          console.error(`Erreur lors de la récupération de la commande ${orderId}:`, error);
          return throwError(() => error);
        })
      );
  }
} 