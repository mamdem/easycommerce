import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil, switchMap, filter, of } from 'rxjs';
import { OrderService } from '../../../../../core/services/order.service';
import { CustomerService } from '../../../../../core/services/customer.service';
import { StoreService } from '../../../../../core/services/store.service';
import { Customer } from '../../../../../core/models/customer.model';
import { Order } from '../../../../../core/models/order.model';
import { Store } from '../../../../../core/models/store.model';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner.component';
import * as XLSX from 'xlsx';
import { ToastService } from '../../../../../core/services/toast.service';

@Component({
  selector: 'app-customers',
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingSpinnerComponent
  ]
})
export class CustomersComponent implements OnInit, OnDestroy {
  // Propriété Math pour l'utiliser dans le template
  Math = Math;

  customers: Customer[] = [];
  loading = true;
  error = false;
  currentStore!: Store;

  // Pour la gestion de la destruction du composant
  private destroy$ = new Subject<void>();

  // Filtres
  searchTerm: string = '';
  sortBy: string = 'lastOrderDate';
  sortDirection: string = 'desc';

  // Pagination
  currentPage = 1;
  pageSize = 15;
  totalPages = 0;

  constructor(
    private orderService: OrderService,
    private customerService: CustomerService,
    private storeService: StoreService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // S'abonner aux changements de boutique
    this.storeService.selectedStore$.pipe(
      takeUntil(this.destroy$),
      switchMap(storeId => {
        if (!storeId) {
          return of(null);
        }
        return this.storeService.getSelectedStore();
      }),
      filter(store => !!store) // Ignorer les valeurs null
    ).subscribe({
      next: (store) => {
        if (store) {
          this.currentStore = store;
    this.loadCustomers();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la boutique:', error);
        this.loading = false;
      }
    });
  }

  loadCustomers(): void {
    this.loading = true;
    this.error = false;

    const storeUrl = this.currentStore.id?.split('_')[1] || '';
        console.log('[CustomersComponent] Chargement des commandes pour la boutique:', storeUrl);
        
        this.orderService.getOrdersByStore(storeUrl).subscribe({
      next: (orders) => {
            console.log('[CustomersComponent] Commandes chargées:', orders);
        if (orders.length === 0) {
              console.log('[CustomersComponent] Aucune commande trouvée');
          this.customers = [];
          this.loading = false;
          return;
        }
        
            // Traiter les commandes pour créer la liste des clients
            this.customers = this.processOrdersToCustomers(orders);
            console.log('[CustomersComponent] Clients traités:', this.customers);
            this.loading = false;
          },
          error: (error) => {
            console.error('[CustomersComponent] Erreur lors du chargement des commandes:', error);
            this.error = true;
        this.loading = false;
      }
    });
  }

  // Changer le tri
  setSorting(column: string): void {
    if (this.sortBy === column) {
      // Si on clique sur la même colonne, on inverse la direction du tri
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Sinon, on change la colonne de tri et on met la direction par défaut en desc
      this.sortBy = column;
      this.sortDirection = 'desc';
    }
  }

  private processOrdersToCustomers(orders: Order[]): Customer[] {
    const customerMap = new Map<string, Customer>();

    orders.forEach(order => {
      if (!order.customerInfo || !order.customerInfo.phone) return;

      const phone = this.normalizePhone(order.customerInfo.phone);
      if (!phone) return;

      const fullName = order.customerInfo.fullName || 'Client sans nom';

      if (!customerMap.has(phone)) {
        // Nouveau client
        customerMap.set(phone, {
          id: 'C' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          fullName: fullName,
          email: order.customerInfo.email || '',
          phone: phone,
          firstOrderDate: order.createdAt,
          lastOrderDate: order.createdAt,
          totalOrders: 1,
          totalSpent: order.total || 0,
          addresses: [order.customerInfo.address].filter(Boolean) as string[],
          orderIds: order.id ? [order.id] : [],
          normalizedName: this.normalizeName(fullName),
          nameVariations: [fullName],
          possibleDuplicates: []
        });
      } else {
        // Mettre à jour le client existant
        const customer = customerMap.get(phone)!;
        customer.lastOrderDate = Math.max(customer.lastOrderDate || 0, order.createdAt || 0);
        customer.totalOrders = (customer.totalOrders || 0) + 1;
        customer.totalSpent = (customer.totalSpent || 0) + (order.total || 0);
        
        if (order.id) {
          customer.orderIds = customer.orderIds || [];
          customer.orderIds.push(order.id);
        }
        
        // Gérer les adresses
        if (order.customerInfo.address) {
          customer.addresses = customer.addresses || [];
          if (!customer.addresses.includes(order.customerInfo.address)) {
          customer.addresses.push(order.customerInfo.address);
          }
        }
        
        // Gérer les variations de nom
        if (fullName && !customer.nameVariations?.includes(fullName)) {
          customer.nameVariations = customer.nameVariations || [];
          customer.nameVariations.push(fullName);
          // Mettre à jour le nom principal avec le meilleur nom
          customer.fullName = this.chooseBestName(customer.nameVariations);
        }
      }
    });

    return Array.from(customerMap.values());
  }

  // Normaliser le numéro de téléphone
  private normalizePhone(phone: string): string {
    if (!phone) return '';
    
    // Supprimer tous les caractères non numériques
    const normalized = phone.replace(/[^0-9]/g, '');
    
    // Gérer les formats internationaux
    if (normalized.startsWith('00')) {
      return '+' + normalized.slice(2);
    } else if (normalized.startsWith('0')) {
      return '+223' + normalized.slice(1); // Préfixe Mali
    }
    
    return normalized;
  }

  // Formater le numéro de téléphone pour l'affichage
  formatPhone(phone: string): string {
    const normalized = this.normalizePhone(phone);
    if (normalized.startsWith('+223')) {
      const local = normalized.slice(4);
      return local.replace(/(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4');
    }
    return phone;
  }

  // Choisir le meilleur nom parmi les variations
  private chooseBestName(names: string[]): string {
    if (!names || !Array.isArray(names) || names.length === 0) return 'Client sans nom';
    
    // Filtrer les noms vides ou invalides
    const validNames = names.filter(name => name && name.trim().length > 0);
    if (validNames.length === 0) return 'Client sans nom';
    
    // Choisir le nom le plus long comme potentiellement le plus complet
    return validNames.reduce((longest, current) => {
      // Ignorer les noms trop courts
      if (!current || current.length < 2) return longest;
      // Préférer le nom le plus long
      return current.length > longest.length ? current : longest;
    }, validNames[0]);
  }

  private normalizeName(name: string): string {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  // Obtenir toutes les variations de nom d'un client
  getNameVariations(customer: Customer): string {
    if (!customer.nameVariations || customer.nameVariations.length <= 1) {
      return '';
    }
    // Exclure le nom principal de la liste des variations
    const variations = customer.nameVariations.filter(name => name !== customer.fullName);
    return variations.join(' | ');
  }

  // Obtenir les clients filtrés et triés avec pagination
  get filteredCustomers(): Customer[] {
    const filtered = this.customers
      .filter(customer => {
        if (!this.searchTerm) return true;
        
        const searchTermLower = this.searchTerm.toLowerCase().trim();
        const normalizedPhone = this.normalizePhone(this.searchTerm);
        
        // Rechercher dans le nom principal
        const mainNameMatch = customer.fullName?.toLowerCase().includes(searchTermLower) || false;
        
        // Rechercher dans les variations de nom si disponibles
        const nameVariationsMatch = Array.isArray(customer.nameVariations) && customer.nameVariations.some(name => 
          name && name.toLowerCase().includes(searchTermLower)
        );
        
        // Rechercher dans l'email si disponible
        const emailMatch = customer.email?.toLowerCase().includes(searchTermLower) || false;

        // Rechercher dans le téléphone si disponible
        const phoneMatch = customer.phone ? this.normalizePhone(customer.phone).includes(normalizedPhone) : false;
        
        return mainNameMatch || nameVariationsMatch || emailMatch || phoneMatch;
      })
      .sort((a, b) => {
        let comparison = 0;
        
        switch (this.sortBy) {
          case 'fullName':
            comparison = (a.fullName || '').localeCompare(b.fullName || '');
            break;
          case 'phone':
            comparison = (a.phone || '').localeCompare(b.phone || '');
            break;
          case 'firstOrderDate':
            comparison = (a.firstOrderDate || 0) - (b.firstOrderDate || 0);
            break;
          case 'lastOrderDate':
            comparison = (a.lastOrderDate || 0) - (b.lastOrderDate || 0);
            break;
          case 'totalOrders':
            comparison = (a.totalOrders || 0) - (b.totalOrders || 0);
            break;
          case 'totalSpent':
            comparison = (a.totalSpent || 0) - (b.totalSpent || 0);
            break;
          default:
            comparison = (a.lastOrderDate || 0) - (b.lastOrderDate || 0);
        }
        
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });

    // Mettre à jour le nombre total de pages
    this.updatePagination(filtered.length);

    // Appliquer la pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    return filtered.slice(startIndex, endIndex);
  }

  // Obtenir tous les clients filtrés (sans pagination)
  get allFilteredCustomers(): Customer[] {
    return this.customers
      .filter(customer => {
        if (!this.searchTerm) return true;
        
        const searchTermLower = this.searchTerm.toLowerCase().trim();
        const normalizedPhone = this.normalizePhone(this.searchTerm);
        
        // Rechercher dans le nom principal
        const mainNameMatch = customer.fullName?.toLowerCase().includes(searchTermLower) || false;
        
        // Rechercher dans les variations de nom si disponibles
        const nameVariationsMatch = Array.isArray(customer.nameVariations) && customer.nameVariations.some(name => 
          name && name.toLowerCase().includes(searchTermLower)
        );

        // Rechercher dans l'email si disponible
        const emailMatch = customer.email?.toLowerCase().includes(searchTermLower) || false;

        // Rechercher dans le téléphone si disponible
        const phoneMatch = customer.phone ? this.normalizePhone(customer.phone).includes(normalizedPhone) : false;
        
        return mainNameMatch || nameVariationsMatch || emailMatch || phoneMatch;
      });
  }

  // Mettre à jour la pagination
  private updatePagination(filteredCount: number): void {
    this.totalPages = Math.ceil(filteredCount / this.pageSize);
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  // Changer de page
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
    }
  }

  // Obtenir le tableau des pages pour l'affichage
  get pages(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  // Formater la date
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Formater le montant
  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' FCFA';
  }

  // Vérifier si un client a des doublons potentiels
  hasDuplicates(customer: Customer): boolean {
    return customer.possibleDuplicates !== undefined && customer.possibleDuplicates.length > 0;
  }

  // Obtenir le nombre de variations de nom pour un client
  getNameVariationsCount(customer: Customer): number {
    return customer.nameVariations?.length || 1;
  }

  // Réinitialiser la recherche
  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
  }

  // Exporter tous les clients
  exportAllCustomers(): void {
    try {
      // Récupérer tous les clients sans pagination
      this.customerService.getCustomers().subscribe(
        (customers: Customer[]) => {
          // Préparation des données pour l'export
          const data = customers.map((customer: Customer) => ({
            'Nom complet': customer.fullName || 'N/A',
            'Email': customer.email || 'N/A',
            'Téléphone': customer.phone || 'N/A',
            'Adresse': customer.addresses[0] || 'N/A',
            'Première commande': customer.firstOrderDate ? new Date(customer.firstOrderDate).toLocaleDateString('fr-FR') : 'N/A',
            'Dernière commande': customer.lastOrderDate ? new Date(customer.lastOrderDate).toLocaleDateString('fr-FR') : 'N/A',
            'Nombre de commandes': customer.totalOrders || 0,
            'Montant total des achats': customer.totalSpent ? `${customer.totalSpent.toLocaleString('fr-FR')} FCFA` : '0 FCFA'
          }));

          // Création du workbook
          const ws = XLSX.utils.json_to_sheet(data);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, 'Clients');

          // Ajustement des colonnes
          const colWidths = [
            { wch: 25 }, // Nom complet
            { wch: 30 }, // Email
            { wch: 15 }, // Téléphone
            { wch: 35 }, // Adresse
            { wch: 15 }, // Première commande
            { wch: 15 }, // Dernière commande
            { wch: 15 }, // Nombre de commandes
            { wch: 20 }  // Montant total
          ];
          ws['!cols'] = colWidths;

          // Sauvegarde du fichier
          const fileName = `liste_clients_${new Date().toISOString().split('T')[0]}.xlsx`;
          XLSX.writeFile(wb, fileName);
          
          this.toastService.success('La liste des clients a été exportée avec succès');
        },
        (error: Error) => {
          console.error('Erreur lors de l\'export des clients:', error);
          this.toastService.error('Une erreur est survenue lors de l\'export des clients');
        }
      );
    } catch (error: unknown) {
      console.error('Erreur lors de l\'export des clients:', error);
      this.toastService.error('Une erreur est survenue lors de l\'export des clients');
    }
  }

  normalizePhoneForWhatsApp(phone: string): string {
    if (!phone) return '';
    // Supprimer tous les caractères non numériques
    const cleaned = phone.replace(/\D/g, '');
    // Si le numéro commence par 0, le remplacer par 221
    if (cleaned.startsWith('0')) {
      return '221' + cleaned.substring(1);
    }
    // Si le numéro ne commence pas par 221, l'ajouter
    if (!cleaned.startsWith('221')) {
      return '221' + cleaned;
    }
    return cleaned;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 