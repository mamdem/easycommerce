import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { OrderService } from '../../../../core/services/order.service';
import { CustomerService } from '../../../../core/services/customer.service';
import { StoreService } from '../../../../core/services/store.service';
import { Customer } from '../../../../core/models/customer.model';
import { Order } from '../../../../core/models/order.model';

@Component({
  selector: 'app-customers',
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule]
})
export class CustomersComponent implements OnInit {
  customers: Customer[] = [];
  loading = true;
  error = false;

  // Filtres
  searchTerm: string = '';
  sortBy: string = 'lastOrderDate';
  sortDirection: string = 'desc';

  constructor(
    private orderService: OrderService,
    private customerService: CustomerService,
    private storeService: StoreService
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.error = false;

    this.storeService.getSelectedStore().subscribe(store => {
      if (store) {
        const storeUrl = store.id?.split('_')[1] || '';
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
      } else {
        console.log('[CustomersComponent] Aucune boutique sélectionnée');
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
      if (!order.customerInfo) return;

      const phone = this.normalizePhone(order.customerInfo.phone);
      if (!phone) return;

      if (!customerMap.has(phone)) {
        // Nouveau client
        customerMap.set(phone, {
          id: 'C' + Math.random().toString(36).substr(2, 9).toUpperCase(),
          fullName: this.chooseBestName([order.customerInfo.fullName]),
          email: order.customerInfo.email,
          phone: phone,
          firstOrderDate: order.createdAt,
          lastOrderDate: order.createdAt,
          totalOrders: 1,
          totalSpent: order.total,
          addresses: [order.customerInfo.address],
          orderIds: [order.id || ''],
          normalizedName: this.normalizeName(order.customerInfo.fullName),
          nameVariations: [order.customerInfo.fullName],
          possibleDuplicates: []
        });
      } else {
        // Mettre à jour le client existant
        const customer = customerMap.get(phone)!;
        customer.lastOrderDate = Math.max(customer.lastOrderDate, order.createdAt);
        customer.totalOrders++;
        customer.totalSpent += order.total;
        if (order.id) customer.orderIds.push(order.id);
        
        // Gérer les adresses
        if (order.customerInfo.address && !customer.addresses.includes(order.customerInfo.address)) {
          customer.addresses.push(order.customerInfo.address);
        }
        
        // Gérer les variations de nom
        if (!customer.nameVariations?.includes(order.customerInfo.fullName)) {
          customer.nameVariations = customer.nameVariations || [];
          customer.nameVariations.push(order.customerInfo.fullName);
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
    if (!names || names.length === 0) return 'Client inconnu';
    
    // Choisir le nom le plus long comme potentiellement le plus complet
    return names.reduce((longest, current) => {
      // Ignorer les noms vides ou trop courts
      if (!current || current.length < 2) return longest;
      // Préférer le nom le plus long
      return current.length > longest.length ? current : longest;
    }, names[0]);
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

  // Obtenir les clients filtrés et triés
  get filteredCustomers(): Customer[] {
    return this.customers
      .filter(customer => {
        if (!this.searchTerm) return true;
        
        const searchTermLower = this.searchTerm.toLowerCase();
        const normalizedPhone = this.normalizePhone(this.searchTerm);
        
        // Rechercher dans toutes les variations de nom
        const nameMatch = customer.nameVariations?.some(name => 
          name.toLowerCase().includes(searchTermLower)
        );
        
        return nameMatch ||
          customer.email.toLowerCase().includes(searchTermLower) ||
          customer.phone.includes(normalizedPhone);
      })
      .sort((a, b) => {
        let comparison = 0;
        
        switch (this.sortBy) {
          case 'fullName':
            comparison = a.fullName.localeCompare(b.fullName);
            break;
          case 'phone':
            comparison = a.phone.localeCompare(b.phone);
            break;
          case 'firstOrderDate':
            comparison = a.firstOrderDate - b.firstOrderDate;
            break;
          case 'lastOrderDate':
            comparison = a.lastOrderDate - b.lastOrderDate;
            break;
          case 'totalOrders':
            comparison = a.totalOrders - b.totalOrders;
            break;
          case 'totalSpent':
            comparison = a.totalSpent - b.totalSpent;
            break;
          default:
            comparison = a.lastOrderDate - b.lastOrderDate;
        }
        
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
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
} 