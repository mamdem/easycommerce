import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-terms-dialog',
  standalone: true,
  imports: [CommonModule, NgbModalModule],
  providers: [NgbActiveModal],
  template: `
    <div class="modal-content">
      <div class="modal-header">
        <div class="d-flex align-items-center">
          <i class="bi bi-info-circle text-primary me-2 fs-4"></i>
          <h5 class="modal-title">Conditions d'utilisation de Jokkofy</h5>
        </div>
        <button type="button" class="btn-close" (click)="closeDialog()"></button>
      </div>
      
      <div class="modal-body">
        <section>
          <h3>1. Acceptation des conditions</h3>
          <p>En accédant et en utilisant la plateforme Jokkofy, vous acceptez d'être lié par ces conditions d'utilisation. Ces conditions constituent un accord légal entre vous et Jokkofy.</p>
        </section>

        <section>
          <h3>2. Description du service</h3>
          <p>Jokkofy est une plateforme de commerce électronique innovante au Sénégal permettant aux marchands de :</p>
          <ul>
            <li>Créer et gérer leur boutique en ligne</li>
            <li>Vendre leurs produits à l'échelle nationale</li>
            <li>Gérer leurs commandes et leur inventaire</li>
            <li>Accéder à des outils de marketing digital</li>
            <li>Bénéficier d'un système de paiement sécurisé en FCFA</li>
          </ul>
        </section>

        <section>
          <h3>3. Inscription et compte marchand</h3>
          <p>Pour utiliser nos services en tant que marchand, vous devez :</p>
          <ul>
            <li>Avoir au moins 18 ans</li>
            <li>Être légalement autorisé à exercer une activité commerciale au Sénégal</li>
            <li>Fournir des informations exactes et complètes lors de l'inscription</li>
            <li>Maintenir la sécurité de votre compte et mot de passe</li>
            <li>Disposer d'une pièce d'identité valide</li>
            <li>Avoir un compte bancaire ou mobile money actif</li>
          </ul>
        </section>

        <section>
          <h3>4. Responsabilités du marchand</h3>
          <p>En tant que marchand sur Jokkofy, vous êtes responsable de :</p>
          <ul>
            <li>La qualité et l'authenticité des produits vendus</li>
            <li>L'exactitude des descriptions et des prix en FCFA</li>
            <li>La gestion des stocks et des délais de livraison</li>
            <li>Le respect des lois commerciales sénégalaises</li>
            <li>Le service client et la gestion des retours</li>
            <li>Le respect des droits des consommateurs</li>
          </ul>
        </section>

        <section>
          <h3>5. Commissions et frais</h3>
          <p>Les frais de service Jokkofy comprennent :</p>
          <ul>
            <li>Commission sur les ventes : pourcentage variable selon la catégorie</li>
            <li>Frais de transaction : variables selon le mode de paiement</li>
            <li>Services premium optionnels (marketing, promotion, etc.)</li>
          </ul>
          <p>Tous les paiements sont effectués en FCFA et les commissions sont prélevées automatiquement.</p>
        </section>

        <section>
          <h3>6. Propriété intellectuelle</h3>
          <p>En utilisant Jokkofy :</p>
          <ul>
            <li>Vous conservez vos droits sur vos contenus</li>
            <li>Vous accordez à Jokkofy une licence pour afficher vos produits</li>
            <li>Vous vous engagez à respecter les droits de propriété intellectuelle</li>
          </ul>
        </section>

        <section>
          <h3>7. Résiliation</h3>
          <p>Jokkofy se réserve le droit de :</p>
          <ul>
            <li>Suspendre ou fermer les comptes violant ces conditions</li>
            <li>Modifier les services ou conditions avec préavis</li>
            <li>Retirer des produits ne respectant pas nos politiques</li>
          </ul>
        </section>
      </div>
      
      <div class="modal-footer">
        <button 
          type="button" 
          class="btn btn-primary px-4"
          (click)="closeDialog()">
          J'ai compris
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .modal-body {
      max-height: 70vh;
      overflow-y: auto;
      padding: 1.5rem;

      section {
        margin-bottom: 1.5rem;

        &:last-child {
          margin-bottom: 0;
        }
      }

      h3 {
        color: #34495E;
        font-size: 1.1rem;
        margin: 0 0 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #fe7b33;
      }

      p {
        color: #4b5563;
        font-size: 0.95rem;
        line-height: 1.5;
        margin-bottom: 1rem;
      }

      ul {
        margin-bottom: 1rem;
        padding-left: 1.25rem;
        
        li {
          color: #4b5563;
          font-size: 0.95rem;
          line-height: 1.4;
          margin-bottom: 0.5rem;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }

    .btn-primary {
      background-color: #fe7b33;
      border-color: #fe7b33;

      &:hover, &:focus {
        background-color: darken(#fe7b33, 5%);
        border-color: darken(#fe7b33, 5%);
      }
    }

    .text-primary {
      color: #fe7b33 !important;
    }
  `]
})
export class TermsDialogComponent {
  constructor(private activeModal: NgbActiveModal) {}

  closeDialog(): void {
    this.activeModal.close();
  }
} 