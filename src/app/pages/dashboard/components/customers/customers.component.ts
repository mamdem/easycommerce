import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-customers',
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss'],
})
export class CustomersComponent implements OnInit {
  // Liste des clients (exemple)
  customers: any[] = [
    { id: 'C001', name: 'Jean Dupont', email: 'jean.dupont@example.com', phone: '+33 6 12 34 56 78', date: '2023-03-15', orders: 5, total: 299.95 },
    { id: 'C002', name: 'Marie Martin', email: 'marie.martin@example.com', phone: '+33 6 23 45 67 89', date: '2023-04-22', orders: 3, total: 149.97 },
    { id: 'C003', name: 'Pierre Durand', email: 'pierre.durand@example.com', phone: '+33 6 34 56 78 90', date: '2023-05-10', orders: 7, total: 429.93 },
    { id: 'C004', name: 'Sophie Petit', email: 'sophie.petit@example.com', phone: '+33 6 45 67 89 01', date: '2023-05-20', orders: 2, total: 159.98 },
    { id: 'C005', name: 'Lucas Bernard', email: 'lucas.bernard@example.com', phone: '+33 6 56 78 90 12', date: '2023-06-05', orders: 1, total: 99.99 },
    { id: 'C006', name: 'Emma Dubois', email: 'emma.dubois@example.com', phone: '+33 6 67 89 01 23', date: '2023-06-15', orders: 4, total: 249.96 },
    { id: 'C007', name: 'Léa Moreau', email: 'lea.moreau@example.com', phone: '+33 6 78 90 12 34', date: '2023-06-30', orders: 2, total: 129.98 },
    { id: 'C008', name: 'Thomas Leroy', email: 'thomas.leroy@example.com', phone: '+33 6 89 01 23 45', date: '2023-07-10', orders: 6, total: 399.94 }
  ];

  // Filtres
  searchTerm: string = '';
  sortBy: string = 'date'; // Tri par défaut sur la date d'inscription
  sortDirection: string = 'desc'; // Direction du tri (asc ou desc)

  constructor() { }

  ngOnInit(): void {
    console.log('Customers component initialized');
  }

  // Changer le tri
  setSorting(column: string): void {
    if (this.sortBy === column) {
      // Si on clique sur la même colonne, on inverse la direction du tri
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Sinon, on change la colonne de tri et on met la direction en asc
      this.sortBy = column;
      this.sortDirection = 'asc';
    }
  }

  // Obtenir les clients filtrés et triés
  get filteredCustomers(): any[] {
    return this.customers
      .filter(customer => {
        // Filtre par terme de recherche
        return this.searchTerm === '' || 
          customer.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          customer.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          customer.phone.includes(this.searchTerm);
      })
      .sort((a, b) => {
        // Tri par colonne
        let comparison = 0;
        
        switch (this.sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'email':
            comparison = a.email.localeCompare(b.email);
            break;
          case 'date':
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
            break;
          case 'orders':
            comparison = a.orders - b.orders;
            break;
          case 'total':
            comparison = a.total - b.total;
            break;
          default:
            comparison = a.name.localeCompare(b.name);
        }
        
        // Appliquer la direction du tri
        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
  }
} 