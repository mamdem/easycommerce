import { Injectable } from '@angular/core';
import { AngularFirestore, QuerySnapshot, DocumentData } from '@angular/fire/compat/firestore';
import { Observable, map, from, forkJoin, mergeMap, BehaviorSubject, shareReplay, catchError, of } from 'rxjs';
import { Customer, DuplicationCheck } from '../models/customer.model';
import { Order, CustomerInfo } from '../models/order.model';

@Injectable({
  providedIn: 'root'
})
export class CustomerService {
  private customersSubject = new BehaviorSubject<Customer[]>([]);
  private customers$ = this.customersSubject.asObservable();
  private isLoading = false;

  constructor(private firestore: AngularFirestore) {}

  // Récupère tous les clients uniques à partir des commandes
  getCustomers(): Observable<Customer[]> {
    console.log('[CustomerService] Début getCustomers, isLoading:', this.isLoading);
    if (!this.isLoading) {
      this.loadCustomers();
    }
    return this.customers$;
  }

  // Force le rechargement des clients
  refreshCustomers(): void {
    console.log('[CustomerService] Force le rechargement des clients');
    this.loadCustomers();
  }

  private loadCustomers(): void {
    console.log('[CustomerService] Début loadCustomers');
    this.isLoading = true;

    this.firestore.collection<DocumentData>('orders').get().pipe(
      catchError(error => {
        console.error('[CustomerService] Erreur lors de la récupération des commandes:', error);
        this.isLoading = false;
        return of(null);
      }),
      mergeMap((storeSnapshots: QuerySnapshot<DocumentData> | null) => {
        if (!storeSnapshots) {
          console.log('[CustomerService] Aucun snapshot reçu');
          return of([]);
        }

        console.log('[CustomerService] Nombre de boutiques trouvées:', storeSnapshots.docs.length);
        if (storeSnapshots.docs.length === 0) {
          console.log('[CustomerService] Aucune boutique trouvée');
          return of([]);
        }

        const storeObservables = storeSnapshots.docs.map(storeDoc => {
          // Extraire l'URL de la boutique à partir de l'ID complet
          const storeUrl = this.extractStoreUrl(storeDoc.id);
          console.log('[CustomerService] Récupération des commandes pour la boutique:', storeUrl);
          
          return this.firestore
            .collection('orders')
            .doc(storeUrl) // Utiliser l'URL de la boutique au lieu de l'ID complet
            .collection<Order>('orders')
            .valueChanges({ idField: 'id' })
            .pipe(
              catchError(error => {
                console.error(`[CustomerService] Erreur pour la boutique ${storeUrl}:`, error);
                return of([]);
              })
            );
        });

        return forkJoin(storeObservables).pipe(
          map((ordersArrays: Order[][]) => {
            const allOrders = ordersArrays.flat();
            console.log('[CustomerService] Nombre total de commandes récupérées:', allOrders.length);
            return this.processOrdersToCustomers(allOrders);
          })
        );
      }),
      shareReplay(1)
    ).subscribe({
      next: (customers) => {
        console.log('[CustomerService] Traitement terminé, nombre de clients:', customers.length);
        this.customersSubject.next(customers);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('[CustomerService] Erreur finale:', error);
        this.customersSubject.next([]);
        this.isLoading = false;
      },
      complete: () => {
        console.log('[CustomerService] Observable complete');
        this.isLoading = false;
      }
    });
  }

  // Extraire l'URL de la boutique à partir de l'ID complet
  private extractStoreUrl(fullStoreId: string): string {
    const parts = fullStoreId.split('_');
    return parts.length > 1 ? parts[1] : fullStoreId;
  }

  // Traite les commandes pour créer une liste de clients uniques
  private processOrdersToCustomers(orders: Order[]): Customer[] {
    console.log('[CustomerService] Début processOrdersToCustomers avec', orders.length, 'commandes');
    const customerMap = new Map<string, Customer>();
    let processedOrders = 0;

    // Première passe : créer les clients basés sur le numéro de téléphone
    orders.forEach(order => {
      processedOrders++;
      if (processedOrders % 10 === 0) {
        console.log(`[CustomerService] Traitement des commandes: ${processedOrders}/${orders.length}`);
      }

      if (!order || !order.customerInfo) {
        console.warn('[CustomerService] Commande invalide ou informations client manquantes:', order);
        return;
      }

      const customerInfo = order.customerInfo;
      const normalizedPhone = this.normalizePhone(customerInfo.phone);
      
      if (!normalizedPhone) {
        console.warn('[CustomerService] Numéro de téléphone invalide pour la commande:', order);
        return;
      }
      
      if (!customerMap.has(normalizedPhone)) {
        console.log('[CustomerService] Nouveau client créé:', normalizedPhone);
        customerMap.set(normalizedPhone, this.createCustomerFromOrder(order));
      } else {
        const existingCustomer = customerMap.get(normalizedPhone);
        if (existingCustomer) {
          this.updateCustomerWithOrder(existingCustomer, order);
        }
      }
    });

    console.log('[CustomerService] Première passe terminée, début de la fusion');
    const customers = Array.from(customerMap.values());
    console.log('[CustomerService] Nombre de clients avant fusion:', customers.length);
    
    const mergedCustomers = this.mergeCustomers(customers);
    console.log('[CustomerService] Nombre de clients après fusion:', mergedCustomers.length);

    return mergedCustomers;
  }

  // Fusionne les clients qui sont probablement les mêmes
  private mergeCustomers(customers: Customer[]): Customer[] {
    console.log('[CustomerService] Début de la fusion des clients');
    const mergedMap = new Map<string, Customer>();
    const processedIds = new Set<string>();
    let mergeCount = 0;

    for (let i = 0; i < customers.length; i++) {
      if (processedIds.has(customers[i].id)) continue;

      let currentCustomer = { ...customers[i] };
      processedIds.add(currentCustomer.id);

      for (let j = i + 1; j < customers.length; j++) {
        if (processedIds.has(customers[j].id)) continue;

        const similarity = this.checkDuplication(currentCustomer, customers[j]);
        if (similarity.score >= 0.8) {
          mergeCount++;
          console.log(`[CustomerService] Fusion des clients ${currentCustomer.id} et ${customers[j].id} (score: ${similarity.score})`);
          currentCustomer = this.mergeCustomerData(currentCustomer, customers[j]);
          processedIds.add(customers[j].id);
        }
      }

      mergedMap.set(currentCustomer.id, currentCustomer);
    }

    console.log(`[CustomerService] Fusion terminée. ${mergeCount} fusions effectuées`);
    return Array.from(mergedMap.values());
  }

  // Fusionne les données de deux clients
  private mergeCustomerData(customer1: Customer, customer2: Customer): Customer {
    return {
      ...customer1,
      fullName: this.chooseBestName(customer1.nameVariations || [], customer2.nameVariations || []),
      firstOrderDate: Math.min(customer1.firstOrderDate, customer2.firstOrderDate),
      lastOrderDate: Math.max(customer1.lastOrderDate, customer2.lastOrderDate),
      totalOrders: customer1.totalOrders + customer2.totalOrders,
      totalSpent: customer1.totalSpent + customer2.totalSpent,
      addresses: [...new Set([...customer1.addresses, ...customer2.addresses])],
      orderIds: [...new Set([...customer1.orderIds, ...customer2.orderIds])],
      nameVariations: [...new Set([...(customer1.nameVariations || []), ...(customer2.nameVariations || [])])],
      possibleDuplicates: [...new Set([...customer1.possibleDuplicates, ...customer2.possibleDuplicates, customer2.id])]
    };
  }

  // Choisit le meilleur nom parmi les variations
  private chooseBestName(variations1: string[], variations2: string[]): string {
    const allVariations = [...variations1, ...variations2];
    if (allVariations.length === 0) return 'Client inconnu';
    
    // Choisir le nom le plus long comme potentiellement le plus complet
    return allVariations.reduce((longest, current) => 
      current.length > longest.length ? current : longest
    );
  }

  private checkDuplication(customer1: Customer, customer2: Customer): DuplicationCheck {
    const check: DuplicationCheck = {
      score: 0,
      reasons: [],
      customer1,
      customer2
    };

    // Vérifier la similarité des noms (plus sophistiqué)
    const nameScore = this.calculateNameSimilarity(
      customer1.normalizedName || '',
      customer2.normalizedName || ''
    );
    
    if (nameScore > 0.8) {
      check.score += 0.4;
      check.reasons.push(`Noms très similaires (${Math.round(nameScore * 100)}% de similarité)`);
    } else if (nameScore > 0.6) {
      check.score += 0.2;
      check.reasons.push(`Noms similaires (${Math.round(nameScore * 100)}% de similarité)`);
    }

    // Vérifier les numéros de téléphone
    const phone1 = this.normalizePhone(customer1.phone);
    const phone2 = this.normalizePhone(customer2.phone);
    if (phone1 && phone2 && phone1 === phone2) {
      check.score += 0.4;
      check.reasons.push('Même numéro de téléphone');
    }

    // Vérifier les adresses communes
    const commonAddresses = customer1.addresses.filter(addr => 
      customer2.addresses.includes(addr)
    );
    if (commonAddresses.length > 0) {
      check.score += 0.2;
      check.reasons.push(`${commonAddresses.length} adresse(s) commune(s)`);
    }

    return check;
  }

  private normalizePhone(phone: string): string {
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

  private calculateNameSimilarity(name1: string, name2: string): number {
    if (!name1 || !name2) return 0;
    if (name1 === name2) return 1;

    // Normaliser les noms
    name1 = this.normalizeName(name1);
    name2 = this.normalizeName(name2);

    // Calculer la distance de Levenshtein
    const distance = this.levenshteinDistance(name1, name2);
    const maxLength = Math.max(name1.length, name2.length);
    
    // Calculer la similarité
    return 1 - (distance / maxLength);
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => 
      Array(str1.length + 1).fill(0)
    );

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j - 1][i] + 1, // deletion
          matrix[j][i - 1] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Enlever les accents
      .replace(/[^a-z0-9]/g, '') // Garder uniquement les lettres et chiffres
      .trim();
  }

  // Crée un nouveau client à partir d'une commande
  private createCustomerFromOrder(order: Order): Customer {
    if (!order.customerInfo) {
      throw new Error('Tentative de création d\'un client à partir d\'une commande sans informations client');
    }

    const normalizedName = this.normalizeName(order.customerInfo.fullName || '');
    
    return {
      id: this.generateCustomerId(),
      fullName: order.customerInfo.fullName || 'Client inconnu',
      email: order.customerInfo.email.toLowerCase(),
      phone: order.customerInfo.phone || '',
      firstOrderDate: order.createdAt,
      lastOrderDate: order.createdAt,
      totalOrders: 1,
      totalSpent: order.total || 0,
      addresses: [order.customerInfo.address || ''],
      orderIds: [order.id || ''],
      normalizedName,
      nameVariations: [order.customerInfo.fullName || 'Client inconnu'],
      possibleDuplicates: []
    };
  }

  // Met à jour un client existant avec les informations d'une nouvelle commande
  private updateCustomerWithOrder(customer: Customer, order: Order): void {
    if (!order.customerInfo) {
      console.warn('Tentative de mise à jour avec une commande sans informations client');
      return;
    }

    const orderDate = order.createdAt;
    
    // Mettre à jour les dates
    customer.firstOrderDate = Math.min(customer.firstOrderDate, orderDate);
    customer.lastOrderDate = Math.max(customer.lastOrderDate, orderDate);
    
    // Mettre à jour les statistiques
    customer.totalOrders++;
    customer.totalSpent += order.total || 0;
    
    // Ajouter l'ID de la commande
    if (order.id && !customer.orderIds.includes(order.id)) {
      customer.orderIds.push(order.id);
    }
    
    // Ajouter l'adresse si nouvelle et valide
    const address = order.customerInfo.address;
    if (address && !customer.addresses.includes(address)) {
      customer.addresses.push(address);
    }
    
    // Ajouter la variation du nom si nouvelle et valide
    const newName = order.customerInfo.fullName;
    if (newName) {
      // Initialiser nameVariations s'il n'existe pas
      if (!customer.nameVariations) {
        customer.nameVariations = [];
      }
      // Ajouter la nouvelle variation si elle n'existe pas déjà
      if (!customer.nameVariations.includes(newName)) {
        customer.nameVariations.push(newName);
      }
    }
  }

  // Utilitaires
  private generateCustomerId(): string {
    return 'C' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
} 