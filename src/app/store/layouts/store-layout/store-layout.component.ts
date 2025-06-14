import { Component, OnInit, Renderer2, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Store } from '../../../core/models/store.model';
import { StoreService } from '../../../core/services/store.service';
import { CartService } from '../../../core/services/cart.service';
import { StoreNavbarComponent } from '../../components/store-navbar/store-navbar.component';
import { StoreFooterComponent } from '../../components/store-footer/store-footer.component';

@Component({
  selector: 'app-store-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    StoreNavbarComponent,
    StoreFooterComponent
  ],
  template: `
    <div class="store-layout">
      <app-store-navbar 
        [store]="store$ | async" 
        [storeUrl]="storeUrl" 
        [storeStyle]="storeStyle">
      </app-store-navbar>

      <main class="store-main">
        <router-outlet></router-outlet>
      </main>

      <app-store-footer 
        [store]="store$ | async" 
        [storeUrl]="storeUrl" 
        [storeStyle]="storeStyle">
      </app-store-footer>
    </div>
  `,
  styles: [`
    .store-layout {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .store-main {
      flex: 1;
      margin-top: var(--nav-height);
      padding: 1rem 0;
      background: var(--store-bg-light, #f8f9fa);
    }
  `]
})
export class StoreLayoutComponent implements OnInit {
  store$!: Observable<Store | null>;
  storeUrl: string = '';
  storeStyle: { [key: string]: string } = {};
  cartItemsCount = 0;
  isMobile = false;
  isMenuOpen = false;

  constructor(
    private route: ActivatedRoute,
    private storeService: StoreService,
    private cartService: CartService,
    private renderer: Renderer2,
    private el: ElementRef
  ) {
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.storeUrl = params['storeUrl'];
      this.updateCartCount();
      this.loadStore();
    });

    // Surveiller les changements du panier
    this.cartService.cartItems$.subscribe(items => {
      this.cartItemsCount = items.reduce((total, item) => total + item.quantity, 0);
    });

    // Récupérer l'URL de la boutique depuis l'URL actuelle
    const urlParts = window.location.pathname.split('/');
    const boutiqueIndex = urlParts.indexOf('boutique');
    if (boutiqueIndex !== -1 && urlParts[boutiqueIndex + 1]) {
      this.storeUrl = urlParts[boutiqueIndex + 1];
      this.loadStoreSettings();
    }
  }

  private loadStore() {
    if (this.storeUrl) {
      this.store$ = this.storeService.getStoreByUrl(this.storeUrl).pipe(
        tap(store => {
          if (store) {
            this.applyStoreTheme(store);
          }
        })
      );
    }
  }

  private applyStoreTheme(store: Store) {
    // Applique les styles au niveau de l'élément hôte du composant
    const styles = {
      '--store-primary-color': store.primaryColor || '#1a1a1a',
      '--store-accent-color': store.secondaryColor || '#ff4081',
      '--store-bg-color': '#ffffff',
      '--store-bg-light': this.adjustColor('#ffffff', 0.98),
      '--store-text-color': '#333333'
    };

    // Applique chaque style à l'élément hôte
    Object.entries(styles).forEach(([property, value]) => {
      this.el.nativeElement.style.setProperty(property, value);
    });

    // Applique également au document pour assurer la cohérence globale
    const root = document.documentElement;
    Object.entries(styles).forEach(([property, value]) => {
      this.renderer.setStyle(root, property, value);
    });
  }

  private adjustColor(color: string, factor: number): string {
    // Convertit la couleur hex en RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    // Ajuste la luminosité
    const adjustedR = Math.min(255, Math.round(r * factor));
    const adjustedG = Math.min(255, Math.round(g * factor));
    const adjustedB = Math.min(255, Math.round(b * factor));

    // Convertit en hex
    return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
  }

  private updateCartCount() {
    this.cartItemsCount = this.cartService.getCartItemsCount(this.storeUrl);
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth < 768;
    if (!this.isMobile) {
      this.isMenuOpen = false;
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  ngOnDestroy() {
    window.removeEventListener('resize', () => this.checkScreenSize());
  }

  private loadStoreSettings() {
    this.storeService.getStoreByUrl(this.storeUrl).subscribe({
      next: (store) => {
        if (store) {
          this.updateStoreColors(store);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des paramètres de la boutique:', error);
      }
    });
  }

  private updateStoreColors(store: Store) {
    // Définir les variables CSS pour les couleurs de la boutique
    document.documentElement.style.setProperty('--store-primary-color', store.primaryColor || '#3498db');
    document.documentElement.style.setProperty('--store-secondary-color', store.secondaryColor || '#2ecc71');
    document.documentElement.style.setProperty('--store-primary-rgb', this.hexToRgb(store.primaryColor || '#3498db'));
    document.documentElement.style.setProperty('--store-secondary-rgb', this.hexToRgb(store.secondaryColor || '#2ecc71'));
    document.documentElement.style.setProperty('--store-bg-color', '#ffffff');
    document.documentElement.style.setProperty('--store-bg-light', '#f8f9fa');
    document.documentElement.style.setProperty('--store-text-color', '#1a1a1a');
  }

  private hexToRgb(hex: string): string {
    // Enlever le # si présent
    hex = hex.replace('#', '');
    
    // Convertir en RGB
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    return `${r}, ${g}, ${b}`;
  }
} 