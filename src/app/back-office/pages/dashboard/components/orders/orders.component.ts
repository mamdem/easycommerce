import { Component, OnInit, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Subject, takeUntil, switchMap, filter, of } from 'rxjs';
import { OrderService } from '../../../../../core/services/order.service';
import { StoreService } from '../../../../../core/services/store.service';
import { Order, OrderStatus } from '../../../../../core/models/order.model';
import { ToastService } from '../../../../../core/services/toast.service';
import { PrintService } from '../../../../../core/services/print.service';
import { RejectOrderDialogComponent } from './reject-order-dialog/reject-order-dialog.component';
import { LoadingSpinnerComponent } from '../../../../../shared/components/loading-spinner/loading-spinner.component';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Store } from '../../../../../core/models/store.model';

type SortColumn = 'customerName' | 'itemsCount' | 'total' | 'date' | 'status';
type SortDirection = 'asc' | 'desc';

@Component({
  selector: 'app-orders',
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LoadingSpinnerComponent
  ]
})
export class OrdersComponent implements OnInit, OnDestroy {
  // Propriété Math pour l'utiliser dans le template
  Math = Math;

  orders: Order[] = [];
  loading = true;
  currentStore!: Store;
  
  // Pour la gestion de la destruction du composant
  private destroy$ = new Subject<void>();
  
  // Propriétés pour le tri
  sortColumn: SortColumn = 'date';
  sortDirection: SortDirection = 'desc';
  
  // Statuts disponibles
  statuses: OrderStatus[] = ['en_cours', 'valide', 'rejete'];
  statusLabels = {
    'en_cours': 'En attente',
    'valide': 'Validée',
    'rejete': 'Rejetée'
  };

  // Filtres
  selectedStatus: OrderStatus | 'tous' = 'tous';
  searchTerm: string = '';

  // Pagination
  currentPage = 1;
  pageSize = 15;
  totalPages = 0;

  // Format de la date pour l'export
  private dateFormat = new Intl.DateTimeFormat('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Export dialog properties
  showExportDialog = false;
  selectedPeriod: 'today' | 'week' | 'month' | 'year' | 'custom' = 'today';
  startDate: string = new Date().toISOString().split('T')[0];
  endDate: string = new Date().toISOString().split('T')[0];

  constructor(
    private orderService: OrderService,
    private storeService: StoreService,
    private toastService: ToastService,
    private dialog: MatDialog,
    private printService: PrintService
  ) { }

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
    this.loadOrders();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la boutique:', error);
        this.loading = false;
      }
    });
  }

  private loadOrders(): void {
    this.loading = true;
    const storeUrl = this.currentStore.id?.split('_')[1] || '';
        this.orderService.getOrdersByStore(storeUrl).subscribe({
          next: (orders) => {
            console.log('Commandes chargées:', orders);
            this.orders = orders;
            this.updatePagination();
            this.loading = false;
          },
          error: (error) => {
            console.error('Erreur lors du chargement des commandes:', error);
            this.loading = false;
            this.toastService.error('Erreur lors du chargement des commandes');
      }
    });
  }

  // Filtrer les commandes par statut
  filterByStatus(status: OrderStatus | 'tous'): void {
    this.selectedStatus = status;
    this.currentPage = 1;
    this.updatePagination();
  }

  // Obtenir les commandes filtrées
  get filteredOrders(): Order[] {
    const filtered = this.orders.filter(order => {
      // Filtre par statut
      const statusMatch = this.selectedStatus === 'tous' || order.status === this.selectedStatus;
      
      // Filtre par terme de recherche
      const searchMatch = this.searchTerm === '' || 
        order.customerInfo.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.customerInfo.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.id?.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      return statusMatch && searchMatch;
    });

    // Trier les résultats
    const sorted = this.sortOrders(filtered);

    // Calculer les indices pour la pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;

    return sorted.slice(startIndex, endIndex);
  }

  // Méthode pour trier les commandes
  private sortOrders(orders: Order[]): Order[] {
    return [...orders].sort((a, b) => {
      let comparison = 0;
      
      switch (this.sortColumn) {
        case 'customerName':
          comparison = a.customerInfo.fullName.localeCompare(b.customerInfo.fullName);
          break;
        case 'itemsCount':
          comparison = a.items.length - b.items.length;
          break;
        case 'total':
          comparison = a.total - b.total;
          break;
        case 'date':
          comparison = a.createdAt - b.createdAt;
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
      }
      
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });
  }

  // Méthode pour changer le tri
  toggleSort(column: SortColumn): void {
    if (this.sortColumn === column) {
      // Si on clique sur la même colonne, on inverse la direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // Si on clique sur une nouvelle colonne, on la trie par défaut en ascendant
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
  }

  // Méthode pour obtenir la classe de l'icône de tri
  getSortIconClass(column: SortColumn): string {
    if (this.sortColumn !== column) return 'bi-arrow-down-up text-muted opacity-25';
    return this.sortDirection === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  }

  // Obtenir toutes les commandes filtrées (sans pagination)
  get allFilteredOrders(): Order[] {
    return this.orders.filter(order => {
      const statusMatch = this.selectedStatus === 'tous' || order.status === this.selectedStatus;
      const searchMatch = this.searchTerm === '' || 
        order.customerInfo.fullName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.customerInfo.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        order.id?.toLowerCase().includes(this.searchTerm.toLowerCase());
      return statusMatch && searchMatch;
    });
  }

  // Mettre à jour la pagination
  private updatePagination(): void {
    const filteredCount = this.allFilteredOrders.length;
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

  // Obtenir le nombre de commandes par statut
  getOrdersCountByStatus(status: OrderStatus): number {
    return this.orders.filter(order => order.status === status).length;
  }

  // Obtenir l'icône pour le statut
  getStatusIcon(status: OrderStatus): string {
    switch(status) {
      case 'en_cours': return 'bi-hourglass-split';
      case 'valide': return 'bi-check-circle';
      case 'rejete': return 'bi-x-circle';
      default: return 'bi-question-circle';
    }
  }

  // Retourner la classe CSS pour le badge de statut
  getStatusBadgeClass(status: OrderStatus): string {
    switch(status) {
      case 'en_cours': return 'bg-warning';
      case 'valide': return 'bg-success';
      case 'rejete': return 'bg-danger';
      default: return 'bg-secondary';
    }
  }

  // Obtenir le libellé du statut
  getStatusLabel(status: OrderStatus): string {
    return this.statusLabels[status] || status;
  }

  // Valider une commande
  validateOrder(order: Order): void {
    if (order.id) {
      this.orderService.updateOrderStatus(order.storeUrl, order.id, 'valide').subscribe({
        next: () => {
          order.status = 'valide';
          order.updatedAt = Date.now();
          this.toastService.success('Commande validée avec succès');
        },
        error: (error) => {
          console.error('Erreur lors de la validation de la commande:', error);
          this.toastService.error('Erreur lors de la validation de la commande');
        }
      });
    }
  }

  // Rejeter une commande
  rejectOrder(order: Order): void {
    const dialogRef = this.dialog.open(RejectOrderDialogComponent, {
      width: '500px',
      data: { order },
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(reason => {
      if (reason && order.id) {
        this.orderService.updateOrderStatus(order.storeUrl, order.id, 'rejete', reason).subscribe({
          next: () => {
            order.status = 'rejete';
            order.rejectionReason = reason;
            order.updatedAt = Date.now();
            this.toastService.success('Commande rejetée');
          },
          error: (error) => {
            console.error('Erreur lors du rejet de la commande:', error);
            this.toastService.error('Erreur lors du rejet de la commande');
          }
        });
      }
    });
  }

  // Imprimer les commandes
  printOrders(): void {
    window.print();
  }

  // Effacer la recherche
  clearSearch(): void {
    this.searchTerm = '';
    this.currentPage = 1;
    this.updatePagination();
  }

  // Gérer la recherche
  onSearch(): void {
    this.currentPage = 1;
    this.updatePagination();
  }

  // Formater la date
  formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Formater le montant
  formatAmount(amount: number): string {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  }

  printOrderTicket(order: Order): void {
    this.printService.generateOrderTicket(order);
  }

  // Exporter en PDF
  exportToPDF(): void {
    try {
      const doc = new jsPDF();
      let storeName = 'Boutique';
      
      // Récupérer le nom de la boutique de manière sûre
      this.storeService.getSelectedStore().subscribe(store => {
        if (store) {
          storeName = store.storeName || 'Boutique';
        }
      });
      
      const today = this.dateFormat.format(new Date());

      // En-tête du document
      doc.setFontSize(18);
      doc.text(`Commandes - ${storeName}`, 14, 20);
      doc.setFontSize(11);
      doc.text(`Exporté le ${today}`, 14, 30);

      // Préparation des données pour le tableau
      const tableData = this.allFilteredOrders.map(order => [
        this.dateFormat.format(new Date(order.createdAt)),
        order.id || 'N/A',
        order.customerInfo?.fullName || 'Client inconnu',
        order.customerInfo?.phone || 'N/A',
        order.status,
        `${order.total.toLocaleString('fr-FR')} FCFA`
      ]);

      // Création du tableau
      autoTable(doc, {
        head: [['Date', 'N° Commande', 'Client', 'Téléphone', 'Statut', 'Montant']],
        body: tableData,
        startY: 40,
        styles: {
          fontSize: 9,
          cellPadding: 3
        },
        headStyles: {
          fillColor: [41, 128, 185],
          textColor: 255
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        }
      });

      // Pied de page
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(
          `Page ${i} sur ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      // Sauvegarde du PDF
      const fileName = `commandes_${storeName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      this.toastService.success('Le fichier PDF a été généré avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export PDF:', error);
      this.toastService.error('Une erreur est survenue lors de l\'export PDF');
    }
  }

  // Exporter en Excel
  exportToExcel(): void {
    try {
      let storeName = 'Boutique';
      
      // Récupérer le nom de la boutique de manière sûre
      this.storeService.getSelectedStore().subscribe(store => {
        if (store) {
          storeName = store.storeName || 'Boutique';
        }
      });
      
      // Préparation des données
      const data = this.allFilteredOrders.map(order => ({
        'Date': this.dateFormat.format(new Date(order.createdAt)),
        'N° Commande': order.id || 'N/A',
        'Client': order.customerInfo?.fullName || 'Client inconnu',
        'Téléphone': order.customerInfo?.phone || 'N/A',
        'Email': order.customerInfo?.email || 'N/A',
        'Adresse': order.customerInfo?.address || 'N/A',
        'Statut': order.status,
        'Montant': order.total,
        'Produits': order.items?.map(item => `${item.quantity}x ${item.product?.name || 'Produit inconnu'}`).join(', ') || 'N/A'
      }));

      // Création du workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Commandes');

      // Ajustement des colonnes
      const colWidths = [
        { wch: 20 }, // Date
        { wch: 15 }, // N° Commande
        { wch: 25 }, // Client
        { wch: 15 }, // Téléphone
        { wch: 25 }, // Email
        { wch: 30 }, // Adresse
        { wch: 12 }, // Statut
        { wch: 12 }, // Montant
        { wch: 50 }  // Produits
      ];
      ws['!cols'] = colWidths;

      // Sauvegarde du fichier
      const fileName = `commandes_${storeName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      this.toastService.success('Le fichier Excel a été généré avec succès !');
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      this.toastService.error('Une erreur est survenue lors de l\'export Excel');
    }
  }

  // Ouvrir le dialogue d'export
  openExportDialog(): void {
    this.showExportDialog = true;
    this.selectPeriod('today');
  }

  // Fermer le dialogue d'export
  closeExportDialog(): void {
    this.showExportDialog = false;
  }

  // Sélectionner une période
  selectPeriod(period: 'today' | 'week' | 'month' | 'year' | 'custom'): void {
    this.selectedPeriod = period;
    const today = new Date();
    
    switch (period) {
      case 'today':
        this.startDate = today.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      
      case 'week':
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        this.startDate = weekStart.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        this.startDate = monthStart.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        this.startDate = yearStart.toISOString().split('T')[0];
        this.endDate = today.toISOString().split('T')[0];
        break;
      
      case 'custom':
        // Garder les dates actuelles
        break;
    }
  }

  // Obtenir les commandes de la période sélectionnée
  private getOrdersInPeriod(): Order[] {
    const start = new Date(this.startDate).getTime();
    const end = new Date(this.endDate).getTime() + 86400000; // Ajouter 24h pour inclure le dernier jour
    
    return this.orders.filter(order => 
      order.status === 'valide' &&
      order.createdAt >= start &&
      order.createdAt <= end
    );
  }

  // Obtenir le montant total
  getTotalAmount(): string {
    const total = this.getOrdersInPeriod()
      .reduce((sum, order) => sum + order.total, 0);
    return total.toLocaleString('fr-FR');
  }

  // Obtenir le nombre de transactions
  getTransactionCount(): number {
    return this.getOrdersInPeriod().length;
  }

  // Formater la période pour l'affichage
  getFormattedPeriod(): string {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    
    return start.toLocaleDateString('fr-FR') + ' - ' + end.toLocaleDateString('fr-FR');
  }

  // Télécharger les factures
  downloadInvoices(): void {
    try {
      const ordersToExport = this.getOrdersInPeriod();
      
      if (ordersToExport.length === 0) {
        this.toastService.error('Aucune commande validée trouvée pour cette période');
        return;
      }

      // Préparation des données
      const data = ordersToExport.map(order => ({
        'Date': new Date(order.createdAt).toLocaleDateString('fr-FR'),
        'N° Commande': order.id || 'N/A',
        'Client': order.customerInfo?.fullName || 'Client inconnu',
        'Téléphone': order.customerInfo?.phone || 'N/A',
        'Email': order.customerInfo?.email || 'N/A',
        'Adresse': order.customerInfo?.address || 'N/A',
        'Produits': order.items?.map(item => `${item.quantity}x ${item.product?.name || 'Produit inconnu'}`).join(', ') || 'N/A',
        'Montant': order.total.toLocaleString('fr-FR') + ' FCFA'
      }));

      // Création du workbook
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Factures');

      // Ajustement des colonnes
      const colWidths = [
        { wch: 12 }, // Date
        { wch: 15 }, // N° Commande
        { wch: 25 }, // Client
        { wch: 15 }, // Téléphone
        { wch: 25 }, // Email
        { wch: 30 }, // Adresse
        { wch: 50 }, // Produits
        { wch: 15 }  // Montant
      ];
      ws['!cols'] = colWidths;

      // Sauvegarde du fichier
      const fileName = `factures_${this.startDate}_${this.endDate}.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      this.toastService.success('Les factures ont été téléchargées avec succès');
      this.closeExportDialog();
    } catch (error) {
      console.error('Erreur lors du téléchargement des factures:', error);
      this.toastService.error('Une erreur est survenue lors du téléchargement des factures');
    }
  }

  // Méthode pour basculer l'affichage du popup
  toggleExportPopup(): void {
    this.showExportDialog = !this.showExportDialog;
    if (this.showExportDialog) {
      this.selectPeriod('today');
    }
  }

  // Gestionnaire de clic à l'extérieur du popup
  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    const exportPopup = document.querySelector('.export-popup');
    const exportButton = document.querySelector('.header-actions button');
    
    if (this.showExportDialog && exportPopup && exportButton) {
      const clickedElement = event.target as HTMLElement;
      if (!exportPopup.contains(clickedElement) && !exportButton.contains(clickedElement)) {
        this.closeExportDialog();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
} 