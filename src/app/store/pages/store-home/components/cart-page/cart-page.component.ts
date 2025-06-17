import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService, CartItem } from '../../../../../core/services/cart.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { OrderService } from '../../../../../core/services/order.service';
import { CheckoutFormComponent } from '../checkout-form/checkout-form.component';
import { CustomerInfo } from '../../../../../core/models/order.model';

@Component({
  selector: 'app-cart-page',
  templateUrl: './cart-page.component.html',
  styleUrls: ['./cart-page.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    CheckoutFormComponent,
    CurrencyPipe
  ]
})
export class CartPageComponent implements OnInit {
  storeUrl: string = '';
  storeName: string = '';
  cartItems: CartItem[] = [];
  cartTotal: number = 0;
  showCheckoutForm = false;
  submitting = false;
  readonly defaultProductImage = 'assets/default-product.svg';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cartService: CartService,
    private orderService: OrderService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.route.parent?.params.subscribe(params => {
      this.storeUrl = params['storeUrl'];
      this.loadCart();
    });
  }

  private loadCart() {
    if (!this.storeUrl) {
      console.error('URL de boutique manquante');
      return;
    }
    
    this.cartItems = this.cartService.getCartItemsByStore(this.storeUrl);
    
    if (this.cartItems.length > 0) {
      this.storeName = this.cartItems[0].storeName;
    }
    
    this.cartTotal = this.cartService.getCartTotal(this.storeUrl);
  }

  updateQuantity(item: CartItem, change: number) {
    const newQuantity = item.quantity + change;
    if (newQuantity > 0 && item.product.id) {
      this.cartService.updateQuantity(item.product.id, this.storeUrl, newQuantity);
      this.toastService.success('Quantité mise à jour');
      this.loadCart();
    }
  }

  removeItem(item: CartItem) {
    if (item.product.id) {
      this.cartService.removeFromCart(item.product.id, this.storeUrl);
      this.toastService.success('Article retiré du panier');
      this.loadCart();
    }
  }

  startCheckout() {
    if (this.cartItems.length === 0) {
      this.toastService.error('Votre panier est vide');
      return;
    }
    this.showCheckoutForm = true;
  }

  onCheckoutConfirmed(customerInfo: CustomerInfo) {
    if (this.submitting) return;
    this.submitting = true;

    this.orderService.createOrder(
      this.storeUrl,
      this.storeName,
      customerInfo
    ).subscribe({
      next: () => {
        this.submitting = false;
        this.showCheckoutForm = false;
        this.toastService.success('Commande enregistrée avec succès !');
        this.cartService.clearCart();
        this.loadCart();
        this.router.navigate(['..'], { relativeTo: this.route });
      },
      error: (error) => {
        console.error('Erreur lors de la création de la commande:', error);
        this.submitting = false;
        this.toastService.error('Erreur lors de la création de la commande');
      }
    });
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      img.src = this.defaultProductImage;
    }
  }
} 