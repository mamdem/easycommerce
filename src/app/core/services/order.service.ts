import { Injectable } from '@angular/core';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import { CartService, CartItem } from './cart.service';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../models/product.model';

export interface CustomerInfo {
  fullName: string;
  phone: string;
  address: string;
  notes?: string;  // Champ optionnel pour les notes de livraison
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id?: string;
  storeUrl: string;
  storeName: string;
  items: OrderItem[];
  customerInfo: CustomerInfo;
  total: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  constructor(
    private firestore: AngularFirestore,
    private cartService: CartService
  ) {}

  createOrder(storeUrl: string, storeName: string, customerInfo: CustomerInfo): Observable<string> {
    const cartItems = this.cartService.getCartItemsByStore(storeUrl);
    const total = this.cartService.getCartTotal(storeUrl);

    const orderItems: OrderItem[] = cartItems
      .filter(item => item.product.id)
      .map(item => {
        const productId = item.product.id;
        if (!productId) {
          throw new Error('Produit invalide détecté après filtrage');
        }
        return {
          productId,
          name: item.product.name,
          price: item.product.price,
          quantity: item.quantity
        };
      });

    if (orderItems.length === 0) {
      throw new Error('Le panier ne contient aucun produit valide');
    }

    const order: Order = {
      storeUrl,
      storeName,
      items: orderItems,
      customerInfo,
      total,
      status: 'pending',
      createdAt: Date.now()
    };

    return from(this.firestore.collection('orders').add(order)).pipe(
      map(docRef => {
        this.cartService.clearCart();
        return docRef.id;
      })
    );
  }

  getOrderById(orderId: string): Observable<Order | null> {
    return this.firestore.doc<Order>(`orders/${orderId}`).valueChanges().pipe(
      map(order => order ? { ...order, id: orderId } : null)
    );
  }
} 