import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CartService, CartItem } from '../../../core/services/cart.service';
import { OrderService, CustomerInfo } from '../../../core/services/order.service';
import { ToastService } from '../../../core/services/toast.service';
import { OrderFormComponent } from '../order-form/order-form.component';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, OrderFormComponent],
  template: `
    <div class="cart-container" [class.open]="isOpen">
      <div class="cart-header">
        <h3>Panier ({{ cartItemsCount }} articles)</h3>
        <button class="close-btn" (click)="toggleCart()">×</button>
      </div>
      
      <ng-container *ngIf="!showOrderForm">
        <div class="cart-items" *ngIf="cartItems.length > 0">
          <div class="cart-item" *ngFor="let item of cartItems">
            <img [src]="item.product.imageUrl" [alt]="item.product.name" class="item-image">
            <div class="item-details">
              <h4>{{ item.product.name }}</h4>
              <p class="price">{{ item.product.price | currency:'EUR' }}</p>
              <div class="quantity-controls">
                <button (click)="updateQuantity(item, -1)" [disabled]="item.quantity <= 1">-</button>
                <input type="number" [value]="item.quantity" (change)="onQuantityChange($event, item)" min="1">
                <button (click)="updateQuantity(item, 1)">+</button>
              </div>
            </div>
            <button class="remove-btn" (click)="removeItem(item)">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>

        <div class="cart-empty" *ngIf="cartItems.length === 0">
          <i class="bi bi-cart-x"></i>
          <p>Votre panier est vide</p>
        </div>

        <div class="cart-footer" *ngIf="cartItems.length > 0">
          <div class="cart-total">
            <span>Total</span>
            <span class="total-amount">{{ cartTotal | currency:'EUR' }}</span>
          </div>
          <button class="checkout-btn" (click)="startCheckout()">
            Commander
          </button>
        </div>
      </ng-container>

      <app-order-form
        *ngIf="showOrderForm"
        [submitting]="submitting"
        (submit)="submitOrder($event)"
        (onCancel)="showOrderForm = false">
      </app-order-form>
    </div>
  `,
  styles: [`
    .cart-container {
      position: fixed;
      top: 0;
      right: -400px;
      width: 400px;
      height: 100vh;
      background: white;
      box-shadow: -2px 0 8px rgba(0,0,0,0.1);
      transition: right 0.3s ease;
      z-index: 1000;
      display: flex;
      flex-direction: column;
    }

    .cart-container.open {
      right: 0;
    }

    .cart-header {
      padding: 1rem;
      border-bottom: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.5rem;
    }

    .cart-items {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
    }

    .cart-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid #eee;
    }

    .item-image {
      width: 80px;
      height: 80px;
      object-fit: cover;
      border-radius: 4px;
    }

    .item-details {
      flex: 1;
      h4 {
        margin: 0 0 0.5rem;
      }
    }

    .quantity-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.5rem;

      button {
        background: #f0f0f0;
        border: none;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
        border-radius: 4px;
      }

      input {
        width: 50px;
        text-align: center;
        border: 1px solid #ddd;
        border-radius: 4px;
        padding: 0.25rem;
      }
    }

    .remove-btn {
      background: none;
      border: none;
      color: #dc3545;
      cursor: pointer;
      padding: 0.5rem;
    }

    .cart-empty {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #6c757d;
      
      i {
        font-size: 3rem;
        margin-bottom: 1rem;
      }
    }

    .cart-footer {
      padding: 1rem;
      border-top: 1px solid #eee;
    }

    .cart-total {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      font-weight: bold;
    }

    .checkout-btn {
      width: 100%;
      padding: 1rem;
      background: var(--primary-color, #007bff);
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;

      &:hover {
        background: var(--primary-color-dark, #0056b3);
      }
    }
  `]
})
export class CartComponent implements OnInit {
  @Input() storeUrl!: string;
  @Input() storeName!: string;
  isOpen = false;
  cartItems: CartItem[] = [];
  cartTotal = 0;
  cartItemsCount = 0;
  showOrderForm = false;
  submitting = false;

  constructor(
    private cartService: CartService,
    private orderService: OrderService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.updateCart();
    this.cartService.cartItems$.subscribe(() => {
      this.updateCart();
    });
  }

  private updateCart() {
    this.cartItems = this.cartService.getCartItemsByStore(this.storeUrl);
    this.cartTotal = this.cartService.getCartTotal(this.storeUrl);
    this.cartItemsCount = this.cartService.getCartItemsCount(this.storeUrl);
  }

  toggleCart() {
    this.isOpen = !this.isOpen;
    if (!this.isOpen) {
      this.showOrderForm = false;
    }
  }

  updateQuantity(item: CartItem, change: number) {
    const newQuantity = item.quantity + change;
    if (newQuantity > 0 && item.product.id) {
      this.cartService.updateQuantity(item.product.id, this.storeUrl, newQuantity);
    }
  }

  onQuantityChange(event: Event, item: CartItem) {
    const input = event.target as HTMLInputElement;
    const newQuantity = parseInt(input.value);
    if (newQuantity > 0 && item.product.id) {
      this.cartService.updateQuantity(item.product.id, this.storeUrl, newQuantity);
    } else {
      input.value = item.quantity.toString();
    }
  }

  removeItem(item: CartItem) {
    if (item.product.id) {
      this.cartService.removeFromCart(item.product.id, this.storeUrl);
      this.toastService.success(`${item.product.name} retiré du panier`);
    }
  }

  startCheckout() {
    this.showOrderForm = true;
  }

  submitOrder(customerInfo: CustomerInfo) {
    if (this.storeUrl && this.storeName) {
      this.orderService.createOrder(
        this.storeUrl,
        this.storeName,
        customerInfo
      ).subscribe({
        next: (orderId) => {
          this.toastService.success('Commande enregistrée avec succès !');
          this.showOrderForm = false;
          this.isOpen = false;
        },
        error: (error) => {
          console.error('Erreur lors de la création de la commande:', error);
          this.toastService.error('Erreur lors de la création de la commande');
        }
      });
    }
  }
} 