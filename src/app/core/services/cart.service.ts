import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Product } from '../models/product.model';

export interface CartItem {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string;
    description?: string;
  };
  quantity: number;
  storeUrl: string;
  storeName: string;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly CART_STORAGE_KEY = 'cart_items';
  private readonly DEFAULT_PRODUCT_IMAGE = 'assets/default-product.svg';
  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  cartItems$ = this.cartItemsSubject.asObservable();

  constructor() {
    this.loadCartFromStorage();
  }

  private loadCartFromStorage() {
    try {
      const storedItems = localStorage.getItem(this.CART_STORAGE_KEY);
      if (storedItems) {
        const items = JSON.parse(storedItems);
        this.cartItemsSubject.next(items);
      }
    } catch (e) {
      console.error('Erreur lors du chargement du panier:', e);
      this.cartItemsSubject.next([]);
    }
  }

  private saveCartToStorage(items: CartItem[]) {
    try {
      localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(items));
      this.cartItemsSubject.next(items);
    } catch (e) {
      console.error('Erreur lors de la sauvegarde du panier:', e);
    }
  }

  private getProductImage(product: Product): string {
    if (product.images && Array.isArray(product.images) && product.images.length > 0 && product.images[0]) {
      return product.images[0];
    }
    return this.DEFAULT_PRODUCT_IMAGE;
  }

  addToCart(product: Product, storeUrl: string, storeName: string, quantity: number = 1) {
    if (!product || !product.id) return;

    const currentItems = this.cartItemsSubject.value;
    const existingItemIndex = currentItems.findIndex(
      item => item.product.id === product.id && item.storeUrl === storeUrl
    );

    const cartItem: CartItem = {
      product: {
        id: product.id,
        name: product.name,
        price: product.price,
        imageUrl: this.getProductImage(product),
        description: product.description
      },
      quantity,
      storeUrl,
      storeName
    };

    if (existingItemIndex > -1) {
      const updatedItems = [...currentItems];
      updatedItems[existingItemIndex].quantity += quantity;
      this.saveCartToStorage(updatedItems);
    } else {
      this.saveCartToStorage([...currentItems, cartItem]);
    }
  }

  updateQuantity(productId: string, storeUrl: string, quantity: number) {
    if (quantity < 1) return;
    
    const currentItems = this.cartItemsSubject.value;
    const updatedItems = currentItems.map(item => {
      if (item.product.id === productId && item.storeUrl === storeUrl) {
        return { ...item, quantity };
      }
      return item;
    });
    this.saveCartToStorage(updatedItems);
  }

  removeFromCart(productId: string, storeUrl: string) {
    const currentItems = this.cartItemsSubject.value;
    const updatedItems = currentItems.filter(
      item => !(item.product.id === productId && item.storeUrl === storeUrl)
    );
    this.saveCartToStorage(updatedItems);
  }

  getCartItemsByStore(storeUrl: string): CartItem[] {
    return this.cartItemsSubject.value.filter(item => item.storeUrl === storeUrl);
  }

  getCartTotal(storeUrl: string): number {
    return this.getCartItemsByStore(storeUrl).reduce(
      (total, item) => total + (item.product.price * item.quantity),
      0
    );
  }

  getCartItemsCount(storeUrl: string): number {
    return this.getCartItemsByStore(storeUrl).reduce(
      (count, item) => count + item.quantity,
      0
    );
  }

  clearCart() {
    this.saveCartToStorage([]);
  }
} 