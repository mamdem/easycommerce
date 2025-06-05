import { Component, OnInit, Renderer2, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { Store } from '../../../core/models/store.model';
import { StoreService } from '../../../core/services/store.service';
import { CartService } from '../../../core/services/cart.service';

@Component({
  selector: 'app-store-layout',
  templateUrl: './store-layout.component.html',
  styleUrls: ['./store-layout.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule]
})
export class StoreLayoutComponent implements OnInit {
  store$!: Observable<Store | null>;
  storeUrl: string = '';
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
} 