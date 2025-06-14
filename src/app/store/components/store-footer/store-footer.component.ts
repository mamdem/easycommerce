import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Store } from '@app/core/models/store.model';

@Component({
  selector: 'app-store-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <footer class="store-footer" [ngStyle]="storeStyle">
      <div class="footer-content">
        <!-- Informations de la boutique -->
        <div class="store-info">
          <div class="store-brand">
            <img [src]="store?.logoUrl || 'assets/default-store-logo.png'" 
                 [alt]="store?.legalName + ' logo'" 
                 class="store-logo">
            <h3>{{ store?.legalName }}</h3>
          </div>
          <p class="store-description">{{ store?.storeDescription }}</p>
          <div class="contact-info">
            <div class="contact-item" *ngIf="store?.address">
              <i class="bi bi-geo-alt"></i>
              <span>{{ store?.address }}, {{ store?.city }}, {{ store?.country }}</span>
            </div>
            <div class="contact-item" *ngIf="store?.phoneNumber">
              <i class="bi bi-telephone"></i>
              <span>{{ store?.phoneNumber }}</span>
            </div>
            <div class="contact-item" *ngIf="store?.email">
              <i class="bi bi-envelope"></i>
              <span>{{ store?.email }}</span>
            </div>
          </div>
        </div>

        <!-- Liens rapides -->
        <div class="quick-links">
          <h4>Liens rapides</h4>
          <nav>
            <a [routerLink]="['/boutique', storeUrl]">
              <i class="bi bi-house"></i>
              Accueil
            </a>
            <a [routerLink]="['/boutique', storeUrl, 'contact']">
              <i class="bi bi-envelope"></i>
              Contact
            </a>
            <a [routerLink]="['/boutique', storeUrl, 'panier']">
              <i class="bi bi-cart3"></i>
              Panier
            </a>
            <a [routerLink]="['/boutique', storeUrl, 'conditions']">
              <i class="bi bi-file-text"></i>
              Conditions générales
            </a>
          </nav>
        </div>

        <!-- Horaires d'ouverture -->
        <div class="opening-hours" *ngIf="hasOpeningHours">
          <h4>Horaires d'ouverture</h4>
          <ul>
            <li *ngFor="let hours of store?.openingHours | keyvalue">
              <span class="day">{{ hours.key }}</span>
              <span class="hours">{{ hours.value }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Copyright et signature -->
      <div class="footer-bottom">
        <div class="copyright">
          <p>&copy; {{ currentYear }} {{ store?.legalName || 'La boutique' }}. Tous droits réservés.</p>
        </div>
        <div class="powered-by">
          <p>Propulsé par <a href="https://techbiz-solutions.com" target="_blank" rel="noopener">TechBiz Solutions</a></p>
        </div>
      </div>
    </footer>
  `,
  styleUrls: ['./store-footer.component.scss']
})
export class StoreFooterComponent {
  @Input() store: Store | null = null;
  @Input() storeUrl: string = '';
  @Input() storeStyle: { [key: string]: string } = {};

  get currentYear(): number {
    return new Date().getFullYear();
  }

  get hasOpeningHours(): boolean {
    return !!this.store?.openingHours && Object.keys(this.store.openingHours).length > 0;
  }
} 