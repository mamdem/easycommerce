import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
})
export class OrdersComponent implements OnInit {
  // Liste des commandes (exemple)
  orders: any[] = [
    { id: 'C001', date: '2023-07-15', customer: 'Jean Dupont', email: 'jean.dupont@example.com', total: 129.99, status: 'Livré', items: 3 },
    { id: 'C002', date: '2023-07-16', customer: 'Marie Martin', email: 'marie.martin@example.com', total: 89.99, status: 'En attente', items: 2 },
    { id: 'C003', date: '2023-07-17', customer: 'Pierre Durand', email: 'pierre.durand@example.com', total: 159.99, status: 'Expédiée', items: 1 },
    { id: 'C004', date: '2023-07-18', customer: 'Sophie Petit', email: 'sophie.petit@example.com', total: 99.99, status: 'En cours', items: 4 },
    { id: 'C005', date: '2023-07-18', customer: 'Lucas Bernard', email: 'lucas.bernard@example.com', total: 199.99, status: 'En attente', items: 2 },
    { id: 'C006', date: '2023-07-19', customer: 'Emma Dubois', email: 'emma.dubois@example.com', total: 149.99, status: 'Livré', items: 3 },
    { id: 'C007', date: '2023-07-19', customer: 'Léa Moreau', email: 'lea.moreau@example.com', total: 79.99, status: 'Expédiée', items: 1 },
    { id: 'C008', date: '2023-07-20', customer: 'Thomas Leroy', email: 'thomas.leroy@example.com', total: 229.99, status: 'En cours', items: 5 }
  ];

  // Statuts disponibles
  statuses: string[] = ['Tous', 'En attente', 'En cours', 'Expédiée', 'Livré'];

  // Filtres
  selectedStatus: string = 'Tous';
  searchTerm: string = '';

  constructor() { }

  ngOnInit(): void {
    console.log('Orders component initialized');
  }

  // Filtrer les commandes par statut
  filterByStatus(status: string): void {
    this.selectedStatus = status;
  }

  // Obtenir les commandes filtrées
  get filteredOrders(): any[] {
    return this.orders.filter(order => {
      // Filtre par statut
      const statusMatch = this.selectedStatus === 'Tous' || order.status === this.selectedStatus;
      
      // Filtre par terme de recherche
      const searchMatch = this.searchTerm === '' || 
        order.customer.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.id.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return statusMatch && searchMatch;
    });
  }

  // Retourner la classe CSS pour le badge de statut
  getStatusBadgeClass(status: string): string {
    switch(status) {
      case 'En attente': return 'bg-warning';
      case 'En cours': return 'bg-info';
      case 'Expédiée': return 'bg-primary';
      case 'Livré': return 'bg-success';
      default: return 'bg-secondary';
    }
  }
} 