import { Component, OnInit, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '../../../core/models/store.model';
import { CartService } from '../../../core/services/cart.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-store-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  animations: [
    trigger('cartBadge', [
      state('void', style({
        transform: 'scale(0)',
        opacity: 0
      })),
      state('*', style({
        transform: 'scale(1)',
        opacity: 1
      })),
      transition('void => *', [
        animate('150ms cubic-bezier(0.4, 0, 0.2, 1)')
      ]),
      transition('* => void', [
        animate('150ms cubic-bezier(0.4, 0, 0.2, 1)')
      ])
    ]),
    trigger('cartPulse', [
      state('pulse', style({
        transform: 'scale(1)'
      })),
      transition('* => pulse', [
        style({ transform: 'scale(1)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'scale(1.2)' })),
        animate('150ms cubic-bezier(0.4, 0, 0.2, 1)', style({ transform: 'scale(1)' }))
      ])
    ])
  ],
  template: `
    <nav class="store-nav" [style]="storeStyle" [class.nav-hidden]="isNavHidden">
      <div class="nav-container">
        <div class="nav-brand">
          <button class="menu-toggle" 
                  (click)="toggleMenu()" 
                  *ngIf="isMobile"
                  [attr.aria-label]="'Toggle menu'"
                  [attr.aria-expanded]="isMenuOpen">
            <i class="bi bi-list" aria-hidden="true"></i>
          </button>
          <a class="brand-link" [routerLink]="['/boutique', storeUrl]" [attr.aria-label]="'Retour à la boutique'">
            <div class="brand-logo">
              <img [src]="store?.logoUrl || 'assets/default-store-logo.png'" 
                   [alt]="store?.legalName + ' logo'"
                   loading="eager">
            </div>
            <span class="brand-name">{{ store?.legalName }}</span>
          </a>
        </div>

        <div class="nav-menu" *ngIf="!isMobile" role="navigation">
          <div class="nav-links" role="menubar">
            <a class="nav-link" 
               [routerLink]="['/boutique', storeUrl]"
               [class.active]="isHomeActive"
               role="menuitem">
              <i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i>
              <span>Produits</span>
            </a>
            <a class="nav-link" 
               [routerLink]="['/boutique', storeUrl]"
               [fragment]="'categories'"
               [class.active]="currentFragment === 'categories'"
               role="menuitem">
              <i class="bi bi-collection" aria-hidden="true"></i>
              <span>Catégories</span>
            </a>
            <a class="nav-link" 
               [routerLink]="['/boutique', storeUrl, 'contact']" 
               [class.active]="isContactActive"
               role="menuitem">
              <i class="bi bi-geo-alt" aria-hidden="true"></i>
              <span>Contact</span>
            </a>
          </div>
          <a class="cart-btn" 
             [routerLink]="['/boutique', storeUrl, 'cart']" 
             [class.active]="isCartActive"
             [@cartPulse]="cartPulseState"
             [attr.aria-label]="'Voir le panier - ' + cartItemsCount + ' articles'">
            <i class="bi bi-cart3" aria-hidden="true">
              <div class="cart-badge" 
                   *ngIf="cartItemsCount > 0"
                   [@cartBadge]
                   [attr.aria-label]="cartItemsCount + ' articles'">
                {{ cartItemsCount }}
              </div>
            </i>
            <span class="cart-text">Panier</span>
          </a>
        </div>
      </div>
    </nav>

    <!-- Menu mobile -->
    <div class="mobile-menu" 
         [class.open]="isMenuOpen && isMobile" 
         role="dialog" 
         [attr.aria-modal]="true"
         [attr.aria-hidden]="!isMenuOpen">
      <div class="menu-overlay" (click)="closeMenu()" aria-hidden="true"></div>
      <div class="menu-content" role="document">
        <div class="menu-header">
          <div class="brand-info">
            <div class="brand-logo">
              <img [src]="store?.logoUrl || 'assets/default-store-logo.png'" 
                   [alt]="store?.legalName + ' logo'"
                   loading="eager">
            </div>
            <h3>{{ store?.legalName }}</h3>
          </div>
          <button class="close-btn" 
                  (click)="closeMenu()"
                  [attr.aria-label]="'Fermer le menu'">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </div>

        <nav class="menu-links" role="navigation">
          <a [routerLink]="['/boutique', storeUrl]"
             [class.active]="isHomeActive"
             (click)="closeMenu()"
             role="menuitem">
            <i class="bi bi-grid-3x3-gap-fill" aria-hidden="true"></i>
            <span>Produits</span>
          </a>
          <a [routerLink]="['/boutique', storeUrl]"
             [fragment]="'categories'"
             [class.active]="currentFragment === 'categories'"
             (click)="closeMenu()"
             role="menuitem">
            <i class="bi bi-collection" aria-hidden="true"></i>
            <span>Catégories</span>
          </a>
          <a [routerLink]="['/boutique', storeUrl, 'contact']"
             [class.active]="isContactActive"
             (click)="closeMenu()"
             role="menuitem">
            <i class="bi bi-geo-alt" aria-hidden="true"></i>
            <span>Contact</span>
          </a>
          <a [routerLink]="['/boutique', storeUrl, 'cart']"
             [class.active]="isCartActive"
             (click)="closeMenu()"
             role="menuitem"
             class="cart-link">
            <i class="bi bi-cart3" aria-hidden="true">
              <div class="cart-badge" 
                   *ngIf="cartItemsCount > 0"
                   [@cartBadge]>
                {{ cartItemsCount }}
              </div>
            </i>
            <span>Panier</span>
          </a>
        </nav>
      </div>
    </div>
  `,
  styleUrls: ['./store-navbar.component.scss']
})
export class StoreNavbarComponent implements OnInit {
  @Input() store: Store | null = null;
  @Input() storeUrl: string = '';
  @Input() storeStyle: any;

  isNavHidden = false;
  isMenuOpen = false;
  isMobile = window.innerWidth < 768;
  cartItemsCount = 0;
  cartPulseState: string = '';
  currentFragment: string | null = null;
  isHomeActive = false;
  isContactActive = false;
  isCartActive = false;
  private lastScrollTop = 0;
  private previousCartCount = 0;

  constructor(
    private cartService: CartService,
    private router: Router
  ) {
    window.addEventListener('resize', () => this.checkScreenSize());
    window.addEventListener('scroll', () => this.handleScroll());

    // Surveiller les changements de route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveStates();
    });
  }

  ngOnInit() {
    this.cartService.cartItems$.subscribe(() => {
      this.previousCartCount = this.cartItemsCount;
      this.cartItemsCount = this.cartService.getCartItemsCount(this.storeUrl);
      
      if (this.cartItemsCount > this.previousCartCount) {
        this.triggerCartAnimation();
      }
    });

    this.updateActiveStates();
  }

  private updateActiveStates() {
    const url = this.router.url;
    const urlParts = url.split('#');
    this.currentFragment = urlParts[1] || null;

    // Vérifier les différents états actifs
    this.isHomeActive = url.endsWith(`/boutique/${this.storeUrl}`) || url.includes(`/boutique/${this.storeUrl}#products`);
    this.isContactActive = url.includes(`/boutique/${this.storeUrl}/contact`);
    this.isCartActive = url.includes(`/boutique/${this.storeUrl}/cart`);
  }

  private triggerCartAnimation() {
    this.cartPulseState = 'pulse';
    setTimeout(() => {
      this.cartPulseState = '';
    }, 450);
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.isMenuOpen = false;
    }
  }

  private handleScroll() {
    const st = window.pageYOffset || document.documentElement.scrollTop;
    this.isNavHidden = st > this.lastScrollTop && st > 100;
    this.lastScrollTop = st <= 0 ? 0 : st;
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => this.checkScreenSize());
    window.removeEventListener('scroll', () => this.handleScroll());
  }
} 