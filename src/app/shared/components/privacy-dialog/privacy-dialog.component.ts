import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-privacy-dialog',
  standalone: true,
  imports: [CommonModule, NgbModalModule],
  providers: [NgbActiveModal],
  template: `
    <div class="modal-content">
      <div class="modal-header">
        <div class="d-flex align-items-center">
          <i class="bi bi-shield-lock text-primary me-2 fs-4"></i>
          <h5 class="modal-title">Politique de confidentialité de Jokkofy</h5>
        </div>
        <button type="button" class="btn-close" (click)="closeDialog()"></button>
      </div>
      
      <div class="modal-body">
        <section>
          <h3>1. Introduction</h3>
          <p>Chez Jokkofy, nous accordons une importance capitale à la protection de vos données personnelles. Cette politique détaille comment nous collectons, utilisons et protégeons vos informations conformément aux lois sénégalaises sur la protection des données.</p>
        </section>

        <section>
          <h3>2. Collecte des données</h3>
          <p>Nous collectons les informations suivantes :</p>
          <ul>
            <li><strong>Données d'identification :</strong> nom, prénom, adresse email, numéro de téléphone</li>
            <li><strong>Documents légaux :</strong> copie de pièce d'identité, registre de commerce</li>
            <li><strong>Informations commerciales :</strong> nom de l'entreprise, NINEA, adresse professionnelle</li>
            <li><strong>Données financières :</strong> informations de compte bancaire ou mobile money</li>
            <li><strong>Données de transaction :</strong> historique des ventes, commissions, paiements</li>
            <li><strong>Informations techniques :</strong> adresse IP, données de navigation, cookies</li>
          </ul>
        </section>

        <section>
          <h3>3. Utilisation des données</h3>
          <p>Vos données sont utilisées pour :</p>
          <ul>
            <li>Créer et gérer votre compte marchand Jokkofy</li>
            <li>Traiter vos transactions et paiements en FCFA</li>
            <li>Assurer la sécurité de la plateforme</li>
            <li>Vous fournir un support client personnalisé</li>
            <li>Améliorer nos services et votre expérience</li>
            <li>Respecter nos obligations légales</li>
            <li>Vous envoyer des communications marketing (avec votre consentement)</li>
          </ul>
        </section>

        <section>
          <h3>4. Protection des données</h3>
          <p>Nous mettons en œuvre des mesures de sécurité robustes :</p>
          <ul>
            <li>Chiffrement des données sensibles</li>
            <li>Authentification à deux facteurs</li>
            <li>Surveillance continue des accès</li>
            <li>Sauvegardes régulières</li>
            <li>Formation de notre personnel à la sécurité</li>
          </ul>
        </section>

        <section>
          <h3>5. Partage des données</h3>
          <p>Nous ne partageons vos données qu'avec :</p>
          <ul>
            <li>Nos partenaires de paiement agréés au Sénégal</li>
            <li>Nos prestataires de services (hébergement, support)</li>
            <li>Les autorités légales sur demande officielle</li>
          </ul>
          <p>Tous nos partenaires sont soumis à des obligations strictes de confidentialité.</p>
        </section>

        <section>
          <h3>6. Vos droits</h3>
          <p>Conformément à la loi, vous avez le droit de :</p>
          <ul>
            <li>Accéder à vos données personnelles</li>
            <li>Rectifier vos informations</li>
            <li>Supprimer votre compte</li>
            <li>Vous opposer au traitement de vos données</li>
            <li>Retirer votre consentement</li>
            <li>Exporter vos données</li>
          </ul>
          <p>Pour exercer ces droits, contactez notre service client ou notre délégué à la protection des données.</p>
        </section>

        <section>
          <h3>7. Cookies et traceurs</h3>
          <p>Nous utilisons des cookies pour :</p>
          <ul>
            <li>Assurer le bon fonctionnement du site</li>
            <li>Mémoriser vos préférences</li>
            <li>Analyser le trafic et l'utilisation</li>
            <li>Personnaliser votre expérience</li>
          </ul>
          <p>Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.</p>
        </section>

        <section>
          <h3>8. Contact</h3>
          <p>Pour toute question sur la protection de vos données :</p>
          <ul>
            <li>Email : privacy&#64;jokkofy.com</li>
            <li>Téléphone : +221 XX XXX XX XX</li>
            <li>Adresse : [Adresse de Jokkofy à Dakar]</li>
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

      strong {
        color: #34495E;
        font-weight: 600;
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
export class PrivacyDialogComponent {
  constructor(private activeModal: NgbActiveModal) {}

  closeDialog(): void {
    this.activeModal.close();
  }
} 