import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminInfluenceurService, Influenceur } from '../../services/admin-influenceur.service';

@Component({
  selector: 'app-admin-influenceurs',
  templateUrl: './admin-influenceurs.component.html',
  styleUrls: ['./admin-influenceurs.component.scss']
})
export class AdminInfluenceursComponent implements OnInit, OnDestroy {
  influenceurs: Influenceur[] = [];
  filteredInfluenceurs: Influenceur[] = [];
  isLoading = true;
  searchTerm = '';
  selectedStatus = 'all';
  sortField = 'dateCreation';
  sortDirection: 'asc' | 'desc' = 'desc';

  // Modal
  showModal = false;
  isEditMode = false;
  currentInfluenceur: Partial<Influenceur> = {};
  isSaving = false;
  errorMessage = '';

  private destroy$ = new Subject<void>();

  constructor(private influenceurService: AdminInfluenceurService) {}

  ngOnInit(): void {
    this.loadInfluenceurs();
    this.resetForm();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge tous les influenceurs depuis Firebase
   */
  private loadInfluenceurs(): void {
    this.isLoading = true;
    
    this.influenceurService.getAllInfluenceurs()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (influenceurs) => {
          this.influenceurs = influenceurs;
          this.filteredInfluenceurs = influenceurs;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des influenceurs:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Applique les filtres et le tri
   */
  applyFilters(): void {
    let filtered = [...this.influenceurs];

    // Filtrage par terme de recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(influenceur =>
        influenceur.nom.toLowerCase().includes(term) ||
        influenceur.prenom.toLowerCase().includes(term) ||
        influenceur.email.toLowerCase().includes(term) ||
        influenceur.codePromo.toLowerCase().includes(term)
      );
    }

    // Filtrage par statut
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(influenceur => influenceur.statut === this.selectedStatus);
    }

    // Tri
    filtered.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (this.sortField) {
        case 'nom':
          valueA = `${a.prenom} ${a.nom}`;
          valueB = `${b.prenom} ${b.nom}`;
          break;
        case 'dateCreation':
          valueA = a.dateCreation;
          valueB = b.dateCreation;
          break;
        case 'commissionGagnee':
          valueA = a.commissionGagnee;
          valueB = b.commissionGagnee;
          break;
        default:
          valueA = a[this.sortField as keyof Influenceur];
          valueB = b[this.sortField as keyof Influenceur];
      }

      if (this.sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });

    this.filteredInfluenceurs = filtered;
  }

  /**
   * Change le tri
   */
  toggleSort(): void {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  /**
   * Ouvre la modal pour ajouter un influenceur
   */
  openAddModal(): void {
    this.isEditMode = false;
    this.resetForm();
    this.showModal = true;
  }

  /**
   * Ouvre la modal pour modifier un influenceur
   */
  openEditModal(influenceur: Influenceur): void {
    this.isEditMode = true;
    this.currentInfluenceur = { ...influenceur };
    this.errorMessage = '';
    this.showModal = true;
  }

  /**
   * Ferme la modal
   */
  closeModal(): void {
    this.showModal = false;
    this.errorMessage = '';
    this.resetForm();
  }

  /**
   * Remet le formulaire à zéro
   */
  private resetForm(): void {
    this.currentInfluenceur = {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      codePromo: '',
      reductionPourcentage: 10,
      validiteMois: 2, // 2 mois de validité par défaut
      instagram: '',
      tiktok: '',
      youtube: ''
    };
    this.errorMessage = '';
  }

  /**
   * Génère automatiquement le code promo
   */
  async onNameChange(): Promise<void> {
    if (this.currentInfluenceur.nom && this.currentInfluenceur.prenom && !this.isEditMode) {
      try {
        // Générer un code promo unique
        this.currentInfluenceur.codePromo = await this.influenceurService.generateUniquePromoCode(
          this.currentInfluenceur.nom,
          this.currentInfluenceur.prenom
        );
        this.errorMessage = '';
      } catch (error) {
        console.error('Erreur lors de la génération du code promo:', error);
      }
    }
  }

  /**
   * Génère un nouveau code promo
   */
  async generateNewCode(): Promise<void> {
    if (this.currentInfluenceur.nom && this.currentInfluenceur.prenom) {
      try {
        this.currentInfluenceur.codePromo = await this.influenceurService.generateUniquePromoCode(
          this.currentInfluenceur.nom,
          this.currentInfluenceur.prenom
        );
        this.errorMessage = '';
      } catch (error) {
        console.error('Erreur lors de la génération du code promo:', error);
        this.errorMessage = 'Erreur lors de la génération du code promo';
      }
    }
  }

  /**
   * Vérifie si le code promo est unique
   */
  async checkPromoCodeUniqueness(): Promise<void> {
    if (this.currentInfluenceur.codePromo && this.currentInfluenceur.codePromo.trim()) {
      const codePromo = this.currentInfluenceur.codePromo.toUpperCase().trim();
      
      // En mode édition, ignorer si c'est le même code promo que l'original
      if (this.isEditMode && this.currentInfluenceur.id === codePromo) {
        this.errorMessage = '';
        return;
      }

      try {
        const exists = await this.influenceurService.checkPromoCodeExistsPromise(codePromo);
        if (exists) {
          this.errorMessage = `Le code promo "${codePromo}" existe déjà.`;
        } else {
          this.errorMessage = '';
        }
      } catch (error) {
        console.error('Erreur lors de la vérification du code promo:', error);
      }
    } else {
      this.errorMessage = '';
    }
  }

  /**
   * Sauvegarde un influenceur
   */
  async saveInfluenceur(): Promise<void> {
    if (!this.isFormValid()) {
      return;
    }

    // Vérifier l'unicité du code promo avant de sauvegarder
    await this.checkPromoCodeUniqueness();
    if (this.errorMessage) {
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';

    try {
      if (this.isEditMode && this.currentInfluenceur.id) {
        await this.influenceurService.updateInfluenceur(
          this.currentInfluenceur.id,
          this.currentInfluenceur
        );
      } else {
        await this.influenceurService.addInfluenceur(
          this.currentInfluenceur as Omit<Influenceur, 'id'>
        );
      }

      this.closeModal();
      // Les données se rechargeront automatiquement via l'Observable
    } catch (error: any) {
      console.error('Erreur lors de la sauvegarde:', error);
      this.errorMessage = error.message || 'Erreur lors de la sauvegarde';
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Valide le formulaire
   */
  private isFormValid(): boolean {
    return !!(
      this.currentInfluenceur.nom &&
      this.currentInfluenceur.prenom &&
      this.currentInfluenceur.email &&
      this.currentInfluenceur.codePromo &&
      this.currentInfluenceur.reductionPourcentage
    );
  }

  /**
   * Met à jour le statut d'un influenceur
   */
  async updateStatut(influenceur: Influenceur, newStatut: 'active' | 'inactive' | 'expired'): Promise<void> {
    try {
      await this.influenceurService.updateStatut(influenceur.id!, newStatut);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  }

  /**
   * Supprime un influenceur
   */
  async deleteInfluenceur(influenceur: Influenceur): Promise<void> {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'influenceur ${influenceur.prenom} ${influenceur.nom} (${influenceur.codePromo}) ?`)) {
      try {
        await this.influenceurService.deleteInfluenceur(influenceur.id!);
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  }

  /**
   * Formate la date
   */
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('fr-FR');
  }

  /**
   * Formate la validité en mois
   */
  formatValiditeMois(mois: number): string {
    if (!mois) return 'Non définie';
    return `${mois} mois`;
  }

  /**
   * Calcule le pourcentage d'utilisation
   */
  getUsagePercentage(influenceur: Influenceur): number {
    const maxUsage = 1000; // Limite arbitraire pour la barre de progression
    return Math.min((influenceur.utilisations / maxUsage) * 100, 100);
  }

  /**
   * Obtient la classe CSS pour le statut
   */
  getStatusClass(status: string): string {
    return `status-${status}`;
  }

  /**
   * Obtient le texte du statut
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      case 'expired': return 'Expiré';
      default: return 'Inconnu';
    }
  }

  /**
   * TrackBy function pour optimiser le ngFor
   */
  trackByInfluenceurId(index: number, influenceur: Influenceur): string {
    return influenceur.id || index.toString();
  }
}
