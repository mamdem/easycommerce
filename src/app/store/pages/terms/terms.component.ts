import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreFooterComponent } from '../../components/store-footer/store-footer.component';
import { Store } from '@app/core/models/store.model';
import { StoreService } from '@app/core/services/store.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, StoreFooterComponent],
  template: `
    <div class="terms-page">
      <div class="terms-container">
        <h1>Conditions Générales de Vente</h1>
        
        <section>
          <h2>1. Introduction</h2>
          <p>
            Les présentes conditions générales de vente s'appliquent à l'ensemble des produits 
            et services proposés sur notre boutique en ligne.
          </p>
        </section>

        <section>
          <h2>2. Prix et Paiement</h2>
          <p>
            Les prix sont indiqués en euros et incluent la TVA. Le paiement s'effectue de 
            manière sécurisée via les moyens de paiement proposés sur notre plateforme.
          </p>
        </section>

        <section>
          <h2>3. Livraison</h2>
          <p>
            Les délais de livraison sont donnés à titre indicatif. Nous nous efforçons de 
            respecter les délais annoncés lors de votre commande.
          </p>
        </section>

        <section>
          <h2>4. Retours et Remboursements</h2>
          <p>
            Vous disposez d'un délai de 14 jours à compter de la réception de votre commande 
            pour exercer votre droit de rétractation.
          </p>
        </section>

        <section>
          <h2>5. Protection des Données</h2>
          <p>
            Nous nous engageons à protéger vos données personnelles conformément au RGPD et 
            à notre politique de confidentialité.
          </p>
        </section>

        <section>
          <h2>6. Service Client</h2>
          <p>
            Notre service client est à votre disposition pour répondre à vos questions et 
            vous accompagner dans vos achats.
          </p>
        </section>

        <section>
          <h2>7. Modification des CGV</h2>
          <p>
            Nous nous réservons le droit de modifier les présentes conditions générales de 
            vente à tout moment.
          </p>
        </section>
      </div>
    </div>

    <app-store-footer 
      [store]="store" 
      [storeUrl]="storeUrl"
      [storeStyle]="storeStyle">
    </app-store-footer>
  `,
  styles: [`
    .terms-page {
      padding: 2rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .terms-container {
      background: white;
      padding: 2rem;
      border-radius: var(--border-radius);
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);

      h1 {
        margin-bottom: 2rem;
        color: var(--text-primary);
        text-align: center;
      }
    }

    section {
      margin-bottom: 2rem;

      &:last-child {
        margin-bottom: 0;
      }

      h2 {
        color: var(--store-primary-color);
        font-size: 1.25rem;
        margin-bottom: 1rem;
      }

      p {
        color: var(--text-secondary);
        line-height: 1.6;
        margin-bottom: 1rem;

        &:last-child {
          margin-bottom: 0;
        }
      }
    }
  `]
})
export class TermsComponent implements OnInit {
  storeUrl: string = '';
  store: Store | null = null;
  storeStyle: { [key: string]: string } = {};

  constructor(private storeService: StoreService) {}

  ngOnInit() {
    // Récupérer l'URL de la boutique depuis l'URL actuelle
    const urlParts = window.location.pathname.split('/');
    const boutiqueIndex = urlParts.indexOf('boutique');
    if (boutiqueIndex !== -1 && urlParts[boutiqueIndex + 1]) {
      this.storeUrl = urlParts[boutiqueIndex + 1];
      this.loadStore();
    }
  }

  private loadStore() {
    if (this.storeUrl) {
      this.storeService.getStoreByUrl(this.storeUrl).subscribe(store => {
        if (store) {
          this.store = store;
          this.updateStoreStyle(store);
        }
      });
    }
  }

  private updateStoreStyle(store: Store) {
    this.storeStyle = {
      '--store-primary-color': store.primaryColor || '#3498db',
      '--store-secondary-color': store.secondaryColor || '#2ecc71',
      '--store-primary-rgb': this.hexToRgb(store.primaryColor || '#3498db'),
      '--store-secondary-rgb': this.hexToRgb(store.secondaryColor || '#2ecc71'),
    };
  }

  private hexToRgb(hex: string): string {
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
} 