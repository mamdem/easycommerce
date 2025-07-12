import { Component, OnInit, Input, HostListener, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Store } from '../../../core/models/store.model';
import { CartService } from '../../../core/services/cart.service';
import { CustomerAuthService, Customer, LoginData, RegisterData } from '../../../core/services/customer-auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-store-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
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
    ]),
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('liftUpDown', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('200ms cubic-bezier(0.4, 0.0, 0.2, 1)', 
          style({ opacity: 0, transform: 'translateY(20px)' }))
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
               [routerLink]="['/boutique', storeUrl, 'contact']" 
               [class.active]="isContactActive"
               role="menuitem">
              <i class="bi bi-geo-alt" aria-hidden="true"></i>
              <span>Contact</span>
            </a>
          </div>
          
          <div class="nav-actions">
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
            
            <button class="login-btn" 
                    *ngIf="!isLoggedIn"
                    (click)="openLoginDrawer()"
                    [attr.aria-label]="'Se connecter'">
              <i class="bi bi-person" aria-hidden="true"></i>
              <span class="login-text">Se connecter</span>
            </button>
            
            <div class="user-menu" *ngIf="isLoggedIn && currentUser">
              <button class="user-btn" (click)="onLogout()">
                <i class="bi bi-person-fill" aria-hidden="true"></i>
                <span>{{ currentUser.firstName }} {{ currentUser.lastName }}</span>
              </button>
            </div>
          </div>
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
          
          <button *ngIf="!isLoggedIn"
                  (click)="openLoginDrawer(); closeMenu()"
                  class="login-link"
                  role="menuitem">
            <i class="bi bi-person" aria-hidden="true"></i>
            <span>Se connecter</span>
          </button>
          
          <button *ngIf="isLoggedIn && currentUser"
                  (click)="onLogout(); closeMenu()"
                  class="user-link"
                  role="menuitem">
            <i class="bi bi-person-fill" aria-hidden="true"></i>
            <span>{{ currentUser.firstName }} {{ currentUser.lastName }}</span>
          </button>
        </nav>
      </div>
    </div>

    <!-- Drawer de connexion -->
    <div class="login-drawer-overlay" 
         [class.open]="isLoginDrawerOpen"
         (click)="closeLoginDrawer()">
    </div>
    
    <div class="login-drawer" 
         [class.open]="isLoginDrawerOpen"
         role="dialog" 
         aria-modal="true"
         aria-labelledby="login-title">
      
      <div class="drawer-header">
        <h2 id="login-title">
          <i class="bi bi-person-circle"></i>
          Connexion
        </h2>
        <button class="close-btn" 
                (click)="closeLoginDrawer()"
                aria-label="Fermer">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>
      
      <div class="drawer-content">
        <div class="auth-tabs">
          <button class="tab-btn" 
                  [class.active]="activeAuthTab === 'login'"
                  (click)="switchAuthTab('login')">
            Se connecter
          </button>
          <button class="tab-btn" 
                  [class.active]="activeAuthTab === 'register'"
                  (click)="switchAuthTab('register')">
            S'inscrire
          </button>
        </div>
        
        <!-- Formulaire de connexion -->
        <form class="auth-form" 
              *ngIf="activeAuthTab === 'login'"
              (ngSubmit)="onSubmitLogin($event)">
          <div class="form-group">
            <label for="login-phone">Téléphone</label>
            <div class="input-wrapper">
              <i class="bi bi-telephone"></i>
              <input type="tel" 
                     id="login-phone" 
                     name="phone"
                     placeholder="70 123 45 67"
                     [(ngModel)]="loginData.phone"
                     required>
            </div>
          </div>
          
          <div class="form-group">
            <label for="login-password">Code PIN</label>
            <div class="input-wrapper">
              <i class="bi bi-lock"></i>
              <input type="password" 
                     id="login-password" 
                     name="password"
                     placeholder="••••"
                     [(ngModel)]="loginData.password"
                     maxlength="4"
                     pattern="[0-9]{4}"
                     title="Saisissez un code PIN de 4 chiffres"
                     (keypress)="onPinKeyPress($event)"
                     (input)="onPinInput($event, 'login')"
                     required>
            </div>
          </div>
          
          <div class="form-options">
            <label class="checkbox-wrapper">
              <input type="checkbox" 
                     id="remember" 
                     name="remember"
                     [(ngModel)]="loginData.remember">
              <span class="checkmark"></span>
              Se souvenir de moi
            </label>
            <button type="button" 
                    class="forgot-password"
                    (click)="onForgotPassword()"
                    [disabled]="!loginData.phone || isForgotPasswordLoading">
              {{ isForgotPasswordLoading ? 'Envoi...' : 'Code PIN oublié ?' }}
            </button>
          </div>
          
          <button type="submit" 
                  class="submit-btn"
                  [disabled]="isLoginLoading">
            <i class="bi bi-box-arrow-in-right" *ngIf="!isLoginLoading" aria-hidden="true"></i>
            <i class="bi bi-arrow-clockwise rotating" *ngIf="isLoginLoading" aria-hidden="true"></i>
            {{ isLoginLoading ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>

        <!-- Formulaire d'inscription -->
        <form class="auth-form" 
              *ngIf="activeAuthTab === 'register'"
              (ngSubmit)="onSubmitRegister($event)">
          <div class="form-group">
            <label for="register-firstname">Prénom</label>
            <div class="input-wrapper">
              <i class="bi bi-person"></i>
              <input type="text" 
                     id="register-firstname" 
                     name="firstname"
                     placeholder="Votre prénom"
                     [(ngModel)]="registerData.firstName"
                     required>
            </div>
          </div>
          
          <div class="form-group">
            <label for="register-lastname">Nom</label>
            <div class="input-wrapper">
              <i class="bi bi-person-fill"></i>
              <input type="text" 
                     id="register-lastname" 
                     name="lastname"
                     placeholder="Votre nom"
                     [(ngModel)]="registerData.lastName"
                     required>
            </div>
          </div>
          
          <div class="form-group">
            <label for="register-phone">Téléphone</label>
            <div class="input-wrapper">
              <i class="bi bi-telephone"></i>
              <input type="tel" 
                     id="register-phone" 
                     name="phone"
                     placeholder="70 123 45 67"
                     [(ngModel)]="registerData.phone"
                     required>
            </div>
          </div>
          
          <div class="form-group">
            <label for="register-password">Code PIN</label>
            <div class="input-wrapper">
              <i class="bi bi-lock"></i>
              <input type="password" 
                     id="register-password" 
                     name="password"
                     placeholder="••••"
                     [(ngModel)]="registerData.password"
                     maxlength="4"
                     pattern="[0-9]{4}"
                     title="Saisissez un code PIN de 4 chiffres"
                     (keypress)="onPinKeyPress($event)"
                     (input)="onPinInput($event, 'register')"
                     required>
            </div>
          </div>
          
          <div class="form-group">
            <label for="register-confirm-password">Confirmer le code PIN</label>
            <div class="input-wrapper">
              <i class="bi bi-lock-fill"></i>
              <input type="password" 
                     id="register-confirm-password" 
                     name="confirmPassword"
                     placeholder="••••"
                     [(ngModel)]="registerData.confirmPassword"
                     maxlength="4"
                     pattern="[0-9]{4}"
                     title="Confirmez votre code PIN de 4 chiffres"
                     (keypress)="onPinKeyPress($event)"
                     (input)="onPinInput($event, 'register')"
                     required>
            </div>
          </div>
          
          <div class="form-options">
            <label class="checkbox-wrapper">
              <input type="checkbox" 
                     id="terms" 
                     name="terms" 
                     [(ngModel)]="registerData.terms"
                     required>
              <span class="checkmark"></span>
              J'accepte les <a href="#" class="terms-link">conditions d'utilisation</a>
            </label>
          </div>
          
          <button type="submit" 
                  class="submit-btn"
                  [disabled]="isRegisterLoading">
            <i class="bi bi-person-plus" *ngIf="!isRegisterLoading" aria-hidden="true"></i>
            <i class="bi bi-arrow-clockwise rotating" *ngIf="isRegisterLoading" aria-hidden="true"></i>
            {{ isRegisterLoading ? 'Création...' : 'Créer mon compte' }}
          </button>
        </form>
        
        <!-- Pied de page élégant -->
        <div class="auth-footer">
          <div class="divider">
            <span>{{ activeAuthTab === 'login' ? 'Nouveau client ?' : 'Déjà inscrit ?' }}</span>
          </div>
          
          <div class="auth-switch">
            <p *ngIf="activeAuthTab === 'login'">
              Créez votre compte pour profiter de tous nos services
            </p>
            <p *ngIf="activeAuthTab === 'register'">
              Connectez-vous avec vos identifiants existants
            </p>
            
            <button class="switch-btn" 
                    (click)="switchAuthTab(activeAuthTab === 'login' ? 'register' : 'login')">
              <i class="bi" 
                 [class.bi-person-plus]="activeAuthTab === 'login'"
                 [class.bi-box-arrow-in-right]="activeAuthTab === 'register'"></i>
              {{ activeAuthTab === 'login' ? 'Créer un compte' : 'Se connecter' }}
            </button>
          </div>
        </div>
        
      </div>
    </div>

    <!-- Modal de confirmation de déconnexion -->
    <div class="modal-overlay" *ngIf="showLogoutConfirm" [@fadeInOut]>
      <div class="modal-dialog" [@liftUpDown]>
        <div class="modal-content">
          <h3>Confirmation de déconnexion</h3>
          <p>Êtes-vous sûr de vouloir vous déconnecter ?</p>
          <div class="modal-actions">
            <button class="btn btn-light" (click)="showLogoutConfirm = false">
              Annuler
            </button>
            <button class="btn btn-warning" (click)="confirmLogout()">
              Déconnexion
            </button>
          </div>
        </div>
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
  isLoginDrawerOpen = false;
  isLoggedIn = false;
  currentUser: Customer | null = null;
  activeAuthTab: 'login' | 'register' = 'login';
  showLogoutConfirm = false;
  private lastScrollTop = 0;
  private previousCartCount = 0;
  private destroy$ = new Subject<void>();

  // Données des formulaires
  loginData: LoginData = {
    phone: '',
    password: '',
    remember: false
  };

  registerData: RegisterData = {
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    terms: false
  };

  // États de chargement
  isLoginLoading = false;
  isRegisterLoading = false;
  isForgotPasswordLoading = false;

  constructor(
    private cartService: CartService,
    private router: Router,
    private customerAuthService: CustomerAuthService,
    private toastService: ToastService,
    private ngZone: NgZone
  ) {
    window.addEventListener('resize', () => this.checkScreenSize());
    window.addEventListener('scroll', () => this.handleScroll());

    // Surveiller les changements de route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.updateActiveStates();
    });
  }

  ngOnInit() {
    this.cartService.cartItems$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.previousCartCount = this.cartItemsCount;
      this.cartItemsCount = this.cartService.getCartItemsCount(this.storeUrl);
      
      if (this.cartItemsCount > this.previousCartCount) {
        this.triggerCartAnimation();
      }
    });

    // Surveiller l'état d'authentification
    this.customerAuthService.isLoggedIn$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(isLoggedIn => {
      this.isLoggedIn = isLoggedIn;
    });

    this.customerAuthService.currentCustomer$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(customer => {
      this.currentUser = customer;
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
    this.destroy$.next();
    this.destroy$.complete();
    
    window.removeEventListener('resize', () => this.checkScreenSize());
    window.removeEventListener('scroll', () => this.handleScroll());
  }

  openLoginDrawer(): void {
    this.isLoginDrawerOpen = true;
    this.activeAuthTab = 'login';
    this.resetForms();
    document.body.style.overflow = 'hidden';
  }

  closeLoginDrawer(): void {
    this.isLoginDrawerOpen = false;
    this.activeAuthTab = 'login';
    this.resetForms();
    document.body.style.overflow = 'auto';
  }

  switchAuthTab(tab: 'login' | 'register'): void {
    this.activeAuthTab = tab;
    this.resetForms();
  }

  private resetForms(): void {
    this.loginData = {
      phone: '',
      password: '',
      remember: false
    };

    this.registerData = {
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      terms: false
    };

    this.isLoginLoading = false;
    this.isRegisterLoading = false;
    this.isForgotPasswordLoading = false;
  }

  async onSubmitLogin(event: Event): Promise<void> {
    event.preventDefault();
    
    if (this.isLoginLoading) return;

    // Validation côté client
    if (!this.loginData.phone || !this.loginData.password) {
      return;
    }

    // Validation du format PIN
    if (!/^\d{4}$/.test(this.loginData.password)) {
      this.toastService.error('Le code PIN doit contenir exactement 4 chiffres');
      return;
    }

    this.isLoginLoading = true;

    try {
      const result = await this.customerAuthService.login(this.loginData);
      
      if (result.success) {
        this.closeLoginDrawer();
      }
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
    } finally {
      this.isLoginLoading = false;
    }
  }

  async onSubmitRegister(event: Event): Promise<void> {
    event.preventDefault();
    
    console.log('onSubmitRegister appelé');
    console.log('registerData:', this.registerData);
    
    if (this.isRegisterLoading) return;

    // Validation côté client
    if (!this.registerData.password || 
        !this.registerData.firstName || !this.registerData.lastName || 
        !this.registerData.phone) {
      console.log('Validation échouée - données manquantes');
      return;
    }

    // Validation du format PIN
    if (!/^\d{4}$/.test(this.registerData.password)) {
      this.toastService.error('Le code PIN doit contenir exactement 4 chiffres');
      return;
    }

    if (!/^\d{4}$/.test(this.registerData.confirmPassword)) {
      this.toastService.error('La confirmation du code PIN doit contenir exactement 4 chiffres');
      return;
    }

    if (this.registerData.password !== this.registerData.confirmPassword) {
      this.toastService.error('Les codes PIN ne correspondent pas');
      return;
    }

    if (!this.registerData.terms) {
      console.log('Validation échouée - conditions non acceptées');
      return;
    }

    console.log('Validation réussie, démarrage inscription');
    this.isRegisterLoading = true;

    try {
      const result = await this.customerAuthService.register(this.registerData);
      console.log('Résultat inscription:', result);
      
      if (result.success) {
        // Fermer le drawer et rouvrir avec l'onglet connexion pré-rempli
        this.closeLoginDrawer();
        setTimeout(() => {
          this.openLoginDrawer();
          this.switchAuthTab('login');
          this.loginData.phone = this.registerData.phone;
        }, 500);
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
    } finally {
      this.isRegisterLoading = false;
    }
  }

  async onLogout(): Promise<void> {
    console.log('Ouverture du dialogue de déconnexion');
    this.showLogoutConfirm = true;
  }

  async confirmLogout(): Promise<void> {
    console.log('Confirmation de la déconnexion');
    try {
      await this.customerAuthService.logout();
      this.toastService.success('Vous avez été déconnecté avec succès');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      this.toastService.error('Une erreur est survenue lors de la déconnexion');
    } finally {
      this.showLogoutConfirm = false;
    }
  }

  async onForgotPassword(): Promise<void> {
    if (!this.loginData.phone) {
      return;
    }

    this.isForgotPasswordLoading = true;

    try {
      const result = await this.customerAuthService.resetPassword(this.loginData.phone);
      // Le message sera affiché via le ToastService dans le service
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
    } finally {
      this.isForgotPasswordLoading = false;
    }
  }

  onPinKeyPress(event: KeyboardEvent) {
    // Permettre les touches de contrôle
    const allowedKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End', 'ArrowLeft', 'ArrowRight'];
    
    if (allowedKeys.includes(event.key)) {
      return;
    }
    
    // Permettre Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if (event.ctrlKey && ['a', 'c', 'v', 'x'].includes(event.key.toLowerCase())) {
      return;
    }
    
    // Bloquer tout ce qui n'est pas un chiffre
    if (event.key < '0' || event.key > '9') {
      event.preventDefault();
    }
  }

  onPinInput(event: Event, tab: 'login' | 'register') {
    const input = event.target as HTMLInputElement;
    let value = input.value;
    
    // Supprimer tout caractère non-numérique
    value = value.replace(/[^0-9]/g, '');
    
    // Limiter à 4 caractères
    if (value.length > 4) {
      value = value.slice(0, 4);
    }
    
    // Mettre à jour la valeur
    input.value = value;
    
    // Mettre à jour le model
    if (tab === 'login') {
      this.loginData.password = value;
    } else if (tab === 'register') {
      const fieldName = input.name as 'password' | 'confirmPassword';
      this.registerData[fieldName] = value;
    }
  }
} 