import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminStoreService } from '../../services/admin-store.service';
import { Store } from '../../../core/models/store.model';

@Component({
  selector: 'app-admin-stores',
  templateUrl: './admin-stores.component.html',
  styleUrls: ['./admin-stores.component.scss']
})
export class AdminStoresComponent implements OnInit, OnDestroy {
  stores: Store[] = [];
  filteredStores: Store[] = [];
  isLoading = true;
  searchTerm = '';
  selectedStatus = 'all';
  
  // Statistics
  totalStores = 0;
  activeStores = 0;
  pendingStores = 0;
  inactiveStores = 0;

  private destroy$ = new Subject<void>();

  constructor(private adminService: AdminStoreService) {}

  ngOnInit(): void {
    this.loadStores();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge toutes les boutiques
   */
  private loadStores(): void {
    this.isLoading = true;
    
    this.adminService.getAllStores()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stores) => {
          this.stores = stores;
          this.filteredStores = stores;
          this.calculateStatistics();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des boutiques:', error);
          this.isLoading = false;
        }
      });
  }

  /**
   * Calcule les statistiques des boutiques
   */
  private calculateStatistics(): void {
    this.totalStores = this.stores.length;
    this.activeStores = this.stores.filter(store => store.status === 'active').length;
    this.pendingStores = this.stores.filter(store => store.status === 'pending').length;
    this.inactiveStores = this.stores.filter(store => store.status === 'inactive').length;
  }

  /**
   * Filtre les boutiques selon le terme de recherche et le statut
   */
  filterStores(): void {
    let filtered = this.stores;

    // Filtrage par terme de recherche
    if (this.searchTerm.trim()) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(store =>
        store.storeName?.toLowerCase().includes(term) ||
        store.legalName?.toLowerCase().includes(term) ||
        store.email?.toLowerCase().includes(term)
      );
    }

    // Filtrage par statut
    if (this.selectedStatus !== 'all') {
      filtered = filtered.filter(store => store.status === this.selectedStatus);
    }

    this.filteredStores = filtered;
  }

  /**
   * Met à jour le statut d'une boutique
   */
  async updateStoreStatus(storeId: string, newStatus: 'active' | 'inactive' | 'pending'): Promise<void> {
    try {
      await this.adminService.updateStoreStatus(storeId, newStatus);
      
      // Mettre à jour localement
      const store = this.stores.find(s => s.id === storeId);
      if (store) {
        store.status = newStatus;
        this.calculateStatistics();
        this.filterStores();
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
  }

  /**
   * Formate la date de création
   */
  formatDate(timestamp?: number): string {
    if (!timestamp) return 'Non disponible';
    return new Date(timestamp).toLocaleDateString('fr-FR');
  }

  /**
   * Obtient l'initiale pour l'avatar de la boutique
   */
  getStoreInitial(store: Store): string {
    return store.storeName?.charAt(0).toUpperCase() || store.legalName?.charAt(0).toUpperCase() || '?';
  }

  /**
   * Obtient la classe CSS pour le statut
   */
  getStatusClass(status?: string): string {
    switch (status) {
      case 'active': return 'status-active';
      case 'pending': return 'status-pending';
      case 'inactive': return 'status-inactive';
      default: return 'status-unknown';
    }
  }

  /**
   * Obtient le texte du statut
   */
  getStatusText(status?: string): string {
    switch (status) {
      case 'active': return 'Active';
      case 'pending': return 'En attente';
      case 'inactive': return 'Inactive';
      default: return 'Inconnu';
    }
  }

  /**
   * TrackBy function pour optimiser le ngFor
   */
  trackByStoreId(index: number, store: Store): string {
    return store.id;
  }
}
