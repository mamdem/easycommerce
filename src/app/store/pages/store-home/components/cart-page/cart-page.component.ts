import { Component, OnInit } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { CartService, CartItem } from '../../../../../core/services/cart.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { OrderService, CustomerInfo } from '../../../../../core/services/order.service';
import { CheckoutFormComponent } from '../checkout-form/checkout-form.component';
import { StoreService } from '../../../../../core/services/store.service';

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
    private toastService: ToastService,
    private storeService: StoreService
  ) {
    console.log('CartPageComponent - Constructeur initialisé');
  }

  ngOnInit() {
    console.log('CartPageComponent - ngOnInit');
    
    // Vérifier d'abord les paramètres de la route actuelle
    const currentParams = this.route.snapshot.params;
    console.log('CartPageComponent - Paramètres de la route actuelle:', currentParams);
    
    // Vérifier les paramètres de la route parente
    const parentParams = this.route.parent?.snapshot.params;
    console.log('CartPageComponent - Paramètres de la route parente:', parentParams);
    
    // S'abonner aux changements de paramètres
    this.route.parent?.params.subscribe(params => {
      console.log('CartPageComponent - Nouveaux paramètres de la route parente:', params);
      this.storeUrl = params['storeUrl'];
      console.log('CartPageComponent - storeUrl défini:', this.storeUrl);
      this.loadStoreSettings();
      this.loadCart();
    });

    // Vérifier aussi la route complète
    console.log('CartPageComponent - URL complète:', this.router.url);
  }

  private loadStoreSettings() {
    this.storeService.getStoreByUrl(this.storeUrl).subscribe(
      store => {
        if (store) {
          // Appliquer les couleurs de la boutique
          document.documentElement.style.setProperty('--store-primary-color', store.primaryColor || '#3498db');
          document.documentElement.style.setProperty('--store-secondary-color', store.secondaryColor || '#2ecc71');
          
          // Créer des variantes de couleurs
          const primaryLight = this.adjustBrightness(store.primaryColor || '#3498db', 20);
          const primaryDark = this.adjustBrightness(store.primaryColor || '#3498db', -20);
          
          document.documentElement.style.setProperty('--store-primary-light', primaryLight);
          document.documentElement.style.setProperty('--store-primary-dark', primaryDark);
        }
      },
      error => {
        console.error('Erreur lors du chargement des paramètres de la boutique:', error);
      }
    );
  }

  private adjustBrightness(hex: string, percent: number): string {
    // Convertir hex en RGB
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);

    // Ajuster la luminosité
    r = Math.min(255, Math.max(0, r + (r * percent / 100)));
    g = Math.min(255, Math.max(0, g + (g * percent / 100)));
    b = Math.min(255, Math.max(0, b + (b * percent / 100)));

    // Convertir en hex
    const rHex = Math.round(r).toString(16).padStart(2, '0');
    const gHex = Math.round(g).toString(16).padStart(2, '0');
    const bHex = Math.round(b).toString(16).padStart(2, '0');

    return `#${rHex}${gHex}${bHex}`;
  }

  private loadCart() {
    console.log('CartPageComponent - loadCart - Début du chargement');
    console.log('CartPageComponent - loadCart - storeUrl:', this.storeUrl);
    
    if (!this.storeUrl) {
      console.error('CartPageComponent - loadCart - Pas d\'URL de boutique');
      return;
    }
    
    // Récupérer les articles du panier
    this.cartItems = this.cartService.getCartItemsByStore(this.storeUrl);
    console.log('CartPageComponent - loadCart - Articles récupérés:', this.cartItems);
    
    if (this.cartItems.length > 0) {
      this.storeName = this.cartItems[0].storeName;
      console.log('CartPageComponent - loadCart - Nom de la boutique défini:', this.storeName);
    } else {
      console.log('CartPageComponent - loadCart - Panier vide');
    }
    
    this.cartTotal = this.cartService.getCartTotal(this.storeUrl);
    console.log('CartPageComponent - loadCart - Total du panier:', this.cartTotal);
  }

  updateQuantity(item: CartItem, change: number) {
    console.log('CartPageComponent - updateQuantity - Début de la mise à jour', { item, change });
    const newQuantity = item.quantity + change;
    if (newQuantity > 0 && item.product.id) {
      this.cartService.updateQuantity(item.product.id, this.storeUrl, newQuantity);
      this.toastService.success('Quantité mise à jour');
      this.loadCart();
    }
  }

  removeItem(item: CartItem) {
    console.log('CartPageComponent - removeItem - Début de la suppression', item);
    if (item.product.id) {
      this.cartService.removeFromCart(item.product.id, this.storeUrl);
      this.toastService.success('Article retiré du panier');
      this.loadCart();
    }
  }

  startCheckout() {
    console.log('CartPageComponent - startCheckout - Début du checkout');
    if (this.cartItems.length === 0) {
      this.toastService.error('Votre panier est vide');
      return;
    }
    this.showCheckoutForm = true;
  }

  onCheckoutConfirmed(customerInfo: CustomerInfo) {
    console.log('CartPageComponent - onCheckoutConfirmed - Début de la confirmation', customerInfo);
    this.submitting = true;
    
    this.orderService.createOrder(
      this.storeUrl,
      this.storeName,
      customerInfo
    ).subscribe({
      next: () => {
        console.log('CartPageComponent - onCheckoutConfirmed - Commande créée avec succès');
        this.submitting = false;
        this.showCheckoutForm = false;
        this.toastService.success('Commande enregistrée avec succès !');
        this.cartService.clearCart();
        this.loadCart();
      },
      error: (error) => {
        console.error('CartPageComponent - onCheckoutConfirmed - Erreur:', error);
        this.submitting = false;
        this.toastService.error('Erreur lors de la création de la commande');
      },
      complete: () => {
        this.submitting = false;
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