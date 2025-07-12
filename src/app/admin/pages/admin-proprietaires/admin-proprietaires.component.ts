import { Component, OnInit } from '@angular/core';

interface Proprietaire {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  adresse: string;
  ville: string;
  region: string;
  dateInscription: number;
  dernierConnexion: number;
  statut: 'active' | 'inactive' | 'suspended';
  typeCompte: 'individual' | 'professional';
  nombreBoutiques: number;
  documentsVerifies: {
    identite: boolean;
    adresse: boolean;
    bancaire: boolean;
    registreCommerce: boolean;
  };
  scoreVerification: number;
}

@Component({
  selector: 'app-admin-proprietaires',
  templateUrl: './admin-proprietaires.component.html',
  styleUrls: ['./admin-proprietaires.component.scss']
})
export class AdminProprietairesComponent implements OnInit {
  proprietaires: Proprietaire[] = [];
  filteredProprietaires: Proprietaire[] = [];
  isLoading = true;
  searchTerm = '';
  selectedStatus = 'all';
  selectedType = 'all';
  sortField = 'nom';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor() {}

  ngOnInit(): void {
    this.loadProprietaires();
  }

  /**
   * Charge tous les propriétaires
   */
  private loadProprietaires(): void {
    this.isLoading = true;
    
    // Simulation du chargement avec des données d'exemple
    setTimeout(() => {
      this.proprietaires = [
        {
          id: '1',
          nom: 'Diallo',
          prenom: 'Mamadou',
          email: 'mamadou.diallo@email.com',
          telephone: '+221 77 123 45 67',
          adresse: 'Rue 10, Mermoz',
          ville: 'Dakar',
          region: 'Dakar',
          dateInscription: Date.now() - (30 * 24 * 60 * 60 * 1000),
          dernierConnexion: Date.now() - (2 * 24 * 60 * 60 * 1000),
          statut: 'active',
          typeCompte: 'professional',
          nombreBoutiques: 3,
          documentsVerifies: {
            identite: true,
            adresse: true,
            bancaire: true,
            registreCommerce: true
          },
          scoreVerification: 100
        },
        {
          id: '2',
          nom: 'Sow',
          prenom: 'Fatou',
          email: 'fatou.sow@email.com',
          telephone: '+221 76 987 65 43',
          adresse: 'Cité Keur Gorgui',
          ville: 'Dakar',
          region: 'Dakar',
          dateInscription: Date.now() - (15 * 24 * 60 * 60 * 1000),
          dernierConnexion: Date.now() - (1 * 24 * 60 * 60 * 1000),
          statut: 'active',
          typeCompte: 'individual',
          nombreBoutiques: 1,
          documentsVerifies: {
            identite: true,
            adresse: true,
            bancaire: false,
            registreCommerce: false
          },
          scoreVerification: 65
        },
        {
          id: '3',
          nom: 'Kane',
          prenom: 'Omar',
          email: 'omar.kane@email.com',
          telephone: '+221 78 456 78 90',
          adresse: 'Parcelles Assainies',
          ville: 'Dakar',
          region: 'Dakar',
          dateInscription: Date.now() - (60 * 24 * 60 * 60 * 1000),
          dernierConnexion: Date.now() - (7 * 24 * 60 * 60 * 1000),
          statut: 'inactive',
          typeCompte: 'professional',
          nombreBoutiques: 2,
          documentsVerifies: {
            identite: true,
            adresse: false,
            bancaire: true,
            registreCommerce: true
          },
          scoreVerification: 75
        },
        {
          id: '4',
          nom: 'Ndiaye',
          prenom: 'Aminata',
          email: 'aminata.ndiaye@email.com',
          telephone: '+221 77 321 65 48',
          adresse: 'Liberté 6',
          ville: 'Dakar',
          region: 'Dakar',
          dateInscription: Date.now() - (5 * 24 * 60 * 60 * 1000),
          dernierConnexion: Date.now() - (12 * 60 * 60 * 1000),
          statut: 'suspended',
          typeCompte: 'individual',
          nombreBoutiques: 1,
          documentsVerifies: {
            identite: false,
            adresse: false,
            bancaire: false,
            registreCommerce: false
          },
          scoreVerification: 25
        }
      ];
      
      this.filteredProprietaires = this.proprietaires;
      this.isLoading = false;
    }, 1000);
  }

  /**
   * Filtre les propriétaires selon le terme de recherche, le statut et le type
   */
  filterProprietaires(): void {
    let filtered = this.proprietaires;

    // Filtrage par terme de recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(proprietaire =>
        proprietaire.nom.toLowerCase().includes(term) ||
        proprietaire.prenom.toLowerCase().includes(term) ||
        proprietaire.email.toLowerCase().includes(term) ||
        proprietaire.ville.toLowerCase().includes(term)
      );
    }

    // Filtrage par statut
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(proprietaire => proprietaire.statut === this.selectedStatus);
    }

    // Filtrage par type
    if (this.selectedType !== 'all') {
      filtered = filtered.filter(proprietaire => proprietaire.typeCompte === this.selectedType);
    }

    this.filteredProprietaires = filtered;
    this.sortProprietaires();
  }

  /**
   * Trie les propriétaires
   */
  sortProprietaires(): void {
    this.filteredProprietaires.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (this.sortField) {
        case 'nom':
          valueA = `${a.nom} ${a.prenom}`;
          valueB = `${b.nom} ${b.prenom}`;
          break;
        case 'email':
          valueA = a.email;
          valueB = b.email;
          break;
        case 'dateInscription':
          valueA = a.dateInscription;
          valueB = b.dateInscription;
          break;
        case 'scoreVerification':
          valueA = a.scoreVerification;
          valueB = b.scoreVerification;
          break;
        default:
          valueA = a[this.sortField as keyof Proprietaire];
          valueB = b[this.sortField as keyof Proprietaire];
      }

      if (this.sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  /**
   * Change le tri
   */
  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.sortProprietaires();
  }

  /**
   * Met à jour le statut d'un propriétaire
   */
  updateProprietaireStatus(proprietaireId: string, newStatus: 'active' | 'inactive' | 'suspended'): void {
    const proprietaire = this.proprietaires.find(p => p.id === proprietaireId);
    if (proprietaire) {
      proprietaire.statut = newStatus;
      this.filterProprietaires();
    }
  }

  /**
   * Formate la date
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('fr-FR');
  }

  /**
   * Formate la date relative
   */
  formatRelativeDate(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor(diff / (60 * 60 * 1000));

    if (days > 0) {
      return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    } else {
      return 'Maintenant';
    }
  }

  /**
   * Obtient l'initiale pour l'avatar
   */
  getInitials(proprietaire: Proprietaire): string {
    return `${proprietaire.prenom.charAt(0)}${proprietaire.nom.charAt(0)}`.toUpperCase();
  }

  /**
   * Obtient la classe CSS pour le statut
   */
  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  /**
   * Obtient la classe CSS pour le type
   */
  getTypeClass(type: string): string {
    return `type-${type}`;
  }

  /**
   * Obtient la classe CSS pour le score de vérification
   */
  getVerificationClass(score: number): string {
    if (score >= 80) return 'verification-high';
    if (score >= 50) return 'verification-medium';
    return 'verification-low';
  }

  /**
   * Obtient le texte du statut
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      case 'suspended': return 'Suspendu';
      default: return 'Inconnu';
    }
  }

  /**
   * Obtient le texte du type
   */
  getTypeText(type: string): string {
    switch (type) {
      case 'individual': return 'Particulier';
      case 'professional': return 'Professionnel';
      default: return 'Inconnu';
    }
  }

  /**
   * TrackBy function pour optimiser le ngFor
   */
  trackByProprietaireId(index: number, proprietaire: Proprietaire): string {
    return proprietaire.id;
  }
}
